# AutoClaw Design System — v1.0 (2026)

The visual language for **AutoClaw** (the open deployment reference for OpenClaw agents) and the **Forward Deployed** service behind it. Grotesque/mono type pairing, warm neutrals, one decisive accent.

> Source of truth: Claude Design project _"Autoclaw.sh design system update"_ — https://claude.ai/design/p/64c2da7d-e4fd-433a-910f-737b21e2a0f0 (`DesignSystem.dc.html`, `ForwardDeployed.dc.html`, `Home.dc.html`, `HomeHeroOptions.dc.html`). First implemented page in-repo: `site/src/pages/forward-deployed.astro`. This doc is the authoritative captured spec.

## Principles
- **Ink on paper does the work.** Warm neutrals carry the page; color is rationed.
- **One decisive accent** (Claw Orange). Cobalt is reserved — it marks "owned / in production / live" states only.
- **The `//` comment voice.** Mono labels prefixed with `//` run through the site as eyebrows/section markers.
- **Hairline structure.** 1px rules, square-ish corners (3–4px), ink panels. Diagrams use the same parts: mono labels, hairline rules, ink panels, one orange node where the work happens.

## Color

| Token | Hex | oklch | Use |
|---|---|---|---|
| **Ink** | `#15120F` | .18 .008 60 | Primary text; dark section backgrounds |
| **Ink 70** | `#4D453B` | — | Body / secondary text on paper |
| **Panel** | `#ECE7DC` | — | Raised surface on paper (e.g. "why us" band) |
| **Paper** | `#F4F1EA` | — | Page base background |
| **Claw Orange** | `#D9572E` | .62 .16 44 | **Primary accent** — CTAs, eyebrows, the orange node |
| **Cobalt** | `#2B53C9` | .50 .17 264 | **Owned / live / in-production** states only |

**Supporting tones** (derived, used on dark sections / detail):
`#E8825E` orange-light (accents on ink) · `#C9C0B1` muted text on ink · `#A59C8C` faint text · `#5C564E` faint border/text on ink · `#DCD5C7` / `#DAD3C6` hairlines on paper · `#1A1612` / `#1E1A16` raised cards on ink · `#2A2420` / `#322c25` hairlines on ink · `#6FA77E` success/"solved" green · `#8FA9F0` cobalt-light.

## Typography
Fonts (Google Fonts): **Space Grotesk** (400/500/600/700) + **Space Mono** (400/700).

| Role | Family | Spec |
|---|---|---|
| Display | Space Grotesk 700 | `letter-spacing:-0.04em`, `line-height:~0.92` (e.g. 72–84px) |
| Heading | Space Grotesk 700 | `letter-spacing:-0.03em`, `line-height:~1.0` (32–52px) |
| Body | Space Grotesk 400 | `line-height:1.55`, color Ink 70 |
| Label / eyebrow | Space Mono | `font-size:~12–13px`, `letter-spacing:0.14em`, `text-transform:uppercase`, color Claw Orange, prefixed `//` |
| Code / stats / meta | Space Mono | mono for numbers, tags, phase codes, captions |

`::selection { background:#D9572E; color:#F4F1EA }`

## Components
- **Buttons:** primary = Claw Orange bg, Paper text, `border-radius:3px`, weight 600 (`Scope a deployment →`). On ink, a dark `#15120F` primary is also used in the nav. Secondary = 1px ink/`#5C564E` outline, transparent. Text/link = orange with a 1px underline.
- **Tags / pills:** mono 12px, `border-radius:999px`; outline (`1px #5C564E`) or solid orange for the active/featured one.
- **Stat block:** very large Space Grotesk number (56–128px, `-0.03/-0.05em`) + mono/Ink-70 caption. Cobalt or orange-light for the highlighted figure.
- **Phase card:** mono step number (orange) + Grotesk title + mono meta + body + a mono `→ outcome` line above a hairline.
- **Brand mark:** orange clip-path notch — `clip-path:polygon(0 0,100% 0,100% 60%,60% 60%,60% 100%,0 100%)`, beside the "AutoClaw" wordmark (Grotesk 700, `-0.02em`).
- **Diagram motif:** boxes joined by hairline arrows; "solved" states outlined, the **last mile** is the single solid orange node, "in production" is cobalt-outlined.

## Layout
- Content max-width **1180px**, side padding **40px** (22px on small screens).
- Sections separated by 1px hairlines; alternating Paper / Panel / Ink backgrounds.
- Generous vertical rhythm (~72–80px section padding).

## Status / rollout
- ✅ `forward-deployed.astro` — first page on the new system (self-contained: own nav/footer, fonts, tokens inline).
- ⏳ **Not yet applied site-wide.** The rest of the site (home, Layout, `public/styles/global.css`) still uses the previous look. Next: implement `Home.dc.html` and migrate the shared `Layout.astro` + `global.css` to these tokens (ideally as CSS custom properties) so the whole site is consistent.
