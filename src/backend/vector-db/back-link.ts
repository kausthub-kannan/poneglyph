import { COLLECTION_NAME, MAX_BACKLINKS, MIN_BACKLINKS } from "backend/utils/db";
import { ChromaClient } from "chromadb-client";
import { getParentMarkdown } from "./db";

export async function injectBacklinks(
    client: ChromaClient,
    content: string,
    selfFilename: string
): Promise<string> {
    const paths = await getParentMarkdown(client, COLLECTION_NAME, content);

    if (!paths?.length) return content;

    const candidates = paths.filter((path) => path !== selfFilename);

    if (candidates.length < MIN_BACKLINKS) return content;

    const backlinkSection =
        "\n\n## Related Notes\n" +
        candidates
            .slice(0, MAX_BACKLINKS)
            .map((path) => `- [[${path}]]`)
            .join("\n");

    return content + backlinkSection;
}