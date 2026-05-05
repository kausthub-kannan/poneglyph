import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { requestUrl } from "obsidian";
import 'pdfjs-dist/build/pdf.worker.mjs'
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:27.0) Gecko/20100101 Firefox/27.0",
};

// ── PDF URL resolution ────────────────────────────────────────────────────

function getDirectUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const webview = document.createElement("webview") as any;
    webview.setAttribute("src", url);
    webview.setAttribute("partition", "persist:scihub");
    webview.style.cssText =
      "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(webview);

    const cleanup = () => {
      try {
        document.body.removeChild(webview);
      } catch {}
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out — no PDF iframe found within 20s"));
    }, 20000);

    webview.addEventListener("did-fail-load", (e: any) => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error(`Webview failed to load: ${e.errorDescription}`));
    });

    webview.addEventListener("did-stop-loading", async () => {
      try {
        let pdfUrl: string | null = null;

        for (let i = 0; i < 20; i++) {
          pdfUrl = await webview.executeJavaScript(`
            (() => {
              const iframes = Array.from(document.querySelectorAll("iframe"));
              for (const iframe of iframes) {
                const src = iframe.dataset.src || iframe.src || "";
                // Only accept iframe whose src actually points to a PDF
                if (src.includes(".pdf")) return src;
              }
              return null;
            })()
          `);

          if (pdfUrl) break;
          await new Promise((r) => setTimeout(r, 500));
        }

        clearTimeout(timeout);
        cleanup();

        if (!pdfUrl) {
          reject(new Error("No PDF iframe found after 10s"));
          return;
        }

        resolve(pdfUrl.startsWith("//") ? `https:${pdfUrl}` : pdfUrl);
      } catch (err) {
        clearTimeout(timeout);
        cleanup();
        reject(err);
      }
    });
  });
}

// ── PDF → text ────────────────────────────────────────────────────────────

async function pdfToText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1)
        .then(p => p.getTextContent())
        .then(c => c.items.map((x: any) => x.str).join(" "))
    )
  );
  return pages.join("\n");
}

// ── Tool ──────────────────────────────────────────────────────────────────

export const sciHubFullTextTool = new DynamicStructuredTool({
  name: "get_scihub_fulltext",
  description: "Fetches full text of a research paper from Sci-Hub by DOI, PMID, or URL.",
  schema: z.object({
  doi: z.string().describe("DOI of the paper, e.g. '10.1038/s41586-021-03491-6'"),
  maxChars: z.number().optional().default(120_000),
}),

func: async ({ doi, maxChars = 120_000 }) => {
  const mirrors = ["https://sci-hub.mobi"]
  if (!mirrors.length) return "Error: No Sci-Hub mirrors available.";

  for (const mirror of mirrors) {
    const baseUrl = `${mirror}/`;
    try {
      console.log("Attempting to fetch from mirror:", mirror);
      const pdfUrl = await getDirectUrl(`${mirror}${doi}`);
      const { arrayBuffer } = await requestUrl({ url: pdfUrl, headers: HEADERS });
      const text = await pdfToText(arrayBuffer);
      if (!text.trim()) continue;
      return text;
    } catch (err) {
      console.warn(`[SciHub] ${mirror} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return `Failed to fetch DOI "${doi}" from all available mirrors. Please try fetching a different paper which is similar to this`;
},
});