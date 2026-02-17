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

        <section className="landingProblem">
          <h2>Getting your own AI assistant used to be complicated.</h2>
          <p>
            Most AI tools expect you to be technical. We think that's wrong.
            You shouldn't need to know about servers, APIs, or code to have
            an AI that works for you. So we made it simple.
          </p>
        </section>

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
      </main>
    </>
  );
}
