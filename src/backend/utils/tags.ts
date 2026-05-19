import { Vault } from 'obsidian';

const FIXED_GROUPS = [
  { tag: "draft",      hex: "eab308", alpha: 0.6 },
  { tag: "researched", hex: "3b82f6", alpha: 0.75 },
  { tag: "verified",   hex: "22c55e", alpha: 0.75 },
];

export async function configureGraphSettings(vault: Vault) {
    const adapter = vault.adapter;
    const path = `${vault.configDir}/graph.json`;
    if (!(await adapter.exists(path))) return;

    try {
        const settings = JSON.parse(await adapter.read(path));
        const groups: any[] = settings.colorGroups ?? [];
        const existing = new Set(groups.map((g: any) => g.query));

        let changed = false;
        for (const { tag, hex, alpha } of FIXED_GROUPS) {
            if (!existing.has(tag)) {
                groups.push({ query: tag, color: { a: alpha, rgb: parseInt(hex, 16) } });
                changed = true;
            }
        }
        const exclusions = "-file:IDEA.md -file:SOURCES.md";
        const search = settings.search || "";
        if (!search.includes("IDEA.md") && !search.includes("SOURCES.md")) {
            settings.search = search ? `${search} ${exclusions}` : exclusions;
            changed = true;
        }

        if (changed) {
            settings.colorGroups = groups;
            await adapter.write(path, JSON.stringify(settings, null, 2));
        }
    } catch { /* ignore */ }
}