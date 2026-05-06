import { createDeepAgent } from "deepagents";
import { sciHubFullTextTool } from "./tools/source/scihub";
import { arxivFullTextTool } from "./tools/source/arxiv";
import { createUnpaywallTool } from "./tools/source/unpaywall";
import { systemPrompt, userPrompt } from "./prompts/deep-reserach";
import { getModel } from "./utils/model-provider";
import { GraphQuerySettings } from "settings";
import { appendMarkdownTool, readMarkdownTool, writeMarkdownTool } from "./tools/markdown-management";
import { openAlexSearchTool } from "./tools/search/open-alex";
import { App } from "obsidian";
import { loadSkills } from "./utils/load-skills";

// Keep a reference to the active controller
let activeAgentController: AbortController | null = null;

if (typeof process !== "undefined" && process.env) {
  process.env["LANGCHAIN_TRACING_V2"] = process.env.LANGCHAIN_TRACING_V2;
  process.env["LANGCHAIN_API_KEY"] = process.env.LANGCHAIN_API_KEY;
  process.env["LANGCHAIN_PROJECT"] = process.env.LANGCHAIN_PROJECT;
  process.env["LANGCHAIN_ENDPOINT"] = process.env.LANGCHAIN_ENDPOINT;
}

async function deepResearch(
  app: App,
  searchQuery: string,
  settings: GraphQuerySettings
): Promise<string> {

  const llm = getModel(settings, 0.2);
  const virtualFileSystem = await loadSkills(app);

  activeAgentController = new AbortController();

  const sourceTextTools = [sciHubFullTextTool, arxivFullTextTool, createUnpaywallTool(settings.email)]
  const searchTools = [openAlexSearchTool]
  const markdownTools = [readMarkdownTool, writeMarkdownTool, appendMarkdownTool]

  const agent = await createDeepAgent({
    model: llm,
    tools: [...searchTools, ...sourceTextTools, ...markdownTools],
    systemPrompt: systemPrompt,
    skills: [
      "/skills/markdown/",
      "/skills/research/",
      "/skills/search/"
    ],
  });

  try {
    const result = await agent.invoke({
      messages: [{ role: "user", content: userPrompt.replace("{{query}}", searchQuery) }],
      files: virtualFileSystem,
    }, {
      signal: activeAgentController.signal
    });

    const finalMessage = result.messages[result.messages.length - 1];
    if (!finalMessage) throw new Error("Agent returned no messages.");

    return typeof finalMessage.content === "string"
      ? finalMessage.content
      : JSON.stringify(finalMessage.content, null, 2);

  } catch (error: any) {
    if (error.name === "AbortError") {
      console.log("Deep research was halted by the user.");
      return "Research extraction stopped.";
    }
    
    console.error("Agent encountered an error:", error);
    throw error;
    
  } finally {
    activeAgentController = null;
  }
}

function stopDeepResearch() {
  if (activeAgentController) {
    activeAgentController.abort();
    activeAgentController = null;
  }
}

export { deepResearch, stopDeepResearch };