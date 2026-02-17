import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

const chatMessages = [
  { type: "user" as const, text: "Hey, anything urgent in my email today?" },
  {
    type: "bot" as const,
    html: `Good morning! I checked your inbox:<br/><br/>📩 <strong>Invoice from Acme Co</strong> — due tomorrow<br/>📅 <strong>Team meeting moved</strong> — now at 3pm<br/>✈️ <strong>Flight confirmed</strong> — Friday is all set<br/><br/>Want me to handle any of these?`,
  },
  { type: "user" as const, text: "Pay the invoice and update my calendar" },
  {
    type: "bot" as const,
    html: `Done! Invoice payment initiated and calendar updated ✓`,
  },
];

function AnimatedChat() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showTyping, setShowTyping] = useState(false);

  useEffect(() => {
    if (visibleCount >= chatMessages.length) return;

    // Show typing indicator before each message
    const typingDelay = visibleCount === 0 ? 800 : 1200;
    const typingTimer = setTimeout(() => setShowTyping(true), typingDelay);

    // Then show the message
    const messageDelay = typingDelay + (chatMessages[visibleCount].type === "bot" ? 1500 : 600);
    const messageTimer = setTimeout(() => {
      setShowTyping(false);
      setVisibleCount((c) => c + 1);
    }, messageDelay);

    return () => {
      clearTimeout(typingTimer);
      clearTimeout(messageTimer);
    };
  }, [visibleCount]);

  return (
    <div className="chatMockup">
      <div className="chatHeader">
        <span className="chatAvatar">🤖</span>
        <span className="chatName">Your Assistant</span>
        <span className="chatStatus">
          <span className="chatOnline" /> Online
        </span>
      </div>
      <div className="chatMessages">
        {chatMessages.slice(0, visibleCount).map((msg, i) => (
          <div
            key={i}
            className={`chatBubble ${msg.type === "user" ? "chatBubbleUser" : "chatBubbleBot"} chatBubbleAnimate`}
          >
            {msg.html ? (
              <span dangerouslySetInnerHTML={{ __html: msg.html }} />
            ) : (
              msg.text
            )}
          </div>
        ))}
        {showTyping && (
          <div className="chatBubble chatBubbleBot chatTyping">
            <span className="typingDot" />
            <span className="typingDot" />
            <span className="typingDot" />
          </div>
        )}
      </div>
    </div>
  );
}

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
            <h1 className="landingTitle">
              Your Own AI Assistant.
              <br />
              It Doesn't Just Talk&nbsp;—{" "}
              <span className="landingHighlight">It&nbsp;Does.</span>
            </h1>
            <p className="landingLead">
              Talk to your assistant on Telegram. It reads your email,
              manages your calendar, and finds your files.
              No tech skills needed — we handle everything.
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
            <AnimatedChat />
          </div>
        </section>

        <section className="landingValueProps">
          <div className="valueProp">
            <div className="valuePropIcon">⚡</div>
            <div>
              <h3>Works where you already are</h3>
              <p>Chat on Telegram. No new apps to learn, no dashboards to figure out.</p>
            </div>
          </div>
          <div className="valueProp">
            <div className="valuePropIcon">🧠</div>
            <div>
              <h3>Actually does things for you</h3>
              <p>This isn't just a chatbot. It reads emails, moves files, updates your calendar — real actions.</p>
            </div>
          </div>
          <div className="valueProp">
            <div className="valuePropIcon">🔐</div>
            <div>
              <h3>Safe and sandboxed</h3>
              <p>Runs in its own secure space. You choose what it can access. Your data stays yours.</p>
            </div>
          </div>
        </section>

        <section className="landingSteps" id="how-it-works">
          <h2>Three steps. That's it.</h2>
          <div className="stepsGrid">
            <div className="stepCard">
              <span className="stepNumber">1</span>
              <h3>Create your account</h3>
              <p>Quick signup, no credit card. You're in within a minute.</p>
            </div>
            <div className="stepConnector" aria-hidden="true">→</div>
            <div className="stepCard">
              <span className="stepNumber">2</span>
              <h3>Connect Telegram</h3>
              <p>We walk you through it. Takes about two minutes.</p>
            </div>
            <div className="stepConnector" aria-hidden="true">→</div>
            <div className="stepCard">
              <span className="stepNumber">3</span>
              <h3>Say hello</h3>
              <p>Your assistant is live. Start with a question, give it a task — it's ready.</p>
            </div>
          </div>
        </section>

        <section className="landingCapabilities">
          <h2>Start simple. Add more when you're ready.</h2>
          <p>
            You control what your assistant can access. Start with chat,
            then unlock more capabilities as you get comfortable.
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
                "What's urgent today?" Morning briefings, draft replies,
                flag what matters.
              </p>
            </div>
            <div className="capCard">
              <div className="capIcon">📁</div>
              <h3>Connect your drive</h3>
              <p>
                "Find that proposal from last week." It searches and
                retrieves files for you.
              </p>
            </div>
            <div className="capCard">
              <div className="capIcon">📅</div>
              <h3>Connect your calendar</h3>
              <p>
                "Move Thursday's meeting to Friday." It manages your
                schedule so you don't have to.
              </p>
            </div>
          </div>
          <p className="capMore">
            And this is just the beginning — more integrations are on the way.
          </p>
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
          <h2>Ready to meet your AI assistant?</h2>
          <p>
            Join the waitlist and we'll get in touch.
          </p>
          <Link href="/waitlist" className="button landingButton">
            Join the Waitlist
          </Link>
          <div className="landingFooterMeta">
            Built by <a href="https://datopian.com" target="_blank" rel="noopener noreferrer" className="footerLink">Datopian</a> · Powered by OpenClaw
          </div>
        </section>
      </main>
    </>
  );
}
