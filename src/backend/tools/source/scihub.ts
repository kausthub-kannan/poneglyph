import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { requestUrl } from "obsidian";
import { getPdfUrlFromWebView, pdfToText } from "backend/utils/helper";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:27.0) Gecko/20100101 Firefox/27.0",
};

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
      try {
        console.log("Attempting to fetch from mirror:", mirror);
        const pdfUrl = await getPdfUrlFromWebView(`${mirror}${doi}`);
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