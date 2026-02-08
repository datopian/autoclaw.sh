import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import { createRun, getSubscription, getTemplates, Template } from "../lib/api/control";
import { useSubscriptionUrl } from "../lib/hooks/use-payment";

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
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);

  const paymentUrl = useSubscriptionUrl(undefined, tenantId);

  useEffect(() => {
    const incomingTenant = router.query.tenantId;
    if (typeof incomingTenant === "string" && incomingTenant) {
      setTenantId(incomingTenant);
    }
  }, [router.query.tenantId]);

  useEffect(() => {
    if (!tenantId) return;

    getSubscription(tenantId)
      .then((sub) => setHasActiveSubscription(sub.active))
      .catch(() => setHasActiveSubscription(false));
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
          <h1 className="heroTitle">Launch Your First Agent Run.</h1>
          <p className="heroSub">
            This screen sends run requests to your deployed Worker API. Runs require
            an active Starter subscription mapped to the tenant ID.
          </p>
        </section>

        <section className="pageGrid">
          <article className="panel">
            <h2 className="panelTitle">Run Configuration</h2>
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

              {hasActiveSubscription === false ? (
                <div className="cta-box">
                  <p>Active subscription required to run agents.</p>
                  <a href={paymentUrl} target="_blank" rel="noreferrer" className="button">
                    Subscribe via Stripe
                  </a>
                </div>
              ) : (
                <button type="submit" disabled={!hasActiveSubscription}>
                  {hasActiveSubscription === null ? "Checking subscription..." : "Queue Run"}
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
              If you see `active subscription required`, complete Stripe checkout and
              resend subscription events for this tenant.
            </p>
          </aside>
        </section>
      </main>
    </>
  );
}
