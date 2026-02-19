import Head from "next/head";
import Link from "next/link";

export default function PricingPage() {
  return (
    <>
      <Head>
        <title>Pricing | OpenClaw AaaS</title>
      </Head>

      <main className="landingMain">
        <header className="topbar landingTopbar">
          <Link href="/" className="brand landingBrand">
            <span className="brandMark" />
            OpenClaw AaaS
          </Link>
          <nav className="navLinks landingNavLinks">
            <Link href="/" className="landingNavLink">
              Home
            </Link>
            <Link href="/login" className="landingNavLink">
              Login
            </Link>
            <Link href="/dashboard" className="landingNavLink">
              Dashboard
            </Link>
          </nav>
        </header>

        <section className="heroPanel">
          <span className="pill">Pricing</span>
          <h1 className="heroTitle">One Plan. Fastest Path to Production Validation.</h1>
          <p className="heroSub">
            We are intentionally starting with one paid plan to keep onboarding tight,
            support response fast, and product feedback loops short.
          </p>
        </section>

        <section className="pageGrid">
          <article className="panel">
            <h2 className="panelTitle">OpenClaw Starter</h2>
            <p className="price">$19 / month</p>
            <ul className="plainList">
              <li>Managed control plane and run orchestration</li>
              <li>Support, Research, and Ops templates included</li>
              <li>Queue and execution visibility via dashboard flow</li>
              <li>BYOK model provider support</li>
            </ul>
            <div className="actions">
              <Link href="/login?plan=starter" className="button">
                Continue to Login
              </Link>
            </div>
          </article>

          <aside className="panel">
            <h3 className="panelTitle">What You Bring</h3>
            <p className="panelText">
              API keys, prompts, and use-case logic.
            </p>
            <h3 className="panelTitle">What We Manage</h3>
            <p className="panelText">
              Runtime, queueing, billing integration, and baseline reliability.
            </p>
            <p className="helper">
              Enterprise and agency plans are planned after Starter validation.
            </p>
          </aside>
        </section>
      </main>
    </>
  );
}
