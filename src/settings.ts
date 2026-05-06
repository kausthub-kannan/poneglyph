import { App, PluginSettingTab, Setting } from 'obsidian';
import type GraphQueryPlugin from './main';

export interface GraphQuerySettings {
  modelProvider: string;
  modelAPIKey: string;
  modelID: string;
  maxDepth: number;
  email: string;
}

export const DEFAULT_SETTINGS: GraphQuerySettings = {
  modelProvider: process.env.MODEL_PROVIDER || '',
  modelAPIKey: process.env.MODEL_API_KEY || '',
  modelID: process.env.MODEL_ID || '',
  maxDepth: process.env.MAX_DEPTH ? parseInt(process.env.MAX_DEPTH, 10) : 3,
  email: process.env.EMAIL || '',
};

export class GraphQuerySettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: GraphQueryPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Poneglyph Settings' });

    new Setting(containerEl)
      .setName('Model Provider')
      .setDesc('Choose one of the supported model providers')
      .addText(text => text
        .setValue(this.plugin.settings.modelProvider)
        .onChange(async (v: string) => {
          this.plugin.settings.modelProvider = v.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('API KEY')
      .setDesc('API Key corresponding to Model Provider')
      .addText(text => text
        .setValue(this.plugin.settings.modelAPIKey)
        .setPlaceholder('sk-...')
        .onChange(async (v: string) => {
          this.plugin.settings.modelAPIKey = v.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('ModelID')
      .setDesc('ID of the Model which needs to be used (often obtained from the provider docs)')
      .addText(text => text
        .setValue(this.plugin.settings.modelID)
        .onChange(async (v: string) => {
          this.plugin.settings.modelID = v.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Max auto-expand depth')
      .setDesc('Hard limit for recursive auto-generation (recommended: 3)')
      .addSlider(slider => slider
        .setLimits(1, 10, 1)
        .setValue(this.plugin.settings.maxDepth)
        .setDynamicTooltip()
        .onChange(async (v: number) => {
          this.plugin.settings.maxDepth = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Unpaywall Email')
      .setDesc('Email address required by the Unpaywall API for fetching open access papers.')
      .addText(text => text
        .setValue(this.plugin.settings.email)
        .setPlaceholder('user@example.com')
        .onChange(async (v: string) => {
          this.plugin.settings.email = v.trim();
          await this.plugin.saveSettings();
        })
      );
  }
}