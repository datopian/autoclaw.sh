export function workerBaseUrl(): string {
  return process.env.WORKER_API_BASE_URL ?? "https://YOUR_WORKER_API_HOST";
}
