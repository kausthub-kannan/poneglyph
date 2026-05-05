import { createDeepAgent } from "deepagents";
import { sciHubFullTextTool } from "./tools/scihub";
import { systemPrompt, userPrompt } from "./prompts/deep-reserach";
import { getModel } from "./model-provider";
import { GraphQuerySettings } from "settings";
import { appendMarkdownTool, readMarkdownTool, writeMarkdownTool } from "./tools/markdown-management";
import { openAlexSearchTool } from "./tools/search";

async function deepSearch(
  searchQuery: string,
  settings: GraphQuerySettings
): Promise<string> {

  const llm = getModel(settings, 0.2);

  const agent = createDeepAgent({
    model: llm,
    tools: [sciHubFullTextTool, openAlexSearchTool, readMarkdownTool, writeMarkdownTool, appendMarkdownTool],
    systemPrompt: systemPrompt
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: userPrompt.replace("{{query}}", searchQuery) }],
  });

  const finalMessage = result.messages[result.messages.length - 1];
  if (!finalMessage) throw new Error("Agent returned no messages.");

  return typeof finalMessage.content === "string"
    ? finalMessage.content
    : JSON.stringify(finalMessage.content, null, 2);
}

export { deepSearch };