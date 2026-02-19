import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import {
  getAuthMe,
  getTelegramPairingStatus,
  getSubscription,
  logoutAuth,
  pairTelegram,
  saveTenantAgentConfig,
  PairingStatus,
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
const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "openclaw_ai_bot";

export default function DashboardPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [userName, setUserName] = useState("");
  const [modelProvider, setModelProvider] = useState("openai");
  const [modelId, setModelId] = useState("gpt-5.2");
  const [byokApiKey, setByokApiKey] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("assistant-ai");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [pairing, setPairing] = useState<PairingStatus | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentUrl = useSubscriptionUrl(undefined, tenantId);

  useEffect(() => {
    getAuthMe()
      .then(({ user }) => {
        setTenantId(user.tenantId);
        setUserName(user.name);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    if (!tenantId) return;

    setIsCheckingAccess(true);
    Promise.all([getSubscription(tenantId), getTelegramPairingStatus(tenantId)])
      .then(([sub, pairingStatus]) => {
        setSubscription(sub);
        setPairing(pairingStatus);
      })
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

  async function handleSaveAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResponse("");
    setIsSubmitting(true);

    try {
      if (!tenantId) {
        throw new Error("Account session not found. Login again.");
      }
      if (!pairing?.paired && !pairingCode.trim()) {
        throw new Error("Pairing code is required until Telegram is paired.");
      }
      if (!byokApiKey.trim()) {
        throw new Error("API key is required.");
      }

      if (!pairing?.paired && pairingCode.trim()) {
        await pairTelegram({
          tenantId,
          pairingCode: pairingCode.trim().toUpperCase()
        });
      }
      await saveTenantAgentConfig({
        tenantId,
        modelProvider,
        modelId,
        byokApiKey
      });

      const updatedPairing = await getTelegramPairingStatus(tenantId);
      setPairing(updatedPairing);
      setResponse("Agent settings saved. Open Telegram and start chatting with your bot.");
    } catch (setupError) {
      const message = setupError instanceof Error ? setupError.message : "Setup failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    await logoutAuth();
    router.replace("/login");
  }

  const selectedProviderLabel =
    PROVIDERS.find((provider) => provider.value === modelProvider)?.label ?? modelProvider;
  const agentInstances = [
    {
      id: "assistant-ai",
      name: DEFAULT_TEMPLATE_NAME,
      status: pairing?.paired ? "Ready" : "Needs setup",
      summary: `${selectedProviderLabel} · ${modelId}`
    }
  ];

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
            <button type="button" className="navLink" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </header>

        <section className="heroPanel">
          <span className="pill">Dashboard</span>
          <h1 className="heroTitle">Manage your agent instances.</h1>
          <p className="heroSub">
            {userName ? `${userName}, your free trial starts automatically.` : "Your free trial starts automatically."}{" "}
            Select an agent, edit its settings, and use Telegram as your chat interface.
          </p>
        </section>

        <section className="dashboardGrid">
          <article className="panel">
            <h2 className="panelTitle">Agent Instances</h2>
            <p className="panelText">Choose an agent to configure.</p>
            <div className="agentList">
              {agentInstances.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  className={`agentItem ${selectedAgentId === agent.id ? "active" : ""}`}
                  onClick={() => setSelectedAgentId(agent.id)}
                >
                  <strong>{agent.name}</strong>
                  <span>{agent.summary}</span>
                  <em>{agent.status}</em>
                </button>
              ))}
            </div>
            <p className="helper">
              Telegram bot: <code>@{TELEGRAM_BOT_USERNAME}</code>
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
            <h2 className="panelTitle">Edit Agent: {DEFAULT_TEMPLATE_NAME}</h2>
            <p className="panelText">
              Update model and API key. Pair Telegram once using <code>/start</code>.
            </p>

            <form className="stacked" onSubmit={handleSaveAgent}>
              {!tenantId && (
                <div className="cta-box">
                  <p>Account session not found. Login so your workspace is linked.</p>
                  <Link href="/login" className="button">
                    Go to Login
                  </Link>
                </div>
              )}

              <input
                placeholder="Paste pairing code from Telegram"
                value={pairingCode}
                onChange={(event) => setPairingCode(event.target.value)}
              />

              <div className="notice">
                Agent template: <strong>{DEFAULT_TEMPLATE_NAME}</strong>
                <input type="hidden" value={DEFAULT_TEMPLATE_ID} readOnly />
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
                placeholder="LLM API key"
                value={byokApiKey}
                onChange={(event) => setByokApiKey(event.target.value)}
              />

              <button type="submit" disabled={isCheckingAccess || isSubmitting || !tenantId}>
                {isSubmitting ? "Saving..." : "Save Agent Settings"}
              </button>
            </form>
          </article>

          <aside className="panel">
            <h3 className="panelTitle">Setup Status</h3>
            <p className="panelText">Agent setup and Telegram pairing status.</p>
            {pairing?.paired ? (
              <p className="success">Telegram paired successfully.</p>
            ) : (
              <p className="helper">Not paired yet.</p>
            )}
            {response && <p className="success">{response}</p>}
            {error && <p className="error">{error}</p>}
            <p className="helper">
              Once created, continue in Telegram using <code>@{TELEGRAM_BOT_USERNAME}</code>.
            </p>
          </aside>
        </section>
      </main>
    </>
  );
}
