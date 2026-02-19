import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import {
  createRun,
  getSubscription,
  SubscriptionStatus,
} from "../lib/api/control";
import { useSubscriptionUrl } from "../lib/hooks/use-payment";

function formatTrialTime(ms: number): string {
  const safeMs = Math.max(0, ms);
  const hours = Math.floor(safeMs / (1000 * 60 * 60));
  const minutes = Math.floor((safeMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

type ProviderOption = {
  value: string;
  label: string;
  models: Array<{ id: string; label: string }>;
};

const PROVIDERS: ProviderOption[] = [
  {
    value: "openai",
    label: "OpenAI",
    models: [
      { id: "gpt-5.2", label: "GPT-5.2 (latest)" },
      { id: "gpt-5.2-mini", label: "GPT-5.2 mini" },
      { id: "gpt-5.2-nano", label: "GPT-5.2 nano" }
    ]
  },
  {
    value: "anthropic",
    label: "Anthropic Claude",
    models: [
      { id: "claude-sonnet-4-0", label: "Claude Sonnet 4" },
      { id: "claude-opus-4-1", label: "Claude Opus 4.1" },
      { id: "claude-3-5-haiku-latest", label: "Claude Haiku 3.5" }
    ]
  },
  {
    value: "google",
    label: "Google Gemini",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" }
    ]
  }
];

const DEFAULT_TEMPLATE_ID = "support-agent";
const DEFAULT_TEMPLATE_NAME = "Assistant AI";

export default function DashboardPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const templateId = DEFAULT_TEMPLATE_ID;
  const [modelProvider, setModelProvider] = useState("openai");
  const [modelId, setModelId] = useState("gpt-5.2");
  const [byokApiKey, setByokApiKey] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  const paymentUrl = useSubscriptionUrl(undefined, tenantId);

  useEffect(() => {
    const incomingTenant = router.query.tenantId;
    if (typeof incomingTenant === "string" && incomingTenant) {
      setTenantId(incomingTenant);
    }
  }, [router.query.tenantId]);

  useEffect(() => {
    if (!tenantId) return;

    setIsCheckingAccess(true);
    getSubscription(tenantId)
      .then((sub) => setSubscription(sub))
      .catch(() => setSubscription(null))
      .finally(() => setIsCheckingAccess(false));
  }, [tenantId]);

  useEffect(() => {
    const provider = PROVIDERS.find((item) => item.value === modelProvider);
    if (!provider) {
      return;
    }
    const currentStillValid = provider.models.some((model) => model.id === modelId);
    if (!currentStillValid && provider.models[0]) {
      setModelId(provider.models[0].id);
    }
  }, [modelProvider, modelId]);

  async function handleLaunch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResponse("");

    try {
      const result = await createRun({
        tenantId,
        templateId,
        modelProvider,
        modelId,
        byokApiKey
      });
      setResponse(`Run queued successfully: ${result.runId}`);
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : "Run failed";
      setError(message);
    }
  }

  return (
    <>
      <Head>
        <title>Dashboard | OpenClaw AaaS</title>
      </Head>

      <main>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brandMark" />
            OpenClaw AaaS
          </Link>
          <nav className="navLinks">
            <Link href="/pricing" className="navLink">
              Pricing
            </Link>
            <Link href="/signup" className="navLink">
              Signup
            </Link>
          </nav>
        </header>

        <section className="heroPanel">
          <span className="pill">Dashboard</span>
          <h1 className="heroTitle">Start using your agent from Telegram.</h1>
          <p className="heroSub">
            Your free trial starts automatically. Use the onboarding checklist first, then run
            your first action.
          </p>
        </section>

        <section className="pageGrid">
          <article className="panel">
            <h2 className="panelTitle">Step 2: Connect Telegram</h2>
            <p className="panelText">
              We set up the bot infrastructure for you. You only pair your Telegram account and
              start chatting.
            </p>
            <ol className="plainList">
              <li>After signup, we provision your Telegram bot access for your account.</li>
              <li>Open that bot in Telegram and send: <code>/start</code>.</li>
              <li>When asked, enter your one-time pairing code shared by our team.</li>
              <li>Send a simple test message, for example: <code>summarize my tasks for today</code>.</li>
            </ol>
            <p className="helper">
              No BotFather setup is needed on your side. Pairing is currently handled manually by
              our team. If details do not arrive, contact{" "}
              <a href="mailto:hello@datopian.com">hello@datopian.com</a>.
            </p>
            {subscription?.trialActive && (
              <div className="notice">
                Free trial active. Time remaining: <strong>{formatTrialTime(subscription.trialRemainingMs)}</strong>
              </div>
            )}
            {subscription && !subscription.trialActive && !subscription.paidActive && (
              <div className="cta-box">
                <p>Trial ended. Subscribe to keep using your agent.</p>
                <a href={paymentUrl} target="_blank" rel="noreferrer" className="button">
                  Continue with Stripe
                </a>
              </div>
            )}
          </article>

          <article className="panel">
            <h2 className="panelTitle">Advanced Run Configuration</h2>
            <form className="stacked" onSubmit={handleLaunch}>
              {!tenantId && (
                <div className="cta-box">
                  <p>Account session not found. Start from signup so your workspace is linked.</p>
                  <Link href="/signup" className="button">
                    Go to Signup
                  </Link>
                </div>
              )}

              <div className="notice">
                Agent template: <strong>{DEFAULT_TEMPLATE_NAME}</strong>
              </div>

              <div className="waitlist">
                <select
                  aria-label="Model provider"
                  value={modelProvider}
                  onChange={(event) => setModelProvider(event.target.value)}
                >
                  {PROVIDERS.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Model ID"
                  list="model-options"
                  value={modelId}
                  onChange={(event) => setModelId(event.target.value)}
                />
                <datalist id="model-options">
                  {(PROVIDERS.find((provider) => provider.value === modelProvider)?.models ?? []).map(
                    (model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    )
                  )}
                </datalist>
              </div>

              <input
                placeholder="BYOK API key"
                value={byokApiKey}
                onChange={(event) => setByokApiKey(event.target.value)}
              />

              {subscription && !subscription.active ? (
                <div className="cta-box">
                  <p>Subscription required after trial period.</p>
                  <a href={paymentUrl} target="_blank" rel="noreferrer" className="button">
                    Subscribe via Stripe
                  </a>
                </div>
              ) : (
                <button type="submit" disabled={isCheckingAccess || !subscription?.active}>
                  {isCheckingAccess ? "Checking access..." : "Queue Run"}
                </button>
              )}
            </form>
          </article>

          <aside className="panel">
            <h3 className="panelTitle">Run Status</h3>
            <p className="panelText">Responses from `/api/runs` appear below.</p>
            {response && <p className="success">{response}</p>}
            {error && <p className="error">{error}</p>}
            <p className="helper">
              If trial is over and you see `active subscription required`, complete Stripe checkout
              and retry.
            </p>
          </aside>
        </section>
      </main>
    </>
  );
}
