# DocForge User Guide

DocForge is a structured document editor for Windows. You build documents from **sections** and **blocks** (headings, paragraphs, figures, tables, and more). Everything is stored as JSON in a project folder, and you can export to Word (`.docx`) when you are ready to share.

This guide walks through the full workflow: launching the app, creating a project, adding content, using assets and styles, AI features, validation, and export.

---

## Table of contents

1. [Launching DocForge](#1-launching-docforge)
2. [The interface at a glance](#2-the-interface-at-a-glance)
3. [Projects: New, Open, and Save](#3-projects-new-open-and-save)
4. [Document structure](#4-document-structure)
5. [Adding content (the main workflow)](#5-adding-content-the-main-workflow)
6. [Editing in the canvas](#6-editing-in-the-canvas)
7. [The document tree (left panel)](#7-the-document-tree-left-panel)
8. [Properties inspector (right panel)](#8-properties-inspector-right-panel)
9. [Block types reference](#9-block-types-reference)
10. [Asset library (bottom panel)](#10-asset-library-bottom-panel)
11. [Styles](#11-styles)
12. [AI features](#12-ai-features)
13. [Validation](#13-validation)
14. [Export](#14-export)
15. [Settings](#15-settings)
16. [Keyboard shortcuts](#16-keyboard-shortcuts)
17. [Example workflow: building a report from scratch](#17-example-workflow-building-a-report-from-scratch)
18. [Tips and current limitations](#18-tips-and-current-limitations)

---

## 1. Launching DocForge

From the project folder:

```powershell
cd D:\Network_PC\Programming\DocCreator
npm install          # first time only
npm run tauri dev
```

The app opens as a desktop window titled **DocForge**.

### OpenAI API key (optional, for AI features)

Create a `.env` file in the project root:

```env
VITE_OPENAI_API_KEY=sk-your-key-here
```

Restart the dev server after changing `.env`. You can also enter a key in **Settings** (stored locally on your machine). If both are set, `.env` takes precedence.

### Try an existing sample project

After running tests, a sample project is saved at:

```
TestOutput\integration-test-document
```

Use **Open** in the toolbar and select that folder to explore a fully built document with figures, tables, and styles.

---

## 2. The interface at a glance

DocForge uses a five-zone layout:

```
┌─────────────────────────────────────────────────────────────────┐
│  Toolbar — New, Open, Save, Export, AI, Validate, Styles, Settings │
├──────────┬──────────────────────────────────────┬─────────────────┤
│          │                                      │                 │
│ Document │         Editor canvas                │   Properties    │
│   tree   │    (read and write content here)     │   inspector     │
│          │                                      │                 │
├──────────┴──────────────────────────────────────┴─────────────────┤
│  Asset library (images and files)                                 │
├───────────────────────────────────────────────────────────────────┤
│  Status bar — section/block counts, project path, save state        │
└───────────────────────────────────────────────────────────────────┘
```

| Zone | Purpose |
|------|---------|
| **Toolbar** | File operations, export, AI generation, validation, styles, settings |
| **Document tree** (left) | Sections and blocks; add, reorder, duplicate, delete |
| **Editor canvas** (center) | Where you type and edit block content |
| **Properties inspector** (right) | Style, layout, and block-specific settings |
| **Asset library** (bottom) | Import and manage images/files; drag into sections |
| **Status bar** | Shows counts, project path, and whether you have unsaved changes |

**Resize panels:** Drag the thin dividers between panels to change their size.

**Collapse the asset library:** Click the chevron in the asset library header, or click the **Asset Library** strip at the bottom when collapsed.

---

## 3. Projects: New, Open, and Save

DocForge saves work as a **project folder**, not a single file.

### Project folder contents

```
my-project/
  document.json    ← document structure and content
  styles.json      ← typography and style definitions
  assets/          ← imported images and files
  thumbnails/      ← preview images for the asset library
  metadata.db      ← project metadata (managed by the app)
```

### Create a new project

1. Click **New** (or press `Ctrl+N`).
2. Choose an empty folder (or create one) where the project will live.
3. DocForge creates `document.json`, `styles.json`, and supporting folders.
4. You start with one section called **Introduction** and an empty document title (**Untitled Document**).

### Open an existing project

1. Click **Open** (or press `Ctrl+O`).
2. Select the project **folder** (the one containing `document.json`).

### Save

- **Save** (`Ctrl+S`) writes `document.json` and `styles.json` to the open project folder.
- **Autosave** is on by default (every 2 seconds after a change, when a project is open). Toggle this in **Settings**.
- The status bar shows **Unsaved changes**, **Saving...**, or **Saved**.

> **Important:** You must save a project before importing assets. Asset files are copied into the project's `assets/` folder.

---

## 4. Document structure

Every document has three levels:

```
Document
├── metadata (title, author, template, dates)
└── sections[]
    └── blocks[]
```

- **Document title** — shown as a large heading at the top of the editor canvas.
- **Sections** — major divisions (e.g. *Introduction*, *Methods*, *Results*). Each has a title and contains blocks.
- **Blocks** — individual content units: a paragraph, a heading, a figure, a table, etc.

Think of sections as chapters and blocks as the paragraphs, images, and tables inside each chapter.

---

## 5. Adding content (the main workflow)

This is the core loop most users follow:

### Step 1 — Add or select a section

In the **document tree** (left panel):

- Click **+ Add Section** at the bottom to create a new section.
- Click a section name to select it (its title becomes editable in the properties panel).

### Step 2 — Add a block to the section

1. In the tree, expand the section if it is collapsed (click the chevron).
2. Click **+ Block** under the section.
3. Choose a block type from the menu (Paragraph, Heading, Figure, Table, etc.).

The new block appears in both the tree and the **editor canvas** (center panel).

### Step 3 — Edit the block in the canvas

Click the block in the canvas and type directly:

- **Paragraph** — rich text editor; start typing where it says *Start typing...*
- **Heading** — click and type the heading text
- **Table** — click cells and type; paste from Excel with `Ctrl+V`
- **Figure** — add caption text; assign an image via the properties panel or drag from the asset library
- **Equation** — type LaTeX (e.g. `E = mc^2`)
- **Code** — type in the code textarea

### Step 4 — Fine-tune in the properties panel

Click the block (in the tree or canvas) to select it. The **properties inspector** (right panel) shows settings for that block: style, visibility, alignment, caption, table options, etc.

### Quick summary

| Goal | Where to do it |
|------|----------------|
| Add a section | Left tree → **+ Add Section** |
| Add a block | Left tree → **+ Block** under a section |
| Write text | Center canvas — click the block and type |
| Change style, alignment, captions | Right properties panel |
| Reorder sections/blocks | Drag the grip handle (⋮⋮) in the left tree |
| Insert an image | Import to asset library → drag onto a section, or add a Figure block and pick the asset |

---

## 6. Editing in the canvas

The center panel is your main writing surface.

- **Document title** appears at the top (large bold text). It reflects `metadata.title` in the project.
- **Section headings** appear as subheadings below the title.
- **Blocks** render in order under their section.

**Selecting a block:** Click it in the canvas or in the tree. Selected blocks show a blue highlight.

**Hidden blocks:** Blocks marked *not visible* in properties are skipped in the canvas but remain in the tree.

---

## 7. The document tree (left panel)

### Filter

Use the search box at the top of the tree to filter sections by title.

### Section actions

When you hover a section row:

| Action | How |
|--------|-----|
| Expand/collapse | Click the chevron |
| Select | Click the section name |
| Reorder | Drag the grip handle (⋮⋮) |
| Duplicate | Click the copy icon |
| Delete | Click the trash icon |

### Block actions

Same pattern for blocks under a section: select, drag to reorder, duplicate, or delete.

### Multi-select

Hold `Ctrl` while clicking to add sections or blocks to the selection.

### Drop images onto a section

Drag an asset from the **asset library** onto a section in the tree. DocForge creates a **Figure** block automatically and links the image.

---

## 8. Properties inspector (right panel)

The right panel changes based on what you have selected.

### Nothing selected

Shows: *Select a block or section to edit properties*.

### Section selected

- **Title** — rename the section (e.g. change *Introduction* to *Background*).

### Block selected

Shows the block type name (e.g. *Paragraph Properties*) plus:

**Common settings (all blocks):**

| Setting | Description |
|---------|-------------|
| Style | Typography style from your style sheet |
| Visible | Show or hide in the canvas |
| Locked | Prevent accidental edits |
| Spacing before/after | Vertical spacing |
| Page break before | Force a page break before this block |
| Keep with next | Keep this block on the same page as the next one |

**Block-specific settings** appear below the common settings (alignment for paragraphs, heading level, figure width, table borders, etc.).

---

## 9. Block types reference

| Block type | Use for | Edit in canvas | Notable properties |
|------------|---------|----------------|-------------------|
| **Heading** | Section titles, H1–H6 | Type heading text | Level, numbering, include in TOC |
| **Paragraph** | Body text | Rich text (TipTap) | Alignment, indentation |
| **Bullet List** | Unordered lists | One input per item; **+ Add item** | — |
| **Numbered List** | Ordered lists | Same as bullet list | — |
| **Checklist** | Task lists with checkboxes | Toggle and edit items | — |
| **Quote** | Pull quotes | Type quote text | Attribution |
| **Code Block** | Source code | Textarea | Language |
| **Equation** | Maths | LaTeX input with live preview | Display mode |
| **Figure** | Images | Caption; image from asset | Width, alignment, wrap, caption position |
| **Table** | Data grids | Click cells; paste from spreadsheet | Header row, borders, banded rows, caption |
| **Horizontal Rule** | Visual divider | — | — |
| **Page Break** | Force new page in export | — | — |

### Tables — paste from Excel

Click a cell, then paste (`Ctrl+V`). Tab-separated or newline-separated clipboard data fills the grid from that cell outward.

Use **+ Row** and **+ Column** buttons below the table to expand it.

### Equations — LaTeX examples

```
\frac{a}{b}          → fraction
x^2 + y^2 = r^2      → superscripts
\sum_{i=1}^{n} i     → summation
```

### Figures — two ways to add an image

1. **Drag and drop:** Import image to asset library → drag onto a section in the tree.
2. **Manual:** Add a Figure block → select the block → in properties, choose an asset from the **Asset** dropdown.

---

## 10. Asset library (bottom panel)

The asset library stores files used in your document (mostly images).

### Open the panel

By default the panel starts **collapsed**. Click **Asset Library** at the bottom of the window to expand it.

### Import assets

1. Save your project first (**Save** or `Ctrl+S`).
2. Click the **upload** icon in the asset library header.
3. Select one or more files (PNG, JPG, GIF, WebP, SVG, PDF, CSV, XLSX).

Files are copied into the project's `assets/` folder and appear as thumbnails.

### Search and filter

- **Search box** — filter by filename, description, or tags.
- **Type dropdown** — show only images, PDFs, or table data files.

### Use an asset

- **Drag** a thumbnail onto a section in the document tree to create a figure block.
- Or assign it to an existing Figure block via the properties panel.

### Delete an asset

Click the trash icon on an unused asset (usage count must be 0).

---

## 11. Styles

Styles control fonts, sizes, colours, and spacing. They are stored in `styles.json` inside your project.

### Style Manager

Click **Styles** in the toolbar to open the Style Manager. For each style you can edit:

- Font family and size
- Colour
- Line spacing
- Bold / italic

### Apply a style to a block

Select the block → properties panel → **Style** dropdown.

Each block type gets a sensible default style when created. Change the style per block as needed.

---

## 12. AI features

AI features require an OpenAI API key (see [Launching DocForge](#1-launching-docforge)).

### Generate a full document

1. Click **Generate AI** (or press `Ctrl+G`).
2. Describe the document you want in the prompt box.
3. Choose options:

| Option | Description |
|--------|-------------|
| **Template** | Starting section structure (Technical Report, Procedure, Meeting Notes, etc.) |
| **Document type** | Free-text label (e.g. *report*, *manual*) |
| **Tone** | Professional, technical, casual, or formal |
| **Detail level** | Brief, moderate, or detailed |
| **Leave some sections blank** | AI skips some sections for you to fill in |
| **Reference documents** | Upload `.docx`, `.pdf`, `.txt`, `.md`, `.csv`, or `.xlsx` for context |
| **Project assets** | Select imported images the AI should reference |

4. Click **Generate Document**. Progress appears in the modal. When complete, the generated content replaces your current document.

**Available templates:**

| Template | Default sections |
|----------|-----------------|
| Blank Document | Content |
| Technical Report | Abstract, Introduction, Methodology, Results, Discussion, Conclusion, References |
| General Report | Executive Summary, Background, Findings, Recommendations, Appendix |
| Procedure | Purpose, Scope, Procedure, Safety, References |
| Specification | Overview, Requirements, Design, Interfaces, Testing, Appendix |
| Meeting Notes | Attendees, Agenda, Discussion, Action Items, Next Steps |
| Proposal | Summary, Problem Statement, Proposed Solution, Timeline, Budget, Conclusion |

### Context-menu AI actions (right-click)

Right-click on a block or section in the canvas/tree area:

**Block actions:** Rewrite, Shorten, Expand, Make technical, Make concise, Grammar check

**Section actions:** Rewrite section, Generate missing content, Summarise, Improve structure

Select an action to run it on the current selection. The block or section is updated in place.

---

## 13. Validation

Click **Validate** in the toolbar to check your document for issues.

The validation panel reports:

- **Errors** — duplicate IDs, unknown block types, missing asset references, invalid styles
- **Warnings** — empty sections, missing required sections for your template

Fix issues in the editor and run validation again before exporting.

---

## 14. Export

### Export DOCX

Click **Export DOCX** to download a Word document. The filename uses your document title (e.g. `My Report.docx`).

Export includes headings, paragraphs, lists, tables, figures (embedded images), code, and page breaks. Equations and complex formatting may be simplified compared to the on-screen preview.

### Export JSON

Click **Export JSON** to download `document.json` as a standalone file. Useful for backups, version control, or inspection.

### Word COM bridge (advanced, Windows)

For deeper Word integration on Windows, a Python sidecar is available:

```powershell
cd python-bridge
pip install -r requirements.txt
```

This supports advanced sync scenarios via the Rust backend. Standard export via **Export DOCX** does not require the Python bridge.

---

## 15. Settings

Click **Settings** (gear icon) in the toolbar.

| Setting | Description |
|---------|-------------|
| **OpenAI API Key** | Required for AI features (read-only if set via `.env`) |
| **Default Model** | Text model for generation (default: `gpt-4o`) |
| **Vision Model** | Model for image understanding (default: `gpt-4o`) |
| **Temperature** | Creativity of AI output (0–2) |
| **Max Tokens** | Maximum length of AI responses |
| **API Base URL** | Override API endpoint (for proxies or compatible APIs) |
| **Autosave enabled** | Automatically save after edits |

---

## 16. Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New project |
| `Ctrl+O` | Open project |
| `Ctrl+S` | Save |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` or `Ctrl+Shift+Z` | Redo |
| `Ctrl+G` | Open AI generation modal |
| `Ctrl+D` | Duplicate selected block |
| `Delete` | Delete selected block |
| `Ctrl+F` | Search (reserved; use the tree filter for now) |

---

## 17. Example workflow: building a report from scratch

Here is a complete walkthrough for a short technical report.

### 1. Create the project

- **New** → choose folder `D:\Documents\my-tech-report`
- You see one section: **Introduction**

### 2. Set up sections

- **+ Add Section** three times
- Select each section and rename in the properties panel:
  - *Introduction* (already exists)
  - *Methodology*
  - *Results*
  - *Conclusion*

### 3. Add content to Introduction

- Under Introduction, click **+ Block** → **Heading**
- Click the heading in the canvas; type `Overview`
- **+ Block** → **Paragraph**
- Click the paragraph; write your opening text

### 4. Add a figure

- Expand the asset library; click upload; import `diagram.png`
- Drag the thumbnail onto the **Introduction** section in the tree
- Select the new figure block; set caption in the canvas or properties panel

### 5. Add a results table

- Select the **Results** section
- **+ Block** → **Table**
- Click cells and type, or paste from Excel
- In properties: enable **Header row** and **Borders**

### 6. Apply styles

- Select a paragraph → properties → choose a body style
- Select headings → assign a heading style

### 7. Validate and export

- **Validate** — fix any warnings (e.g. empty sections)
- **Save** (`Ctrl+S`)
- **Export DOCX** — share the Word file

---

## 18. Tips and current limitations

### Tips

- **Save early** — create and save a project before importing assets.
- **Use templates via AI** — **Generate AI** with a template is the fastest way to get a multi-section skeleton.
- **Tree + canvas together** — use the tree for structure (add, move, delete) and the canvas for writing.
- **Undo** — `Ctrl+Z` works for structural and content changes.
- **Sample project** — open `TestOutput\integration-test-document` to see a fully populated example.

### Changing the document title

The document title is shown at the top of the editor canvas. It is set automatically when:

- You create a new project (**Untitled Document** by default)
- AI generation runs (uses the template name)
- You open a project whose `document.json` already has a title

There is not yet an in-app field to rename the document title. To change it manually:

1. **Save** and close the project (or edit while the app is open).
2. Open `document.json` in your project folder with a text editor.
3. Find `"metadata"` → `"title"` and change the value.
4. **Open** the project again (or reload) to see the new title.

Exported files (`.docx`, `.json`) also use this title as the filename.

### Current limitations

- Document title, author, and description are not yet editable in the properties panel (only in `document.json`).
- Global document search (`Ctrl+F`) is wired but does not yet open a search panel — use the tree filter to find sections by name.
- Word **import** is used internally by AI reference reading; there is no **Import DOCX** button in the toolbar yet.
- Rich-text formatting in paragraphs (bold, italic via toolbar) is limited compared to full word processors; plain typing works in the TipTap editor.

---

## Quick reference card

```
START HERE
  New → pick folder → Save
  Left tree: + Block → pick type
  Center canvas: click block → type
  Right panel: style and options

IMAGES
  Save project → Asset library → Upload
  Drag thumbnail onto section in tree

AI
  Settings: API key
  Generate AI: full document from prompt
  Right-click block/section: quick AI edits

FINISH
  Validate → Save → Export DOCX
```

---

*DocForge — structured documents with JSON at the core and Word export when you need it.*
