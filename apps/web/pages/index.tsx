import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type ChatMessage = {
  type: "user" | "bot";
  text?: string;
  html?: string;
};

const scenarios: ChatMessage[][] = [
  [
    { type: "user", text: "Hey, anything urgent in my email today?" },
    {
      type: "bot",
      html: `I checked your inbox:<br/><br/>📩 <strong>Invoice from Acme Co</strong> — due tomorrow<br/>📅 <strong>Team meeting moved</strong> — now at 3pm<br/>✈️ <strong>Flight confirmed</strong> — Friday is all set<br/><br/>Want me to handle any of these?`,
    },
    { type: "user", text: "Pay the invoice and update my calendar" },
    { type: "bot", html: `Done! Invoice paid and calendar updated ✓` },
  ],
  [
    { type: "user", text: "Find the proposal I sent to Sarah last week" },
    {
      type: "bot",
      html: `Found it in your Drive:<br/><br/>📄 <strong>Q1 Partnership Proposal</strong><br/>Shared with Sarah on Feb 10<br/>Last edited by you, 3 pages<br/><br/>Want me to send her a follow-up?`,
    },
    { type: "user", text: "Yes, ask if she had a chance to review it" },
    { type: "bot", html: `Follow-up sent to Sarah ✓<br/>I'll let you know when she replies.` },
  ],
  [
    { type: "user", text: "Move my 2pm meeting to Thursday" },
    {
      type: "bot",
      html: `📅 <strong>Design Review with Alex</strong><br/>Currently: Wednesday 2pm<br/><br/>Alex is free Thursday at 2pm and 4pm. Which works better?`,
    },
    { type: "user", text: "4pm works" },
    { type: "bot", html: `Moved to Thursday 4pm ✓<br/>Alex has been notified.` },
  ],
  [
    { type: "user", text: "Draft a reply to Tom's email about the budget" },
    {
      type: "bot",
      html: `Here's a draft based on your conversation:<br/><br/><em>"Hi Tom, thanks for the breakdown. The Q2 numbers look good — let's go ahead with Option B. Can you send the updated timeline by Friday?"</em><br/><br/>Send it, or want me to adjust?`,
    },
    { type: "user", text: "Make it a bit more formal and send it" },
    { type: "bot", html: `Toned up and sent to Tom ✓` },
  ],
];

function AnimatedChat() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const [fading, setFading] = useState(false);

  const currentScenario = scenarios[scenarioIndex];

  const nextScenario = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setScenarioIndex((i) => (i + 1) % scenarios.length);
      setVisibleCount(0);
      setShowTyping(false);
      setFading(false);
    }, 400);
  }, []);

  useEffect(() => {
    if (visibleCount >= currentScenario.length) {
      // Pause on completed conversation, then rotate
      const rotateTimer = setTimeout(nextScenario, 4000);
      return () => clearTimeout(rotateTimer);
    }

    const typingDelay = visibleCount === 0 ? 800 : 1000;
    const typingTimer = setTimeout(() => setShowTyping(true), typingDelay);

    const messageDelay =
      typingDelay + (currentScenario[visibleCount].type === "bot" ? 1400 : 500);
    const messageTimer = setTimeout(() => {
      setShowTyping(false);
      setVisibleCount((c) => c + 1);
    }, messageDelay);

    return () => {
      clearTimeout(typingTimer);
      clearTimeout(messageTimer);
    };
  }, [visibleCount, scenarioIndex, currentScenario, nextScenario]);

  return (
    <div className="heroVisualWrap">
      <div className="heroBgBlob heroBgBlob1" aria-hidden="true" />
      <div className="heroBgBlob heroBgBlob2" aria-hidden="true" />
      <div className="heroBgBlob heroBgBlob3" aria-hidden="true" />
      <div className={`chatMockup ${fading ? "chatFading" : ""}`}>
        <div className="chatHeader">
          <span className="chatAvatar">🤖</span>
          <span className="chatName">Your Assistant</span>
          <span className="chatStatus">
            <span className="chatOnline" /> Online
          </span>
        </div>
        <div className="chatMessages">
          {currentScenario.slice(0, visibleCount).map((msg, i) => (
            <div
              key={`${scenarioIndex}-${i}`}
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
              Chat with your assistant on Telegram, WhatsApp, or the web.
              It reads your email, manages your calendar, and finds your files.
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
              <p>Telegram, WhatsApp, or web — chat wherever you're comfortable. No new apps to learn.</p>
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
              <h3>Pick your channel</h3>
              <p>Telegram, WhatsApp, or web chat — connect in two minutes.</p>
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
