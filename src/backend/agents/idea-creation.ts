import { App, TFile } from 'obsidian';
import { getModel } from 'backend/utils/model-provider';
import { systemPrompt, userPrompt } from 'backend/prompts/idea-creation';
import { GraphQuerySettings } from 'settings';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { 
    getExtractIdeaFiles, 
    collectNoteContext, 
    buildThesisMarkdown
} from 'backend/utils/helper';
import { IdeaResult, NoteContext } from 'types';

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

export async function createIdeas(
    app: App,
    settings: GraphQuerySettings,
    onProgress?: (index: number, total: number, title: string) => void
): Promise<void> {
    const extractIdeaFiles = getExtractIdeaFiles(app);

    if (extractIdeaFiles.length === 0) {
        throw new Error("No notes with the 'extract-idea' tag found in the vault.");
    }

    const results: IdeaResult[] = [];

    for (let i = 0; i < extractIdeaFiles.length; i++) {
        const file = extractIdeaFiles[i];
        if (!file) continue;

        onProgress?.(i + 1, extractIdeaFiles.length, file.basename);

        const { primary, parents } = await collectNoteContext(app, file);

        const llmOutput = await generateIdeaForNote(primary, parents, settings);

        results.push({
            primaryTitle: primary.title,
            parentTitles: parents.map(p => p.title),
            llmOutput,
        });
    }

    const thesisContent = buildThesisMarkdown(results);
    const thesisPath = 'THESIS.md';

    const existingFile = app.vault.getAbstractFileByPath(thesisPath);
    if (existingFile instanceof TFile) {
        await app.vault.modify(existingFile, thesisContent);
    } else {
        await app.vault.create(thesisPath, thesisContent);
    }
}
