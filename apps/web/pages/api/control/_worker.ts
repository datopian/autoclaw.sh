export function workerBaseUrl(): string {
  return process.env.WORKER_API_BASE_URL ?? "https://openclaw-worker-api.datopian.workers.dev";
}
