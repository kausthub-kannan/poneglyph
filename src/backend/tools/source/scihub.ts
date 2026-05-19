import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { getPdfUrlFromWebView, extractTextFromPdfUrl } from "backend/utils/helper";

export const sciHubFullTextTool = new DynamicStructuredTool({
  name: "get_scihub_fulltext",
  description: "Fetches full text of a research paper from Sci-Hub by DOI, PMID, or URL.",
  schema: z.object({
    doi: z.string().describe("DOI of the paper, e.g. '10.1038/s41586-021-03491-6'"),
    maxChars: z.number().optional().default(120_000),
  }),

  func: async ({ doi }) => {
    const mirrors = ["https://sci-hub.mobi"]
    if (!mirrors.length) return "Error: No Sci-Hub mirrors available.";

    for (const mirror of mirrors) {
      try {
        const pdfUrl = await getPdfUrlFromWebView(`${mirror}${doi}`);
        const text = await extractTextFromPdfUrl(pdfUrl);
        if (!text.trim()) continue;
        return text;
      } catch { /* ignore error */ }
    }

    return `Failed to fetch DOI "${doi}" from all available mirrors. Please try fetching a different paper which is similar to this`;
  },
});