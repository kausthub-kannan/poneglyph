import { App, TFile } from 'obsidian';
import { getModel } from 'backend/utils/model-provider';
import { systemPrompt, userPrompt } from 'backend/prompts/idea-creation';
import { GraphQuerySettings } from 'settings';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

const EXTRACT_IDEA_TAG = 'extract-idea';
const MAX_PARENT_DEPTH = 3;

// ──────────────────────────────────────────────────────────────────────────────
// Obsidian note parsing helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Reads all files from the vault that carry the `extract-idea` tag.
 * Tags are matched both in frontmatter (`tags: [extract-idea]` / `tags:\n  - extract-idea`)
 * and as inline Obsidian tags (`#extract-idea`).
 */
export function getExtractIdeaFiles(app: App): TFile[] {
    return app.vault.getMarkdownFiles().filter(file => {
        const cache = app.metadataCache.getFileCache(file);
        if (!cache) return false;

        // Frontmatter tags
        const fmTags: string[] = cache.frontmatter?.tags ?? [];
        const normalizedFmTags = (Array.isArray(fmTags) ? fmTags : [fmTags])
            .map((t: string) => t.toLowerCase().trim());
        if (normalizedFmTags.includes(EXTRACT_IDEA_TAG)) return true;

        // Inline tags in the body
        const inlineTags = (cache.tags ?? []).map(t => t.tag.replace('#', '').toLowerCase().trim());
        return inlineTags.includes(EXTRACT_IDEA_TAG);
    });
}

/**
 * Extracts wikilinks from the "Related Notes" section at the bottom of a markdown file.
 * Looks for a heading called "Related Notes" (case-insensitive) and collects all
 * [[WikiLink]] references that follow it.
 */
function extractRelatedNoteLinks(content: string): string[] {
    const lines = content.split('\n');
    let inRelatedSection = false;
    const links: string[] = [];

    for (const line of lines) {
        if (/^#{1,6}\s+related\s+notes/i.test(line)) {
            inRelatedSection = true;
            continue;
        }
        // Stop if we hit another heading
        if (inRelatedSection && /^#{1,6}\s+/.test(line) && !/^#{1,6}\s+related\s+notes/i.test(line)) {
            break;
        }
        if (inRelatedSection) {
            const matches = line.matchAll(/\[\[([^\]|#]+?)(?:\|[^\]]+)?\]\]/g);
            for (const m of matches) {
                if (m[1]) links.push(m[1].trim());
            }
        }
    }

    return links;
}

/**
 * Resolves a wikilink name to a TFile in the vault.
 * Tries exact path match first, then basename match.
 */
function resolveWikiLink(app: App, linkName: string): TFile | null {
    // Try as a full path
    const byPath = app.vault.getAbstractFileByPath(linkName.endsWith('.md') ? linkName : `${linkName}.md`);
    if (byPath instanceof TFile) return byPath;

    // Fall back to basename match
    return app.vault.getMarkdownFiles().find(f => f.basename === linkName) ?? null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Parent traversal
// ──────────────────────────────────────────────────────────────────────────────

interface NoteContext {
    title: string;
    content: string;
}

/**
 * Given a primary extract-idea file, collects its content and traverses the
 * "Related Notes" section up to MAX_PARENT_DEPTH levels.
 * Returns the primary note context and an array of parent note contexts.
 */
async function collectNoteContext(
    app: App,
    primaryFile: TFile
): Promise<{ primary: NoteContext; parents: NoteContext[] }> {
    const primaryContent = await app.vault.read(primaryFile);
    const primary: NoteContext = { title: primaryFile.basename, content: primaryContent };

    const parents: NoteContext[] = [];
    const visited = new Set<string>([primaryFile.path]);
    const queue: { file: TFile; depth: number }[] = [{ file: primaryFile, depth: 0 }];

    while (queue.length > 0) {
        const { file, depth } = queue.shift()!;
        if (depth >= MAX_PARENT_DEPTH) continue;

        const content = depth === 0 ? primaryContent : await app.vault.read(file);
        const linkNames = extractRelatedNoteLinks(content);

        for (const linkName of linkNames) {
            const resolved = resolveWikiLink(app, linkName);
            if (!resolved || visited.has(resolved.path)) continue;

            visited.add(resolved.path);
            const parentContent = await app.vault.read(resolved);
            parents.push({ title: resolved.basename, content: parentContent });
            queue.push({ file: resolved, depth: depth + 1 });
        }
    }

    return { primary, parents };
}

// ──────────────────────────────────────────────────────────────────────────────
// LLM call
// ──────────────────────────────────────────────────────────────────────────────

async function generateIdeaForNote(
    primary: NoteContext,
    parents: NoteContext[],
    settings: GraphQuerySettings
): Promise<string> {
    const model = getModel(settings, 0.4);

    const parentNotesSerialized = parents.length > 0
        ? parents.map((p, i) =>
            `### Parent Note ${i + 1}: ${p.title}\n\n${p.content}`
        ).join('\n\n---\n\n')
        : '_No parent notes found._';

    const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(
            userPrompt
                .replace('{{primaryTitle}}', primary.title)
                .replace('{{primaryContent}}', primary.content)
                .replace('{{parentNotes}}', parentNotesSerialized)
        ),
    ];

    const response = await model.invoke(messages);
    return typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
}

// ──────────────────────────────────────────────────────────────────────────────
// THESIS.md builder
// ──────────────────────────────────────────────────────────────────────────────

interface IdeaResult {
    primaryTitle: string;
    parentTitles: string[];
    llmOutput: string;
}

function buildThesisMarkdown(results: IdeaResult[]): string {
    const header = `---
title: Research Thesis
created: ${new Date().toISOString().slice(0, 10)}
---

# Research Thesis

> This document was auto-generated by Poneglyph's Idea Creation pipeline.
> Each section corresponds to one \`extract-idea\` note and its related parent notes.

---

`;

    const sections = results.map((r, i) => {
        const parentList = r.parentTitles.length > 0
            ? r.parentTitles.map(t => `- [[${t}]]`).join('\n')
            : '_None_';

        return `## ${i + 1}. ${r.primaryTitle}

**Source Note**: [[${r.primaryTitle}]]

**Related Context**:
${parentList}

${r.llmOutput}

---
`;
    });

    return header + sections.join('\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// Main exported function
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Orchestrates the full idea-creation pipeline:
 * 1. Finds all `extract-idea` tagged notes.
 * 2. For each, collects the note + its parent notes (up to 3 levels via Related Notes).
 * 3. Runs a focused LLM call to identify the research gap and propose a thesis.
 * 4. Writes THESIS.md with all results.
 *
 * @param app      - Obsidian App instance
 * @param settings - Plugin settings (model config)
 * @param onProgress - Optional callback called after each note is processed (index, total, title)
 */
export async function createIdeas(
    app: App,
    settings: GraphQuerySettings,
    onProgress?: (index: number, total: number, title: string) => void
): Promise<void> {
    const extractIdeaFiles = getExtractIdeaFiles(app);

    if (extractIdeaFiles.length === 0) {
        throw new Error("No notes with the 'extract-idea' tag found in the vault.");
    }

    console.log(`[IDEA-CREATION] Found ${extractIdeaFiles.length} extract-idea note(s).`);

    const results: IdeaResult[] = [];

    for (let i = 0; i < extractIdeaFiles.length; i++) {
        const file = extractIdeaFiles[i];
        if (!file) continue;
        
        console.log(`[IDEA-CREATION] Processing (${i + 1}/${extractIdeaFiles.length}): ${file.basename}`);

        onProgress?.(i + 1, extractIdeaFiles.length, file.basename);

        const { primary, parents } = await collectNoteContext(app, file);

        const llmOutput = await generateIdeaForNote(primary, parents, settings);

        results.push({
            primaryTitle: primary.title,
            parentTitles: parents.map(p => p.title),
            llmOutput,
        });

        console.log(`[IDEA-CREATION] Done: ${file.basename}`);
    }

    // Write THESIS.md
    const thesisContent = buildThesisMarkdown(results);
    const thesisPath = 'THESIS.md';

    const existingFile = app.vault.getAbstractFileByPath(thesisPath);
    if (existingFile instanceof TFile) {
        await app.vault.modify(existingFile, thesisContent);
        console.log('[IDEA-CREATION] THESIS.md updated.');
    } else {
        await app.vault.create(thesisPath, thesisContent);
        console.log('[IDEA-CREATION] THESIS.md created.');
    }
}
