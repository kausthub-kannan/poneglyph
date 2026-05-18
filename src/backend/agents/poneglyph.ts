(globalThis as any).Bun = {};

if (typeof process !== "undefined" && process.env) {
  Object.assign(process.env, {
    LANGSMITH_TRACING: process.env.LANGSMITH_TRACING,
    LANGSMITH_API_KEY: process.env.LANGSMITH_API_KEY,
    LANGSMITH_PROJECT: process.env.LANGSMITH_PROJECT,
    LANGSMITH_ENDPOINT: process.env.LANGSMITH_ENDPOINT,
    LANGSMITH_DISABLE_RUN_COMPRESSION: process.env.LANGSMITH_DISABLE_RUN_COMPRESSION,
    LANGSMITH_MULTIPART_STREAMING_DISABLED: "true"
  });
}

import { createDeepAgent, createSkillsMiddleware } from "deepagents";
import { systemPrompt, userPrompt } from "backend/prompts/poneglyph";
import { getModel } from "backend/utils/model-provider";
import { GraphQuerySettings } from "settings";
import {
  readMarkdownTool,
  writeMarkdownTool,
  appendMarkdownTool,
  deleteTempMarkdownTool
} from "backend/tools/markdown-management";
import { addSourceTool } from "backend/tools/add-source";
import { updateStatusTool } from "backend/tools/update-status";
import { App } from "obsidian";
import { loadSkills } from "backend/utils/load-skills";
import { ObsidianVaultBackend } from "backend/utils/obsidian-backend";
import { generateQueries } from "./query-generation";
import { createDeepResearchSubAgent } from "./deep-reserach";

let activeAgentController: AbortController | null = null;
let agentRunning = false;

/**
 * Coordinator agent for the Poneglyph research pipeline.
 *
 * Responsibilities:
 *  - Create the draft markdown note (frontmatter only)
 *  - Delegate all paper search & retrieval to the deep-research subagent
 *  - Read TEMP.md after the subagent completes
 *  - Synthesize findings into a polished academic body and append to the draft
 *  - Update note status: draft → researched
 *  - Record all cited sources in SOURCES.md
 *  - Delete TEMP.md as the final cleanup step
 *
 * The coordinator has NO access to search or source retrieval tools.
 * All research is delegated to the deep-research subagent.
 */
async function deepResearch(
  app: App,
  ideaText: string,
  settings: GraphQuerySettings
): Promise<string> {

  const llm = getModel(settings, 0.2);
  const virtualFileSystem = await loadSkills(app);

  activeAgentController = new AbortController();
  agentRunning = true;

  // Coordinator: markdown management tools only — no search or source tools
  const markdownTools = [
    readMarkdownTool,
    writeMarkdownTool,
    appendMarkdownTool,
    addSourceTool,
    updateStatusTool,
    deleteTempMarkdownTool
  ];

  // Deep-research subagent handles all paper searching, retrieval, and TEMP.md output
  const deepResearchSubAgent = createDeepResearchSubAgent(app, settings);

  const agent = createDeepAgent({
    model: llm,
    tools: markdownTools,
    systemPrompt: systemPrompt,
    subagents: [deepResearchSubAgent],
    middleware: [
      createSkillsMiddleware({
        backend: new ObsidianVaultBackend(app),
        sources: ["/skills"]
      })
    ]
  });

  try {
    const queries = await generateQueries(ideaText, settings);
    console.log("[QUERIES GENERATED]:", queries);

    const result = await agent.invoke({
      messages: [{ role: "user", content: userPrompt.replace("{{query}}", queries) }],
      files: virtualFileSystem,
    }, {
      signal: activeAgentController.signal
    });

    const finalMessage = result.messages[result.messages.length - 1];
    console.log("[COORDINATOR FINAL MESSAGE]", finalMessage);
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