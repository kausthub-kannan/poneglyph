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
import { App, TFile } from "obsidian";
import { loadSkills } from "backend/utils/load-skills";
import { ObsidianVaultBackend } from "backend/utils/obsidian-backend";
import { generateQueries } from "./query-generation";
import { createDeepResearchSubAgent } from "./deep-reserach";
import { injectBacklinks } from "backend/vector-db/back-link";
import { getChromaClient } from "backend/utils/db";

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

  let generatedFilePath: string | null = null;

  const originalWriteFunc = (writeMarkdownTool as any).func;
  (writeMarkdownTool as any).func = async (args: { path: string; content: string }) => {
    const result = await originalWriteFunc(args);
    const normalizedPath = args.path.endsWith('.md') ? args.path : `${args.path}.md`;
    const isSystemFile = ["TEMP.md", "SOURCES.md"].includes(normalizedPath);
    if (!isSystemFile) {
      generatedFilePath = normalizedPath;
    }
    return result;
  };

  const markdownTools = [
    readMarkdownTool,
    writeMarkdownTool,
    appendMarkdownTool,
    addSourceTool,
    updateStatusTool,
    deleteTempMarkdownTool
  ];

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

    const now = new Date();
    const currentDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const result = await agent.invoke({
      messages: [{ role: "user", content: userPrompt.replace("{{query}}", queries).replace("{{date}}", currentDate) }],
      files: virtualFileSystem,
    }, {
      signal: activeAgentController.signal
    });

    const finalMessage = result.messages[result.messages.length - 1];
    if (!finalMessage) throw new Error("Agent returned no messages.");

    if (generatedFilePath) {
      try {
        const chromaClient = await getChromaClient();
        if (chromaClient) {
          const file = app.vault.getAbstractFileByPath(generatedFilePath);
          if (file instanceof TFile) {
            const content = await app.vault.read(file);
            const updatedContent = await injectBacklinks(chromaClient, content, file.name);
            if (updatedContent !== content) {
              await app.vault.modify(file, updatedContent);
            }
          }
        }
      } catch {
        // error ignored
      }
    }

    return typeof finalMessage.content === "string"
      ? finalMessage.content
      : JSON.stringify(finalMessage.content, null, 2);
  } catch (error: any) {
    if (error.name === "AbortError") {
      return "Research extraction stopped.";
    }

    throw error;
  } finally {
    (writeMarkdownTool as any).func = originalWriteFunc;
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