export function workerBaseUrl(): string {
  if (!process.env.WORKER_API_BASE_URL) throw new Error("WORKER_API_BASE_URL is not set");
}
