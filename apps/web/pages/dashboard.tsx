import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import {
  createRun,
  getSubscription,
  getTemplates,
  SubscriptionStatus,
  Template
} from "../lib/api/control";
import { useSubscriptionUrl } from "../lib/hooks/use-payment";

function formatTrialTime(ms: number): string {
  const safeMs = Math.max(0, ms);
  const hours = Math.floor(safeMs / (1000 * 60 * 60));
  const minutes = Math.floor((safeMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("support-agent");
  const [modelProvider, setModelProvider] = useState("openai");
  const [modelId, setModelId] = useState("gpt-4o-mini");
  const [prompt, setPrompt] = useState("Run starter workflow");
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
    getTemplates()
      .then((items) => {
        setTemplates(items);
        if (items[0]) {
          setTemplateId(items[0].id);
        }
      })
      .catch(() => setError("Unable to load templates"));
  }, []);

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
        byokApiKey,
        prompt
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
              This is the quickest way to use your OpenClaw agent today.
            </p>
            <ol className="plainList">
              <li>Open Telegram and start a chat with your configured OpenClaw bot.</li>
              <li>Send: <code>/start</code>.</li>
              <li>Send a test instruction, for example: <code>summarize today&apos;s tasks</code>.</li>
              <li>Return here to trigger advanced runs only when needed.</li>
            </ol>
            <p className="helper">WhatsApp support is planned next after Telegram-first onboarding.</p>
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
              <input
                required
                placeholder="Tenant ID"
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
              />

              <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>

              <div className="waitlist">
                <input
                  placeholder="Model provider"
                  value={modelProvider}
                  onChange={(event) => setModelProvider(event.target.value)}
                />
                <input
                  placeholder="Model ID"
                  value={modelId}
                  onChange={(event) => setModelId(event.target.value)}
                />
              </div>

              <input
                placeholder="BYOK API key"
                value={byokApiKey}
                onChange={(event) => setByokApiKey(event.target.value)}
              />

              <textarea
                placeholder="Prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
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
