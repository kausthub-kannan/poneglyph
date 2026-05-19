import { App, requestUrl, TFile } from 'obsidian';
import 'pdfjs-dist/build/pdf.worker.mjs'
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { NoteContext, IdeaResult } from 'types';
import { 
    IDEA_MD_TEMPLATE, 
    SOURCES_MD_TEMPLATE, 
    getThesisHeaderTemplate, 
    getThesisSectionTemplate 
} from './templates';



function getPdfUrlFromWebView(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const webview = document.createElement("webview") as any;
        webview.setAttribute("src", url);
        webview.setAttribute("partition", "persist:scihub");
        webview.style.cssText =
            "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;";
        document.body.appendChild(webview);

        const cleanup = () => {
            try {
                document.body.removeChild(webview);
            } catch { /* ignore */ }
        };

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Timed out — no PDF iframe found within 20s"));
        }, 20000);

        webview.addEventListener("did-fail-load", (e: any) => {
            clearTimeout(timeout);
            cleanup();
            reject(new Error(`Webview failed to load: ${e.errorDescription}`));
        });

        webview.addEventListener("did-stop-loading", async () => {
            try {
                let pdfUrl: string | null = null;

                for (let i = 0; i < 20; i++) {
                    pdfUrl = await webview.executeJavaScript(`
            (() => {
              const iframes = Array.from(document.querySelectorAll("iframe"));
              for (const iframe of iframes) {
                const src = iframe.dataset.src || iframe.src || "";
                if (src.includes(".pdf")) return src;
              }
              return null;
            })()
          `);

                    if (pdfUrl) break;
                    await new Promise((r) => setTimeout(r, 500));
                }

                clearTimeout(timeout);
                cleanup();

                if (!pdfUrl) {
                    reject(new Error("No PDF iframe found after 10s"));
                    return;
                }

                resolve(pdfUrl.startsWith("//") ? `https:${pdfUrl}` : pdfUrl);
            } catch (err) {
                clearTimeout(timeout);
                cleanup();
                reject(err);
            }
        });
    });
}

const PDF_HEADERS: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
    "Accept": "application/pdf,application/octet-stream,*/*",
    "Accept-Language": "en-US,en;q=0.9",
};



function sanitizePdfUrl(url: string): string {
    url = url.trim();
    if (url.startsWith("//")) {
        url = "https:" + url;
    }
    if (url.startsWith("http://")) {
        url = "https://" + url.slice(7);
    }
    if (!url.startsWith("https://")) {
        url = "https://" + url;
    }
    try {
        const parsed = new URL(url);
        return parsed.toString();
    } catch {
        throw new Error(`Invalid PDF URL: "${url}"`);
    }
}

function resolveHtmlToPdfUrl(html: string, baseUrl: string): string | null {
    const base = new URL(baseUrl);

    const resolveRelative = (href: string): string => {
        if (!href) return "";
        try {
            return new URL(href, base).toString();
        } catch {
            return href;
        }
    };

    const citationMatch = html.match(/<meta[^>]+name=["']citation_pdf_url["'][^>]+content=["']([^"']+)["']/i)
        ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']citation_pdf_url["']/i);
    if (citationMatch?.[1]) {
        const resolved = resolveRelative(citationMatch[1]);
        return resolved;
    }

    const embedMatch = html.match(/<(?:embed|iframe)[^>]+src=["']([^"']*(?:\.pdf|\/pdf)[^"']*)["']/i);
    if (embedMatch?.[1]) {
        const resolved = resolveRelative(embedMatch[1]);
        return resolved;
    }

    const linkRegex = /<a[^>]+href=["']([^"']*(?:\.pdf|\/pdf(?:\/|\?|$))[^"']*)["']/gi;
    let linkMatch: RegExpExecArray | null;
    const pdfLinks: string[] = [];
    while ((linkMatch = linkRegex.exec(html)) !== null) {
        if (!linkMatch[1]) continue;
        pdfLinks.push(resolveRelative(linkMatch[1]));
    }
    if (pdfLinks.length > 0) {
        return pdfLinks[0] ?? null;
    }

    const refreshMatch = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^;]*;\s*url=([^"']+)["']/i);
    if (refreshMatch?.[1]) {
        const resolved = resolveRelative(refreshMatch[1].trim());
        return resolved;
    }

    return null;
}

async function fetchRaw(url: string, headers: Record<string, string>): Promise<{ status: number; arrayBuffer: ArrayBuffer; headers: Record<string, string> }> {
    try {
        const response = await requestUrl({ url, method: "GET", headers, throw: false });
        return response;
    } catch (err) {
        throw new Error(`Network error fetching "${url}": ${err instanceof Error ? err.message : String(err)}`);
    }
}

function isPdfMagicBytes(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 4) return false;
    const magic = new Uint8Array(buffer, 0, 4);
    return magic[0] === 0x25 && magic[1] === 0x50 && magic[2] === 0x44 && magic[3] === 0x46;
}

async function fetchPdfBuffer(pdfUrl: string): Promise<ArrayBuffer> {
    const sanitizedUrl = sanitizePdfUrl(pdfUrl);

    const response = await fetchRaw(sanitizedUrl, PDF_HEADERS);

    if (response.status < 200 || response.status >= 300) {
        throw new Error(`Failed to fetch PDF (HTTP ${response.status}): ${sanitizedUrl}`);
    }

    const contentType: string = (response.headers["content-type"] ?? response.headers["Content-Type"] ?? "").toLowerCase();

    const buffer = response.arrayBuffer;
    if (!buffer || buffer.byteLength === 0) {
        throw new Error(`Empty response body when fetching from "${sanitizedUrl}"`);
    }

    if (isPdfMagicBytes(buffer)) {
        return buffer;
    }

    if (contentType.includes("html")) {
        const html = new TextDecoder().decode(buffer);
        const resolvedPdfUrl = resolveHtmlToPdfUrl(html, sanitizedUrl);

        if (!resolvedPdfUrl) {
            throw new Error(
                `URL "${sanitizedUrl}" returned an HTML page but no PDF link could be found in it. ` +
                `The paper may be paywalled or the URL may be a landing page without a direct PDF.`
            );
        }

        const pdfResponse = await fetchRaw(resolvedPdfUrl, PDF_HEADERS);

        if (pdfResponse.status < 200 || pdfResponse.status >= 300) {
            throw new Error(`Failed to fetch resolved PDF URL (HTTP ${pdfResponse.status}): ${resolvedPdfUrl}`);
        }

        const pdfBuffer = pdfResponse.arrayBuffer;
        if (!pdfBuffer || pdfBuffer.byteLength === 0) {
            throw new Error(`Empty response body from resolved PDF URL "${resolvedPdfUrl}"`);
        }

        if (!isPdfMagicBytes(pdfBuffer)) {
            throw new Error(
                `Resolved URL "${resolvedPdfUrl}" also did not return a valid PDF. ` +
                `The paper may require authentication or be paywalled.`
            );
        }

        return pdfBuffer;
    }

    throw new Error(
        `URL "${sanitizedUrl}" returned unexpected content (Content-Type: "${contentType}"). ` +
        `Expected a PDF or HTML landing page.`
    );
}

async function pdfToText(buffer: ArrayBuffer): Promise<string> {
    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        verbosity: pdfjsLib.VerbosityLevel.ERRORS,
    });

    let pdf: Awaited<typeof loadingTask.promise>;
    try {
        pdf = await loadingTask.promise;
    } catch (err) {
        throw new Error(`pdfjs failed to parse document: ${err instanceof Error ? err.message : String(err)}`);
    }

    const pages = await Promise.all(
        Array.from({ length: pdf.numPages }, (_, i) =>
            pdf.getPage(i + 1)
                .then(p => p.getTextContent({ includeMarkedContent: false }))
                .then(c =>
                    c.items
                        .map((x: any) => x.str ?? "")
                        .filter(Boolean)
                        .join(" ")
                        .replace(/\s+/g, " ")
                        .trim()
                )
                .catch(() => {
                return "";
            })
        )
    );

    return pages.filter(Boolean).join("\n");
}

async function extractTextFromPdfUrl(pdfUrl: string): Promise<string> {
    const buffer = await fetchPdfBuffer(pdfUrl);
    return pdfToText(buffer);
}

async function setupMarkdowns(app: App) {
    const ideaPath = 'IDEA.md';
    const sourcesPath = 'SOURCES.md';

    if (!app.vault.getAbstractFileByPath(ideaPath)) {
        await app.vault.create(ideaPath, IDEA_MD_TEMPLATE);
    }

    if (!app.vault.getAbstractFileByPath(sourcesPath)) {
        await app.vault.create(sourcesPath, SOURCES_MD_TEMPLATE);
    }
}

const EXTRACT_IDEA_TAG = 'extract-idea';
const MAX_PARENT_DEPTH = 3;

function getExtractIdeaFiles(app: App): TFile[] {
    return app.vault.getMarkdownFiles().filter(file => {
        const cache = app.metadataCache.getFileCache(file);
        if (!cache) return false;
        const fmTags: string[] = cache.frontmatter?.tags ?? [];
        const normalizedFmTags = (Array.isArray(fmTags) ? fmTags : [fmTags])
            .map((t: string) => t.toLowerCase().trim());
        if (normalizedFmTags.includes(EXTRACT_IDEA_TAG)) return true;
        const inlineTags = (cache.tags ?? []).map(t => t.tag.replace('#', '').toLowerCase().trim());
        return inlineTags.includes(EXTRACT_IDEA_TAG);
    });
}

function extractRelatedNoteLinks(content: string): string[] {
    const lines = content.split('\n');
    let inRelatedSection = false;
    const links: string[] = [];
    for (const line of lines) {
        if (/^#{1,6}\s+related\s+notes/i.test(line)) {
            inRelatedSection = true;
            continue;
        }
        if (inRelatedSection && /^#{1,6}\s+/.test(line) && !/^#{1,6}\s+related\s+notes/i.test(line)) {
            break;
        }
        if (inRelatedSection) {
            const matches = line.matchAll(/\[\[([^\]|#]+?)(?:\|[^\]]+)?\]\]/g);
            for (const m of matches) {
                if (m[1]) links.push(m[1].trim());
            }
        }
    }
    return links;
}

function resolveWikiLink(app: App, linkName: string): TFile | null {
    const byPath = app.vault.getAbstractFileByPath(linkName.endsWith('.md') ? linkName : `${linkName}.md`);
    if (byPath instanceof TFile) return byPath;
    return app.vault.getMarkdownFiles().find(f => f.basename === linkName) ?? null;
}

async function collectNoteContext(
    app: App,
    primaryFile: TFile
): Promise<{ primary: NoteContext; parents: NoteContext[] }> {
    const primaryContent = await app.vault.read(primaryFile);
    const primary: NoteContext = { title: primaryFile.basename, content: primaryContent };
    const parents: NoteContext[] = [];
    const visited = new Set<string>([primaryFile.path]);
    const queue: { file: TFile; depth: number }[] = [{ file: primaryFile, depth: 0 }];
    while (queue.length > 0) {
        const { file, depth } = queue.shift()!;
        if (depth >= MAX_PARENT_DEPTH) continue;
        const content = depth === 0 ? primaryContent : await app.vault.read(file);
        const linkNames = extractRelatedNoteLinks(content);
        for (const linkName of linkNames) {
            const resolved = resolveWikiLink(app, linkName);
            if (!resolved || visited.has(resolved.path)) continue;
            visited.add(resolved.path);
            const parentContent = await app.vault.read(resolved);
            parents.push({ title: resolved.basename, content: parentContent });
            queue.push({ file: resolved, depth: depth + 1 });
        }
    }
    return { primary, parents };
}

function buildThesisMarkdown(results: IdeaResult[]): string {
    const header = getThesisHeaderTemplate(new Date().toISOString().slice(0, 10));
    const sections = results.map((r, i) => {
        const parentList = r.parentTitles.length > 0
            ? r.parentTitles.map(t => `- [[${t}]]`).join('\n')
            : '_None_';
        return getThesisSectionTemplate(i + 1, r.primaryTitle, parentList, r.llmOutput);
    });
    return header + sections.join('\n');
}

export {
    getPdfUrlFromWebView,
    sanitizePdfUrl,
    fetchPdfBuffer,
    pdfToText,
    extractTextFromPdfUrl,
    setupMarkdowns,
    EXTRACT_IDEA_TAG,
    MAX_PARENT_DEPTH,
    getExtractIdeaFiles,
    extractRelatedNoteLinks,
    resolveWikiLink,
    collectNoteContext,
    buildThesisMarkdown
};