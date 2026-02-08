import Head from "next/head";
import Link from "next/link";

const capabilityRows = [
  {
    label: "Control Plane",
    detail:
      "Tenant setup, template lifecycle, and run routing are managed so you can ship agent behavior, not admin glue.",
  },
  {
    label: "Execution Fabric",
    detail:
      "Queued runs, retries, and recovery are built in on a globally distributed infrastructure with BYOK model access.",
  },
];

const operationFlow = [
  "Select a production-ready OpenClaw template.",
  "Connect keys and tenant settings.",
  "Run in managed infrastructure with auditable execution history.",
];

export default function HomePage() {
  return (
    <>
      <Head>
        <title>OpenClaw AaaS</title>
        <meta
          name="description"
          content="Managed OpenClaw service for teams that need reliable execution, tenancy, and billing without building platform infrastructure."
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
            <Link href="/signup" className="landingNavLink">
              Signup
            </Link>
            <Link href="/dashboard" className="landingNavLink">
              Dashboard
            </Link>
          </nav>
        </header>

        <section className="landingHero">
          <div className="landingHeroCopy">
            <p className="landingKicker">Managed OpenClaw Runtime</p>
            <h1 className="landingTitle">
              OpenClaw
              <br />
              Agent-as-a-Service. No Mac Mini Required.
            </h1>
            <p className="landingLead">
              Deploy production-ready agents without managing infrastructure. Start chatting
              with your AI assistant in minutes.
            </p>
            <div className="actions landingActions">
              <Link href="/signup" className="button landingButton">
                Create Agent
              </Link>
              <Link href="/pricing" className="button ghostButton landingGhostButton">
                See Pricing
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

        <section className="landingSignals" aria-label="Core capabilities">
          {capabilityRows.map((item) => (
            <article className="landingSignalRow" key={item.label}>
              <h2>{item.label}</h2>
              <p>{item.detail}</p>
            </article>
          ))}
        </section>

        <section className="landingFlow" aria-label="How it works">
          <h2>How teams ship with OpenClaw AaaS</h2>
          <ol>
            {operationFlow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <p className="footer landingFooter">
          Redline focus: launch reliable agent operations first, expand custom logic after
          real usage data.
        </p>
      </main >
    </>
  );
}
