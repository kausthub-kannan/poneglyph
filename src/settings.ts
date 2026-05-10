import { App, PluginSettingTab, Setting } from 'obsidian';
import type GraphQueryPlugin from './main';
import { modelDirectory } from './backend/utils/model-provider';

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

  private createSectionHeader(containerEl: HTMLElement, title: string, description: string) {
    const wrapper = containerEl.createDiv({ cls: 'poneglyph-section' });
    wrapper.createEl('h3', { text: title, cls: 'poneglyph-section-title' });
    wrapper.createEl('p', { text: description, cls: 'poneglyph-section-desc' });
    return wrapper;
  }

  private createDivider(containerEl: HTMLElement) {
    containerEl.createEl('hr', { cls: 'poneglyph-divider' });
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('poneglyph-settings');

    // ── Banner ────────────────────────────────────────────────────────────────
    const banner = containerEl.createDiv({ cls: 'poneglyph-banner' });
    banner.createEl('div', { cls: 'poneglyph-banner-icon', text: '𓂀' });
    const bannerText = banner.createDiv({ cls: 'poneglyph-banner-text' });
    bannerText.createEl('h2', { text: 'Poneglyph' });
    bannerText.createEl('p', { text: 'A living knowledge graph — you steer, AI does the digging.' });

    // ── Section 1: Model Provider ─────────────────────────────────────────────
    this.createSectionHeader(
      containerEl,
      'Model Configuration',
      'Select your AI provider and enter the corresponding credentials.'
    );

    new Setting(containerEl)
      .setName('Provider')
      .setDesc('The LLM provider to use for query generation and graph expansion.')
      .addDropdown(dropdown => {
        Object.keys(modelDirectory).forEach(key => dropdown.addOption(key, key));
        dropdown
          .setValue(this.plugin.settings.modelProvider)
          .onChange(async (v: string) => {
            this.plugin.settings.modelProvider = v;
            await this.plugin.saveSettings();
            // Refresh to update model hint
            this.display();
          });
      });

    // Dynamic model hint based on selected provider
    const provider = this.plugin.settings.modelProvider;
    const modelHints: Record<string, { hint: string; docsUrl: string }> = {
      openai:    { hint: 'e.g. gpt-4o, gpt-4-turbo',             docsUrl: 'https://platform.openai.com/docs/models' },
      anthropic: { hint: 'e.g. claude-sonnet-4-20250514',        docsUrl: 'https://docs.anthropic.com/en/docs/models-overview' },
      gemini:    { hint: 'e.g. gemini-2.0-flash',                docsUrl: 'https://ai.google.dev/gemini-api/docs/models' },
      groq:      { hint: 'e.g. llama-3.3-70b-versatile',         docsUrl: 'https://console.groq.com/docs/models' },
      mistral:   { hint: 'e.g. mistral-large-latest',            docsUrl: 'https://docs.mistral.ai/getting-started/models/' },
    };
    const providerInfo = modelHints[provider.toLowerCase()];

    const apiKeySetting = new Setting(containerEl)
      .setName('API Key')
      .setDesc('Your secret API key for the selected provider.')
      .addText(text => {
        text
          .setValue(this.plugin.settings.modelAPIKey)
          .setPlaceholder('sk-...')
          .onChange(async (v: string) => {
            this.plugin.settings.modelAPIKey = v.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
        text.inputEl.addClass('poneglyph-api-key-input');
        return text;
      })
      .addExtraButton(btn => {
        btn
          .setIcon('eye')
          .setTooltip('Show / hide key')
          .onClick(() => {
            const input = containerEl.querySelector('.poneglyph-api-key-input') as HTMLInputElement;
            if (!input) return;
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            btn.setIcon(isHidden ? 'eye-off' : 'eye');
          });
      });

    if (providerInfo) {
      const descFrag = document.createDocumentFragment();
      descFrag.append('Your secret API key for the selected provider. ');
      const link = descFrag.createEl('a', {
        text: 'View API key docs ↗',
        href: providerInfo.docsUrl,
      });
      link.setAttr('target', '_blank');
      apiKeySetting.descEl.empty();
      apiKeySetting.descEl.appendChild(descFrag);
    }

    const modelIDSetting = new Setting(containerEl)
      .setName('Model ID')
      .setDesc('The exact model identifier to use. Find this in your provider\'s documentation.')
      .addText(text => {
        text
          .setValue(this.plugin.settings.modelID)
          .onChange(async (v: string) => {
            this.plugin.settings.modelID = v.trim();
            await this.plugin.saveSettings();
          });
        if (providerInfo) {
          text.setPlaceholder(providerInfo.hint);
        }
        return text;
      });

    if (providerInfo) {
      const frag = document.createDocumentFragment();
      frag.append(`Hint: ${providerInfo.hint}. `);
      const link = frag.createEl('a', { text: 'Browse models ↗', href: providerInfo.docsUrl });
      link.setAttr('target', '_blank');
      modelIDSetting.descEl.empty();
      modelIDSetting.descEl.appendChild(frag);
    }

    // ── Section 2: Graph Behaviour ────────────────────────────────────────────
    this.createDivider(containerEl);
    this.createSectionHeader(
      containerEl,
      'Graph Behaviour',
      'Control how deep and wide Poneglyph expands your knowledge graph.'
    );

    new Setting(containerEl)
      .setName('Max auto-expand depth')
      .setDesc('Hard recursion limit for auto-generation. Higher values yield richer graphs but cost more tokens.')
      .addSlider(slider => {
        const valueDisplay = createEl('span', {
          cls: 'poneglyph-slider-value',
          text: String(this.plugin.settings.maxDepth),
        });
        slider
          .setLimits(1, 10, 1)
          .setValue(this.plugin.settings.maxDepth)
          .setDynamicTooltip()
          .onChange(async (v: number) => {
            this.plugin.settings.maxDepth = v;
            valueDisplay.setText(String(v));
            await this.plugin.saveSettings();
          });
        slider.sliderEl.insertAdjacentElement('afterend', valueDisplay);
        return slider;
      });

    // ── Section 3: Research APIs ──────────────────────────────────────────────
    this.createDivider(containerEl);
    this.createSectionHeader(
      containerEl,
      'Research APIs',
      'Credentials for third-party APIs used during paper discovery.'
    );

    new Setting(containerEl)
      .setName('Unpaywall Email')
      .setDesc('Required by the Unpaywall API to fetch open-access papers. A real address is needed for their fair-use policy.')
      .addText(text => text
        .setValue(this.plugin.settings.email)
        .setPlaceholder('you@example.com')
        .onChange(async (v: string) => {
          this.plugin.settings.email = v.trim();
          await this.plugin.saveSettings();
        })
      );

    // ── Styles ────────────────────────────────────────────────────────────────
    this.injectStyles();
  }

  private injectStyles() {
    const id = 'poneglyph-settings-styles';
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      /* Banner */
      .poneglyph-banner {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px 24px;
        margin-bottom: 28px;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--color-base-25) 0%, var(--color-base-30) 100%);
        border: 1px solid var(--color-base-40);
      }
      .poneglyph-banner-icon {
        font-size: 2.4rem;
        line-height: 1;
        flex-shrink: 0;
      }
      .poneglyph-banner-text h2 {
        margin: 0 0 30px;
        padding: 0; !important
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-normal);
      }
      .poneglyph-banner-text p {
        margin: 0;
        font-size: 0.85rem;
        color: var(--text-muted);
      }

      /* Section headers */
      .poneglyph-section {
        margin: 8px 0 4px;
      }
      .poneglyph-section-title {
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-accent);
        margin: 0;
        padding: 0 !important ;
      }
      .poneglyph-section-desc {
        font-size: 0.82rem;
        color: var(--text-muted);
        margin: 0 0 10px;
      }

      /* Divider */
      .poneglyph-divider {
        border: none;
        border-top: 1px solid var(--color-base-35);
        margin: 22px 0 18px;
      }

      /* Slider value badge */
      .poneglyph-slider-value {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 22px;
        padding: 0 6px;
        margin-left: 10px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        background: var(--color-accent);
        color: var(--text-on-accent);
        vertical-align: middle;
      }

      /* API key full-width input */
      .poneglyph-api-key-input {
        font-family: var(--font-monospace);
        font-size: 0.82rem;
        letter-spacing: 0.03em;
      }
    `;
    document.head.appendChild(style);
  }
}