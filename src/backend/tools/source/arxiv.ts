import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { extractTextFromPdfUrl } from "backend/utils/helper";

export const arxivFullTextTool = new DynamicStructuredTool({
  name: "get_arxiv_fulltext",
  description: "Fetches full text of a research paper from arXiv by DOI or arXiv ID.",
  schema: z.object({
    doi: z.string().describe("DOI or arXiv ID of the paper, e.g. '10.48550/arXiv.2310.03025' or '2310.03025'"),
  }),
  func: async ({ doi }) => {
    try {
      let arxivId = doi;

      const arxivMatch = doi.match(/arxiv\.([\d.]+.*)/i);
      if (arxivMatch) {
        arxivId = arxivMatch[1] || '';
      }

      const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;

      const text = await extractTextFromPdfUrl(pdfUrl);

      if (!text.trim()) {
        return `Failed to extract text from arXiv PDF for ${doi}.`;
      }

      return text;
    } catch (err) {
      return `Failed to fetch from arXiv for "${doi}": ${err instanceof Error ? err.message : String(err)}`;
    }
  },
});