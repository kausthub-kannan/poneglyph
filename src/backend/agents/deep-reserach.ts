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

import { type SubAgent, createSkillsMiddleware } from "deepagents";
import { sciHubFullTextTool } from "backend/tools/source/scihub";
import { arxivFullTextTool } from "backend/tools/source/arxiv";
import { createUnpaywallTool } from "backend/tools/source/unpaywall";
import { systemPrompt } from "backend/prompts/deep-reserach";
import { getModel } from "backend/utils/model-provider";
import { GraphQuerySettings } from "settings";
import { writeMarkdownTool, appendMarkdownTool } from "backend/tools/markdown-management";
import { openAlexSearchTool } from "backend/tools/search/open-alex";
import { App } from "obsidian";
import { ObsidianVaultBackend } from "backend/utils/obsidian-backend";

/**
 * Creates the deep-research SubAgent specification.
 *
 * This agent is responsible for all academic paper searching, full-text
 * retrieval, and writing raw findings to TEMP.md in structured batches of 1–3
 * papers. It does NOT write the final markdown note — that is the coordinator's job.
 *
 * Skills available: /skills/search and /skills/research only.
 * No markdown skill is loaded by this agent.
 */
export function createDeepResearchSubAgent(app: App, settings: GraphQuerySettings): SubAgent {
  const llm = getModel(settings, 0.2);

  const searchTools = [openAlexSearchTool];
  const sourceTextTools = [sciHubFullTextTool, arxivFullTextTool, createUnpaywallTool(settings.email)];
  const outputTools = [writeMarkdownTool, appendMarkdownTool];

  return {
    name: "deep-research",
    description: [
      "Academic paper research agent.",
      "Searches for papers in strict batches of 1–3, retrieves full text using multiple fallback sources",
      "(arXiv → Sci-Hub → Unpaywall), and appends structured findings to TEMP.md.",
      "Also appends a cross-paper synthesis section when all batches are complete.",
      "Use this agent to perform ALL paper discovery, DOI resolution, and full-text extraction tasks.",
      "Do not use this agent for markdown formatting or status updates."
    ].join(" "),
    systemPrompt: systemPrompt,
    model: llm,
    tools: [...searchTools, ...sourceTextTools, ...outputTools],
    middleware: [
      createSkillsMiddleware({
        backend: new ObsidianVaultBackend(app),
        sources: ["/skills"]
      })
    ]
  };
}
