---
name: reserach
description: >
  Deep-research any topic for the Poneglphy project and produce a finished, vault-ready Obsidian note.
  Trigger this skill whenever the user asks to "research", "investigate", "deep-dive", "find out about",
  "look into", or "explore" a topic — even casually phrased requests like "what's the deal with X" or
  "can you dig into Y". Also trigger when the user wants to verify a theory, cross-reference canon,
  trace a concept's history, or build a sourced lore entry. Output always follows the obsidian-poneglphy
  skill conventions (frontmatter, wikilinks, callouts, references).
---

# Poneglphy Research Skill

A skill for conducting structured, multi-source research on any topic and depositing the findings
as a finished, graph-connected note in the Poneglphy vault.

---

## Core Philosophy

Research for Poneglphy is not just gathering facts — it's **building connective tissue** between
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
- What type of note will this produce? (lore, character, concept, timeline, faction — see tag taxonomy in `obsidian-poneglphy` skill)
- Are there **existing vault notes** this should link to? If so, identify them upfront.
- What's the **depth level** needed?

| Depth | When to use | Expected length |
|---|---|---|
| **Stub** | Placeholder, just enough to create a wikilink target | < 100 words |
| **Overview** | General understanding, no deep analysis needed | 200–500 words |
| **Deep Dive** | Core lore, important characters, major theories | 500–1500 words |
| **Exhaustive** | Foundational vault entries, central concepts | 1500+ words |

> [!TIP] Default to Deep Dive
> When in doubt, go deeper. Shallow notes accumulate debt. It's easier to trim than to revisit.

---

## Phase 2 — Source Strategy

### Source Hierarchy

Rank sources in this order. Higher = more authoritative:

1. **Primary canon** — Original manga chapters, official databooks, author (Oda) interviews
2. **Anime adaptation** — Generally canon, but filler arcs are non-canon; label clearly
3. **Official supplementary material** — SBS columns, Vivre Cards, One Piece novel series
4. **Reputable aggregators** — One Piece Wiki (verify against primary), established wikis
5. **Community analysis** — Fan theories, Reddit deep-dives (always flag as `speculative`)

### What to Search

For each research topic, run searches covering:

- The topic name + "one piece" or "poneglphy" context
- Specific chapter or episode references if known
- Contradicting or alternative theories
- Any related concepts already in the vault (`[[Wikilinks]]` you know exist)

### Source Logging

As you gather sources, maintain an internal scratchpad:

```
SOURCE LOG
- [One Piece Wiki — Void Century](url) → overview, cross-check with primary
- [SBS Vol. 45](url) → Oda confirms X
- [Chapter 967 raw analysis](url) → speculative, fan translation
```

This becomes the `## References` section at the end.

---

## Phase 3 — Synthesis

This is the most important phase. Don't just paste facts — **think through them**.

### The Three-Pass Method

**Pass 1 — Inventory**
Write down everything you found without filtering. Raw notes, bullet points, contradictions included.

**Pass 2 — Structure**
Group the inventory into logical sections. Identify what's verified vs contested vs unknown.
Draft the heading skeleton before writing any prose.

**Pass 3 — Prose + Links**
Write the final note. Convert every proper noun to a `[[Wikilink]]`. Wrap contested claims
in `> [!WARNING]` callouts. Wrap open questions in `> [!QUESTION]` callouts.

### Handling Contradictions

When sources conflict, **never silently pick one**. Instead:

```markdown
> [!WARNING] Canon Conflict
> [[Source A]] states X, while [[Source B]] claims Y.
> Oda has not clarified this directly. Current best interpretation: Z.
> See also: [[Related Theory Note]]
```

### Handling Speculation

Fan theories and unconfirmed interpretations are valuable — but must be clearly labelled:

```markdown
> [!NOTE] Speculative
> The following is based on community analysis, not confirmed canon.
> Confidence: Medium — supported by [[Chapter 967]] but not yet confirmed.
```

---

## Phase 4 — Write the Note

Follow the `obsidian-poneglphy` skill exactly for structure. The research note template is:

````markdown
---
title: "Topic Name"
aliases: []
tags:
  - draft
  - poneglphy
  - research
  - <type-tag>          # lore / character / concept / timeline / faction
  - <priority-tag>      # core / supporting / reference
created: YYYY-MM-DD
updated: YYYY-MM-DD
related: []
source: ""
depth: deep-dive        # stub / overview / deep-dive / exhaustive
confidence: high        # high / medium / low / speculative
---

# Topic Name

> [!ABSTRACT] Summary
> One paragraph. What this note covers, what it concludes, and what remains open.

## Background

*Context and history. What the reader needs to know before the main content.*

## [Main Content Section(s)]

*Title these descriptively — not generic labels like "Details" or "Information".*
*Use as many ##-level sections as the content warrants.*

## Theories & Interpretations

*Clearly separated from verified facts. Use [!NOTE] Speculative callouts.*

## Open Questions

- [ ] Unresolved question one — link to [[Related Note]] if applicable
- [ ] Unresolved question two

## Timeline (if applicable)

| Date / Arc | Event | Source |
|---|---|---|
| Pre-timeskip | [[Event Name]] | [[Chapter X]] |

## References

- [Source Title](url) — what this source contributes.
- [[Internal Note]] — why this vault note is relevant.

---

## See Also

- [[Related Note 1]]
- [[Related Note 2]]
````

---

## Phase 5 — Self-Review Before Finalizing

Run through this checklist before marking the note `researched`:

### Accuracy
- [ ] Every claim has a traceable source in `## References`
- [ ] Contested claims are wrapped in `> [!WARNING]` callouts
- [ ] Speculation is clearly labelled and separated from canon

### Obsidian Integration
- [ ] All proper nouns are `[[Wikilinks]]`
- [ ] Frontmatter `related` field is populated
- [ ] `depth` and `confidence` fields are set accurately
- [ ] Tags match the taxonomy in the `obsidian-poneglphy` skill

### Completeness
- [ ] `## Open Questions` section exists — even "nothing unresolved" should be stated
- [ ] `> [!ABSTRACT]` summary is accurate to the actual content
- [ ] `## See Also` links are relevant, not just anything related

### Finalization
- [ ] Replace `draft` tag → `researched` (or `needs-review` if confidence is low/speculative)
- [ ] Update `updated` date

---

## Appendix — Confidence Levels

Use the `confidence` frontmatter field consistently:

| Level | Meaning |
|---|---|
| `high` | Directly confirmed by primary canon (manga, official databooks, Oda SBS) |
| `medium` | Strongly implied by canon, or confirmed by reliable secondary sources |
| `low` | Inferred from indirect evidence; plausible but not confirmed |
| `speculative` | Fan theory or personal interpretation; no direct canon support |

A single note can contain claims of different confidence levels — use callouts to mark those inline.
The frontmatter `confidence` field reflects the **overall** confidence of the note's central thesis.

---

## Appendix — Depth vs. Confidence Matrix

Use this to quickly decide how much effort to put in and how strongly to assert claims:

|  | High Confidence | Low Confidence |
|---|---|---|
| **Deep Dive** | Full prose, sourced, definitive | Full prose + heavy `[!WARNING]` callouts, explicit uncertainty |
| **Stub** | Short, factual, link-forward | Note it's a stub *and* speculative; flag for review |

---

*Pair this skill with `obsidian-poneglphy` for all formatting, wikilink, and tag conventions.*
