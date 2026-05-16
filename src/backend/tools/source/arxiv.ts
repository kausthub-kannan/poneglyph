import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { requestUrl } from "obsidian";
import { pdfToText } from "backend/utils/helper";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:27.0) Gecko/20100101 Firefox/27.0",
};

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
      console.log(`Attempting to fetch from arxiv: ${pdfUrl}`);
      
      const { arrayBuffer } = await requestUrl({ url: pdfUrl, headers: HEADERS });
      const text = await pdfToText(arrayBuffer);
      
      if (!text.trim()) {
        return `Failed to extract text from arXiv PDF for ${doi}.`;
      }
      
      return text;
    } catch (err) {
      console.warn(`[ArXiv] fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return `Failed to fetch from arXiv for "${doi}": ${err instanceof Error ? err.message : String(err)}`;
    }
  },
});