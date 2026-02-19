import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { startAuth, verifyAuth } from "../lib/api/control";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCodeHint, setDevCodeHint] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await startAuth({ email });
      setIsCodeSent(result.requiresVerification);
      setDevCodeHint(result.devCode ?? "");
      setIsSubmitting(false);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Unable to send login code";
      setError(message);
      setIsSubmitting(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await verifyAuth({ email, code });
      router.push("/dashboard");
    } catch (verifyError) {
      const message =
        verifyError instanceof Error ? verifyError.message : "Unable to verify login code";
      setError(message);
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Login | OpenClaw AaaS</title>
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
          </nav>
        </header>

        <section className="heroPanel">
          <span className="pill">Login</span>
          <h1 className="heroTitle">Sign in with one-time code.</h1>
          <p className="heroSub">
            Enter your email and we will send a short-lived verification code. First-time email
            automatically creates your account.
          </p>
        </section>

        <section className="pageGrid">
          <article className="panel">
            {!isCodeSent ? (
              <form className="stacked" onSubmit={handleSendCode}>
                <input
                  required
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Login Code"}
                </button>
              </form>
            ) : (
              <form className="stacked" onSubmit={handleVerify}>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Verifying..." : "Verify & Login"}
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
            <h3 className="panelTitle">One-step access</h3>
            <p className="panelText">
              No signup page and no password. Use your email here, verify OTP, and continue.
            </p>
          </aside>
        </section>
      </main>
    </>
  );
}
