import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { App, TFile } from "obsidian";

declare const app: App;

export const updateStatusTool = new DynamicStructuredTool({
    name: "update_status",
    description: "Updates the status in a markdown file by replacing the previous status with a new status.",
    schema: z.object({
        path: z.string().describe("The exact path of the markdown file, e.g., 'folder/file.md'. Same which was used to create the file. Do not start with /"),
        previous_status: z.string().describe("The exact string of the previous status to find and replace"),
        next_status: z.string().describe("The new status string to replace the previous status with")
    }),
    func: async ({ path, previous_status, next_status }) => {
        try {
            const normalizedPath = path.endsWith('.md') ? path : `${path}.md`;
            const file = app.vault.getAbstractFileByPath(normalizedPath);
            
            if (!file) return `Error: File not found at: ${normalizedPath}`;
            if (!(file instanceof TFile)) return `Error: Path ${normalizedPath} is not a valid file.`;
            
            const existingContent = await app.vault.read(file);
            
            if (!existingContent.includes(previous_status)) {
                return `Error: Previous status "${previous_status}" not found in file ${normalizedPath}`;
            }
            
            const newContent = existingContent.replace(previous_status, next_status);
            await app.vault.modify(file, newContent);
            
            return `Successfully updated status from "${previous_status}" to "${next_status}" in: ${normalizedPath}`;
        } catch (error) {
            return `Error updating status in file: ${(error as Error).message}`;
        }
    }
});
