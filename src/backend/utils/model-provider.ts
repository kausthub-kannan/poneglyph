import { ChatAnthropic } from "@langchain/anthropic";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
import type { GraphQuerySettings } from "settings";

const modelDirectory = {
    "mistral": ChatMistralAI,
    "anthropic": ChatAnthropic,
    "ollama": ChatOllama,
    "openai": ChatOpenAI
} as const;

type SupportedProvider = keyof typeof modelDirectory;

const getModel = (
    settings: GraphQuerySettings,
    temperature = 0.2
) => {
    // 3. Cast the provider or check if it's valid
    const provider = settings.modelProvider as SupportedProvider;
    const ModelClass = modelDirectory[provider];

    if (!ModelClass) {
        throw new Error(`Provider "${settings.modelProvider}" is not supported.`);
    }

    const ModelConstructor = ModelClass as any;
    
    const config: Record<string, any> = {
        model: settings.modelID,
        temperature: temperature,
    };

    if (settings.modelAPIKey) {
        config.apiKey = settings.modelAPIKey;
    }

    return new ModelConstructor(config);
};

export { getModel, modelDirectory };