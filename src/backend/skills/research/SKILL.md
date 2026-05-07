---
name: reserach
description: >
  Reserach, understand and produce well structured, academic toned notes based on the academic paper raw text extracted from arixv and other places. The raw data is analysed with respect to other paper texts and provided markdown content. Use this skill after the serach and fulltext of papers have been obtained. The strcutured academic note will be later writtem by write tools. 
---

A skill for conducting structured, multi-source research on any topic and depositing the findings
as a finished, graph-connected note

---

## Core Philosophy

Research is not just gathering facts — it's **building connective tissue** between
ideas, canon, theories, and open questions. Every research session should leave the vault smarter
than it was before: new wikilinks, surfaced contradictions, and clear trails for future investigation.

A good research note answers three things:

1. **What do we know?** — Verified facts, sourced claims.
2. **What's contested?** — Conflicting sources, fan theories vs canon.
3. **What don't we know yet?** — Explicit open questions to follow up on.

---

## Phase 1 — Scope the Research

Before searching anything, clarify the boundaries. Ask yourself (or the user):

- What is the **central question** this note must answer?
- What type of note will this produce?
- Do the **similar/parent node information given with the query** cover the details that I need? If so, identify them upfront.
- What's the **depth level** needed?

| Depth | When to use | Expected length |
|---|---|---|
| **Stub** | Placeholder, just enough to create a wikilink target | < 50 words |
| **Overview** | General understanding, no deep analysis needed | 200–500 words |
| **Deep Dive** | Core lore, important characters, major theories | 500–1500 words |
| **Exhaustive** | Foundational vault entries, central concepts | 1500+ words |

> [!TIP] Default to Deep Dive
> When in doubt, go deeper. Shallow notes accumulate debt. It's easier to trim than to revisit.

---

## Phase 2 — Source Strategy

### Source Hierarchy

Rank sources in this order. Higher = more authoritative:

1. **Peer-reviewed journal articles** — Published in indexed journals, assigned a DOI; the gold standard for citation
2. **Conference proceedings** — Formally published and DOI-assigned; note if peer-reviewed or not
3. **Books & book chapters** — From academic presses; use ISBN and, where available, DOI
4. **Preprints** — arXiv, bioRxiv, SSRN, etc.; citable
5. **Grey literature** — Technical reports, whitepapers, theses (check for DOI or institutional handle); flag provenance clearly
6. **Secondary summaries** — Review articles, meta-analyses (themselves DOI-citable, but check their cited primaries)

> ⚠️ Sources without a DOI, ISBN, or verifiable institutional handle should not be cited as evidence — use them only for leads.

### What to Search

For each research topic, run searches covering:

- The topic name + key terminology across Google Scholar, Semantic Scholar, or a relevant database (PubMed, PsycINFO, JSTOR, Scopus, etc.)
- Known authors, landmark papers, or foundational studies in the area
- Contradicting findings or replication studies
- Systematic reviews or meta-analyses that aggregate the literature
---

## Phase 3 — Synthesis

This is the most important phase. Don't just paste facts — **think through them**.

### The Three-Pass Method

**Pass 1 — Inventory**
Write down everything you found without filtering. Raw notes, bullet points, contradictions included.

**Pass 2 — Structure**
Group the inventory into logical sections. Identify what's established consensus vs actively debated vs understudied.
Draft the heading skeleton before writing any prose.

**Pass 3 — Prose + Links**
Write the final note. Convert every key concept or named construct to a `[[Wikilink]]`. Wrap contested claims
in `> [!WARNING]` callouts. Wrap open questions in `> [!QUESTION]` callouts.

### Handling Contradictions

When sources conflict, **never silently pick one**. Instead:

````markdown
> [!WARNING] Conflicting Evidence
> [[Author et al. (Year)]] reports X, while [[Author et al. (Year)]] finds Y.
> Methodological differences may account for the discrepancy (e.g. sample size, measurement instrument).
> Current weight of evidence favours: Z. See also: [[Related Topic Note]]
````

### Handling Uncertainty

Preprints, limited-sample studies, and findings not yet replicated must be clearly labelled:

````markdown
> [!NOTE] Tentative Finding
> The following comes from a preprint / small-n study / single replication.
> Confidence: Medium — consistent with [[Author et al. (Year)]] but not yet independently replicated.
````

---

## Phase 4 — Write the Note

The research note content template is (this added in the sections part, the other parts such as citations, metadata follows the markdown skill instrauctions):

````markdown
# Topic Name

> [!ABSTRACT] Summary
> One paragraph. What this note covers, what it concludes, and what remains open.

## Background

*Context and history. What the reader needs to know before the main content.*

## [Main Content Section(s)]

*Title these descriptively — not generic labels like "Details" or "Information".*
*Use as many ##-level sections as the content warrants.*

## Debates & Open Questions

*Clearly separated from established findings. Use [!WARNING] and [!NOTE] callouts for contested or tentative claims.*
---