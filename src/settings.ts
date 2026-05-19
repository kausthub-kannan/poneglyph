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
  maxDepth: 3, // Fixed — not user-configurable
  email: process.env.EMAIL || '',
};

export class GraphQuerySettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: GraphQueryPlugin) {
    super(app, plugin);
  }

  private createSectionHeader(
    containerEl: HTMLElement,
    title: string,
    description: string,
  ) {
    const wrapper = containerEl.createDiv({ cls: 'pg-section' });
    wrapper.createEl('h3', { text: title, cls: 'pg-section-title' });
    wrapper.createEl('p', { text: description, cls: 'pg-section-desc' });
    return wrapper;
  }

  private createDivider(containerEl: HTMLElement) {
    containerEl.createEl('hr', { cls: 'pg-divider' });
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('pg-settings');

    // ── Banner ────────────────────────────────────────────────────────────────
    const banner = containerEl.createDiv({ cls: 'pg-banner' });
    const bannerLeft = banner.createDiv({ cls: 'pg-banner-left' });
    bannerLeft.createEl('div', { cls: 'pg-banner-glyph', text: '𓂀' });
    const bannerText = bannerLeft.createDiv({ cls: 'pg-banner-text' });
    bannerText.createEl('h2', { text: 'Poneglyph' });
    bannerText.createEl('p', { text: 'A living knowledge graph — you steer, AI does the digging.' });
    banner.createDiv({ cls: 'pg-banner-deco' });

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


    // Dynamic model hints
    const provider = this.plugin.settings.modelProvider;
    const modelHints: Record<string, { hint: string; docsUrl: string }> = {
      openai:    { hint: 'e.g. gpt-4o, gpt-4-turbo',        docsUrl: 'https://platform.openai.com/docs/models' },
      anthropic: { hint: 'e.g. claude-sonnet-4-20250514',   docsUrl: 'https://docs.anthropic.com/en/docs/models-overview' },
      gemini:    { hint: 'e.g. gemini-2.0-flash',           docsUrl: 'https://ai.google.dev/gemini-api/docs/models' },
      groq:      { hint: 'e.g. llama-3.3-70b-versatile',    docsUrl: 'https://console.groq.com/docs/models' },
      mistral:   { hint: 'e.g. mistral-large-latest',       docsUrl: 'https://docs.mistral.ai/getting-started/models/' },
    };
    const providerInfo = modelHints[provider.toLowerCase()];

    // API Key
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
        text.inputEl.addClass('pg-api-key-input');
        return text;
      })
      .addExtraButton(btn => {
        btn
          .setIcon('eye')
          .setTooltip('Show / hide key')
          .onClick(() => {
            const input = containerEl.querySelector('.pg-api-key-input') as HTMLInputElement;
            if (!input) return;
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            btn.setIcon(isHidden ? 'eye-off' : 'eye');
          });
      });

    if (providerInfo) {
      const descFrag = document.createDocumentFragment();
      descFrag.append('Your secret API key for the selected provider. ');
      const link = descFrag.createEl('a', { text: 'View docs', href: providerInfo.docsUrl });
      link.setAttr('target', '_blank');
      apiKeySetting.descEl.empty();
      apiKeySetting.descEl.appendChild(descFrag);
    }

    // Model ID
    const modelIDSetting = new Setting(containerEl)
      .setName('Model ID')
      .setDesc("The exact model identifier to use. Find this in your provider's documentation.")
      .addText(text => {
        text
          .setValue(this.plugin.settings.modelID)
          .onChange(async (v: string) => {
            this.plugin.settings.modelID = v.trim();
            await this.plugin.saveSettings();
          });
        if (providerInfo) text.setPlaceholder(providerInfo.hint);
        return text;
      });

    if (providerInfo) {
      const frag = document.createDocumentFragment();
      frag.append(`Hint: ${providerInfo.hint}. `);
      const link = frag.createEl('a', { text: 'Browse models', href: providerInfo.docsUrl });
      link.setAttr('target', '_blank');
      modelIDSetting.descEl.empty();
      modelIDSetting.descEl.appendChild(frag);
    }

    // ── Section 2: Research APIs ──────────────────────────────────────────────
    this.createDivider(containerEl);
    this.createSectionHeader(
      containerEl,
      'Research APIs',
      'Credentials for third-party APIs used during paper discovery.',
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

    // ── Footer ────────────────────────────────────────────────────────────────
    this.createDivider(containerEl);
    const footer = containerEl.createDiv({ cls: 'pg-footer' });
    footer.createEl('span', { text: 'Poneglyph' });

    this.injectStyles();
  }

  private injectStyles() {
    const id = 'pg-settings-styles';
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      /* ── Root ─────────────────────────────────────────────── */
      .pg-settings {
        --pg-accent-soft:  color-mix(in srgb, var(--pg-accent) 12%, transparent);
        --pg-border:       var(--color-base-35, rgba(128,128,128,.18));
        --pg-bg-card:      var(--color-base-20, rgba(0,0,0,.06));
        --pg-radius:       10px;
        --pg-font-mono:    var(--font-monospace, 'JetBrains Mono', monospace);
        font-family: var(--font-interface);
      }

      /* ── Banner ────────────────────────────────────────────── */
      .pg-banner {
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 22px 28px;
        margin-bottom: 32px;
        border-radius: 14px;
        background: linear-gradient(
          130deg,
          var(--color-base-25, rgba(0,0,0,.08)) 0%,
          var(--color-base-30, rgba(0,0,0,.12)) 100%
        );
        border: 1px solid var(--pg-border);
      }
      .pg-banner-left {
        display: flex;
        align-items: center;
        gap: 18px;
        z-index: 1;
      }
      .pg-banner-glyph {
        font-size: 2.8rem;
        line-height: 1;
        flex-shrink: 0;
        filter: drop-shadow(0 0 12px var(--pg-accent-soft));
      }
      .pg-banner-text h2 {
        margin: 0 0 4px;
        padding: 0 !important;
        font-size: 1.3rem;
        font-weight: 700;
        color: var(--text-normal);
        letter-spacing: -.01em;
      }
      .pg-banner-text p {
        margin: 0;
        font-size: 0.83rem;
        color: var(--text-muted);
      }
      /* Decorative geometric accent */
      .pg-banner-deco {
        position: absolute;
        right: -20px;
        top: -20px;
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: radial-gradient(circle, var(--pg-accent-soft) 0%, transparent 70%);
        pointer-events: none;
      }

      /* ── Section Headers ────────────────────────────────────── */
      .pg-section {
        margin: 10px 0 6px;
      }
      .pg-section-title {
        font-size: 0.73rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--pg-accent);
        margin: 0 0 3px;
        padding: 0 !important;
      }
      .pg-section-desc {
        font-size: 0.81rem;
        color: var(--text-muted);
        margin: 0 0 10px 0;
      }

      /* ── Setting rows ────────────────────────────────────────── */
      .pg-settings .setting-item {
        border: 1px solid transparent;
        border-radius: var(--pg-radius);
        padding: 12px 14px;
        margin-bottom: 6px;
        transition: background 0.15s, border-color 0.15s;
      }
      .pg-settings .setting-item:hover {
        background: var(--pg-bg-card);
        border-color: var(--pg-border);
      }
      .pg-settings .setting-item-name {
        font-size: 0.88rem;
        font-weight: 600;
        color: var(--text-normal);
      }
      .pg-settings .setting-item-description {
        font-size: 0.79rem;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .pg-settings .setting-item-description a {
        color: var(--pg-accent);
        text-decoration: none;
        border-bottom: 1px dotted var(--pg-accent);
        padding-bottom: 1px;
        transition: opacity .15s;
      }
      .pg-settings .setting-item-description a:hover {
        opacity: .75;
      }

      /* ── Inputs ──────────────────────────────────────────────── */
      .pg-settings input[type="text"],
      .pg-settings input[type="password"] {
        border-radius: 7px;
        border: 1px solid var(--pg-border);
        background: var(--color-base-15, rgba(0,0,0,.04));
        transition: border-color .2s, box-shadow .2s;
        font-size: 0.84rem;
        padding: 5px 10px;
      }
      .pg-settings input[type="text"]:focus,
      .pg-settings input[type="password"]:focus {
        border-color: var(--pg-accent);
        box-shadow: 0 0 0 3px var(--pg-accent-soft);
        outline: none;
      }
      .pg-api-key-input {
        font-family: var(--pg-font-mono);
        font-size: 0.8rem !important;
        letter-spacing: 0.04em;
      }

      /* ── Dropdown ────────────────────────────────────────────── */
      .pg-settings select {
        border-radius: 7px;
        border: 1px solid var(--pg-border);
        background-color: var(--color-base-15, rgba(0,0,0,.04));
        background-repeat: no-repeat;
        background-position: right 8px center;
        font-size: 0.84rem;
        padding: 5px 28px 5px 10px;
        min-width: 140px;
        transition: border-color .2s, box-shadow .2s;
        appearance: none;
      }
      .pg-settings select:focus {
        border-color: var(--pg-accent);
        box-shadow: 0 0 0 3px var(--pg-accent-soft);
        outline: none;
      }

      /* ── Divider ─────────────────────────────────────────────── */
      .pg-divider {
        border: none;
        border-top: 1px solid var(--pg-border);
        margin: 24px 0 20px;
      }

      /* ── Footer ──────────────────────────────────────────────── */
      .pg-footer {
        padding: 12px 0 4px;
        text-align: center;
        font-size: 0.74rem;
        color: var(--text-faint);
        letter-spacing: 0.04em;
      }
    `;
    document.head.appendChild(style);
  }
}