import { requestUrl } from "obsidian";

export async function getEmbedding(texts: string[], port = "11434"): Promise<number[][]> {
    const response = await requestUrl({
        url: `http://localhost:${port}/api/embed`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'embeddinggemma',
            input: texts  // send all at once
        })
    });

    if (response.status !== 200) {
        throw new Error(`Embedding failed with status ${response.status}`);
    }

    const data = response.json;

    if (!data.embeddings || data.embeddings.length === 0) {
        throw new Error("No embeddings returned from Ollama.");
    }

    return data.embeddings; // already number[][]
}