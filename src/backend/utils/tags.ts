import { Vault } from 'obsidian';

const FIXED_GROUPS = [
  { tag: "#draft",      hex: "eab308" }, // Yellow
  { tag: "#researched", hex: "3b82f6" }, // Blue
  { tag: "#verified",   hex: "22c55e" }, // Green
];

export async function injectGraphColors(vault: Vault) {
    const adapter = vault.adapter;
    const path = `${vault.configDir}/graph.json`;
    if (!await adapter.exists(path)) return;

    try {
        const settings = JSON.parse(await adapter.read(path));
        const groups: any[] = settings.colorGroups ?? [];
        const existing = new Set(groups.map((g: any) => g.query));

        let changed = false;
        for (const { tag, hex } of FIXED_GROUPS) {
            if (!existing.has(tag)) {
                groups.push({ query: tag, color: { a: 1, rgb: parseInt(hex, 16) } });
                changed = true;
            }
        }
//
        if (changed) {
            settings.colorGroups = groups;
            console.log(settings);
            await adapter.write(path, JSON.stringify(settings, null, 2));
            console.log("Poneglyph: Graph colors updated.");
        } else {
            console.log("Poneglyph: All tag groups already exist, no changes made.");
        }
    } catch (e) {
        console.error("Poneglyph: Failed to update graph settings", e);
    }
}