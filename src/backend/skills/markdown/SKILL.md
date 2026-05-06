---
name: markdown-writer
description: >
  Write, structure, and maintain beautifully formatted Obsidian markdown notes.
  Trigger this skill whenever the user wants to create a new note, research document, or wiki entry inside
  their Poneglphy Obsidian vault — even if they just say "write this up", "add a note about X", or
  "document this". Also trigger when the user asks to format, clean up, or improve an existing note.
  Covers research papers, character/world-building entries, lore documents, and any other vault content.
---

# Obsidian Note Writing — Poneglphy Vault

A skill for producing well-structured, richly linked Obsidian markdown notes that feel native to the vault.

---

## Core Philosophy

Obsidian markdown is **not** generic markdown. Notes live in a graph. Every note you write should:

- Be **linkable** — use `[[Wikilinks]]` generously so the graph stays connected.
- Be **scannable** — readers navigate by headings; make them descriptive, not generic.
- Be **tagged** — tags are the primary discovery mechanism alongside links.
- Be **frontmatter-first** — YAML at the top is the single source of truth for metadata.

---

## 1. Document Initialization

Before writing any content, create the file and lay down the skeleton:

### Frontmatter (YAML)

Every note **must** open with a YAML frontmatter block. Use this template and fill in all fields:

```yaml
---
title: "Note Title Here"
aliases: []            # Alternative names this note can be found under
tags:
  - draft              # Start with draft; replace with researched when done
  - poneglphy          # Always include the project tag
  - <topic-tag>        # Add one or more specific topic tags (see Tag Taxonomy below)
created: YYYY-MM-DD
updated: YYYY-MM-DD
related: []            # [[Wikilinks]] to closely related notes
source: ""             # URL, book, or reference if applicable
---
```

> **Why this matters:** Obsidian's Dataview plugin, search, and graph all read frontmatter. Consistent fields make queries like `TABLE title, tags FROM "Poneglphy" WHERE contains(tags, "character")` work perfectly.

### H1 Title

Immediately after frontmatter, write a single `# Title` that matches the `title` field exactly. This is what shows in graph hover previews.

---

## 2. Tag Taxonomy

Use tags consistently. A note can have multiple tags from different categories.

| Category | Tags |
|---|---|
| Status | `draft`, `researched`, `stub`, `needs-review` |
| Type | `research`, `lore`, `character`, `location`, `faction`, `timeline`, `concept` |
| Priority | `core`, `supporting`, `reference` |
| Project | `poneglphy` *(always include)* |

**Never invent one-off tags.** If a new category is genuinely needed, add it to this table first.

---

## 3. Content Structure

### Heading Hierarchy

```
# Title             ← Single, matches frontmatter title
## Major Section    ← Top-level topics
### Sub-section     ← Details within a topic
#### Fine detail    ← Use sparingly; prefer prose or bullets
```

Avoid skipping levels (e.g., jumping from `##` to `####`).

### Wikilinks

Use `[[Wikilinks]]` for every proper noun, concept, or entity that has (or *should* have) its own note:

- Characters → `[[Character Name]]`
- Locations → `[[Location Name]]`
- Concepts → `[[Concept Name]]`
- Events → `[[Event Name]]`

If the note doesn't exist yet, link it anyway — Obsidian shows broken links as a prompt to create them, keeping the graph honest.

Use **aliased links** when the display text should differ from the note title:

```markdown
[[Grand Line|the most dangerous sea route]]
```

### Callouts

Use Obsidian callouts to highlight important information without cluttering prose:

```markdown
> [!NOTE] Context
> Background information the reader needs before diving in.

> [!WARNING] Contested Canon
> Multiple sources disagree on this point. See [[Alternative Theory]].

> [!TIP] Research Lead
> Follow up on this thread — may connect to [[Void Century]].

> [!QUOTE]
> "Exact quote from a source." — Author, *Work*, Year
```

Available callout types: `NOTE`, `TIP`, `WARNING`, `DANGER`, `QUOTE`, `ABSTRACT`, `TODO`, `QUESTION`.

### Tables

Use tables for structured comparisons, timelines, or attribute lists — **not** for flowing prose:

```markdown
| Attribute | Value |
| --- | --- |
| First Appearance | [[Chapter 1]] |
| Affiliation | [[Straw Hat Pirates]] |
| Devil Fruit | [[Gomu Gomu no Mi]] |
```

### Code Blocks (for in-universe data, transcriptions, etc.)

When reproducing structured in-universe data (coordinates, cipher text, logbook entries), use fenced code blocks with an appropriate language hint or `text`:

````markdown
```text
Log Entry — Day 47
Position: 23°N, 157°W
Weather: Calm. Too calm.
```
````

---

## 4. Citations and References

Every factual claim should be traceable. At the bottom of the note, before any footer, include:

```markdown
## References

- [Author or Work Title](https://doi.org/or-url) — brief note on what this source covers.
- [[Internal Note Title]] — cross-reference to a related vault note.
```

Format rules:
- External sources: `[Display Name](URL or DOI)`
- Internal sources: `[[Note Title]]`
- Always add a short annotation after the dash explaining *why* the source is cited.

---

## 5. Footer Block

End every note with a footer section to keep navigation consistent:

```markdown
---

## See Also

- [[Closely Related Note 1]]
- [[Closely Related Note 2]]

## Backlinks

*(Obsidian populates this automatically — leave blank or omit)*
```

---

## 6. Finalization Checklist

When a note transitions from draft to complete, update the frontmatter:

- [ ] Replace `draft` tag with `researched` (or `needs-review` if uncertain)
- [ ] Update the `updated` date field
- [ ] Fill in any empty `related` links
- [ ] Verify all `[[Wikilinks]]` are correct (no typos)
- [ ] Confirm the References section is complete
- [ ] Check heading hierarchy (no skipped levels)
- [ ] Remove any `> [!TODO]` callouts or resolve them

---

## 7. Quick Reference — Common Patterns

### Character Entry

```markdown
---
title: "Character Name"
tags: [researched, poneglphy, character]
created: 2025-01-01
updated: 2025-01-01
related: ["[[Faction Name]]", "[[Home Location]]"]
---

# Character Name

Brief one-line description of who this character is.

## Overview
...

## Background
...

## Abilities
...

## Relationships
| Character | Nature |
|---|---|
| [[Ally Name]] | Crewmate |

## References
- [Source](url)
```

### Research / Lore Note

```markdown
---
title: "Topic Name"
tags: [draft, poneglphy, research, lore]
created: 2025-01-01
updated: 2025-01-01
source: "https://..."
---

# Topic Name

> [!NOTE] Scope
> What this note covers and what it intentionally omits.

## Background
...

## Analysis
...

## Open Questions

- [ ] Question one
- [ ] Question two

## References
...
```

---

Following this skill ensures every note you drop into the Poneglphy vault is consistent, graph-connected, and easy to navigate months later.

## 8. SOURCES.md — Vault-Wide Citation Registry

After completing any note that includes a References section, **append each new external source** to the master citation table at the vault root: `SOURCES.md`.

### Table Schema

`SOURCES.md` maintains a single Markdown table with these columns:

| Column | Description |
|---|---|
| `Paper Title` | Full title, linked to the note it was cited in: `[[Note Title\|Paper Title]]` |
| `DOI` | Raw DOI string (e.g. `10.1000/xyz123`), or `—` if unavailable |
| `Avg h-index` | Average h-index of all authors at time of publication |
| `Avg i10-index` | Average i10-index of all authors at time of publication |
| `Avg Citedness` | Average relative citation ratio or citation count per author |
| `Year` | Publication year (4-digit) |
| `Journal` | Full journal name, not abbreviated |
| `Volume` | Volume number, or `—` if not applicable |

### Table Format

```markdown
| Paper Title | DOI | Avg h-index | Avg i10-index | Avg Citedness | Year | Journal | Volume |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [[My Note\|Some Paper Title]] | 10.1000/xyz123 | 24 | 31 | 18.4 | 2021 | Nature Communications | 12 |
```

### Rules

- **One row per external source.** Internal `[[Wikilinks]]` citations are not added to SOURCES.md.
- **No duplicate DOIs.** Before appending, check if the DOI already exists in the table. If it does, skip — do not add a second row.
- **Link back to the originating note** using an aliased wikilink in the Paper Title column so the table stays graph-connected.
- **Leave unknown fields as `—`**, never leave cells blank — blank cells break table alignment in Obsidian.
- **Preserve existing rows** — only append; never delete or reorder existing entries.

### Finalization Step

Add this check to the Section 6 Finalization Checklist:

- [ ] Each new external citation appended to `SOURCES.md` with all fields filled (or `—` for unknowns)
- [ ] No duplicate DOIs introduced into `SOURCES.md`