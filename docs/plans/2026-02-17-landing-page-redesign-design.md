# Landing Page Redesign Design

**Date**: 2026-02-17
**Status**: Approved

## Context

The current landing page targets developers/builders with technical language ("managed OpenClaw runtime", "control plane", "execution fabric", "BYOK model access"). The product's real goal is to make OpenClaw agents accessible to **non-technical people** — anyone who wants a personal AI assistant that actually does things on their behalf.

### Key Insight (from stakeholder input)

The target audience is people like Daniela, Ioana, a non-technical partner — people who have heard AI can help but don't know where to start. The current page fails this audience. The litmus test: "Does [non-technical person] have OpenClaw set up? No. That's the market."

## Design Decisions

- **Audience**: Non-technical end users. No developer-facing language on the main page.
- **Core promise**: "Your own AI assistant" — personal, owned, works for you.
- **Tone**: Warm and friendly. Conversational, approachable, no jargon.
- **Approach**: Conversation-led (Approach A) — show a Telegram chat mockup to instantly communicate what the product feels like.
- **CTA**: Join waitlist (product not fully self-serve yet, controlled onboarding).
- **OpenClaw branding**: Subtle "Powered by OpenClaw" pill in hero for SEO/tech-aware visitors.
- **Product name**: TBD — to be decided separately. Design uses placeholder `[ProductName]`.

## Page Structure

### Section 1: Hero

**Pill** (small, muted, above headline):
"Powered by OpenClaw"

**Headline**:
"Your Own AI Assistant. It Doesn't Just Talk — It Does."

**Subheadline**:
"Talk to your assistant on Telegram. Let it handle your email, calendar, and files. No tech skills needed — we take care of everything."

**CTA**: "Join the Waitlist" (primary button)

**Visual**: Telegram chat mockup showing a realistic conversation:
- User: "Hey, anything urgent in my email today?"
- Assistant: friendly summary of 3 emails with actions suggested

The mockup immediately shows what the product *feels like* — no explanation needed.

### Section 2: The Problem (Empathy)

Short section, 2-3 lines max. No technical jargon.

Copy direction:
- "You've heard AI can help with your day-to-day, but getting it set up feels overwhelming."
- "Most AI tools expect you to be technical. We think that's wrong."

Or even simpler:
- "Getting your own AI assistant used to be complicated. Not anymore."

Purpose: empathy, not education. The reader should feel "yes, that's me."

### Section 3: How It Works (3 Steps)

Dead simple. No dashboards, no queues, no configuration screens.

1. **Sign up** — Create your account
2. **Pick where to chat** — Telegram (WhatsApp and more coming soon)
3. **Start talking** — Your assistant is ready

Visual: clean step indicators (1-2-3) with simple icons or illustrations.

### Section 4: What It Can Do (Gradual Capabilities)

Frame as "start simple, grow when you're ready" — the gradual trust model.

- **Start chatting** — Ask questions, brainstorm ideas, get help thinking
- **Connect your email** — "What's urgent today?" Get morning briefings, draft replies
- **Connect your drive** — "Find that proposal from last week"
- **Connect your calendar** — "Reschedule my Thursday meeting to Friday"

Visual: each capability as a card or row, possibly with a small chat snippet showing the interaction. The progression should feel like unlocking superpowers one at a time, not a wall of features.

Key message: you control what it can access. Start with just chat. Add more when you're comfortable.

### Section 5: Security & Trust

This is a first-class section, not a footnote. Non-technical people are nervous about AI accessing their stuff.

Copy direction:
- "Your assistant runs in its own secure space — not on your laptop"
- "You decide exactly what it can access. Nothing more."
- "Your data stays yours. Always."

Tone: confident but not scary. Reassuring, not warning. "We take this seriously so you don't have to worry."

Visual: simple trust icons (lock, shield, toggle switches showing user control).

### Section 6: Footer CTA

- Repeat "Join the Waitlist" CTA
- Brief reinforcement: "Be the first to get your own AI assistant."
- Standard footer links (pricing, contact, etc.)

## What This Design Removes

Everything from the current page that doesn't serve non-technical users:

- "Managed OpenClaw Runtime" messaging
- "Control Plane" and "Execution Fabric" sections
- "BYOK model access" language
- "Queued runs, retries, and recovery" details
- Technical "How It Works" (select template, connect keys, run in managed infrastructure)
- "Redline focus" footer copy
- Dashboard/run configuration references

## Visual Direction

- Keep the current clean, minimal design system (CSS variables, Manrope font, generous spacing)
- Replace the hero-visual.png with a Telegram chat mockup
- Warm color palette — soften the current dark/technical feel
- Simple illustrations or icons for the 3-step flow and capability cards
- No code snippets, terminal screenshots, or infrastructure diagrams

## Technical Notes

- Stack remains: Next.js 14, custom CSS, Pages Router
- Changes are primarily to `apps/web/pages/index.tsx` and `apps/web/styles/globals.css`
- Waitlist page already exists at `/waitlist` — hero CTA links there
- Pricing page may need updating to match new tone (separate effort)
