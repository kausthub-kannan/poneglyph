import { createDeepAgent, createSkillsMiddleware, } from "deepagents";
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
import { ObsidianVaultBackend } from "./utils/obsidian-backend";
import { addSourceTool } from "./tools/add-source";
import { updateStatusTool } from "./tools/update-status";
import { generateQueries } from "./query-generation";
let activeAgentController: AbortController | null = null;
let agentRunning = false;

if (typeof process !== "undefined" && process.env) {
  Object.assign(process.env, {
    LANGCHAIN_TRACING_V2: process.env.LANGCHAIN_TRACING_V2,
    LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY,
    LANGCHAIN_PROJECT: process.env.LANGCHAIN_PROJECT,
    LANGCHAIN_ENDPOINT: process.env.LANGCHAIN_ENDPOINT,
  });
}

async function deepResearch(
  app: App,
  ideaText: string,
  settings: GraphQuerySettings
): Promise<string> {
  
  const llm = getModel(settings, 0.2);
  const virtualFileSystem = await loadSkills(app);

  activeAgentController = new AbortController();
  agentRunning = true;

  const sourceTextTools = [sciHubFullTextTool, arxivFullTextTool, createUnpaywallTool(settings.email)]
  const searchTools = [openAlexSearchTool]
  const markdownTools = [readMarkdownTool, writeMarkdownTool, appendMarkdownTool, addSourceTool, updateStatusTool]

  const agent = createDeepAgent({
    model: llm,
    tools: [...searchTools, ...sourceTextTools, ...markdownTools],
    systemPrompt: systemPrompt,
    middleware: [
      createSkillsMiddleware({
        backend: new ObsidianVaultBackend(app),
        sources: ["/skills"]
      })
    ]
  });

  try {
    const queries = await generateQueries(ideaText, settings);
    const result = await agent.invoke({
      messages: [{ role: "user", content: userPrompt.replace("{{query}}", queries) }],
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
      return "Research extraction stopped.";
    }
    
    console.error("Agent encountered an error:", error);
    throw error;
    
  } finally {
    agentRunning = false;
    activeAgentController = null;
  }
}

function stopDeepResearch() {
  if (activeAgentController) {
    activeAgentController.abort();
    activeAgentController = null;
  }
}

export { deepResearch, stopDeepResearch, agentRunning };