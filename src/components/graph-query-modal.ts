import { App, Modal, Setting } from 'obsidian';

export class GraphQueryModal extends Modal {
    query: string = '';
    onSubmit: (result: string) => void;

    constructor(app: App, onSubmit: (result: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        this.titleEl.setText('New Research Query');
        contentEl.empty();

        const descEl = contentEl.createEl('p');
        descEl.setText('Enter the query you want to run against your knowledge graph.');
        descEl.style.marginBottom = '1.5rem';
        descEl.style.color = 'var(--text-muted)';

        // Input Field using Obsidian's Setting API
        const querySetting = new Setting(contentEl)
            .setName('Research Query')
            .addText((text) => {
                text.setPlaceholder('e.g., How do neural networks work?');
                
                // Track value changes
                text.onChange((value) => {
                    this.query = value;
                });

                // Listen for the Enter key on the specific input element
                text.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                        e.preventDefault(); // Prevent accidental form submissions if wrapped
                        this.submit();
                    }
                });
                
                // Auto-focus the input so user can start typing immediately
                setTimeout(() => text.inputEl.focus(), 50);
            });

        // Make the text input take up the remaining width for better UX
        querySetting.controlEl.style.flex = '1';
        const inputEl = querySetting.controlEl.querySelector('input');
        if (inputEl) {
            inputEl.style.width = '100%';
        }

        // Action Buttons
        new Setting(contentEl)
            .addButton((btn) => btn
                .setButtonText('Cancel')
                .onClick(() => {
                    this.close();
                }))
            .addButton((btn) => btn
                .setButtonText('Search')
                .setCta()
                .onClick(() => {
                    this.submit();
                }));
    }

    submit() {
        if (this.query.trim().length > 0) {
            this.onSubmit(this.query);
            this.close();
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}