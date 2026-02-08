export type AnalyticsEvent = {
  name: string;
  metadata?: Record<string, string | number | boolean>;
};

export function trackEvent(event: AnalyticsEvent): void {
  if (process.env.NODE_ENV !== "production") {
    // Console tracking for local development until analytics provider is wired.
    // eslint-disable-next-line no-console
    console.log("[analytics]", event.name, event.metadata ?? {});
  }
}
