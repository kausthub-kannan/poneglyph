import { ChatMistralAI } from "@langchain/mistralai";
import { HTTPClient } from "@mistralai/mistralai";
import { requestUrl } from "obsidian";
import type { GraphQuerySettings } from "settings";

export const modelDirectory = {
    "mistral": ChatMistralAI
} as const;

type SupportedProvider = keyof typeof modelDirectory;

const obsidianHttpClient = new HTTPClient({
    fetcher: async (request: Request) => {
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
            headers[key] = value;
        });

        const response = await requestUrl({
            url: request.url,
            method: request.method,
            headers: headers,
            body: request.body ? await new Response(request.body).text() : undefined,
        });

        return new Response(response.text, {
            status: response.status,
            headers: response.headers,
        });
    }
});

const getModel = (
    settings: GraphQuerySettings,
    temperature = 0.2
) => {
    const provider = settings.modelProvider as SupportedProvider;
    const ModelClass = modelDirectory[provider];

    if (!ModelClass) {
        throw new Error(`Provider "${settings.modelProvider}" is not supported.`);
    }

    // @ts-ignore
    return new ModelClass({
        model: settings.modelID,
        temperature: temperature,
        apiKey: settings.modelAPIKey,
        httpClient: obsidianHttpClient,
    });
};

export { getModel };