---
name: doi-search-and-fulltext-retrieval
description: >
  Use this skill whenever the user wants to find academic papers, search for research on a topic,
  retrieve paper metadata (h-index, i10-index, citedness), or obtain the full text of a paper.
  Triggers include: "find papers on X", "search for research about X", "get me the PDF of this paper",
  "find high-impact papers on X", "look up this DOI", "get citations for X", or any request that
  involves locating, evaluating, or downloading academic literature. Also trigger when the user
  provides a DOI and wants either metadata or full text. This skill governs the iterative search
  loop (keep searching until quality thresholds are met) AND the full-text retrieval waterfall
  (Unpaywall → open repositories → Sci-Hub, in strict order).
---

# DOI Search — Iterative High-Impact Paper Discovery

A skill for finding the best-quality academic papers on a topic through continuous search refinement,
and for retrieving full text through a strict, ordered access waterfall.

---

## Core Philosophy

A single search is almost never enough. The goal is **quality over speed**: keep iterating until the
result set contains papers with demonstrably strong scholarly impact. Full-text access follows a
**legal-first, last-resort** waterfall — only escalate to the next tool when the previous one
genuinely fails to return a PDF.

---

## Part 1 — Iterative Search Loop

### 1.1 Quality Thresholds

Before stopping, every paper in the final result set must meet **all three** thresholds:

| Metric | Minimum to keep a paper |
|---|---|
| Average author h-index | ≥ 20 |
| Average author i10-index | ≥ 30 |
| Relative citedness / citation count | ≥ 15 (or top-25% for field if count is low) |

If fewer than **3 papers** in the current result set clear all three thresholds, **continue searching**.
Do not stop early just because the user seems satisfied with preliminary results — surface the
metrics explicitly so the user can see why you kept going.

> [!NOTE] Field sensitivity
> Some fields (e.g. pure mathematics, niche humanities) have structurally lower citation counts.
> If after 5 iterations no papers meet the numeric thresholds, surface the best available set and
> flag the field as low-citation rather than silently giving up.

---

### 1.2 Search Sequence

**Step 1 — Seed search**

Run an initial broad query on the topic using `web_search` or a scholarly API (Semantic Scholar,
CrossRef, OpenAlex). Collect DOIs, titles, years, journals.

**Step 2 — Metadata enrichment**

For every DOI returned, fetch author-level metrics from the OpenAlex or Semantic Scholar API:

For each author in the paper compute:
- `avg_h_index` = mean of all authors' hIndex values
- `avg_i10_index` = mean of authors' papers-with-≥10-citations count (use `paperCount` as proxy if
  direct i10 unavailable, or fetch from Google Scholar via scrape only as last resort)
- `avg_citedness` = mean of authors' citationCount / paperCount

**Step 3 — Score and filter**

Apply the thresholds from §1.1. Tag each paper:
- ✅ `passes` — meets all three
- ⚠️ `partial` — meets two of three
- ❌ `fails` — meets fewer than two

**Step 4 — Refinement decision**

If 3 or more papers pass, stop and proceed to present results. If fewer than 3 pass and iterations are under 8, refine the query (see §1.3) and go back to Step 1. Otherwise, surface the best partial results and explain why thresholds weren't met.

**Step 5 — Present results**

Return a ranked table (highest avg_h_index first).

---

### 1.3 Query Refinement Strategies

When a round fails to produce enough passing papers, apply these strategies **in order**,
rotating through them across iterations:

| Iteration | Strategy | Example |
|---|---|---|
| 1 | Broader synonyms | `"machine learning" → "deep learning OR neural networks"` |
| 2 | Add review/survey filter | Append `review` or `survey` to query — review papers aggregate impact |
| 3 | Restrict to high-IF journals | Add journal names: `Nature`, `Science`, `Cell`, `PNAS`, `NEJM` |
| 4 | Cited-by snowball | Take the best `partial` paper so far; fetch its top 10 citing papers |
| 5 | Co-author expansion | Take the highest h-index author found; fetch their other top papers |
| 6 | Year restriction | Limit to last 5 years to surface recent high-citation work |
| 7 | OpenAlex concept filter | Use OpenAlex concept IDs to narrow to the precise sub-field |
| 8 | Manual DOI fallback | Ask user if they have specific DOIs or landmark papers to seed from |

Never repeat the exact same query twice. Every iteration must introduce a meaningfully different
search angle.

---

### 1.4 APIs and Endpoints Reference

#### Semantic Scholar (preferred for author metrics)

#### OpenAlex (preferred for i10-index and concept filtering)

#### CrossRef (DOI metadata fallback)

> [!TIP] Rate limits
> Semantic Scholar: 1 req/sec unauthenticated; 10 req/sec with API key in header `x-api-key`.
> OpenAlex: 10 req/sec; add `mailto=your@email.com` as query param for polite pool (higher limits).
> Always add a 200ms delay between sequential author lookups to avoid 429 errors.

---

## Part 2 — Full-Text Retrieval Waterfall

When the user needs the actual PDF of a paper (not just metadata), follow this **strict ordered
waterfall**. Only move to the next tool if the current one **genuinely fails** to return a
downloadable PDF. Do not skip steps, do not re-order, do not try a later tool "just in case".

---

### Step 1 — Unpaywall (always first)

Unpaywall indexes legal open-access copies. Try this before anything else. Stop if found.

---

### Step 2 — Open Repositories

Try these in sub-order; stop at first hit:

#### 2a. arXiv

#### 2b. Europe PMC / PubMed

#### 2c. Semantic Scholar PDF link

Semantic Scholar sometimes indexes open PDFs directly.

#### 2d. CORE.ac.uk

---

### Step 3 — Publisher Direct (check for free access)

Some publishers make papers freely available after embargo. Check the publisher landing page. Stop if found.

---

### Step 4 — PubMed Central

Only applicable for biomedical/life sciences papers in the NIH mandate. Stop if found.

---

### Step 5 — Sci-Hub (last resort only)

Only attempt Sci-Hub if **all four steps above have been tried and failed**. This is a legal
grey area in many jurisdictions — surface this step to the user before proceeding and let them
confirm.

> [!WARNING] Legal notice
> Sci-Hub operates outside standard copyright agreements. Only use when the paper is inaccessible
> through legal channels and the user explicitly confirms they wish to proceed. Always log which
> DOIs were accessed this way.

**Procedure:**

1. Notify the user: *"Steps 1–4 found no open-access PDF. Sci-Hub may have a copy — do you want me
   to try? Note this bypasses publisher access controls."*
2. On confirmation only, try known Sci-Hub mirrors.
3. Log the access in SOURCES.md.

---

## Part 3 — Logging to SOURCES.md

After any successful retrieval (metadata **or** full text), append to `SOURCES.md` per the
markdown-writer skill's registry schema. 

Fields map as follows:

| SOURCES.md column | Where it comes from |
|---|---|
| Paper Title | Linked to the note that will cite this paper |
| DOI | From CrossRef / Semantic Scholar |
| Avg h-index | Computed in §1.2 |
| Avg i10-index | Computed in §1.2 |
| Avg Citedness | Computed in §1.2 |
| Year | From paper metadata |
| Journal | Full name from CrossRef |
| Volume | From CrossRef |

Do **not** add a row if the DOI already exists in `SOURCES.md`.

---

## Part 4 — Decision Flowchart (Quick Reference)
```text
User requests papers on topic X
        │
        ▼
  Seed search (Step 1)
        │
        ▼
  Enrich metadata for each result
        │
        ▼
  Apply thresholds → count(passes) ≥ 3?
     YES │                    │ NO
         ▼                    ▼
   Present results      iterations < 8?
   + log SOURCES.md       YES │      │ NO
                              ▼      ▼
                         Refine   Surface best
                         query    partials + explain
                         (§1.3)
                              │
                         loop back

─────────────────────────────────────────────────

User requests full text for DOI
        │
        ▼
  Unpaywall API → PDF found? ──YES──▶ Download + STOP
        │ NO
        ▼
  Open repositories (arXiv / PMC / S2 / CORE) → found? ──YES──▶ STOP
        │ NO
        ▼
  Publisher direct (citation_pdf_url meta tag) → found? ──YES──▶ STOP
        │ NO
        ▼
  PubMed Central → found? ──YES──▶ STOP
        │ NO
        ▼
  Confirm with user → Sci-Hub (last resort)