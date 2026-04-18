---
title: QMD Memory Engine for OpenClaw
description: Understand OpenClaw memory at a high level, when the builtin engine is enough, and how to set up and troubleshoot the QMD memory engine.
---

# QMD Memory Engine for OpenClaw

OpenClaw memory is simple in one important sense: there is no hidden long-term state living inside the model. What the agent remembers is what gets written to disk and indexed for retrieval later.

That makes the memory system easier to reason about than a lot of people expect. If you want durable memory, you are really deciding two things:

- What the agent should save
- How that saved material should be indexed and searched later

For many setups, the default memory engine is enough. If you want stronger retrieval, local-first search, reranking, or the ability to search material outside the normal workspace memory files, QMD is the more interesting option.

## Memory in OpenClaw

At a high level, OpenClaw memory is built around plain Markdown files in the agent workspace.

The main pieces are:

- `MEMORY.md` for durable long-term facts, preferences, and decisions
- `memory/YYYY-MM-DD.md` for daily notes and running context
- Optional `DREAMS.md` for dreaming and memory review output

OpenClaw then indexes that material so the agent can search it later with memory tools instead of relying on the chat context window alone.

That distinction matters. Memory is not just "the model remembering better." It is a retrieval system over files the agent has saved.

If you ask OpenClaw to remember something, it writes that information into the appropriate memory file. The memory backend then decides how search, ranking, and recall work.

## The builtin memory engine

The builtin engine is the default backend, and for most users it is the right place to start.

It stores its index in SQLite, supports keyword search out of the box, and can add vector or hybrid search when you have a supported embedding provider configured. It needs no extra sidecar process and no extra installation.

Use the builtin engine when:

- You want the simplest setup
- You mainly care about workspace memory files
- You do not need reranking or query expansion
- You want memory search to work without adding more moving parts

If that sounds like your setup, stay with builtin. Switch to QMD when you specifically need better retrieval quality, local-first model-based search features, or indexing beyond the normal memory files.

## When QMD is the better fit

QMD is a local-first search sidecar that runs alongside OpenClaw. Compared to the builtin engine, the important differences are not just "another backend" or "slightly different indexing." QMD adds capabilities the builtin engine does not try to provide.

QMD is the right choice when you want one or more of these:

- Reranking for higher-quality search results
- Query expansion to improve recall
- Local search that does not depend on remote embedding APIs
- Extra indexed directories outside the normal workspace memory files
- Session transcript indexing so the agent can search older conversations

If your goal is simply "make memory work," builtin is still the easier default. If your goal is "make memory retrieval much stronger and broader," that is where QMD starts to make sense.

## What QMD changes

With QMD enabled, OpenClaw still uses the same memory files and the same overall memory model. You are not replacing `MEMORY.md` or daily notes with some opaque database product.

What changes is the search layer.

OpenClaw manages a QMD sidecar for the agent, creates collections for the workspace memory content and any extra configured paths, and keeps those collections updated in the background. If QMD is unavailable or fails, OpenClaw can fall back to the builtin engine.

That fallback is useful operationally. It means enabling QMD is not the same as making memory all-or-nothing.

## 1. Install QMD first

QMD needs to be installed on the machine where the OpenClaw gateway runs.

Install it with either npm or Bun:

```bash
npm install -g @tobilu/qmd
```

You also need:

- QMD available on the gateway process `PATH`
- A SQLite build that allows extensions
- Linux or macOS for the easiest path
- WSL2 if you are on Windows and want the most predictable setup

If OpenClaw runs as a service and cannot see the binary, fix that before doing anything else. A very common failure mode is "QMD is installed for my user shell, but not visible to the service that launches OpenClaw."

## 2. Enable the QMD backend

Set the memory backend to `qmd` in your OpenClaw config:

```json5
{
  memory: {
    backend: "qmd",
  },
}
```

Once enabled, OpenClaw manages a self-contained QMD home for the agent under its own OpenClaw data directory and handles collection updates automatically.

You do not need to manually wire up the normal workspace memory files. QMD will index the usual memory sources for you.

## 3. Know what gets indexed by default

Out of the box, QMD focuses on the normal OpenClaw memory material:

- `MEMORY.md`
- the `memory/` directory tree

That is an important point because people often assume QMD is only useful if they are indexing a giant external notes directory. It is still useful even if you only care about regular OpenClaw memory, because reranking and query expansion can improve retrieval quality.

On startup, OpenClaw refreshes the QMD collections in the background and continues to update them on an interval. That means chat startup is not blocked waiting for a full indexing pass.

## 4. Add extra paths when you need broader recall

One of the biggest reasons to choose QMD is that it can search content beyond the default workspace memory files.

For example, if you want your agent to search a notes directory:

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      paths: [
        { name: "docs", path: "~/notes", pattern: "**/*.md" }
      ],
    },
  },
}
```

This is the feature that often changes QMD from "nice to have" into "the obvious backend." If your useful context lives in project docs, research notes, or other Markdown outside the default memory files, builtin can feel narrow. QMD is designed for that broader local search workflow.

## 5. Enable session indexing if you want conversation recall

QMD can also index prior session transcripts.

Enable that like this:

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      sessions: { enabled: true },
    },
  },
}
```

This is useful when the thing you want the agent to recall was discussed in an earlier conversation but never promoted into a durable memory file.

That said, it is worth being deliberate here. Session recall is powerful, but it is also broader and noisier than carefully maintained durable memory. If you only need stable facts and preferences, good `MEMORY.md` hygiene may matter more than transcript indexing.

## 6. Test QMD with small checks first

Do not start by assuming QMD is working because the config looks correct. Check it directly.

Useful first commands:

```bash
openclaw memory status
```

```bash
openclaw memory search "test query"
```

```bash
openclaw memory index --force
```

What you want to verify first:

- OpenClaw reports memory status cleanly
- Searches return results instead of silently falling back or timing out
- A forced reindex completes without errors

If you suspect the first QMD query is slow, that can be normal. QMD may download local GGUF models on first use for reranking and query expansion.

## 7. Understand the first-run behavior

The first search can be much slower than later searches.

That usually does not mean something is broken. QMD may be downloading models and preparing local assets the first time it handles a query. If you are testing on a smaller machine, this can feel like a hang when it is really just a heavy cold start.

If you want to reduce surprises, pre-warm QMD before relying on it in normal usage by running a small manual query such as:

```bash
qmd query "test"
```

Do that in the same environment OpenClaw uses so model downloads and cache paths line up with the actual runtime.

## 8. Tune models only if you have a reason

QMD supports model overrides via environment variables:

```bash
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
export QMD_RERANK_MODEL="/absolute/path/to/reranker.gguf"
export QMD_GENERATE_MODEL="/absolute/path/to/generator.gguf"
```

Most people should not start here.

The right order is:

1. Install QMD
2. Enable `memory.backend: "qmd"`
3. Confirm search works
4. Add extra paths or session indexing if needed
5. Only then think about model overrides

If you change the embedding model, rerun embeddings so the stored vectors match the new model's vector space.

## 9. Troubleshoot the common failures

Most QMD problems fall into a small number of categories.

**`QMD not found` or OpenClaw does not appear to use it**

The QMD binary is usually not visible on the gateway process `PATH`. This is especially common when OpenClaw runs as a service. If needed, create a symlink into a standard location such as `/usr/local/bin/qmd` so the service can find it.

**The first query is extremely slow**

QMD often downloads GGUF models on first use. That is expected. Pre-warm with `qmd query "test"` and give the machine time to finish the first setup pass.

**Search times out on slower hardware**

Increase `memory.qmd.limits.timeoutMs`. The default can be too aggressive for smaller or older machines, especially on first run.

**Results are empty in group chats**

Check `memory.qmd.scope`. By default, QMD search exposure is not equally open everywhere. If scope rules deny search in a certain chat type, the result can look like memory is broken when it is really a policy decision.

**Indexing breaks around temporary repos or odd directory structures**

If you are indexing extra paths that contain temporary nested repos, very deep trees, or awkward workspace-visible scratch directories, simplify the indexed path first. QMD traversal behavior can be less forgiving than people expect. Keeping temporary checkouts under hidden directories like `.tmp/` or outside indexed roots is the safer approach.

**Results feel stale**

Force a rebuild with:

```bash
openclaw memory index --force
```

If that fixes it, the issue was probably indexing lag or a missed refresh rather than retrieval quality.

## 10. A practical decision rule

Use the builtin engine if you want the simplest possible setup and your memory needs are mostly limited to normal OpenClaw files.

Use QMD if you care about retrieval quality enough to want reranking and query expansion, or if you want OpenClaw to search a broader body of local documents and past sessions.

That is the real split. Builtin is the default because it is easy and good enough for most setups. QMD is the stronger choice when memory is becoming part of your actual workflow rather than just a small convenience feature.

## Minimal checklist

Before you call the QMD setup done, make sure all of these are true:

1. `qmd` is installed on the machine where OpenClaw runs
2. The gateway process can find `qmd` on its `PATH`
3. `memory.backend` is set to `"qmd"`
4. `openclaw memory status` succeeds
5. A test `openclaw memory search` returns expected results
6. Optional extra paths or session indexing are enabled only if you actually need them
7. A forced reindex works without errors

At that point, QMD should be in good shape for real usage.
