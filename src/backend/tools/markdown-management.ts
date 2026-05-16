import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { App, TFile, TFolder } from "obsidian";

declare const app: App;

async function ensureFolderExists(filePath: string) {
    const parts = filePath.split('/');
    parts.pop();
    let currentPath = '';
    for (const part of parts) {
        currentPath = currentPath === '' ? part : `${currentPath}/${part}`;
        const folder = app.vault.getAbstractFileByPath(currentPath);
        if (!folder) {
            await app.vault.createFolder(currentPath);
        } else if (!(folder instanceof TFolder)) {
            throw new Error(`Path ${currentPath} exists but is not a folder.`);
        }
    }
}

export const readMarkdownTool = new DynamicStructuredTool({
    name: "read_markdown",
    description: "Reads the content of a markdown file in the Obsidian vault.",
    schema: z.object({
        path: z.string().describe("The exact path of the markdown file, e.g., 'folder/file.md'")
    }),
    func: async ({ path }) => {
        const file = app.vault.getAbstractFileByPath(path);
        if (!file) return `Error: File not found at path: ${path}`;
        if (!(file instanceof TFile)) return `Error: Path ${path} is not a valid file.`;
        try {
            return await app.vault.read(file);
        } catch (error) {
            return `Error reading file: ${(error as Error).message}`;
        }
    }
});

export const writeMarkdownTool = new DynamicStructuredTool({
    name: "write_markdown",
    description: "Writes content to a markdown file. Overwrites if it exists, creates new if it doesn't. Never start the path with a '/'",
    schema: z.object({
        path: z.string().describe("The exact path of the markdown file, e.g., 'folder/file.md'"),
        content: z.string().describe("The full markdown content to write")
    }),
    func: async ({ path, content }) => {
        try {
            const normalizedPath = path.endsWith('.md') ? path : `${path}.md`;
            await ensureFolderExists(normalizedPath);
            const file = app.vault.getAbstractFileByPath(normalizedPath);
            if (file instanceof TFile) {
                await app.vault.modify(file, content);
                return `Successfully overwritten: ${normalizedPath}`;
            } else if (!file) {
                await app.vault.create(normalizedPath, content);
                return `Successfully created: ${normalizedPath}`;
            }
            return `Error: Path ${normalizedPath} exists but is not a file.`;
        } catch (error) {
            return `Error writing file: ${(error as Error).message}`;
        }
    }
});

export const appendMarkdownTool = new DynamicStructuredTool({
    name: "append_markdown",
    description: "Appends content to the end of an existing markdown file.",
    schema: z.object({
        path: z.string().describe("The exact path of the markdown file, e.g., 'folder/file.md'"),
        content: z.string().describe("The markdown content to append")
    }),
    func: async ({ path, content }) => {
        try {
            const normalizedPath = path.endsWith('.md') ? path : `${path}.md`;
            const file = app.vault.getAbstractFileByPath(normalizedPath);
            if (!file) return `Error: File not found at: ${normalizedPath}`;
            if (!(file instanceof TFile)) return `Error: Path ${normalizedPath} is not a valid file.`;
            const existing = await app.vault.read(file);
            await app.vault.modify(file, existing + (existing.endsWith('\n') ? '' : '\n') + content);
            return `Successfully appended to: ${normalizedPath}`;
        } catch (error) {
            return `Error appending to file: ${(error as Error).message}`;
        }
    }
});

export const obsidianTools = [readMarkdownTool, writeMarkdownTool, appendMarkdownTool];