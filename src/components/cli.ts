import { Notice, TFile } from 'obsidian';
import GraphideaPlugin from '../main';
import { deepResearch, stopDeepResearch } from 'backend/agents/poneglyph';
import { ChromaClient } from 'chromadb-client';
import { injectBacklinks } from 'backend/vector-db/back-link';
import { createIdeas } from 'backend/agents/idea-creation';
import { IDEA_MD_TEMPLATE, LOADING_BAR_BLOCK } from 'backend/utils/templates';
import { validateServers } from 'backend/utils/server-check';

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

async function validateSettings(plugin: GraphideaPlugin): Promise<boolean> {
    const { modelProvider, modelAPIKey, modelID, email } = plugin.settings;
    if (!modelProvider || !modelAPIKey || !modelID || !email) {
        new Notice('Please fill in all missing values in the settings.');
        return false;
    }
    const serversRunning = await validateServers();
    if (!serversRunning) {
        return false;
    }
    return true;
}

export function registerCommands(plugin: GraphideaPlugin) {
    plugin.addCommand({
        id: 'start-deep-research',
        name: 'Start Deep Research',
        callback: async () => {
            if (!(await validateSettings(plugin))) return;
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
            plugin.agentStatusBarItem.style.color = 'var(--color-yellow, #ffbf00)';
            plugin.agentStatusBarItem.setAttribute('aria-label', 'Agent in Progress');

            try {
                const cleansedIdea = idea.replace(IDEA_MD_TEMPLATE, '');
                await deepResearch(plugin.app, cleansedIdea, plugin.settings);
                new Notice('Deep Research finished.');
            } catch (error) {
                new Notice(error instanceof Error ? error.message : String(error));
            } finally {
                await removeLoadingBar(plugin, file);
                plugin.agentStatusBarItem.style.color = 'var(--color-green, green)';
                plugin.agentStatusBarItem.setAttribute('aria-label', 'Agent Idle');
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
            plugin.agentStatusBarItem.style.color = 'var(--color-green, green)';
            plugin.agentStatusBarItem.setAttribute('aria-label', 'Agent Idle');
        }
    });
    plugin.addCommand({
        id: 'inject-backlinks',
        name: 'Inject Backlinks',
        callback: async () => {
            if (!(await validateSettings(plugin))) return;
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
            } catch {
                new Notice('Failed to inject backlinks.');
            }
        }
    });

    plugin.addCommand({
        id: 'start-idea-creation',
        name: 'Generate Thesis',
        callback: async () => {
            if (!(await validateSettings(plugin))) return;
            new Notice('Starting Idea Creation...');
            plugin.agentStatusBarItem.style.color = 'var(--color-yellow, #ffbf00)';
            plugin.agentStatusBarItem.setAttribute('aria-label', 'Agent in Progress');

            try {
                await createIdeas(plugin.app, plugin.settings, (index, total, title) => {
                    new Notice(`Processing Idea (${index}/${total}): ${title}`);
                });
                new Notice('Idea Creation finished. Check THESIS.md');
            } catch (error) {
                new Notice(error instanceof Error ? error.message : String(error));
            } finally {
                plugin.agentStatusBarItem.style.color = 'var(--color-green, green)';
                plugin.agentStatusBarItem.setAttribute('aria-label', 'Agent Idle');
            }
        }
    });
}

