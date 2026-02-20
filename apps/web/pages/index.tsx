import Head from "next/head";
import Link from "next/link";
import { useAuthStatus } from "../lib/hooks/use-auth-status";

const valueRows = [
  {
    label: "Persistent by Design",
    detail:
      "Your agent does not reset every session. It remembers your context, preferences, and working style over time.",
  },
  {
    label: "Lives in Your Chat Apps",
    detail:
      "Use your AI in messaging apps like Telegram and WhatsApp, so your primary interface is where you already communicate.",
  },
  {
    label: "Always-On Digital Operator",
    detail:
      "Connect tools like email and calendar, run with leading models behind the scenes, and let it monitor and act for you 24/7.",
  },
];

const onboardingFlow = [
  "Create your account and connect your chat app.",
  "Configure model and tool access (email, calendar, and more).",
  "Teach it new skills and let it work continuously, even while you sleep.",
];

export default function HomePage() {
  const { authenticated } = useAuthStatus();

  return (
    <>
      <Head>
        <title>OpenClaw Autopilot</title>
        <meta
          name="description"
          content="Build a persistent personal AI that lives in WhatsApp and Telegram, remembers you over time, connects to your tools, and operates for you 24/7."
        />
      </Head>

      <main className="landingMain">
        <header className="topbar landingTopbar">
          <Link href="/" className="brand landingBrand">
            <span className="brandMark" />
            OpenClaw Autopilot
          </Link>
          <nav className="navLinks landingNavLinks">
            <Link href="/blog" className="landingNavLink">
              Blog
            </Link>
            <Link href="/pricing" className="landingNavLink">
              Pricing
            </Link>
            <Link href="/login" className="landingNavLink">
              Login
            </Link>
            {authenticated && (
              <Link href="/dashboard" className="landingNavLink">
                Dashboard
              </Link>
            )}
          </nav>
        </header>

        <section className="landingHero">
          <div className="landingHeroCopy">
            <p className="landingKicker">OpenClaw Autopilot</p>
            <h1 className="landingTitle">
              Your personal AI.
              <br />
              Always on.
            </h1>
            <p className="landingLead">
              It lives in WhatsApp, Telegram, and other chat apps.
              <br />
              It remembers, learns, and works for you 24/7.
            </p>
            <div className="actions landingActions">
              <Link href="/login" className="button landingButton">
                Create Agent
              </Link>
            </div>
          </div>
          <div className="landingHeroRail">
            <figure className="landingHeroVisual">
              <img
                src="/brand/hero-visual.png"
                alt="OpenClaw Hero Visual"

              />
            </figure>

          </div>
        </section>

        <section className="landingSignals" aria-label="Why OpenClaw">
          {valueRows.map((item) => (
            <article className="landingSignalRow" key={item.label}>
              <h2>{item.label}</h2>
              <p>{item.detail}</p>
            </article>
          ))}
        </section>

        <section className="landingFlow" aria-label="How to get started">
          <h2>How it works</h2>
          <ol>
            {onboardingFlow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <p className="footer landingFooter">
          Build an AI that grows with you instead of restarting every chat.
        </p>
      </main >
    </>
  );
}
