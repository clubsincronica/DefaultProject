# Obsidian Plugins Setup Guide

This guide explains the recommended community plugins for the Club Sincrónica / Pipeline Viral Obsidian vault, tailored to the Tzolkin knowledge base and meditation content workflow.

## Installing Plugins

1. Open Obsidian Settings (Ctrl+,)
2. Navigate to **Community plugins** → **Browse**
3. Search for the plugin name below
4. Click **Install**, then **Enable**

---

## Priority 1: Essential (Install First)

### Dataview

> Transform your vault into a queryable database using frontmatter metadata.

**What it does:** Query notes with SQL-like syntax. Display results as tables, lists, or task boards. Every YAML frontmatter field becomes a queryable column.

**Use cases for this project:**

List all kins by seal:
```dataview
TABLE seal, tone, chakra, freq
FROM "Kin-Data"
WHERE kin > 20
SORT kin ASC
```

Show completed harmonics:
```dataview
TABLE harmonic, drone, status
FROM "Pipeline"
WHERE status = "completado"
SORT harmonic DESC
```

Find all notes with a specific tag:
```dataview
LIST
FROM #tzolkin
WHERE file.name contains "Serpiente"
```

**Configuration:**
- Settings → Dataview → Enable "Enable JavaScript queries" (for advanced use cases)
- Settings → Dataview → Enable "Enable inline queries" (for inline field syntax)

---

### Templater

> Dynamic templates with JavaScript execution. Automates note creation and eliminates manual structure.

**What it does:** Replace static templates with programmable scripts. Insert variables, run logic, prompt for input, rename files — all at note creation time.

**Syntax:**
- `<% tp.date.now("YYYY-MM-DD") %>` — current date
- `<% tp.file.title %>` — note title
- `<% tp.system.prompt("Question?") %>` — user input
- `<%* ... %>` — execution block (run JavaScript)

**Template for a new kin note:**

Create `templates/Kin-Note.md`:
```markdown
---
tags: [kin, tzolkin]
kin: <% tp.system.prompt("Kin number?") %>
seal: <% tp.system.prompt("Seal (1-20)?") %>
tone: <% tp.system.prompt("Tone (1-13)?") %>
chakra: 
freq: 
---

# Kin <% tp.file.title %>

## Sello

## Tono

## Lema

## Aspectos

## Referencias
- [[Tzolkin-Overview]]
```

**Template for a new harmonic:**

Create `templates/Harmonic-Note.md`:
```markdown
---
tags: [harmonic, pipeline-viral]
harmonic: H<% tp.system.prompt("Harmonic number?") %>
kins: <% tp.system.prompt("Kin numbers (e.g. 25-28)?") %>
drone: <% tp.system.prompt("Drone frequency?") %>
status: pendiente
---

# Harmonic <% tp.file.title %>

## Drone
## Kins
## Guion
## Audio
## Publicacion
```

**Configuration:**
- Settings → Templater → Template folder location: `templates`
- Settings → Templater → Enable "Trigger Templater on new file creation"
- Settings → Templater → Folder Templates: map `Kin-Data/` → `Kin-Note.md`, `Pipeline/` → `Harmonic-Note.md`

---

### Calendar Plus

> Visual calendar sidebar with daily, weekly, monthly, quarterly, and yearly periodic notes built-in.

**What it does:** Shows a calendar in the sidebar. Click a day to open/create that day's note. Each day = a kin in your workflow.

**Why Calendar Plus over the original Calendar plugin:**
- Built-in periodic notes (daily, weekly, monthly, quarterly, yearly)
- No separate Periodic Notes plugin required
- Year navigator for quick jumping between months
- history button shows which months have notes

**Use cases:**
- Click a date → opens that day's kin note
- See which days have notes (production tracking)
- Navigate between adjacent kins visually
- Weekly reviews of harmonic production

**Configuration:**
- Settings → Calendar Plus → Enable "Daily notes"
- Settings → Calendar Plus → Daily note folder: (your daily notes location)
- Settings → Calendar Plus → Date format: `YYYY-MM-DD`

**Alternative:** If you prefer the original Calendar plugin (by Liam Cain), it works fine too — just install "calendar" instead. You'll also need the separate "Periodic Notes" plugin for weekly/monthly notes.

---

## Priority 2: High Value (Install After Essentials)

### Excalidraw

> Hand-drawn whiteboard inside Obsidian. Storyboarding, diagrams, visual thinking.

**What it does:** Full drawing toolkit — freehand pen, shapes, connectors, text, images. Hand-drawn sketch aesthetic. Drawings stored as markdown files in your vault.

**Use cases for this project:**

**Storyboard sketches:**
- Draw frame compositions before rendering
- Sketch visual meditation layouts
- Plan subtitle positioning

**Pipeline flow diagrams:**
```
tzolkin → astro → generate-day → guion → grabacion →
transcripcion → validate-astro → storyboard → musica →
frames → assemble → publicacion
```

**Maya cosmology diagrams:**
- Visual maps of seal/tone/chakra relationships
- Frequency relationship charts
- Harmonic connection maps

**Key features:**
- Embed drawings in notes: `![[my-drawing.excalidraw]]`
- Link drawing elements to notes: `[[file#^elementID]]`
- Script engine for automation
- Mermaid diagram support
- Export to PNG/SVG

**Configuration:**
- Settings → Excalidraw → Set auto-save interval
- Settings → Excalidraw → Configure export settings (transparent background, dark mode)

---

## Priority 3: Enhanced Visualization (Install When Ready)

### Graph Analysis

> Enhanced graph view with community detection and clustering.

**What it does:** Extends Obsidian's built-in graph view with algorithms that find communities, clusters, and hidden connections.

**Use cases:**
- See which kins are most connected (god nodes)
- Find clusters of related concepts (seal families, chakra groups)
- Identify isolated notes that need more connections
- Visualize the Tzolkin knowledge network

**How to use:**
1. Open Graph View (Ctrl+G)
2. Click the Graph Analysis icon in the top-right
3. Run community detection to find clusters
4. Click a community to highlight its members

---

### Daily Notes

> Auto-creates one note per day. Complementary to Calendar for daily workflow.

**What it does:** Built-in Obsidian core plugin. Creates a note for each day with configurable format and template.

**Use cases:**
- Daily production log (what was published, what's pending)
- Kin-of-the-day reflection
- Quick capture of ideas during meditation

**Configuration:**
- Settings → Core plugins → Daily notes → Enable
- Settings → Core plugins → Daily notes → Date format: `YYYY-MM-DD`
- Settings → Core plugins → Daily notes → New file location: (your daily notes folder)
- Settings → Core plugins → Daily notes → Template file: (your daily note template)

---

## Configuration Summary

After installing all plugins, configure them:

| Plugin | Key Setting | Value |
|--------|-------------|-------|
| Dataview | Enable JavaScript queries | ON |
| Dataview | Enable inline queries | ON |
| Templater | Template folder location | `templates` |
| Templater | Trigger on new file creation | ON |
| Templater | Folder Templates | `Kin-Data/` → `Kin-Note.md` |
| Calendar Plus | Enable Daily notes | ON |
| Calendar Plus | Date format | `YYYY-MM-DD` |
| Excalidraw | Auto-save | ON |
| Daily Notes | Date format | `YYYY-MM-DD` |
| Daily Notes | New file location | (your choice) |

---

## Plugin Interaction Map

```
                    ┌─────────────┐
                    │  Templater  │
                    │ (templates) │
                    └──────┬──────┘
                           │ creates notes with
                           ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Calendar   │───▶│  Daily Notes │◀───│  Dataview    │
│  (navigate)  │    │   (journal)  │    │  (query)     │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐    ┌──────────────┐
                    │ Excalidraw   │    │Graph Analysis│
                    │ (storyboard) │    │ (visualize)  │
                    └──────────────┘    └──────────────┘
```

---

## Obsidian vs Orca — When to Use What

These tools serve completely different purposes. They are complementary, not alternatives.

| Use Case | Tool | Why |
|----------|------|-----|
| Documenting a kin's meaning, seal, tone | **Obsidian** | Knowledge base with wikilinks |
| Generating a procedural music pattern | **Orca** | 2D grid sequencer produces MIDI |
| Managing pipeline documentation | **Obsidian** | Markdown vault with graph view |
| Creating rhythmic sequences for beds | **Orca** | Mathematical rule-based generation |
| Searching "what did I decide about H7?" | **Obsidian** | Full-text search + backlinks |
| Generating kin-tone patterns for strudel | **Orca** | Maps seal→MIDI, tone→rhythm |
| Tracking project status | **Obsidian** | Dataview tables query metadata |
| Creating MIDI for soundscape.js | **Orca** | Orca→Strudel bridge converts events |

**In practice:** Orca generates the music, Obsidian documents everything around it.
