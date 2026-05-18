import { Plugin, TFile } from 'obsidian';
import { GraphQuerySettings, DEFAULT_SETTINGS, GraphQuerySettingTab } from './settings';
import { configureGraphSettings } from 'backend/utils/tags';
import { registerCommands, removeLoadingBar } from './components/cli';
import { stopDeepResearch } from './backend/agents/poneglyph';
import { setupFileExplorerIcons } from './components/file-explorer';
import { setupMarkdowns } from 'backend/utils/helper';
import { drainOfflineQueue, onFileCreated, onFileDeleted, onFileModified } from 'backend/vector-db/file-listeners';
import { indexVault } from 'backend/vector-db/auto-index';

// Add this to see the exact request being mad

export default class GraphQueryPlugin extends Plugin {
    settings: GraphQuerySettings;
    agentStatusBarItem: HTMLElement;

    async onload() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.app.workspace.onLayoutReady(() => configureGraphSettings(this.app.vault));
        this.addSettingTab(new GraphQuerySettingTab(this.app, this));
        setupMarkdowns(this.app);
        
        this.agentStatusBarItem = this.addStatusBarItem();
        this.agentStatusBarItem.setText('𓂀');
        this.agentStatusBarItem.style.color = 'var(--color-green, green)';
        this.agentStatusBarItem.style.fontWeight = 'bold';
        this.agentStatusBarItem.setAttribute('aria-label', 'Agent Idle');

        registerCommands(this);
        setupFileExplorerIcons(this);

        this.agentStatusBarItem.style.color = 'var(--color-yellow, #ffbf00)';
        this.agentStatusBarItem.setAttribute('aria-label', 'Indexing Files ....');
        await drainOfflineQueue(this.app.vault);
        await indexVault(this.app.vault);

        this.registerEvent(this.app.vault.on('create', (file) => {
            if (file instanceof TFile && file.extension === 'md')
                onFileCreated(file, this.app.vault);
        }));
        this.registerEvent(this.app.vault.on('delete', (file) => {
            if (file instanceof TFile) onFileDeleted(file);
        }));
        this.registerEvent(this.app.vault.on('modify', (file) => {
            if (file instanceof TFile && file.extension === 'md')
                onFileModified(file, this.app.vault);
        }));
        this.agentStatusBarItem.style.color = 'var(--color-green, green)';
        this.agentStatusBarItem.setAttribute('aria-label', 'Agent Idle');
    }

    onunload() {
        stopDeepResearch();
        const file = this.app.vault.getFiles().find((f: TFile) => f.name === 'IDEA.md');
        if (file) {
            removeLoadingBar(this, file);
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}