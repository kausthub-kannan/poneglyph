import { App, requestUrl } from 'obsidian';
import 'pdfjs-dist/build/pdf.worker.mjs'
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export const IDEA_MD_TEMPLATE = `> [!NOTE] How To Use
> IDEA.md is the place where you store your ideas, research questions, and other thoughts. When you have an idea for a research paper, you can create a new markdown file in the same directory and link it to this file. The more robust IDEA.md is the more robust research will be which would lead to more robust knowledge base.\n>\n`

export function getPdfUrlFromWebView(url: string): Promise<string> {
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
            } catch { }
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
                // Only accept iframe whose src actually points to a PDF
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

const HTML_HEADERS: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
};

export function sanitizePdfUrl(url: string): string {
    url = url.trim();
    // Fix protocol-relative URLs
    if (url.startsWith("//")) {
        url = "https:" + url;
    }
    // Always upgrade HTTP → HTTPS (APS, Springer, etc. use http:// links that redirect)
    if (url.startsWith("http://")) {
        url = "https://" + url.slice(7);
    }
    // Fix missing scheme
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

/**
 * When a URL returns an HTML page instead of a PDF (common with APS, MDPI,
 * Springer landing pages), try to find the direct PDF URL embedded in the HTML.
 *
 * Strategies (in priority order):
 *  1. <meta name="citation_pdf_url"> — Google Scholar / publisher metadata
 *  2. <embed src="...pdf..."> or <iframe src="...pdf...">
 *  3. <a href="...pdf..."> links containing ".pdf" or "/pdf/"
 *  4. meta http-equiv="refresh" redirect
 */
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

    // 1. citation_pdf_url meta tag (highest priority, used by APS, Springer, etc.)
    const citationMatch = html.match(/<meta[^>]+name=["']citation_pdf_url["'][^>]+content=["']([^"']+)["']/i)
        ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']citation_pdf_url["']/i);
    if (citationMatch?.[1]) {
        const resolved = resolveRelative(citationMatch[1]);
        console.log(`[PDF] Found citation_pdf_url: ${resolved}`);
        return resolved;
    }

    // 2. <embed> or <iframe> with a PDF src
    const embedMatch = html.match(/<(?:embed|iframe)[^>]+src=["']([^"']*(?:\.pdf|\/pdf)[^"']*)["']/i);
    if (embedMatch?.[1]) {
        const resolved = resolveRelative(embedMatch[1]);
        console.log(`[PDF] Found embed/iframe PDF src: ${resolved}`);
        return resolved;
    }

    // 3. <a href> links that point to a PDF
    const linkRegex = /<a[^>]+href=["']([^"']*(?:\.pdf|\/pdf(?:\/|\?|$))[^"']*)["']/gi;
    let linkMatch: RegExpExecArray | null;
    const pdfLinks: string[] = [];
    while ((linkMatch = linkRegex.exec(html)) !== null) {
        if (!linkMatch[1]) continue;
        pdfLinks.push(resolveRelative(linkMatch[1]));
    }
    if (pdfLinks.length > 0) {
        console.log(`[PDF] Found ${pdfLinks.length} PDF <a> links, using first: ${pdfLinks[0]}`);
        return pdfLinks[0] ?? null;
    }

    // 4. meta http-equiv="refresh" — e.g. <meta http-equiv="refresh" content="0; url=...">
    const refreshMatch = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^;]*;\s*url=([^"']+)["']/i);
    if (refreshMatch?.[1]) {
        const resolved = resolveRelative(refreshMatch[1].trim());
        console.log(`[PDF] Found meta-refresh redirect: ${resolved}`);
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
    return magic[0] === 0x25 && magic[1] === 0x50 && magic[2] === 0x44 && magic[3] === 0x46; // %PDF
}

/**
 * Fetches a PDF as an ArrayBuffer using Obsidian's requestUrl.
 *
 * Handles:
 *  - HTTP → HTTPS upgrade
 *  - Publisher landing pages (APS, MDPI, Springer) → extracts real PDF URL from HTML
 *  - Magic byte validation to confirm we actually got a PDF
 */
export async function fetchPdfBuffer(pdfUrl: string): Promise<ArrayBuffer> {
    const sanitizedUrl = sanitizePdfUrl(pdfUrl);
    console.log(`[PDF] Fetching: ${sanitizedUrl}`);

    // Step 1: Try fetching directly as a PDF
    const response = await fetchRaw(sanitizedUrl, PDF_HEADERS);

    if (response.status < 200 || response.status >= 300) {
        throw new Error(`Failed to fetch PDF (HTTP ${response.status}): ${sanitizedUrl}`);
    }

    const contentType: string = (response.headers["content-type"] ?? response.headers["Content-Type"] ?? "").toLowerCase();
    console.log(`[PDF] Content-Type: "${contentType}" for ${sanitizedUrl}`);

    const buffer = response.arrayBuffer;
    if (!buffer || buffer.byteLength === 0) {
        throw new Error(`Empty response body when fetching from "${sanitizedUrl}"`);
    }

    // Step 2: If we already have a valid PDF, return it
    if (isPdfMagicBytes(buffer)) {
        console.log(`[PDF] Fetched ${buffer.byteLength} bytes from ${sanitizedUrl}`);
        return buffer;
    }

    // Step 3: We got HTML (landing page). Try to extract the real PDF URL from it.
    if (contentType.includes("html")) {
        console.warn(`[PDF] Got HTML instead of PDF from "${sanitizedUrl}" — attempting to resolve PDF URL from page`);

        const html = new TextDecoder().decode(buffer);
        const resolvedPdfUrl = resolveHtmlToPdfUrl(html, sanitizedUrl);

        if (!resolvedPdfUrl) {
            throw new Error(
                `URL "${sanitizedUrl}" returned an HTML page but no PDF link could be found in it. ` +
                `The paper may be paywalled or the URL may be a landing page without a direct PDF.`
            );
        }

        console.log(`[PDF] Retrying with resolved PDF URL: ${resolvedPdfUrl}`);

        // Step 4: Fetch the actual PDF URL found in the HTML
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

        console.log(`[PDF] Successfully fetched ${pdfBuffer.byteLength} bytes from resolved URL: ${resolvedPdfUrl}`);
        return pdfBuffer;
    }

    // Step 5: Not HTML and not PDF — unknown format
    throw new Error(
        `URL "${sanitizedUrl}" returned unexpected content (Content-Type: "${contentType}"). ` +
        `Expected a PDF or HTML landing page.`
    );
}

export async function pdfToText(buffer: ArrayBuffer): Promise<string> {
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
                .catch(err => {
                    console.warn(`[PDF] Failed to extract text from page ${i + 1}:`, err);
                    return "";
                })
        )
    );

    return pages.filter(Boolean).join("\n");
}

export async function extractTextFromPdfUrl(pdfUrl: string): Promise<string> {
    const buffer = await fetchPdfBuffer(pdfUrl);
    return pdfToText(buffer);
}

export async function setupMarkdowns(app: App) {
    const ideaPath = 'IDEA.md';
    const sourcesPath = 'SOURCES.md';

    if (!app.vault.getAbstractFileByPath(ideaPath)) {
        await app.vault.create(ideaPath, IDEA_MD_TEMPLATE);
    }

    if (!app.vault.getAbstractFileByPath(sourcesPath)) {
        const sourcesContent = `> [!ABSTRACT] Central Citation Source
> Here is where you would find all the cited academic papers or books which has been used throught the knowledge base. This can be used fro quick reference creation in your papers or for other purposes.  \n\n| Paper Title | DOI | Avg h-index | Avg i10-index | Avg Citedness | Year |\n|---|---|---|---|---|---|\n`;
        await app.vault.create(sourcesPath, sourcesContent);
    }
}