# Landing Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the technical developer-focused landing page with a warm, non-technical page that sells "your own AI assistant" to everyday users.

**Architecture:** Single-page rewrite of `apps/web/pages/index.tsx` and associated CSS in `apps/web/styles/globals.css`. No new dependencies. Reuses existing waitlist API. The page has 6 sections: hero, problem, how-it-works, capabilities, security, and footer CTA.

**Tech Stack:** Next.js 14 (Pages Router), React 18, TypeScript, custom CSS with CSS variables.

**Design doc:** `docs/plans/2026-02-17-landing-page-redesign-design.md`

---

### Task 1: Rewrite the Hero Section

**Files:**
- Modify: `apps/web/pages/index.tsx:1-111` (full rewrite)
- Modify: `apps/web/styles/globals.css:329-510` (landing-specific styles)

**Step 1: Replace index.tsx with new page skeleton and hero**

Replace the entire content of `apps/web/pages/index.tsx` with:

```tsx
import Head from "next/head";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Your Own AI Assistant | Powered by OpenClaw</title>
        <meta
          name="description"
          content="Get your own AI assistant that actually does things for you. Talk to it on Telegram, let it handle your email, calendar, and files. No tech skills needed."
        />
      </Head>

      <main className="landingMain">
        <header className="topbar landingTopbar">
          <Link href="/" className="brand landingBrand">
            <span className="brandMark" />
            {/* Product name TBD — placeholder for now */}
            AI Assistant
          </Link>
          <nav className="navLinks landingNavLinks">
            <Link href="/pricing" className="landingNavLink">
              Pricing
            </Link>
            <Link href="/waitlist" className="landingNavLink">
              Join Waitlist
            </Link>
          </nav>
        </header>

        <section className="landingHero">
          <div className="landingHeroCopy">
            <span className="landingPill">Powered by OpenClaw</span>
            <h1 className="landingTitle">
              Your Own AI Assistant.
              <br />
              It Doesn't Just Talk&nbsp;— It&nbsp;Does.
            </h1>
            <p className="landingLead">
              Talk to your assistant on Telegram. Let it handle your email,
              calendar, and files. No tech skills needed — we take care of
              everything.
            </p>
            <div className="actions landingActions">
              <Link href="/waitlist" className="button landingButton">
                Join the Waitlist
              </Link>
              <a href="#how-it-works" className="button ghostButton landingGhostButton">
                See How It Works
              </a>
            </div>
          </div>
          <div className="landingHeroRail">
            <div className="chatMockup">
              <div className="chatHeader">
                <span className="chatAvatar">🤖</span>
                <span className="chatName">Your Assistant</span>
                <span className="chatStatus">Online</span>
              </div>
              <div className="chatMessages">
                <div className="chatBubble chatBubbleUser">
                  Hey, anything urgent in my email today?
                </div>
                <div className="chatBubble chatBubbleBot">
                  Good morning! I checked your inbox. Here's what needs attention:
                  <br /><br />
                  📩 <strong>Invoice from Acme Co</strong> — payment due tomorrow
                  <br />
                  📅 <strong>Team meeting moved</strong> — now at 3pm instead of 2pm
                  <br />
                  ✈️ <strong>Flight confirmation</strong> — your booking for Friday is confirmed
                  <br /><br />
                  Want me to handle any of these?
                </div>
                <div className="chatBubble chatBubbleUser">
                  Pay the invoice and update my calendar for the meeting
                </div>
                <div className="chatBubble chatBubbleBot">
                  Done! Invoice payment initiated and your calendar is updated. Anything else?
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
```

**Step 2: Add CSS for the pill and chat mockup**

Add the following styles to `apps/web/styles/globals.css`, replacing the old landing-specific styles (lines 329-510) with updated ones. Keep all styles before line 329 intact.

Replace from `.landingMain` through the end of the file with:

```css
/* ── Landing page ── */

.landingMain {
  max-width: 1230px;
  padding-top: 24px;
}

.landingTopbar {
  margin-bottom: 42px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}

.landingBrand {
  font-family: "Space Grotesk", sans-serif;
  letter-spacing: -0.01em;
  font-size: 1rem;
}

.landingNavLinks {
  gap: 16px;
}

.landingNavLink {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 1px solid transparent;
  padding-bottom: 2px;
}

.landingNavLink:hover {
  color: var(--text);
  border-color: var(--text);
}

.landingPill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 5px 12px;
  border: 1px solid var(--line);
  background: var(--surface-muted);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  margin-bottom: 16px;
}

.landingHero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: center;
}

.landingHeroCopy {
  max-width: 56ch;
}

.landingTitle {
  margin: 0 0 16px;
  font-size: clamp(2rem, 4.5vw, 3.6rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
  font-family: "Space Grotesk", sans-serif;
}

.landingLead {
  margin: 0;
  color: var(--text-muted);
  font-size: 1.08rem;
  line-height: 1.65;
}

.landingActions {
  justify-content: flex-start;
  margin-top: 24px;
}

.landingButton {
  background: var(--accent);
  border-color: var(--accent);
}

.landingButton:hover {
  box-shadow: 0 10px 18px rgba(17, 24, 39, 0.22);
}

.landingGhostButton {
  border-color: var(--line-strong);
  color: var(--text);
  background: var(--surface);
}

.landingGhostButton:hover {
  box-shadow: 0 8px 16px rgba(17, 24, 39, 0.08);
}

.landingHeroRail {
  display: flex;
  justify-content: center;
}

/* ── Chat mockup ── */

.chatMockup {
  width: 100%;
  max-width: 400px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.chatHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-muted);
}

.chatAvatar {
  font-size: 1.4rem;
}

.chatName {
  font-weight: 600;
  font-size: 0.92rem;
}

.chatStatus {
  font-size: 0.75rem;
  color: var(--success);
  margin-left: auto;
}

.chatMessages {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chatBubble {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 0.9rem;
  line-height: 1.5;
  max-width: 88%;
}

.chatBubbleUser {
  background: var(--accent);
  color: #ffffff;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}

.chatBubbleBot {
  background: var(--surface-muted);
  color: var(--text);
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}

/* ── Problem section ── */

.landingProblem {
  margin-top: 80px;
  text-align: center;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.landingProblem h2 {
  font-family: "Space Grotesk", sans-serif;
  font-size: clamp(1.4rem, 3vw, 2rem);
  letter-spacing: -0.02em;
  margin: 0 0 12px;
}

.landingProblem p {
  color: var(--text-muted);
  font-size: 1.05rem;
  line-height: 1.65;
  margin: 0;
}

/* ── How it works ── */

.landingSteps {
  margin-top: 80px;
}

.landingSteps > h2 {
  font-family: "Space Grotesk", sans-serif;
  font-size: clamp(1.4rem, 3vw, 2rem);
  letter-spacing: -0.02em;
  margin: 0 0 32px;
  text-align: center;
}

.stepsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.stepCard {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 24px;
  text-align: center;
}

.stepNumber {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.stepCard h3 {
  margin: 0 0 8px;
  font-size: 1.05rem;
}

.stepCard p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.55;
}

/* ── Capabilities ── */

.landingCapabilities {
  margin-top: 80px;
}

.landingCapabilities > h2 {
  font-family: "Space Grotesk", sans-serif;
  font-size: clamp(1.4rem, 3vw, 2rem);
  letter-spacing: -0.02em;
  margin: 0 0 12px;
  text-align: center;
}

.landingCapabilities > p {
  text-align: center;
  color: var(--text-muted);
  margin: 0 0 32px;
  font-size: 1.02rem;
}

.capGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.capCard {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 24px;
}

.capIcon {
  font-size: 1.6rem;
  margin-bottom: 10px;
}

.capCard h3 {
  margin: 0 0 6px;
  font-size: 1.02rem;
}

.capCard p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.55;
}

/* ── Security section ── */

.landingSecurity {
  margin-top: 80px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 40px;
  text-align: center;
}

.landingSecurity h2 {
  font-family: "Space Grotesk", sans-serif;
  font-size: clamp(1.4rem, 3vw, 2rem);
  letter-spacing: -0.02em;
  margin: 0 0 28px;
}

.trustPoints {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  text-align: center;
}

.trustPoint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.trustIcon {
  font-size: 1.8rem;
}

.trustPoint h3 {
  margin: 0;
  font-size: 1rem;
}

.trustPoint p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

/* ── Footer CTA ── */

.landingFooterCta {
  margin-top: 80px;
  text-align: center;
  padding-bottom: 40px;
}

.landingFooterCta h2 {
  font-family: "Space Grotesk", sans-serif;
  font-size: clamp(1.4rem, 3vw, 2.2rem);
  letter-spacing: -0.02em;
  margin: 0 0 12px;
}

.landingFooterCta p {
  color: var(--text-muted);
  margin: 0 0 24px;
  font-size: 1.02rem;
}

.landingFooterMeta {
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
  color: var(--text-muted);
  font-size: 0.82rem;
}

/* ── Responsive ── */

@media (max-width: 940px) {
  .sectionGrid {
    grid-template-columns: 1fr;
  }

  .pageGrid {
    grid-template-columns: 1fr;
  }

  .landingHero {
    grid-template-columns: 1fr;
  }

  .stepsGrid {
    grid-template-columns: 1fr;
  }

  .capGrid {
    grid-template-columns: 1fr;
  }

  .trustPoints {
    grid-template-columns: 1fr;
  }

  .landingActions {
    justify-content: flex-start;
    margin-top: 8px;
  }

  .landingHeroRail {
    justify-items: start;
  }
}

@media (max-width: 680px) {
  main {
    padding: 20px 14px 34px;
  }

  .heroPanel {
    padding: 20px;
  }

  .waitlist {
    grid-template-columns: 1fr;
  }

  .landingMain {
    padding-top: 18px;
  }

  .landingTitle {
    font-size: clamp(1.7rem, 6vw, 2.4rem);
  }

  .landingSecurity {
    padding: 24px;
  }
}
```

**Step 3: Verify the page renders**

Run: `cd /home/deme/Projects/datopian/openclaw-aaas && npm run dev --workspace=apps/web`

Open `http://localhost:3000` and verify the hero section renders with the chat mockup.

**Step 4: Commit**

```bash
git add apps/web/pages/index.tsx apps/web/styles/globals.css
git commit -m "feat: rewrite landing hero with chat mockup and new copy"
```

---

### Task 2: Add the Problem Section

**Files:**
- Modify: `apps/web/pages/index.tsx` (add section after hero)

**Step 1: Add the problem section JSX**

Add the following after the closing `</section>` of the hero, inside `<main>`:

```tsx
        <section className="landingProblem">
          <h2>Getting your own AI assistant used to be complicated.</h2>
          <p>
            Most AI tools expect you to be technical. We think that's wrong.
            You shouldn't need to know about servers, APIs, or code to have
            an AI that works for you. So we made it simple.
          </p>
        </section>
```

**Step 2: Verify it renders**

Check `http://localhost:3000` — the problem section should appear centered below the hero.

**Step 3: Commit**

```bash
git add apps/web/pages/index.tsx
git commit -m "feat: add problem/empathy section to landing page"
```

---

### Task 3: Add the How It Works Section

**Files:**
- Modify: `apps/web/pages/index.tsx` (add section after problem)

**Step 1: Add the how-it-works JSX**

Add after the problem section:

```tsx
        <section className="landingSteps" id="how-it-works">
          <h2>Up and running in three steps</h2>
          <div className="stepsGrid">
            <div className="stepCard">
              <span className="stepNumber">1</span>
              <h3>Sign up</h3>
              <p>Create your account. No credit card needed to get started.</p>
            </div>
            <div className="stepCard">
              <span className="stepNumber">2</span>
              <h3>Pick where to chat</h3>
              <p>
                Connect Telegram — that's it. WhatsApp and more coming soon.
              </p>
            </div>
            <div className="stepCard">
              <span className="stepNumber">3</span>
              <h3>Start talking</h3>
              <p>
                Your assistant is ready. Ask it anything or give it a task.
              </p>
            </div>
          </div>
        </section>
```

**Step 2: Verify it renders**

Check `http://localhost:3000` — three step cards should appear in a row.

**Step 3: Commit**

```bash
git add apps/web/pages/index.tsx
git commit -m "feat: add how-it-works section to landing page"
```

---

### Task 4: Add the Capabilities Section

**Files:**
- Modify: `apps/web/pages/index.tsx` (add section after how-it-works)

**Step 1: Add the capabilities JSX**

Add after the steps section:

```tsx
        <section className="landingCapabilities">
          <h2>Start simple. Add more when you're ready.</h2>
          <p>
            You control what your assistant can access. Begin with chat, then
            unlock more as you get comfortable.
          </p>
          <div className="capGrid">
            <div className="capCard">
              <div className="capIcon">💬</div>
              <h3>Chat with your assistant</h3>
              <p>
                Ask questions, brainstorm ideas, get help thinking through
                problems. No setup needed.
              </p>
            </div>
            <div className="capCard">
              <div className="capIcon">📧</div>
              <h3>Connect your email</h3>
              <p>
                "What's urgent today?" Get morning briefings and let your
                assistant draft replies.
              </p>
            </div>
            <div className="capCard">
              <div className="capIcon">📁</div>
              <h3>Connect your drive</h3>
              <p>
                "Find that proposal from last week." Your assistant searches
                and retrieves files for you.
              </p>
            </div>
            <div className="capCard">
              <div className="capIcon">📅</div>
              <h3>Connect your calendar</h3>
              <p>
                "Reschedule Thursday's meeting to Friday." Your assistant
                manages your schedule.
              </p>
            </div>
          </div>
        </section>
```

**Step 2: Verify it renders**

Check `http://localhost:3000` — four capability cards should appear in a 2x2 grid.

**Step 3: Commit**

```bash
git add apps/web/pages/index.tsx
git commit -m "feat: add capabilities section to landing page"
```

---

### Task 5: Add the Security Section

**Files:**
- Modify: `apps/web/pages/index.tsx` (add section after capabilities)

**Step 1: Add the security JSX**

Add after the capabilities section:

```tsx
        <section className="landingSecurity">
          <h2>Your data. Your rules.</h2>
          <div className="trustPoints">
            <div className="trustPoint">
              <span className="trustIcon">🔒</span>
              <h3>Secure sandbox</h3>
              <p>
                Your assistant runs in its own secure space — not on your
                laptop where it could access everything.
              </p>
            </div>
            <div className="trustPoint">
              <span className="trustIcon">🎛️</span>
              <h3>You're in control</h3>
              <p>
                You decide exactly what it can access. Email, drive,
                calendar — only what you choose. Nothing more.
              </p>
            </div>
            <div className="trustPoint">
              <span className="trustIcon">🛡️</span>
              <h3>Your data stays yours</h3>
              <p>
                We don't sell or share your information. Your assistant
                works for you and only you.
              </p>
            </div>
          </div>
        </section>
```

**Step 2: Verify it renders**

Check `http://localhost:3000` — security section should appear as a card with three trust points.

**Step 3: Commit**

```bash
git add apps/web/pages/index.tsx
git commit -m "feat: add security and trust section to landing page"
```

---

### Task 6: Add the Footer CTA

**Files:**
- Modify: `apps/web/pages/index.tsx` (add final section + close main)

**Step 1: Add footer CTA JSX and close the main tag**

Add after the security section, before the closing `</main>`:

```tsx
        <section className="landingFooterCta">
          <h2>Be the first to get your own AI assistant.</h2>
          <p>
            Join the waitlist. We'll reach out when it's your turn.
          </p>
          <Link href="/waitlist" className="button landingButton">
            Join the Waitlist
          </Link>
          <div className="landingFooterMeta">
            Powered by OpenClaw
          </div>
        </section>
```

**Step 2: Verify full page renders end-to-end**

Check `http://localhost:3000` — scroll through all 6 sections. Verify:
- Hero with chat mockup
- Problem statement
- 3-step how it works
- 4 capability cards
- Security trust points
- Footer CTA with waitlist link

**Step 3: Commit**

```bash
git add apps/web/pages/index.tsx
git commit -m "feat: add footer CTA and complete landing page redesign"
```

---

### Task 7: Update the Waitlist Page Copy

**Files:**
- Modify: `apps/web/pages/waitlist.tsx:1-84`

**Step 1: Update waitlist page to match new tone**

Update the Head title, heading, and description copy in `waitlist.tsx`:

- Title: `"Join the Waitlist | Your AI Assistant"`
- Heading: `"Join the Waitlist"`
- Description: `"We're onboarding new users gradually to make sure everyone gets a great experience. Leave your email and we'll reach out when it's your turn."`
- Placeholder: `"you@email.com"` (instead of `"you@company.com"`)
- Brand text in header: `"AI Assistant"` (matching index.tsx)

**Step 2: Verify waitlist page**

Navigate to `http://localhost:3000/waitlist` and verify copy is updated.

**Step 3: Commit**

```bash
git add apps/web/pages/waitlist.tsx
git commit -m "feat: update waitlist page copy to match new landing tone"
```

---

### Task 8: Remove Dashboard Nav Link and Clean Up Dead CSS

**Files:**
- Verify: `apps/web/pages/index.tsx` — confirm no references to Dashboard, Signup in nav
- Modify: `apps/web/styles/globals.css` — remove any orphaned CSS classes no longer used

**Step 1: Verify index.tsx nav only has Pricing and Join Waitlist**

Read `index.tsx` and confirm the nav links are correct (done in Task 1, but verify).

**Step 2: Identify and remove orphaned landing CSS**

The following classes from the old page are no longer used and should be removed if they exist only for the landing page:
- `.landingKicker`
- `.landingSignals`, `.landingSignalRow`
- `.landingFlow`
- `.landingFooter` (replaced by `.landingFooterCta`)

Only remove these if they are not referenced elsewhere.

**Step 3: Commit**

```bash
git add apps/web/styles/globals.css
git commit -m "chore: remove orphaned CSS from old landing page"
```

---

### Task 9: Final Visual QA and Responsive Check

**Step 1: Check desktop layout**

Run dev server, open `http://localhost:3000` at full width. Verify all sections look correct.

**Step 2: Check tablet layout (940px breakpoint)**

Resize to ~900px. Verify:
- Hero stacks to single column
- Steps stack to single column
- Capability cards stack to single column
- Trust points stack to single column

**Step 3: Check mobile layout (680px breakpoint)**

Resize to ~375px. Verify:
- Title is readable and doesn't overflow
- Chat mockup fits within viewport
- All sections have appropriate padding
- CTA buttons are full-width or close to it

**Step 4: Fix any issues found**

Make CSS adjustments as needed.

**Step 5: Commit any fixes**

```bash
git add apps/web/styles/globals.css apps/web/pages/index.tsx
git commit -m "fix: responsive layout adjustments for landing page"
```
