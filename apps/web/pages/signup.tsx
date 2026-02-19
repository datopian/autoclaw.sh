import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { startAccountSignup, verifyAccountSignup } from "../lib/api/control";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [devCodeHint, setDevCodeHint] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await startAccountSignup({ name, email });
      setIsCodeSent(result.requiresVerification);
      setDevCodeHint(result.devCode ?? "");
      setIsSubmitting(false);
    } catch {
      setError("Unable to create account. Please retry.");
      setIsSubmitting(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const verified = await verifyAccountSignup({
        email,
        code: verificationCode
      });
      router.push(`/dashboard?tenantId=${verified.tenantId}`);
    } catch {
      setError("Unable to verify email. Please check code and retry.");
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
            <h2 className="panelTitle">
              {isCodeSent ? "Step 2: Verify your email" : "Step 1: Create your account"}
            </h2>
            <p className="panelText">
              {isCodeSent
                ? "Enter the 6-digit code we sent to your email. Verification is required before setup."
                : "Use your work email so we can keep your agent and memory private to your account."}
            </p>
            {!isCodeSent ? (
              <form className="stacked" onSubmit={handleStart}>
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
                  {isSubmitting ? "Sending Code..." : "Send Verification Code"}
                </button>
              </form>
            ) : (
              <form className="stacked" onSubmit={handleVerify}>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit verification code"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                />
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Verifying..." : "Verify Email & Continue"}
                </button>
              </form>
            )}
            {error && <p className="error">{error}</p>}
            {devCodeHint && (
              <p className="helper">
                Dev code (email provider not configured): <strong>{devCodeHint}</strong>
              </p>
            )}
          </article>

          <aside className="panel">
            <h3 className="panelTitle">What happens next</h3>
            <p className="panelText">
              After email verification, we will take you to your dashboard with Telegram setup
              instructions and a quick checklist to start chatting with your agent.
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
