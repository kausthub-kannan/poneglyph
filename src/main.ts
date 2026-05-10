import { Plugin, TFile } from 'obsidian';
import { GraphQuerySettings, DEFAULT_SETTINGS, GraphQuerySettingTab } from './settings';
import { configureGraphSettings } from 'backend/utils/tags';
import { registerCommands, removeLoadingBar } from './components/cli';
import { stopDeepResearch } from './backend/deep-research';
import { setupFileExplorerIcons } from './components/file-explorer';
import { setupMarkdowns } from 'backend/utils/helper';


export default class GraphQueryPlugin extends Plugin {
    settings: GraphQuerySettings;

    async onload() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.app.workspace.onLayoutReady(() => configureGraphSettings(this.app.vault));
        this.addSettingTab(new GraphQuerySettingTab(this.app, this));
        setupMarkdowns(this.app);
        registerCommands(this);
        setupFileExplorerIcons(this);
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