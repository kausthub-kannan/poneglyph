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
      const fields = "title,authorships,abstract_inverted_index,publication_year,doi,cited_by_count,primary_location";
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&select=${fields}&mailto=plugin@obsidian.md`;

      const response = await requestUrl({ url, method: "GET", throw: false });

      if (response.status !== 200) {
        return `Error: OpenAlex API failed with status ${response.status}`;
      }

      const data = response.json;

      if (!data.results || data.results.length === 0) {
        return `No academic papers found for the query: "${query}"`;
      }

      // Collect all unique author IDs across all papers for a single batch request
      const allAuthorIds = new Set<string>();
      data.results.forEach((paper: any) => {
        paper.authorships?.forEach((a: any) => {
          if (a.author?.id) allAuthorIds.add(a.author.id);
        });
      });

      // Single batched fetch for all author stats
      const authorStatsMap = await fetchAuthorStats([...allAuthorIds]);

      let resultString = `Found ${data.results.length} papers for "${query}":\n\n`;

      data.results.forEach((paper: any, index: number) => {
        const authorships: any[] = paper.authorships ?? [];

        const authors = authorships.length > 0
          ? authorships.slice(0, 3).map((a: any) => a.author?.display_name ?? "Unknown").join(", ")
            + (authorships.length > 3 ? " et al." : "")
          : "Unknown authors";

        // Average each metric across all authors on this paper
        const avgStats = computeAverageStats(authorships, authorStatsMap);

        const abstract = reconstructAbstract(paper.abstract_inverted_index);

        const paperUrl = paper.doi
          ? `https://doi.org/${paper.doi.replace("https://doi.org/", "")}`
          : paper.primary_location?.landing_page_url ?? "No URL provided";

        resultString += `### ${index + 1}. ${paper.title ?? "Untitled"} (${paper.publication_year ?? "N/A"})\n`;
        resultString += `- **Authors:** ${authors}\n`;
        resultString += `- **Paper Citations:** ${paper.cited_by_count ?? 0}\n`;
        resultString += `- **Avg. Author H-Index:** ${avgStats.hIndex}\n`;
        resultString += `- **Avg. Author i10-Index:** ${avgStats.i10Index}\n`;
        resultString += `- **Avg. Author Citedness:** ${avgStats.citedness}\n`;
        resultString += `- **URL:** ${paperUrl}\n`;
        resultString += `- **Abstract:** ${abstract}\n\n`;
      });

      return resultString;

    } catch (error) {
      return `Failed to execute OpenAlex search: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

// ─── Author Stats ────────────────────────────────────────────────────────────

interface AuthorStats {
  hIndex: number;
  i10Index: number;
  citedness: number; // mean_cited_by_count from summary_stats
}

// Fetches h_index, i10_index, and citedness for all author IDs in one batch request.
async function fetchAuthorStats(authorIds: string[]): Promise<Map<string, AuthorStats>> {
  const statsMap = new Map<string, AuthorStats>();
  if (authorIds.length === 0) return statsMap;

  try {
    const shortIds = authorIds.map(id => id.split("/").pop() ?? id);
    const filterValue = `ids.openalex:${shortIds.join("|")}`;
    const url = `https://api.openalex.org/authors?filter=${encodeURIComponent(filterValue)}&select=id,summary_stats&per-page=100&mailto=plugin@obsidian.md`;

    const response = await requestUrl({ url, method: "GET", throw: false });
    if (response.status !== 200) return statsMap;

    response.json.results?.forEach((author: any) => {
      const s = author.summary_stats;
      if (author.id && s) {
        statsMap.set(author.id, {
          hIndex:    s.h_index           ?? 0,
          i10Index:  s.i10_index         ?? 0,
          citedness: s.mean_cited_by_count ?? 0,
        });
      }
    });
  } catch {
    // Gracefully return empty map — outputs will show "N/A"
  }

  return statsMap;
}

// Averages h-index, i10-index, and citedness across all authors on a paper.
// Authors missing from the stats map are excluded from each average.
function computeAverageStats(
  authorships: any[],
  statsMap: Map<string, AuthorStats>
): { hIndex: string; i10Index: string; citedness: string } {
  const stats = authorships
    .map((a: any) => statsMap.get(a.author?.id))
    .filter((s): s is AuthorStats => s !== undefined);

  if (stats.length === 0) return { hIndex: "N/A", i10Index: "N/A", citedness: "N/A" };

  const avg = (key: keyof AuthorStats) =>
    (stats.reduce((sum, s) => sum + s[key], 0) / stats.length).toFixed(1);

  return {
    hIndex:    avg("hIndex"),
    i10Index:  avg("i10Index"),
    citedness: avg("citedness"),
  };
}

// ─── Abstract Reconstruction ─────────────────────────────────────────────────

// OpenAlex stores abstracts as an inverted index: { "word": [position, ...], ... }
function reconstructAbstract(invertedIndex: Record<string, number[]> | null | undefined): string {
  if (!invertedIndex) return "No abstract available.";

  const wordPositions: [string, number][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) wordPositions.push([word, pos]);
  }

  const abstract = wordPositions
    .sort((a, b) => a[1] - b[1])
    .map(([word]) => word)
    .join(" ");

  return abstract.length > 400 ? abstract.substring(0, 400) + "..." : abstract;
}