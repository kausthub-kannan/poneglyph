import { Plugin, WorkspaceLeaf } from 'obsidian';
import { GraphQueryModal } from 'components/graph-query-modal';
import { GraphQuerySettings, DEFAULT_SETTINGS, GraphQuerySettingTab } from './settings';
import { deepResearch, stopDeepResearch } from 'backend/deep-research';
import { injectGraphColors } from 'backend/utils/tags';
import { loadSkills } from 'backend/utils/load-skills';


export default class GraphQueryPlugin extends Plugin {
    settings: GraphQuerySettings;

    async onload() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.app.workspace.onLayoutReady(() => injectGraphColors(this.app.vault));
        this.addSettingTab(new GraphQuerySettingTab(this.app, this));
        this.app.workspace.onLayoutReady(async () => {
            this.injectButtonIntoGraphLeaves();
        });

        this.registerEvent(
            this.app.workspace.on('active-leaf-change', async (leaf: WorkspaceLeaf | null) => {
                if (leaf && leaf.getViewState().type === 'graph') {
                    this.injectButtonIntoGraphLeaves();
                }
            })
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    injectButtonIntoGraphLeaves() {
        const graphLeaves = this.app.workspace.getLeavesOfType('graph');

        graphLeaves.forEach((leaf) => {
            const container = leaf.view.containerEl;
            if (container.querySelector('.custom-graph-query-btn')) return;

            // Create the button element
            const button = container.createEl('button', {
                text: 'Search Graph',
                cls: 'custom-graph-query-btn mod-cta' // 'mod-cta' applies Obsidian's accent color theme
            });

            const stopButton = container.createEl('button', {
                text: 'Stop',
                cls: 'custom-graph-query-btn mod-cta'
            });

            // Style the button to float over the graph canvas
            Object.assign(button.style, {
                position: 'absolute',
                bottom: '30px',
                right: '30px',
                zIndex: '100',
                boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
            });

            Object.assign(stopButton.style, {
                position: 'absolute',
                bottom: '30px',
                right: '30px',
                zIndex: '100',
                boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
            }); 

            // Bind the click event to open your modal
            button.addEventListener('click', () => {
                new GraphQueryModal(this.app, (query) => {
                    this.executeGraphQuery(query);
                }).open();
            });

            stopButton.addEventListener('click', async () => {
                stopDeepResearch();
            }); 
        });
    }

    // The function triggered when "Enter" is pressed in the modal
    async executeGraphQuery(query: string) {
        if (!query.trim()) {
            console.log("Empty query submitted.");
            return;
        }

        console.log(`[Plugin Log] Executing query against graph context: ${query}`);
        deepResearch(this.app, query, this.settings)
    }

    onunload() {
        // Clean up DOM injections to prevent memory leaks or ghost UI elements
        document.querySelectorAll('.custom-graph-query-btn').forEach(button => {
            button.remove();
        });
    }
}