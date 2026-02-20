import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getAuthMe,
  getTelegramPairingStatus,
  getSubscription,
  getTenantProfile,
  logoutAuth,
  pairTelegram,
  PairingStatus,
  saveTenantAgentConfig,
  SubscriptionStatus,
  TenantProfile,
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
      { id: "gpt-5.2-nano", label: "GPT-5.2 nano" },
    ],
  },
  {
    value: "anthropic",
    label: "Anthropic Claude",
    models: [
      { id: "claude-sonnet-4-0", label: "Claude Sonnet 4" },
      { id: "claude-opus-4-1", label: "Claude Opus 4.1" },
      { id: "claude-3-5-haiku-latest", label: "Claude Haiku 3.5" },
    ],
  },
  {
    value: "google",
    label: "Google Gemini",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
    ],
  },
];

const DEFAULT_TEMPLATE_NAME = "Assistant AI";
const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "openclaw_ai_bot";

type WizardStep = 1 | 2 | 3;

export default function DashboardPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [userName, setUserName] = useState("");
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [modelProvider, setModelProvider] = useState("openai");
  const [modelId, setModelId] = useState("gpt-5.2");
  const [byokApiKey, setByokApiKey] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [pairing, setPairing] = useState<PairingStatus | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentUrl = useSubscriptionUrl(undefined, tenantId);
  const telegramBotUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}`;

  const hasConfiguredAgent = useMemo(() => {
    return Boolean(
      pairing?.paired &&
        tenantProfile?.modelProvider &&
        tenantProfile?.modelId &&
        tenantProfile?.hasApiKey
    );
  }, [pairing?.paired, tenantProfile?.hasApiKey, tenantProfile?.modelId, tenantProfile?.modelProvider]);

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
    Promise.all([getSubscription(tenantId), getTelegramPairingStatus(tenantId), getTenantProfile()])
      .then(([sub, pairingStatus, profile]) => {
        setSubscription(sub);
        setPairing(pairingStatus);
        setTenantProfile(profile);

        const initialProvider = profile?.modelProvider ?? "openai";
        const initialModel = profile?.modelId ?? "gpt-5.2";
        setModelProvider(initialProvider);
        setModelId(initialModel);
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

  async function reloadSetupData(currentTenantId: string) {
    const [sub, pairingStatus, profile] = await Promise.all([
      getSubscription(currentTenantId),
      getTelegramPairingStatus(currentTenantId),
      getTenantProfile(),
    ]);
    setSubscription(sub);
    setPairing(pairingStatus);
    setTenantProfile(profile);
  }

  async function handleCreateAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResponse("");
    setIsSubmitting(true);

    try {
      if (!tenantId) {
        throw new Error("Account session not found. Login again.");
      }
      if (!pairing?.paired && !pairingCode.trim()) {
        throw new Error("Please paste your Telegram code.");
      }
      if (!byokApiKey.trim()) {
        throw new Error("Please add your model API key.");
      }

      if (!pairing?.paired && pairingCode.trim()) {
        await pairTelegram({
          tenantId,
          pairingCode: pairingCode.trim().toUpperCase(),
        });
      }

      await saveTenantAgentConfig({
        tenantId,
        modelProvider,
        modelId,
        byokApiKey,
      });

      await reloadSetupData(tenantId);
      setResponse("Agent created. Open Telegram and start chatting now.");
      setShowSuccessScreen(true);
      setPairingCode("");
      setByokApiKey("");
    } catch (setupError) {
      const message = setupError instanceof Error ? setupError.message : "Setup failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

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
        throw new Error("Please paste your Telegram code to finish pairing.");
      }
      if (!byokApiKey.trim()) {
        throw new Error("Please add your model API key to save changes.");
      }

      if ((!pairing?.paired || pairingCode.trim()) && pairingCode.trim()) {
        await pairTelegram({
          tenantId,
          pairingCode: pairingCode.trim().toUpperCase(),
        });
      }

      await saveTenantAgentConfig({
        tenantId,
        modelProvider,
        modelId,
        byokApiKey,
      });

      await reloadSetupData(tenantId);
      setResponse("Agent settings saved.");
      setPairingCode("");
      setByokApiKey("");
    } catch (setupError) {
      const message = setupError instanceof Error ? setupError.message : "Save failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function goToNextWizardStep() {
    setError("");
    if (wizardStep === 1) {
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      if (!pairing?.paired && !pairingCode.trim()) {
        setError("Paste the code you got in Telegram before continuing.");
        return;
      }
      setWizardStep(3);
    }
  }

  function goToPreviousWizardStep() {
    setError("");
    if (wizardStep === 3) {
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      setWizardStep(1);
    }
  }

  async function handleLogout() {
    await logoutAuth();
    router.replace("/login");
  }

  const selectedProvider = PROVIDERS.find((provider) => provider.value === modelProvider) ?? PROVIDERS[0];

  return (
    <>
      <Head>
        <title>Dashboard | OpenClaw Autopilot</title>
      </Head>

      <main>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brandMark" />
            OpenClaw Autopilot
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
          <h1 className="heroTitle">Set up and manage your Telegram agent.</h1>
          <p className="heroSub">
            {userName ? `${userName},` : ""} this page gives you one clear flow: create your first agent, or
            select an existing one and edit settings.
          </p>
        </section>

        <section className="panel dashboardSinglePanel">
          {!tenantId && (
            <div className="cta-box">
              <p>Account session not found. Login so your workspace is linked.</p>
              <Link href="/login" className="button">
                Go to Login
              </Link>
            </div>
          )}

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

          {!hasConfiguredAgent || showSuccessScreen ? (
            <>
              {!showSuccessScreen && (
                <>
                  <h2 className="panelTitle">Create your first agent</h2>
                  <p className="panelText">Follow the steps. You can always edit settings later.</p>
                </>
              )}

              {!showSuccessScreen && (
                <div className="wizardSteps" aria-label="Onboarding steps">
                  <span className={wizardStep === 1 ? "active" : ""}>1. Open Telegram</span>
                  <span className={wizardStep === 2 ? "active" : ""}>2. Paste Code</span>
                  <span className={wizardStep === 3 ? "active" : ""}>3. Choose AI Model</span>
                </div>
              )}

              {!showSuccessScreen && wizardStep === 1 && (
                <div className="wizardCard">
                  <p className="panelText">
                    Tap the button below, then send <code>/start</code> in Telegram. The bot will reply with a short code.
                  </p>
                  <div className="actions">
                    <a href={telegramBotUrl} target="_blank" rel="noreferrer" className="button">
                      Open @{TELEGRAM_BOT_USERNAME}
                    </a>
                    <button type="button" className="ghostButton" onClick={goToNextWizardStep}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {!showSuccessScreen && wizardStep === 2 && (
                <div className="wizardCard">
                  <p className="panelText">
                    Paste the code from Telegram here. This links your chat account to your agent.
                  </p>
                  <input
                    placeholder="Example: AB12CD"
                    value={pairingCode}
                    onChange={(event) => setPairingCode(event.target.value)}
                  />
                  <div className="actions">
                    <button type="button" className="ghostButton" onClick={goToPreviousWizardStep}>
                      Back
                    </button>
                    <button type="button" onClick={goToNextWizardStep}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {!showSuccessScreen && wizardStep === 3 && (
                <form className="stacked wizardCard" onSubmit={handleCreateAgent}>
                  <p className="panelText">
                    Pick your AI provider, choose a model, and paste your API key.
                  </p>
                  <div className="waitlist">
                    <select
                      aria-label="AI provider"
                      value={modelProvider}
                      onChange={(event) => setModelProvider(event.target.value)}
                    >
                      {PROVIDERS.map((provider) => (
                        <option key={provider.value} value={provider.value}>
                          {provider.label}
                        </option>
                      ))}
                    </select>
                    <select aria-label="AI model" value={modelId} onChange={(event) => setModelId(event.target.value)}>
                      {selectedProvider.models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="password"
                    placeholder="Paste your API key"
                    value={byokApiKey}
                    onChange={(event) => setByokApiKey(event.target.value)}
                  />

                  <div className="actions">
                    <button type="button" className="ghostButton" onClick={goToPreviousWizardStep}>
                      Back
                    </button>
                    <button type="submit" disabled={isCheckingAccess || isSubmitting || !tenantId}>
                      {isSubmitting ? "Creating..." : "Create Agent"}
                    </button>
                  </div>
                </form>
              )}

              {showSuccessScreen && (
                <div className="wizardCard">
                  <p className="success">Agent created successfully.</p>
                  <p className="panelText">
                    Go back to Telegram and start chatting with your AI agent.
                  </p>
                  <div className="actions">
                    <a href={telegramBotUrl} target="_blank" rel="noreferrer" className="button">
                      Chat in Telegram
                    </a>
                    <button type="button" className="ghostButton" onClick={() => setShowSuccessScreen(false)}>
                      Go to Agent Settings
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {!selectedAgentId ? (
                <>
                  <h2 className="panelTitle">Your agent instances</h2>
                  <p className="panelText">Select an agent to edit its settings.</p>
                  <div className="agentList">
                    <button
                      type="button"
                      className="agentItem"
                      onClick={() => setSelectedAgentId("assistant-ai")}
                    >
                      <strong>{DEFAULT_TEMPLATE_NAME}</strong>
                      <span>
                        {(tenantProfile?.modelProvider ?? "openai").toUpperCase()} · {tenantProfile?.modelId ?? "gpt-5.2"}
                      </span>
                      <em>{pairing?.paired ? "Ready" : "Needs setup"}</em>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="dashboardHeaderRow">
                    <h2 className="panelTitle">Edit Agent: {DEFAULT_TEMPLATE_NAME}</h2>
                    <button type="button" className="ghostButton" onClick={() => setSelectedAgentId(null)}>
                      Back to list
                    </button>
                  </div>
                  <p className="panelText">
                    Update your Telegram link, model, and API key. Click Save when finished.
                  </p>

                  <form className="stacked" onSubmit={handleSaveAgent}>
                    <div className="notice">
                      Telegram status: <strong>{pairing?.paired ? "Paired" : "Not paired"}</strong>
                    </div>

                    <input
                      placeholder={pairing?.paired ? "Paste a new Telegram code to re-link (optional)" : "Paste Telegram code"}
                      value={pairingCode}
                      onChange={(event) => setPairingCode(event.target.value)}
                    />

                    <div className="waitlist">
                      <select
                        aria-label="AI provider"
                        value={modelProvider}
                        onChange={(event) => setModelProvider(event.target.value)}
                      >
                        {PROVIDERS.map((provider) => (
                          <option key={provider.value} value={provider.value}>
                            {provider.label}
                          </option>
                        ))}
                      </select>
                      <select aria-label="AI model" value={modelId} onChange={(event) => setModelId(event.target.value)}>
                        {selectedProvider.models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="password"
                      placeholder="Paste your API key"
                      value={byokApiKey}
                      onChange={(event) => setByokApiKey(event.target.value)}
                    />
                    <p className="helper">For security, your key is hidden and must be entered again when saving.</p>

                    <div className="actions">
                      <button type="submit" disabled={isCheckingAccess || isSubmitting || !tenantId}>
                        {isSubmitting ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </>
          )}

          {response && <p className="success">{response}</p>}
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    </>
  );
}
