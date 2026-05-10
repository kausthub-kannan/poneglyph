import { getModel } from "./utils/model-provider";
import { systemPrompt, userPrompt } from "./prompts/query-generation";
import type { GraphQuerySettings } from "settings";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export async function generateQueries(ideaText: string, settings: GraphQuerySettings): Promise<string> {
    const model = getModel(settings);

    const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt.replace("{{ideaText}}", ideaText))
    ];

    const response = await model.invoke(messages);
    console.log("response", response)

    return typeof response.content === "string" ? response.content : JSON.stringify(response.content);
}
