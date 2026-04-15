import { useMemo, useState } from "react";
import {
  calculateModelCosts,
  type CostCalculationResult,
  formatUsd,
} from "./costs/calculator";
import {
  DEFAULT_OUTPUT,
  DEFAULT_PROMPT,
  MODEL_PRICING,
} from "./costs/pricing";

type SortKey = keyof Pick<
  CostCalculationResult,
  | "providerLabel"
  | "modelLabel"
  | "inputCostPerMillionUsd"
  | "outputCostPerMillionUsd"
  | "inputCostUsd"
  | "outputCostUsd"
  | "totalCostUsd"
>;

type SortDirection = "asc" | "desc";

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: "Provider", key: "providerLabel" },
  { label: "Model", key: "modelLabel" },
  { label: "Input $/1M", key: "inputCostPerMillionUsd" },
  { label: "Output $/1M", key: "outputCostPerMillionUsd" },
  { label: "Input Cost", key: "inputCostUsd" },
  { label: "Output Cost", key: "outputCostUsd" },
  { label: "Total", key: "totalCostUsd" },
];

function sortResults(
  results: CostCalculationResult[],
  key: SortKey,
  direction: SortDirection,
): CostCalculationResult[] {
  return [...results].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    const cmp =
      typeof aVal === "string" && typeof bVal === "string"
        ? aVal.localeCompare(bVal)
        : (aVal as number) - (bVal as number);
    return direction === "asc" ? cmp : -cmp;
  });
}

export default function App() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [output, setOutput] = useState(DEFAULT_OUTPUT);
  const [sortKey, setSortKey] = useState<SortKey>("providerLabel");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  const results = useMemo(
    () =>
      calculateModelCosts({
        prompt,
        output,
        pricing: MODEL_PRICING,
      }),
    [prompt, output]
  );

  const { pinned, rest } = useMemo(() => {
    const sorted = sortResults(results, sortKey, sortDirection);
    return {
      pinned: sorted.filter((r) => pinnedIds.has(r.modelId)),
      rest: sorted.filter((r) => !pinnedIds.has(r.modelId)),
    };
  }, [results, sortKey, sortDirection, pinnedIds]);

  function handlePin(modelId: string) {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      next.has(modelId) ? next.delete(modelId) : next.add(modelId);
      return next;
    });
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-900 bg-white text-[11px] font-semibold uppercase tracking-[0.18em]">
              A
            </span>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-600">
                AutoClaw
              </p>
              <p className="text-sm text-zinc-500">Prompt Cost Calculator</p>
            </div>
          </div>
          <a
            href="https://github.com/datopian/openclaw-aaas"
            className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600 transition hover:text-red-700"
          >
            GitHub
          </a>
        </header>

        <main className="grid gap-6">
          <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.06em] text-zinc-950 sm:text-6xl">
                Compare prompt costs across multiple models.
              </h1>
              <p className="mt-4 text-base leading-7 text-zinc-600">
                Drop in the prompt you want to send and a representative response. The calculator
                estimates input and output usage, then ranks providers by expected cost.
              </p>
            </div>
          </section>

          <section className="grid gap-6">
            <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="grid gap-2">
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">
                    Input prompt
                  </span>
                  <textarea
                    className="min-h-48 rounded-2xl border border-zinc-300 bg-white px-4 py-4 text-base leading-7 text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">
                    Model output
                  </span>
                  <textarea
                    className="min-h-48 rounded-2xl border border-zinc-300 bg-white px-4 py-4 text-base leading-7 text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5"
                    value={output}
                    onChange={(event) => setOutput(event.target.value)}
                  />
                </label>
              </div>

              <p className="mt-5 border-t border-zinc-200 pt-4 text-sm leading-6 text-zinc-600">
                Token counts are estimated using the rule of thumb of{" "}
                <span className="font-medium text-zinc-900">1 token ≈ 4 characters</span>, as
                documented by{" "}
                <a
                  href="https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-zinc-900 underline underline-offset-2 hover:text-red-700"
                >
                  OpenAI
                </a>{" "}
                and{" "}
                <a
                  href="https://ai.google.dev/gemini-api/docs/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-zinc-900 underline underline-offset-2 hover:text-red-700"
                >
                  Google
                </a>
                . Costs are directional estimates for comparing providers, not billing-grade figures.
              </p>
            </div>

            <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-800">
                    Cost Comparison
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
                    Estimated cost per model
                  </h2>
                </div>
                <p className="text-sm text-zinc-500">Sorted by provider · click any column to sort</p>
              </div>

              <div className="overflow-visible rounded-2xl border border-zinc-200">
                <div className="overflow-x-auto overflow-y-visible">
                  <table className="min-w-[860px] w-full border-collapse bg-white">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          Compare
                        </th>
                        {COLUMNS.map(({ label, key }) => {
                          const active = sortKey === key;
                          return (
                            <th
                              key={key}
                              onClick={() => handleSort(key)}
                              className="cursor-pointer select-none px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500 hover:text-zinc-900"
                            >
                              <span className="inline-flex items-center gap-1">
                                {label}
                                <span className={active ? "text-zinc-900" : "text-zinc-300"}>
                                  {active && sortDirection === "desc" ? "↓" : "↑"}
                                </span>
                              </span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {[...pinned, ...rest].map((result, index) => {
                        const isPinned = pinnedIds.has(result.modelId);
                        return (
                          <tr
                            key={result.modelId}
                            className={
                              isPinned
                                ? "border-l-2 border-l-amber-400 bg-amber-50/60"
                                : index % 2 === 0 ? "bg-white" : "bg-zinc-50/60"
                            }
                          >
                            <td className="border-t border-zinc-200 px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isPinned}
                                onChange={() => handlePin(result.modelId)}
                                className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-amber-500"
                              />
                            </td>
                            <td className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                              {result.providerLabel}
                            </td>
                            <td className="border-t border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-950">
                              {result.modelLabel}
                            </td>
                            <td className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                              ${result.inputCostPerMillionUsd.toFixed(2)}/1M
                            </td>
                            <td className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                              ${result.outputCostPerMillionUsd.toFixed(2)}/1M
                            </td>
                            <td className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                              <div>~{formatUsd(result.inputCostUsd)}</div>
                              <div className="mt-0.5 text-xs text-zinc-400">
                                ~{result.inputTokens.toLocaleString("en-US")} tokens
                              </div>
                            </td>
                            <td className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                              <div>~{formatUsd(result.outputCostUsd)}</div>
                              <div className="mt-0.5 text-xs text-zinc-400">
                                ~{result.outputTokens.toLocaleString("en-US")} tokens
                              </div>
                            </td>
                            <td className="border-t border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-950">
                              ~{formatUsd(result.totalCostUsd)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </section>
        </main>
      </div>
    </div>
  );
}
