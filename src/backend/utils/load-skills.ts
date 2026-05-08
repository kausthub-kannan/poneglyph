import { App, normalizePath } from "obsidian";
import { type FileData } from "deepagents";

export async function loadSkills(app: App): Promise<Record<string, FileData>> {
    const virtualFiles: Record<string, FileData> = {};
    
    const basePath = normalizePath(".obsidian/plugins/poneglyph/src/backend/skills");
    
    const exists = await app.vault.adapter.exists(basePath);
    if (!exists) return virtualFiles;

    const listResult = await app.vault.adapter.list(basePath);

    // Register the root /skills/ directory itself
    virtualFiles["/skills"] = {
        content: "",
        mimeType: "inode/directory",
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
    };
    
    for (const folderPath of listResult.folders) {
        const skillFilePath = normalizePath(`${folderPath}/SKILL.md`);
        
        if (await app.vault.adapter.exists(skillFilePath)) {
            const content = await app.vault.adapter.read(skillFilePath);
            const stat = await app.vault.adapter.stat(skillFilePath);
            const skillName = folderPath.split('/').pop();

            // Register the skill subdirectory entry
            virtualFiles[`/skills/${skillName}`] = {
                content: "",
                mimeType: "inode/directory",
                created_at: new Date(stat?.ctime || Date.now()).toISOString(),
                modified_at: new Date(stat?.mtime || Date.now()).toISOString(),
            };
            
            // Register the SKILL.md file
            virtualFiles[`/skills/${skillName}/SKILL.md`] = {
                content: content,
                mimeType: "text/markdown",
                created_at: new Date(stat?.ctime || Date.now()).toISOString(),
                modified_at: new Date(stat?.mtime || Date.now()).toISOString(),
            };
        }
    }
    
    return virtualFiles;
}