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
        <title>Waitlist | OpenClaw AaaS</title>
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
            <Link href="/login" className="navLink">
              Login
            </Link>
          </nav>
        </header>

        <section className="heroPanel">
          <span className="pill">Pilot Waitlist</span>
          <h1 className="heroTitle">Request Early Access.</h1>
          <p className="heroSub">
            Join the pilot list if you want direct onboarding support and early
            influence over templates and runtime capabilities.
          </p>

          <form className="waitlist" onSubmit={handleSubmit}>
            <input
              required
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Join Waitlist"}
            </button>
          </form>

          {status === "ok" && (
            <p className="success">Request received. We will follow up soon.</p>
          )}
          {status === "error" && (
            <p className="error">Submission failed. Please retry.</p>
          )}
        </section>
      </main>
    </>
  );
}
