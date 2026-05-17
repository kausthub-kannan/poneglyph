import { getModel } from "backend/utils/model-provider";
import { systemPrompt, userPrompt } from "backend/prompts/query-generation";
import type { GraphQuerySettings } from "settings";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export async function createIdea(existingData: string, settings: GraphQuerySettings): Promise<string> {
    const model = getModel(settings);

    const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt.replace("{{existingData}}", existingData))
    ];

    const response = await model.invoke(messages);

    return typeof response.content === "string" ? response.content : JSON.stringify(response.content);
}
