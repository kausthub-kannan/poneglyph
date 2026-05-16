import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { requestUrl } from "obsidian";
import { pdfToText } from "backend/utils/helper";

export const createUnpaywallTool = (email: string) => {
  return new DynamicStructuredTool({
    name: "get_unpaywall_fulltext",
    description: "Fetches full text of an open-access research paper using the Unpaywall API by DOI.",
    schema: z.object({
      doi: z.string().describe("DOI of the paper, e.g. '10.1038/s41586-021-03491-6'"),
    }),
    func: async ({ doi }) => {
      if (!email) {
        return "Error: Unpaywall email is not set in settings. Please configure it to use this tool.";
      }

      try {
        const apiUrl = `https://api.unpaywall.org/v2/${doi}?email=${encodeURIComponent(email)}`;
        console.log(`Fetching from Unpaywall: ${apiUrl}`);
        
        const response = await requestUrl({ url: apiUrl });
        
        if (response.status !== 200) {
          return `Failed to fetch metadata from Unpaywall for DOI "${doi}". Status: ${response.status}`;
        }

        const data = response.json;
        
        if (!data.is_oa) {
          return `The paper with DOI "${doi}" is not open access according to Unpaywall.`;
        }

        const extractPdfUrl = (loc: any): string | null => {
          if (loc?.url_for_pdf) return loc.url_for_pdf;
          if (loc?.url && loc.url.endsWith(".pdf")) return loc.url;
          if (loc?.url_for_landing_page && loc.url_for_landing_page.endsWith(".pdf")) return loc.url_for_landing_page;
          return null;
        };

        let pdfUrl = extractPdfUrl(data.best_oa_location);
        
        if (!pdfUrl && data.oa_locations && data.oa_locations.length > 0) {
          for (const loc of data.oa_locations) {
            const url = extractPdfUrl(loc);
            if (url) {
              pdfUrl = url;
              break;
            }
          }
        }

        if (!pdfUrl) {
          return `Open access version found for DOI "${doi}", but no PDF URL is available.`;
        }

        console.log(`Downloading PDF from: ${pdfUrl}`);
        
        const HEADERS = {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:27.0) Gecko/20100101 Firefox/27.0",
        };
        
        const pdfResponse = await requestUrl({ url: pdfUrl, headers: HEADERS });
        const text = await pdfToText(pdfResponse.arrayBuffer);
        
        if (!text.trim()) {
          return `Failed to extract text from the PDF for DOI "${doi}".`;
        }
        
        return text;
      } catch (err) {
        console.warn(`[Unpaywall] fetch failed: ${err instanceof Error ? err.message : String(err)}`);
        return `Failed to fetch from Unpaywall for "${doi}": ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  });
};