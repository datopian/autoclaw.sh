export type WaitlistRequest = {
  email: string;
  segment?: string;
};

export async function submitWaitlist(payload: WaitlistRequest): Promise<void> {
  const response = await fetch("/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Unable to submit waitlist request.");
  }
}
