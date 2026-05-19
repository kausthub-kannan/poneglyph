import { requestUrl, Notice } from 'obsidian';

export async function checkOllama(): Promise<boolean> {
    try {
        const response = await requestUrl({ url: 'http://localhost:11434/', method: 'GET' });
        return response.status === 200;
    } catch (e) {
        return false;
    }
}

export async function checkChroma(): Promise<boolean> {
    try {
        const response = await requestUrl({ url: 'http://localhost:8000/api/v2/heartbeat', method: 'GET' });
        return response.status === 200;
    } catch (e) {
        return false;
    }
}

export async function validateServers(): Promise<boolean> {
    const isOllamaRunning = await checkOllama();
    const isChromaRunning = await checkChroma();

    if (!isOllamaRunning && !isChromaRunning) {
        new Notice('Ollama and ChromaDB are not running. Please start the servers.');
        return false;
    } else if (!isOllamaRunning) {
        new Notice('Ollama is not running. Please start the server.');
        return false;
    } else if (!isChromaRunning) {
        new Notice('ChromaDB is not running. Please start the server.');
        return false;
    }
    return true;
}
