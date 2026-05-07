import { App, normalizePath } from "obsidian";
import { type FileData } from "deepagents";

export async function loadSkills(app: App): Promise<Record<string, FileData>> {
    const virtualFiles: Record<string, FileData> = {};
    
    // The physical path inside the Obsidian vault
    const basePath = normalizePath(".obsidian/plugins/poneglyph/src/backend/skills");
    
    // Failsafe: check if the directory exists
    const exists = await app.vault.adapter.exists(basePath);
    if (!exists) return virtualFiles;

    // List all folders inside the skills directory (e.g., literature-extractor)
    const listResult = await app.vault.adapter.list(basePath);
    
    for (const folderPath of listResult.folders) {
        const skillFilePath = normalizePath(`${folderPath}/SKILL.md`);
        
        if (await app.vault.adapter.exists(skillFilePath)) {
            const content = await app.vault.adapter.read(skillFilePath);
            const stat = await app.vault.adapter.stat(skillFilePath);
            
            // Extract the skill folder name to map it to the virtual path
            const skillName = folderPath.split('/').pop(); 
            const virtualPath = `/skills/${skillName}/SKILL.md`;
            
            virtualFiles[virtualPath] = {
                content: content,
                mimeType: "text/markdown",
                created_at: new Date(stat?.ctime || Date.now()).toISOString(),
                modified_at: new Date(stat?.mtime || Date.now()).toISOString(),
            };
        }
    }
    
    return virtualFiles;
}