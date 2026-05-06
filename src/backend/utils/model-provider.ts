import { ChatMistralAI } from "@langchain/mistralai";
import type { GraphQuerySettings } from "settings";

// 1. Use 'as const' so TypeScript knows the exact allowed keys
const modelDirectory = {
    "mistral": ChatMistralAI
} as const;

// 2. Define a type based on the keys of your directory
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

    // 4. TypeScript now recognizes ModelClass as a constructor
    return new ModelClass({
        model: settings.modelID,
        temperature: temperature,
        apiKey: settings.modelAPIKey
    });
};

export { getModel };