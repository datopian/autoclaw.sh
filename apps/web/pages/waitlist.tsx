import Head from "next/head";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { submitWaitlist } from "../lib/api/waitlist";
import { trackEvent } from "../lib/analytics";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("idle");

    try {
      await submitWaitlist({ email, segment: "solo-builders" });
      trackEvent({
        name: "waitlist_submitted",
        metadata: { segment: "solo-builders" }
      });
      setStatus("ok");
      setEmail("");
    } catch {
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Join the Waitlist | Your AI Assistant</title>
      </Head>
      <main>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brandMark" />
            AI Assistant
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
          <span className="pill">Early Access</span>
          <h1 className="heroTitle">Join the Waitlist</h1>
          <p className="heroSub">
            We're onboarding new users gradually to make sure everyone gets a
            great experience. Leave your email and we'll reach out when it's
            your turn.
          </p>

          <form className="waitlist" onSubmit={handleSubmit}>
            <input
              required
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Join Waitlist"}
            </button>
          </form>

          {status === "ok" && (
            <p className="success">You're on the list! We'll be in touch soon.</p>
          )}
          {status === "error" && (
            <p className="error">Submission failed. Please retry.</p>
          )}
        </section>
      </main>
    </>
  );
}
