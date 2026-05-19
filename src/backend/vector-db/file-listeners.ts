import { buildMetadata, COLLECTION_NAME, dequeueOp, enqueueOp, getChromaClient, isSignificantChange, loadQueue, pendingUpdates, UPDATE_DEBOUNCE_MS } from "backend/utils/db";
import { TFile, Vault } from "obsidian";
import { addMarkdown, createCollection, deleteMarkdown, updateMarkdown } from "./db";

export async function drainOfflineQueue(_vault: Vault): Promise<void> {
    const queue = loadQueue();
    if (queue.length === 0) return;

    const client = await getChromaClient();
    if (!client) {
        return;
    }

    await createCollection(client, COLLECTION_NAME);

    for (const op of queue) {
        try {
            if (op.type === "add") {
                await addMarkdown(client, COLLECTION_NAME, op.filename, op.content, op.metadata);
            } else if (op.type === "delete") {
                await deleteMarkdown(client, COLLECTION_NAME, op.filename);
            } else if (op.type === "update") {
                await updateMarkdown(client, COLLECTION_NAME, op.filename, op.content, op.metadata);
            }
            dequeueOp(op);
        } catch { /* ignore */ }
    }
}

export async function onFileCreated(file: TFile, vault: Vault): Promise<void> {
    if (file.path === 'IDEA.md' || file.path === 'SOURCES.md') {
        return;
    }

    const content = await vault.cachedRead(file);
    const metadata = buildMetadata(file, content);

    const client = await getChromaClient();

    if (!client) {
        enqueueOp({ type: "add", filename: file.path, content, metadata });
        return;
    }

    await createCollection(client, COLLECTION_NAME);
    await addMarkdown(client, COLLECTION_NAME, file.path, content, buildMetadata(file, content));
}

export async function onFileDeleted(file: TFile): Promise<void> {
    if (file.path === 'IDEA.md' || file.path === 'SOURCES.md') {
        return;
    }

    if (pendingUpdates.has(file.path)) {
        clearTimeout(pendingUpdates.get(file.path)!.timer);
        pendingUpdates.delete(file.path);
    }

    const client = await getChromaClient();

    if (!client) {
        enqueueOp({ type: "delete", filename: file.path });
        return;
    }

    try {
        await deleteMarkdown(client, COLLECTION_NAME, file.path);
    } catch { /* ignore */ }
}

export async function onFileModified(file: TFile, vault: Vault): Promise<void> {
    if (file.path === 'IDEA.md' || file.path === 'SOURCES.md') {
        return;
    }

    const existing = pendingUpdates.get(file.path);

    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(async () => {
        pendingUpdates.delete(file.path);

        const newContent = await vault.cachedRead(file);
        const previousContent = existing?.previousContent ?? "";

        if (!isSignificantChange(previousContent, newContent)) {
            return;
        }

        const metadata = buildMetadata(file, newContent);
        const client = await getChromaClient();

        if (!client) {
            enqueueOp({ type: "update", filename: file.path, content: newContent, metadata });
            return;
        }

        try {
            await updateMarkdown(client, COLLECTION_NAME, file.path, newContent, metadata);
        } catch {
            await addMarkdown(client, COLLECTION_NAME, file.path, newContent, metadata);
        }
    }, UPDATE_DEBOUNCE_MS);

    pendingUpdates.set(file.path, {
        timer,
        previousContent: existing?.previousContent ?? (await vault.cachedRead(file)),
    });
}