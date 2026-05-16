import { ChromaClient } from "chromadb-client";
import { requestUrl } from "obsidian";
import { getEmbedding } from "./embed";

const queue: (() => Promise<any>)[] = [];
let active = 0;
const MAX_CONCURRENT = 3;

const enqueue = (fn: () => Promise<any>) =>
  new Promise((resolve, reject) => {
    queue.push(async () => {
      try { resolve(await fn()); }
      catch (e) { reject(e); }
    });
    drain();
  });

const drain = () => {
  while (active < MAX_CONCURRENT && queue.length) {
    const fn = queue.shift()!;
    active++;
    fn().finally(() => { active--; drain(); });
  }
};

(globalThis as any).fetch = async (url: string, init?: RequestInit) => {
  return enqueue(async () => {
    const response = await requestUrl({
      url,
      method: init?.method || "GET",
      headers: (init?.headers as Record<string, string>) ?? {},
      body: init?.body as string,
      throw: false,
    });

    const makeResponse = () => ({
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      headers: new Headers(response.headers),
      json: async () => response.json,
      text: async () => response.text,
      clone: () => makeResponse(),
    });

    return makeResponse();
  });
};

const MAX_CHUNK_CHARS = 8000;
const CHUNK_OVERLAP_CHARS = 200;

export const chunkText = (text: string, maxChars = MAX_CHUNK_CHARS, overlap = CHUNK_OVERLAP_CHARS): string[] => {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + maxChars;

    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }

    let splitAt = text.lastIndexOf("\n\n", end);
    if (splitAt <= start) splitAt = text.lastIndexOf("\n", end);
    if (splitAt <= start) {
      splitAt = text.lastIndexOf(". ", end);
      if (splitAt > start) splitAt += 1;
    }
    if (splitAt <= start) splitAt = end;

    chunks.push(text.slice(start, splitAt).trim());
    start = Math.max(start + 1, splitAt - overlap);
  }

  return chunks.filter(c => c.length > 0);
};

const chunkIds = (filepath: string, count: number): string[] =>
  count === 1
    ? [filepath]
    : Array.from({ length: count }, (_, i) => `${filepath}__chunk_${i}`);

export const getClient = (port = "8000") =>
  new ChromaClient({ path: `http://localhost:${port}` });

export const createCollection = async (client: ChromaClient, name: string) =>
  client.getOrCreateCollection({ name });

export const addMarkdown = async (
  client: ChromaClient,
  name: string,
  filepath: string,
  markdown: string,
  metadata: Record<string, any>,
) => {
  const collection = await client.getCollection({ name });
  const chunks = chunkText(markdown);
  const ids = chunkIds(filepath, chunks.length);
  const embeddings = await getEmbedding(chunks);

  await collection.add({
    ids,
    documents: chunks,
    embeddings,
    metadatas: chunks.map((_, i) => ({
      ...metadata,
      chunkIndex: i,
      totalChunks: chunks.length,
    })),
  });
};

export const deleteMarkdown = async (
  client: ChromaClient,
  name: string,
  filepath: string,
) => {
  const collection = await client.getCollection({ name });
  await collection.delete({ where: { path: { $eq: filepath } } });
};

export const updateMarkdown = async (
  client: ChromaClient,
  name: string,
  filepath: string,
  markdown: string,
  metadata: Record<string, any>,
) => {
  await deleteMarkdown(client, name, filepath);
  await addMarkdown(client, name, filepath, markdown, metadata);
};

interface DocEntry { text: string; filepath: string; }

export const batchAddMarkdown = async (
  client: ChromaClient,
  name: string,
  documents: DocEntry[],
  metadata: Record<string, any>[],
) => {
  const collection = await client.getCollection({ name });

  const allIds: string[] = [];
  const allDocs: string[] = [];
  const allMetas: Record<string, any>[] = [];
  const allTexts: string[] = [];

  documents.forEach((doc, docIndex) => {
    const chunks = chunkText(doc.text);
    const ids = chunkIds(doc.filepath, chunks.length);

    chunks.forEach((chunk, i) => {
      const id = ids[i] as string;
      allIds.push(id);
      allDocs.push(chunk);
      allTexts.push(chunk);
      allMetas.push({
        ...metadata[docIndex],
        chunkIndex: i,
        totalChunks: chunks.length,
      });
    });
  });

  const embeddings = await getEmbedding(allTexts);

  await collection.add({
    ids: allIds,
    documents: allDocs,
    metadatas: allMetas,
    embeddings,
  });
};

export const getParentMarkdown = async (
  client: ChromaClient,
  name: string,
  query: string,
  nResults = 5,
) => {
  const collection = await client.getCollection({ name });
  const embedding = await getEmbedding([query]);

  const result = await collection.query({
    queryEmbeddings: embedding,
    nResults: nResults,
  });

  // Count how many chunks were retrieved per path (majority voting)
  const pathVotes = new Map<string, number>();

  (result.ids[0] ?? []).forEach((id, i) => {
    const path: string = (result.metadatas?.[0]?.[i] as any)?.path ?? id;
    pathVotes.set(path, (pathVotes.get(path) ?? 0) + 1);
  });

  // Sort paths by vote count descending, then slice to [1, 3]
  const topPaths = Array.from(pathVotes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([path]) => path);

  return topPaths; // minimum 1, maximum 3 paths
};

export const batchDeleteMarkdown = async (
  client: ChromaClient,
  name: string,
  filepaths: string[],
) => {
  if (!filepaths.length) return;
  const collection = await client.getCollection({ name });

  const CHUNK = 50;
  for (let i = 0; i < filepaths.length; i += CHUNK) {
    const batch = filepaths.slice(i, i + CHUNK);
    await collection.delete({
      where: { path: { $in: batch } },
    });
  }
};