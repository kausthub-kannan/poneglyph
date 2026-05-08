---
name: markdown
description: >-
  Use this skill before any operation that creates or modifies a markdown file
  in the Obsidian vault. It defines the required frontmatter schema, tag
  taxonomy, heading hierarchy, citation format, and the finalization checklist
  including how to update Sources.md. Always apply this skill when invoking
  writeMarkdownTool or appendMarkdownTool.
---

# Markdown Write Tool

A skill for producing well-structured, richly linked Obsidian markdown notes that feel native to the vault.

---

## Core Philosophy

Obsidian markdown is **not** generic markdown. Notes live in a graph. Every note you write should:

- Be **tagged** — tags are the primary discovery mechanism alongside links.
- Be **frontmatter-first** — YAML at the top is the single source of truth for metadata.

> **IMPORTANT INSTRUCTIONS**:\
When creating notes from papers it's imporant that the final note should not be purely just appends of the content of the papers. It should be a synthesis of the content, it should have proper structure and organization. The note should be able to stand on its own and should be able to be understood by someone who has not read the paper. Realise that it's a *intensive research note* not copy-paste of papers. 

---

## 1. New Markdown Creation

These are the Instructions to be followed while creating a new markdown file:
1. The markdown file should be saved with the title as the filename (e.g. title.md)
2. The markdown file should have the following frontmatter:

```
---
title: "The title of the note; same as the filename saved as [filename].md"
tags:
  - draft              # Start with draft; replace with researched when done
  - <topic-tag>        # Add one or more specific topic tags (see Tag Taxonomy below)
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

> **Why this matters:** Obsidian's Dataview plugin, search, and graph all read frontmatter. Consistent fields make queries like `TABLE title, tags FROM "Poneglphy" WHERE contains(tags, "character")` work perfectly.


## 2. Tag Taxonomy

Use tags consistently. A note can have multiple tags from different categories.

| Category | Tags |
|---|---|
| Status | `draft`, `researched` |
| Type | `research`, `location`, `faction`, `timeline`, `concept` |
| Priority | `core`, `supporting` |

**Never invent one-off tags.** If a new category is genuinely needed, add it to this table first.


## 3. Content Structure

### Heading Hierarchy

```
# Major Section    ← Top-level topics
## Sub-section     ← Details within a topic
### Fine detail    ← Use sparingly; prefer prose or bullets
```

### Tables
Use tables for structured comparisons, timelines, or attribute lists — **not** for flowing prose:

```markdown
| Attribute | Value |
| --- | --- |
| First Appearance | [[Chapter 1]] |
| Affiliation | [[Straw Hat Pirates]] |
| Devil Fruit | [[Gomu Gomu no Mi]] |
```

### Citations
Every factual claim should be traceable. At the bottom of the note, include:

```markdown
#### Sources

- [Paper Title](https://doi.org/or-url) — brief note on what this source covers.
```

### Internal Links
Add title names of the initially given or obtained parent/similar existing markdowns in the vault. You can *omit this* if the parent titles were not given

```markdown
#### Parent Nodes

1. [[Parent Note 1 Title]]
2. [[Parent Note 2 Title]]
```

## 4. Finalization Checklist

When a note transitions from draft to complete, update the frontmatter:

- [ ] Replace `draft` tag with `researched`
- [ ] Update the `updated` date field
- [ ] Fill in any empty `related` links
- [ ] Confirm the References section is complete
- [ ] Remove any `> [!TODO]` callouts or resolve them
- [ ] Follow the below instrcutions and updated the table in Source.md

## 2. Editing the Source.md

The Sources.md is the tabular universal data of all the academic paper refernces throughout the vault. The Source.md *must be edited whenever a markdown is finalised and all content are added to it* 

The table schema looks like below:

| Column | Description |
|---|---|
| `Paper Title` | Full title, linked to the note it was cited in: `[[Note Title\|Paper Title]]` |
| `DOI` | Raw DOI string (e.g. `10.1000/xyz123`) |
| `Avg h-index` | Average h-index of all authors at time of publication |
| `Avg i10-index` | Average i10-index of all authors at time of publication |
| `Avg Citedness` | Average relative citation ratio or citation count per author |
| `Year` | Publication year (4-digit) |

Paper Title, DOI are must with other if missing "N/A" neededs to be added. 