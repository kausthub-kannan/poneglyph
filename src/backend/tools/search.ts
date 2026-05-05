import { DynamicStructuredTool } from "@langchain/core/tools";
import { requestUrl } from "obsidian";
import { z } from "zod";

export const openAlexSearchTool = new DynamicStructuredTool({
  name: "search_open_alex",
  description: "Searches the OpenAlex database for academic papers. Use this to find peer-reviewed papers, abstracts, authors, and publication years.",
  schema: z.object({
    query: z.string().describe("The search query (e.g., 'large language models in healthcare')"),
    limit: z.number().optional().default(3).describe("Number of papers to return. Keep it small (e.g., 3-5) to avoid exceeding context limits."),
  }),
  func: async ({ query, limit = 3 }) => {
    try {
      // OpenAlex uses 'search' param and 'select' for fields
      const fields = "title,authorships,abstract_inverted_index,publication_year,doi,cited_by_count,primary_location";
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&select=${fields}&mailto=plugin@obsidian.md`;

      const response = await requestUrl({
        url,
        method: "GET",
        throw: false,
      });

      if (response.status !== 200) {
        return `Error: OpenAlex API failed with status ${response.status}`;
      }

      const data = response.json;

      if (!data.results || data.results.length === 0) {
        return `No academic papers found for the query: "${query}"`;
      }

      let resultString = `Found ${data.results.length} papers for "${query}":\n\n`;

      data.results.forEach((paper: any, index: number) => {
        // OpenAlex stores authors under authorships[].author.display_name
        const authors = paper.authorships && paper.authorships.length > 0
          ? paper.authorships.slice(0, 3).map((a: any) => a.author?.display_name ?? "Unknown").join(", ")
            + (paper.authorships.length > 3 ? " et al." : "")
          : "Unknown authors";

        // OpenAlex abstracts are stored as inverted index — need to reconstruct
        const abstract = reconstructAbstract(paper.abstract_inverted_index);

        // DOI link or landing page URL
        const paperUrl = paper.doi
          ? `https://doi.org/${paper.doi.replace("https://doi.org/", "")}`
          : paper.primary_location?.landing_page_url ?? "No URL provided";

        resultString += `### ${index + 1}. ${paper.title ?? "Untitled"} (${paper.publication_year ?? "N/A"})\n`;
        resultString += `- **Authors:** ${authors}\n`;
        resultString += `- **Citations:** ${paper.cited_by_count ?? 0}\n`;
        resultString += `- **URL:** ${paperUrl}\n`;
        resultString += `- **Abstract:** ${abstract}\n\n`;
      });

      return resultString;

    } catch (error) {
      return `Failed to execute OpenAlex search: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

// OpenAlex stores abstracts as an inverted index: { "word": [position, ...], ... }
// This reconstructs the original abstract string from it
function reconstructAbstract(invertedIndex: Record<string, number[]> | null | undefined): string {
  if (!invertedIndex) return "No abstract available.";

  const wordPositions: [string, number][] = [];

  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      wordPositions.push([word, pos]);
    }
  }

  const abstract = wordPositions
    .sort((a, b) => a[1] - b[1])
    .map(([word]) => word)
    .join(" ");

  return abstract.length > 400 ? abstract.substring(0, 400) + "..." : abstract;
}