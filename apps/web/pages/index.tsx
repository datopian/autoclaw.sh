import Head from "next/head";
import Link from "next/link";

const valueRows = [
  {
    label: "Easy to Start",
    detail:
      "Create your account, choose an agent template, and get step-by-step instructions to use your agent from chat.",
  },
  {
    label: "Chat-First Experience",
    detail:
      "Telegram is supported first so you can talk to your agent where you already work. WhatsApp support is next.",
  },
  {
    label: "Private and Isolated",
    detail:
      "Your agent runs in a sandboxed cloud environment, not on your laptop. Only your account can access your agent, memory, and history.",
  },
];

const onboardingFlow = [
  "Create your agent in under two minutes.",
  "Follow Telegram setup steps from your dashboard.",
  "Start chatting and get work done right away.",
];

export default function HomePage() {
  return (
    <>
      <Head>
        <title>OpenClaw AaaS</title>
        <meta
          name="description"
          content="Launch your own AI agent and use it from Telegram. OpenClaw handles secure infrastructure so you do not expose your personal computer."
        />
      </Head>

      <main className="landingMain">
        <header className="topbar landingTopbar">
          <Link href="/" className="brand landingBrand">
            <span className="brandMark" />
            OpenClaw AaaS
          </Link>
          <nav className="navLinks landingNavLinks">
            <Link href="/pricing" className="landingNavLink">
              Pricing
            </Link>
            <Link href="/login" className="landingNavLink">
              Login
            </Link>
            <Link href="/dashboard" className="landingNavLink">
              Dashboard
            </Link>
          </nav>
        </header>

        <section className="landingHero">
          <div className="landingHeroCopy">
            <p className="landingKicker">OpenClaw Agent-as-a-Service</p>
            <h1 className="landingTitle">
              Your own AI agent.
              <br />
              Run it safely. Chat with it anywhere.
            </h1>
            <p className="landingLead">
              Set up once, then use your agent from Telegram with clear instructions. Keep your
              data and workflow isolated from your personal devices.
            </p>
            <div className="actions landingActions">
              <Link href="/login" className="button landingButton">
                Create Agent
              </Link>
              <Link href="/dashboard" className="button ghostButton landingGhostButton">
                See Demo Dashboard
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
          Includes a 48-hour free trial so you can test before paying.
        </p>
      </main >
    </>
  );
}
