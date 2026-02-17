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
