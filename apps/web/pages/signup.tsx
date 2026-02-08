import Head from "next/head";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { createTenant } from "../lib/api/control";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_STRIPE_STARTER_URL;
    if (!base) {
      return "";
    }

    const url = new URL(base);
    if (email) {
      url.searchParams.set("prefilled_email", email);
    }
    if (tenantId) {
      url.searchParams.set("client_reference_id", tenantId);
      url.searchParams.set("tenant_id", tenantId);
    }

    return url.toString();
  }, [email, tenantId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const tenant = await createTenant({ name, email });
      setTenantId(tenant.id);
    } catch {
      setError("Unable to create tenant. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Signup | OpenClaw AaaS</title>
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
            <Link href="/dashboard" className="navLink">
              Dashboard
            </Link>
          </nav>
        </header>

        <section className="heroPanel">
          <span className="pill">Signup</span>
          <h1 className="heroTitle">Create Tenant, Then Activate Starter.</h1>
          <p className="heroSub">
            We create your tenant first so Stripe and runtime entitlements can be
            mapped to one stable tenant ID.
          </p>
        </section>

        <section className="pageGrid">
          <article className="panel">
            <h2 className="panelTitle">Step 1: Tenant Setup</h2>
            <p className="panelText">Use a stable project name and billing email.</p>
            <form className="stacked" onSubmit={handleSubmit}>
              <input
                required
                placeholder="Project or company name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <input
                required
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating Tenant..." : "Create Tenant"}
              </button>
            </form>
            {error && <p className="error">{error}</p>}
          </article>

          <aside className="panel">
            <h3 className="panelTitle">Step 2: Billing Activation</h3>
            {!tenantId && (
              <p className="helper">Create tenant first to unlock Stripe checkout.</p>
            )}
            {tenantId && (
              <div className="notice">
                <p>
                  Tenant ready: <code>{tenantId}</code>
                </p>
                {paymentUrl ? (
                  <a href={paymentUrl} target="_blank" rel="noreferrer" className="button">
                    Open Stripe Checkout
                  </a>
                ) : (
                  <p className="helper">
                    Set <code>NEXT_PUBLIC_STRIPE_STARTER_URL</code> in `apps/web/.env.local`.
                  </p>
                )}
                <div className="actions">
                  <Link href={`/dashboard?tenantId=${tenantId}`} className="button ghostButton">
                    Continue to Dashboard
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
    </>
  );
}
