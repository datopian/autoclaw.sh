import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { createTenant } from "../lib/api/control";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const tenant = await createTenant({ name, email });
      // Redirect to dashboard immediately
      router.push(`/dashboard?tenantId=${tenant.id}`);
    } catch {
      setError("Unable to create account. Please retry.");
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
          <h1 className="heroTitle">Create your account and start your first agent.</h1>
          <p className="heroSub">
            No payment required to begin. You get a 48-hour free trial so you can test your
            agent in Telegram before subscribing.
          </p>
        </section>

        <section className="pageGrid">
          <article className="panel">
            <h2 className="panelTitle">Step 1: Create your account</h2>
            <p className="panelText">
              Use your work email so we can keep your agent and memory private to your account.
            </p>
            <form className="stacked" onSubmit={handleSubmit}>
              <input
                required
                placeholder="Your name or company name"
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
                {isSubmitting ? "Creating Account..." : "Create Account & Continue"}
              </button>
            </form>
            {error && <p className="error">{error}</p>}
          </article>

          <aside className="panel">
            <h3 className="panelTitle">What happens next</h3>
            <p className="panelText">
              We will take you to your dashboard with Telegram setup instructions and a quick
              checklist to start chatting with your agent.
            </p>
            <ul className="plainList">
              <li>48-hour free trial starts immediately.</li>
              <li>Telegram is the primary chat channel right now.</li>
              <li>You only subscribe once you are ready to continue.</li>
            </ul>
          </aside>
        </section>
      </main>
    </>
  );
}
