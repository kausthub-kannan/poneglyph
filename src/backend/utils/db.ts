import { getClient } from "backend/vector-db/db";
import { ChromaClient } from "chromadb-client";
import { TFile } from "obsidian";

export const COLLECTION_NAME = "poneglyph-collection";
export const MIN_SIMILARITY_SCORE = 0.75;
export const MAX_BACKLINKS = 5;
export const MIN_BACKLINKS = 1;
export const UPDATE_DEBOUNCE_MS = 10_000;
export const MIN_CHANGE_RATIO = 0.05;
export const QUEUE_STORAGE_KEY = "kg-offline-queue";

interface PendingUpdate {
    timer: ReturnType<typeof setTimeout>;
    previousContent: string;
}

export const pendingUpdates = new Map<string, PendingUpdate>();

type QueuedOp =
    | { type: "add"; filename: string; content: string; metadata: Record<string, unknown> }
    | { type: "delete"; filename: string }
    | { type: "update"; filename: string; content: string; metadata: Record<string, unknown> };

export function loadQueue(): QueuedOp[] {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) ?? "[]");
    } catch {
        return [];
    }
}

export function saveQueue(queue: QueuedOp[]): void {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

export function enqueueOp(op: QueuedOp): void {
    const queue = loadQueue();
    const idx = queue.findIndex((o) => o.filename === op.filename && o.type === op.type);
    if (idx !== -1) queue.splice(idx, 1);
    queue.push(op);
    saveQueue(queue);
}

export function dequeueOp(op: QueuedOp): void {
    const queue = loadQueue().filter(
        (o) => !(o.filename === op.filename && o.type === op.type)
    );
    saveQueue(queue);
}

export async function getChromaClient(): Promise<ChromaClient | null> {
    try {
        const client = getClient();
        await client.heartbeat();
        return client;
    } catch (error) {
        console.log(error)
        console.warn("[KG] ChromaDB unreachable – offline operations preserved.");
        return null;
    }
}


export function buildMetadata(file: TFile, content: string): Record<string, unknown> {
    return {
        path: file.path,
        createdAt: file.stat.ctime,
        modifiedAt: file.stat.mtime,
    };
}

export function isSignificantChange(previous: string, next: string): boolean {
    if (previous === next) return false;
    if (previous.length === 0) return true;

    const lengthDelta = Math.abs(next.length - previous.length);
    const ratio = lengthDelta / previous.length;

    const stripped = (s: string) => s.replace(/\n\n## Related Notes\n[\s\S]*$/, "");
    if (stripped(previous) === stripped(next)) return false;

    return ratio >= MIN_CHANGE_RATIO;
}