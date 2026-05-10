---
name: search
description: >-
  Use this skill whenever the user wants to find academic papers, search for research on a topic,
  retrieve paper metadata (h-index, i10-index, citedness), or obtain the full text of a paper.
  Triggers include: "find papers on X", "search for research about X", "get me the PDF of this paper",
  "find high-impact papers on X", "look up this DOI", "get citations for X", or any request that
  involves locating, evaluating, or downloading academic literature. Also trigger when the user
  provides a DOI and wants either metadata or full text.
---

A skill for discovering, filtering, and retrieving high-quality academic literature on any topic
and depositing citable, DOI-anchored findings into a finished, graph-connected note.

---

## Core Philosophy

Search is not just pulling papers — it's **triangulating evidence** across methods,
replication attempts, and competing theoretical frameworks. Every search session should
leave the vault with stronger sourcing: new wikilinks to constructs and authors, surfaced
contradictions between studies, and explicit trails for what still needs investigating.

A good literature note answers three things:

1. **What is established?** — Findings with strong citation weight, replicated across studies.
2. **What is contested?** — Conflicting results, methodological disputes, rival frameworks.
3. **What is missing?** — Gaps in the literature, understudied populations, open empirical questions.

---

### Tool Stack

| Tool | Purpose |
|------|---------|
| **OpenAlex** (DOI search from query) | Primary discovery — find candidate papers |
| **Unpaywall** | Full-text retrieval — the default search enginer in our case |
| **arXiv / other fulltext tools** | Full-text for 'arxiv' papers. Use it whenever the doi has the word 'arxiv' in it |
| **Sci-Hub fulltext tool** | Last resort only — use if all above fail |

---

### Step 1 — Discovery via OpenAlex

Run your query through the OpenAlex DOI search tool. For each result, OpenAlex returns per-paper quality signals — **use these to rank and filter before retrieving full text**:

| Signal | What it means | Prefer |
|--------|--------------|--------|
| `cited_by_count` | Raw citation count | Higher |
| `cited_by_percentile` | Percentile within field/year | ≥ 75th |
| `fwci` (Field-Weighted Citation Impact) | Citations relative to field average | > 1.0 |
| `i10_index` (where available) | Papers with 10+ citations | Higher |

> [!NOTE] Quality Filter
> Deprioritise papers with very low citation counts **unless** the topic is recent (< 2 years)
> or the paper is the only primary source available for a specific claim.

Don't retrieve full text for every result — shortlist the strongest candidates first.

---

### Step 2 — Full-Text Retrieval (in order)

For each shortlisted DOI, attempt retrieval in this strict order. **Stop at the first success.**

Unpaywall          ← Full-text retrieval — the default search enginer in our case
arXiv fulltext     ← Do not use this tool unless the doi has the word 'arxiv' in it
[other fulltext tools similar to arXiv fulltext tool, .i.e if the doi has similarity to the tool name use it else go to default .i.e Unpaywall]
Sci-Hub            ← last resort only, if all above fail


> [!WARNING] Sci-Hub is the final fallback, not a convenience shortcut.
> Only invoke it after the full chain above has been exhausted for that DOI.

---

### Step 3 — What to Record

For every paper retrieved, note:

- DOI
- Full citation (Author, Year, Journal, DOI)
- Quality signals (cited_by_count, fwci or percentile)
- Full-text source (Unpaywall / arXiv / Sci-Hub / etc.)
- Whether it is peer-reviewed or a preprint

---