import { Notice, TFile } from 'obsidian';
import GraphideaPlugin from '../main';
import { deepResearch, stopDeepResearch } from 'backend/agents/deep-research';
import { IDEA_MD_TEMPLATE } from 'backend/utils/helper';
import { ChromaClient } from 'chromadb-client';
import { injectBacklinks } from 'backend/vector-db/back-link';

const LOADING_BAR_BLOCK = `<div style="text-align:center;">\n<i>Agent in progress...</i>\n<progress value="100" max="100" style="width:100%; height:6px; accent-color:var(--color-accent);"></progress>\n</div>\n`;

async function injectLoadingBar(plugin: GraphideaPlugin, file: TFile) {
    const content = await plugin.app.vault.read(file);
    if (!content.startsWith(LOADING_BAR_BLOCK)) {
        await plugin.app.vault.modify(file, LOADING_BAR_BLOCK + content);
    }
}

export async function removeLoadingBar(plugin: GraphideaPlugin, file: TFile) {
    const content = await plugin.app.vault.read(file);
    if (content.startsWith(LOADING_BAR_BLOCK)) {
        await plugin.app.vault.modify(file, content.slice(LOADING_BAR_BLOCK.length));
    }
}

export function registerCommands(plugin: GraphideaPlugin) {
    plugin.addCommand({
        id: 'start-deep-research',
        name: 'Start Deep Research',
        callback: async () => {
            const file = plugin.app.vault.getFiles().find((f: TFile) => f.name === 'IDEA.md');
            if (!file) {
                new Notice('IDEA.md not found in the vault.');
                return;
            }
            const idea = await plugin.app.vault.read(file);
            if (!idea.trim()) {
                new Notice('IDEA.md is empty.');
                return;
            }

            new Notice('Starting Deep Research...');
            await injectLoadingBar(plugin, file);

            try {
                const cleansedIdea = idea.replace(IDEA_MD_TEMPLATE, '');
                await deepResearch(plugin.app, cleansedIdea, plugin.settings);
                new Notice('Deep Research finished.');
            } catch (error) {
                new Notice('Deep Research encountered an error.');
                console.error(error);
            } finally {
                await removeLoadingBar(plugin, file);
            }
        }
    });

    plugin.addCommand({
        id: 'stop-deep-agent',
        name: 'Stop Execution',
        callback: async () => {
            new Notice('Stopping Deep Agent...');
            stopDeepResearch();
            const file = plugin.app.vault.getFiles().find((f: TFile) => f.name === 'IDEA.md');
            if (file) {
                await removeLoadingBar(plugin, file);
            }
        }
    });
        plugin.addCommand({
        id: 'inject-backlinks',
        name: 'Inject Backlinks',
        callback: async () => {
            const file = plugin.app.workspace.getActiveFile();
            if (!file) {
                new Notice('No active file. Please open a note first.');
                return;
            }
 
            new Notice('Injecting backlinks...');
 
            try {
                const client = new ChromaClient();
                const content = await plugin.app.vault.read(file);
                const updatedContent = await injectBacklinks(client, content, file.name);
 
                if (updatedContent === content) {
                    new Notice('No relevant backlinks found.');
                    return;
                }
 
                await plugin.app.vault.modify(file, updatedContent);
                new Notice('Backlinks injected successfully.');
            } catch (error) {
                new Notice('Failed to inject backlinks.');
                console.error(error);
            }
        }
    });
}
 
