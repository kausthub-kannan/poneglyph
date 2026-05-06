import 'pdfjs-dist/build/pdf.worker.mjs'
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export function getPdfUrlFromWebView(url: string): Promise<string> {
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
            } catch { }
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


export async function pdfToText(buffer: ArrayBuffer): Promise<string> {
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