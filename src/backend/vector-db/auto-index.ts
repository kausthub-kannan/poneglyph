import { buildMetadata, COLLECTION_NAME, getChromaClient } from "backend/utils/db";
import { Vault } from "obsidian";
import { batchAddMarkdown, batchDeleteMarkdown, createCollection } from "./db";
import { IncludeEnum } from "chromadb-client";

const EXCLUDED_FILES = new Set(["IDEA.md", "SOURCES.md"]);
const CHUNK_SIZE = 50;

export async function indexVault(vault: Vault): Promise<void> {
  const client = await getChromaClient();
  if (!client) {
    return;
  }

  const collection = await createCollection(client, COLLECTION_NAME);

  const existing = await collection.get({ include: [IncludeEnum.Metadatas] });

  // All unique paths currently in the vector DB
  const indexedPaths = new Set(
    existing.metadatas?.map((m) => (m as any)?.path).filter(Boolean) ?? []
  );

  // All current vault file paths (excluding ignored files)
  const vaultFiles = vault.getMarkdownFiles().filter((f) => !EXCLUDED_FILES.has(f.path));
  const vaultPaths = new Set(vaultFiles.map((f) => f.path));

  // Files in DB but no longer in vault → delete
  const stalePaths = [...indexedPaths].filter((p) => !vaultPaths.has(p));

  if (stalePaths.length) {
    await batchDeleteMarkdown(client, COLLECTION_NAME, stalePaths);
  }

  // Files in vault but not in DB → add
  const missingFiles = vaultFiles.filter((f) => !indexedPaths.has(f.path));

  if (!missingFiles.length) {
    return;
  }

  for (let i = 0; i < missingFiles.length; i += CHUNK_SIZE) {
    const batch = missingFiles.slice(i, i + CHUNK_SIZE);
    const docs: { text: string; filepath: string }[] = [];
    const metadatas: Record<string, unknown>[] = [];

    await Promise.all(
      batch.map(async (file) => {
        const content = await vault.cachedRead(file);
        docs.push({ text: content, filepath: file.path });
        metadatas.push(buildMetadata(file, content));
      })
    );

    await batchAddMarkdown(client, COLLECTION_NAME, docs, metadatas);
  }
}