# F1 — Apex Concept Site (Project Bible)

Image-first design lab for a multi-page F1 product concept. Output = self-contained dark-themed HTML pages (Tailwind CDN) sitting next to their reference `screen.png`. Each top-level folder = one screen.

## Workspace map

```
F1/
├── CLAUDE.md                              ← this file (project bible)
├── .claude/
│   ├── settings.json                      ← project permissions
│   ├── design-system.md                   ← single source of truth: tokens, fonts, motion
│   ├── page-manifest.md                   ← inventory of screens + status
│   ├── commands/                          ← slash commands tailored to this project
│   │   ├── new-page.md                    /new-page <slug> <intent>
│   │   ├── audit-page.md                  /audit-page <folder>
│   │   ├── refine.md                      /refine <folder>
│   │   ├── style-guide.md                 /style-guide
│   │   └── bundle.md                      /bundle
│   ├── agents/
│   │   ├── page-auditor.md                visual+code parity check
│   │   ├── asset-curator.md               image-prompt + screen.png hygiene
│   │   └── html-shipper.md                ship one HTML to dist/
│   └── hooks/                             (reserved — global caveman+claude-mem cover lifecycle)
├── dist/                                  ← bundled multi-page site output
├── <screen-folder>/
│   ├── code.html                          ← Stitch-style standalone HTML
│   └── screen.png                         ← design reference render
└── extracted_text_from_*.md               ← image-prompt scratchpad
```

## Page roster (current concept pages)

| Folder | Role |
|--------|------|
| `the_grid_homepage/` | Marketing/home — landing for "The Grid" |
| `the_grid_24_7_global_feed/` | Live 24/7 news feed |
| `apex_news_hub_navigation/` | Global nav shell |
| `race_lab_mission_control_analysis/` | Telemetry mission-control view |
| `race_lab_deep_dive/` | Long-form race breakdown |
| `driver_profile_high_prestige/` | Premium driver profile |
| `the_archive_high_volume_databank/` | High-density archive index |
| `the_archive_news_gallery/` | Media-rich news gallery |
| `velocity_verse/` | Editorial/storytelling surface |
| `a_futuristic_formula_1_pit_lane_at_night...` | image-prompt scratch |
| `cinematic_high_speed_motion_blur...` | image-prompt scratch |
| `intense_vertical_close_up_of_a_formula_1...` | image-prompt scratch |

Treat `image-prompt` folders as **prompt artifacts, not pages** — no `code.html`, only PNG outputs.

## Design system (must obey — full detail in `.claude/design-system.md`)

- **Palette** locked to Material-You dark. Brand red `#E10600` (telemetry-red). Asphalt gray `#262626`. Surface `#141313`. Never invent new top-level hues; extend tokens.
- **Fonts**: Anybody 700/800 (display), Hanken Grotesk 400 (body), EB Garamond 300 (editorial pulls), JetBrains Mono 500 (telemetry/data). Material Symbols Outlined for iconography.
- **Theme class** `<html class="dark">` always. Tailwind CDN with `darkMode: "class"`.
- **Tone**: cinematic, premium, telemetry-grade. No generic dashboard chrome, no neon glow stacks, no bento clichés.
- **Motion**: scroll-pinned hero, scrubbed reveals, hardware-accelerated transforms only. GSAP if added.

## How to do work in this repo

### When user says "new page <slug>"
1. Invoke `/new-page` (or skill `brainstorming` first if intent is vague).
2. Pull tokens from `.claude/design-system.md` verbatim — no drift.
3. Scaffold `<slug>/code.html` matching the template head block in existing pages (Tailwind CDN, fonts, color tokens, Material Symbols).
4. Append row to `.claude/page-manifest.md`.

### When user says "refine / make it premium / fix this page"
1. Invoke skill `redesign-existing-projects` AND `high-end-visual-design`.
2. Audit current `code.html` vs `screen.png` for parity (use `page-auditor` agent).
3. Apply edits in-place. Never rewrite scaffolding the user already accepted.

### When user says "audit / review"
1. Invoke `/audit-page <folder>` → spawns `page-auditor` subagent.
2. Returns one-line-per-finding caveman-style list (severity, file:line, fix).

### When user says "ship / bundle / build site"
1. Invoke `/bundle` → `html-shipper` agent copies each `<folder>/code.html` into `dist/<folder>.html`, builds an `index.html` nav, rewrites cross-page links.

### When user references image prompts
1. Image-prompt folders are sources; `screen.png` inside concept folders is the design oracle.
2. For new image prompts use `imagegen-frontend-web` (web) or `imagegen-frontend-mobile` (mobile) — never freehand.

## Tools enabled for this project

**Plugins (global, already on):** `superpowers`, `claude-mem`, `caveman`.

**Heavy-use skills:**
- `design-taste-frontend` — premium UI defaults
- `high-end-visual-design` — kill cheap-AI defaults
- `redesign-existing-projects` — upgrade existing HTML
- `gpt-taste` — strict layout variance + AIDA structure when scaffolding
- `image-to-code` — when working from PNG → HTML
- `imagegen-frontend-web` / `imagegen-frontend-mobile` — design references
- `brandkit` — when user asks for identity boards
- `stitch-design-taste` — emit `DESIGN.md` for Stitch handoff
- `full-output-enforcement` — never truncate HTML output
- `verification-before-completion` — must open the page before claiming done
- `systematic-debugging` — for layout / token bugs
- `brainstorming` — before any new screen
- `test-driven-development` — only when adding JS logic (rare)

**Hooks (already global):** caveman SessionStart + UserPromptSubmit. claude-mem lifecycle.

## Conventions

- HTML pages are **single-file, no build step**. Tailwind CDN, fonts via CDN, Material Symbols via CDN. Do not introduce npm/build pipeline unless user asks.
- Keep each page <500 lines unless dataset demands.
- All copy in English; F1 jargon allowed (DRS, undercut, parc fermé, etc).
- Use Material Symbols, not inline SVG icons, unless asked.
- Never delete a `screen.png` — it is the design oracle.
- Never edit files in `image-prompt` folders.

## Memory

`claude-mem` is active. Cross-session memory is auto-injected. When user shares non-obvious design decisions or vetoes, save as `feedback` memory. When user names a new page or kills one, save as `project` memory with absolute date.

## Caveman

Caveman mode active globally (default `full`). Per project boundary: **code blocks always full normal English/HTML**, prose can be compressed. Security warnings + destructive ops → drop caveman.
