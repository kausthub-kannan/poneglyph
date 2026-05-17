import { App, normalizePath } from "obsidian";
import { FilesystemBackend } from "deepagents";
import type { LsResult, ReadResult, FileInfo, FileDownloadResponse } from "deepagents";

const VIRTUAL_ROOT = "/skills";
const VAULT_ROOT   = ".obsidian/plugins/poneglyph/src/backend/skills";

export class ObsidianVaultBackend extends FilesystemBackend {
  private readonly app: App;

  constructor(app: App) {
    super({ virtualMode: true });
    this.app = app;
  }

  private toVaultPath(virtualPath: string): string {
    const relative = virtualPath.startsWith(VIRTUAL_ROOT)
      ? virtualPath.slice(VIRTUAL_ROOT.length)
      : virtualPath;
    return normalizePath(`${VAULT_ROOT}${relative}`);
  }

  private toVirtualPath(vaultPath: string): string {
    const prefix = normalizePath(VAULT_ROOT);
    const relative = vaultPath.startsWith(prefix)
      ? vaultPath.slice(prefix.length)
      : vaultPath;
    return `${VIRTUAL_ROOT}${relative.startsWith("/") ? "" : "/"}${relative}`;
  }

  override async ls(dirPath: string): Promise<LsResult> {
    try {
      const vaultPath = this.toVaultPath(dirPath);

      if (!(await this.app.vault.adapter.exists(vaultPath))) {
        return { files: [] };
      }

      const listing = await this.app.vault.adapter.list(vaultPath);
      const results: FileInfo[] = [];

      for (const filePath of listing.files) {
        const s = await this.app.vault.adapter.stat(filePath);
        results.push({
          path: this.toVirtualPath(filePath),
          is_dir: false,
          size: s?.size ?? 0,
          modified_at: new Date(s?.mtime ?? Date.now()).toISOString(),
        });
      }

      for (const folderPath of listing.folders) {
        const s = await this.app.vault.adapter.stat(folderPath);
        results.push({
          path: this.toVirtualPath(folderPath) + "/",
          is_dir: true,
          size: 0,
          modified_at: new Date(s?.mtime ?? Date.now()).toISOString(),
        });
      }

      results.sort((a, b) => a.path.localeCompare(b.path));
      return { files: results };
    } catch {
      return { files: [] };
    }
  }

  override async read(
    filePath: string,
    offset: number = 0,
    limit: number = 500,
  ): Promise<ReadResult> {
    try {
      const vaultPath = this.toVaultPath(filePath);

      if (!(await this.app.vault.adapter.exists(vaultPath))) {
        return { error: `File '${filePath}' not found` };
      }

      const content = await this.app.vault.adapter.read(vaultPath);
      const lines   = content.split("\n");

      if (offset >= lines.length) {
        return {
          error: `Line offset ${offset} exceeds file length (${lines.length} lines)`,
        };
      }

      console.log(content)

      return {
        content: lines.slice(offset, offset + limit).join("\n"),
        mimeType: "text/markdown",
      };
    } catch (e: any) {
      return { error: `Error reading file '${filePath}': ${e.message}` };
    }
  }

  override async downloadFiles(paths: string[]): Promise<FileDownloadResponse[]> {
    const responses: FileDownloadResponse[] = [];

    for (const filePath of paths) {
      try {
        const vaultPath = this.toVaultPath(filePath);

        if (!(await this.app.vault.adapter.exists(vaultPath))) {
          responses.push({
            path: filePath,
            content: null,
            error: "file_not_found",
          });
          continue;
        }

        const stat = await this.app.vault.adapter.stat(vaultPath);
        if (stat && stat.type === "folder") {
          responses.push({
            path: filePath,
            content: null,
            error: "is_directory",
          });
          continue;
        }

        const arrayBuffer = await this.app.vault.adapter.readBinary(vaultPath);
        const content = new Uint8Array(arrayBuffer);

        responses.push({ path: filePath, content: content as any, error: null });

      } catch (e: any) {
        responses.push({
          path: filePath,
          content: null,
          error: "invalid_path",
        });
      }
    }

    return responses;
  }
}