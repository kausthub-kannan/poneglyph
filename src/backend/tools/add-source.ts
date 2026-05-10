import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { App, TFile } from "obsidian";

declare const app: App;

export const addSourceTool = new DynamicStructuredTool({
    name: "add_source",
    description: "Adds a new research paper source to the SOURCES.md file as a new row in the table.",
    schema: z.object({
        paperTitle: z.string().describe("The title of the research paper"),
        doi: z.string().describe("The DOI (Digital Object Identifier) of the research paper"),
        avgHIndex: z.union([z.number(), z.string()]).describe("The average h-index of the authors"),
        avgI10Index: z.union([z.number(), z.string()]).describe("The average i10-index of the authors"),
        avgCitedness: z.union([z.number(), z.string()]).describe("The average citedness of the authors"),
        year: z.union([z.number(), z.string()]).describe("The publication year of the research paper")
    }),
    func: async ({ paperTitle, doi, avgHIndex, avgI10Index, avgCitedness, year }) => {
        try {
            const filePath = "SOURCES.md";
            const row = `| ${paperTitle} | ${doi} | ${avgHIndex} | ${avgI10Index} | ${avgCitedness} | ${year} |`;
            const file = app.vault.getAbstractFileByPath(filePath);

            if (file instanceof TFile) {
                await app.vault.process(file, (existingContent) => {
                    return existingContent + (existingContent.endsWith('\n') ? '' : '\n') + row;
                });
                return `Successfully added source to ${filePath}`;
            } else if (!file) {
                const header = `| Paper Title | DOI | Avg h-index | Avg i10-index | Avg Citedness | Year |\n| ----------- | --- | ----------- | ------------- | ------------- | ---- |\n`;
                const content = header + row;
                await app.vault.create(filePath, content);
                return `Successfully created ${filePath} and added source.`;
            }
            
            return `Error: Path ${filePath} exists but is not a valid file.`;
        } catch (error) {
            return `Error adding source: ${(error as Error).message}`;
        }
    }
});
