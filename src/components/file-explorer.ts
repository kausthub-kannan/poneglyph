import { Plugin, TFile, addIcon, setIcon } from 'obsidian';

const TARGET_FILES = ['IDEA', 'TEMP', 'SOURCES', 'THESIS'];

export function setupFileExplorerIcons(plugin: Plugin) {
    addIcon('poneglyph-symbol', `<text x="50" y="80" font-size="80" text-anchor="middle" fill="var(--color-accent)" font-weight="900">𓂀</text>`);

    const updateIcons = () => {
        const fileExplorers = plugin.app.workspace.getLeavesOfType('file-explorer');
        for (const leaf of fileExplorers) {
            // @ts-ignore
            const fileItems = leaf.view.fileItems;
            if (!fileItems) continue;

            for (const path in fileItems) {
                const item = fileItems[path];
                const file = item?.file;

                if (
                    file instanceof TFile &&
                    file.extension === 'md' &&
                    TARGET_FILES.includes(file.basename)
                ) {
                    addIconToItem(item);
                } else {
                    removeIconFromItem(item);
                }
            }
        }
    };

    plugin.registerEvent(plugin.app.workspace.on('layout-change', updateIcons));
    plugin.registerEvent(plugin.app.vault.on('rename', updateIcons));
    plugin.registerEvent(plugin.app.vault.on('create', updateIcons));
    plugin.registerEvent(plugin.app.vault.on('delete', updateIcons));

    plugin.app.workspace.onLayoutReady(() => updateIcons());
}

function addIconToItem(item: any) {
    const selfEl = item.selfEl as HTMLElement | undefined;
    const innerEl = item.innerEl as HTMLElement | undefined;
    if (!selfEl || !innerEl) return;

    if (selfEl.querySelector('.poneglyph-file-icon')) return;

    const iconEl = document.createElement('span');
    iconEl.addClass('poneglyph-file-icon');
    setIcon(iconEl, 'poneglyph-symbol');
    innerEl.insertAdjacentElement('beforebegin', iconEl);
}

function removeIconFromItem(item: any) {
    const selfEl = item.selfEl as HTMLElement | undefined;
    selfEl?.querySelector('.poneglyph-file-icon')?.remove();
}