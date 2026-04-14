---
title: "Dynamic Workers: A Practical Overview of Runtime Workers, Sandboxes, and Codemode"
description: Understand what Cloudflare Dynamic Workers are, how their sandbox and capability model works, and why they matter for Codemode.
---

# Dynamic Workers: A Practical Overview of Runtime Workers, Sandboxes, and Codemode

Cloudflare Dynamic Workers are an unusually interesting primitive because they sit in a space between normal application code and a full-blown sandbox platform. They are not just "Workers, but more dynamic," and they are not simply "containers, but smaller." The real idea is that a Worker can create other Workers at runtime, load code on demand, and decide exactly what that code is allowed to do.

That sounds abstract at first, but it becomes clear once you view the parent Worker as a supervisor. The parent Worker is the trusted application you write and deploy normally. Inside that Worker, you can use a `worker_loaders` binding such as `env.LOADER` to spin up child Workers from code strings or bundled modules. Those child Workers are the Dynamic Workers. They run in isolated Worker sandboxes, but they still live inside the control plane of your parent Worker.

This is what makes the feature powerful. Dynamic Workers are not mainly about deployment convenience. They are about taking code that is selected, generated, uploaded, or assembled at runtime and running it with a much tighter security and capability model than a generic "just execute this somewhere" system.

## What Dynamic Workers actually are

At a high level, a Dynamic Worker is a Worker isolate created programmatically at request time or application runtime. Instead of deploying a fixed Worker bundle and routing traffic to it forever, you can decide on the fly what code should run and then load that code into a child Worker.

Cloudflare exposes this through two core APIs:

- `load(code)`, which creates a fresh Dynamic Worker for one-off execution
- `get(id, callback)`, which loads a Dynamic Worker by stable ID and may reuse a warm isolate across requests

That distinction matters. `load()` is for ephemeral execution when the code is effectively unique every time. `get()` is for cases where the same code might be invoked repeatedly, so you want a stable identity and a chance to reuse an already-loaded Worker. In other words, `load()` is closer to "run this now," while `get()` is closer to "manage this runtime-defined Worker as an application component."

The code you pass in is described as a `WorkerCode` object. That includes the compatibility date, the main module, and a map of modules. Dynamic Workers support JavaScript and Python modules, including ES modules, CommonJS, and Python source. If you want to write TypeScript or use npm packages, you need to transpile and bundle them before handing them to the loader. Cloudflare's `@cloudflare/worker-bundler` exists for exactly that reason.

That detail is worth calling out because it reveals the real boundary of the system: Dynamic Workers are dynamic in how they are loaded, not in the sense of being a universal language runtime. They still run inside the Workers model. They are meant for JavaScript- and Python-shaped application code.

## How they are typically used

The simplest usage pattern is straightforward. A normal Worker receives a request, chooses or constructs some code, calls `env.LOADER.load()` or `env.LOADER.get()`, then invokes the child Worker's entrypoint. The parent can forward the incoming request, call a named exported entrypoint, or treat the dynamic Worker more like an RPC service.

From there, several practical patterns emerge.

One pattern is one-off execution. You generate code from an LLM, or retrieve user-provided code, load it with `load()`, run it once, and discard it. This is the shape Dynamic Workers take in AI "code mode" scenarios, where the code is frequently new and there is little value in caching.

Another pattern is warm reuse. You have a logical app, plugin, tenant function, or generated program that should survive across multiple requests. In that case, you give it a stable ID and use `get()`. Cloudflare may keep the isolate warm and reuse it when the same ID appears again. The important caveat is that reuse is opportunistic, not guaranteed. A stable ID gives you a chance at reuse, but it does not create a durable process model.

There is also a more advanced pattern around Durable Objects. Dynamic Workers can provide classes that become durable object facets, which means dynamically loaded code can run with its own isolated SQLite-backed storage under the supervision of a parent Durable Object. That is a strong model for running tenant-specific or AI-generated applications that need persistence without exposing your supervisor's own storage directly.

In all of these cases, the central value is the same: the parent Worker controls composition. It chooses the code, the bindings, the network rules, and the execution shape.

## Why Dynamic Workers are more than just "a sandbox"

It is accurate to call Dynamic Workers a sandbox, but that description is incomplete. A generic sandbox usually suggests an isolated environment that can run arbitrary code, often with broad system abstractions underneath it. Dynamic Workers are narrower and more opinionated than that.

First, they live inside a Worker. You do not spin them up as a separate machine, container, or VM that owns its own infrastructure boundary. A normal Worker is the host and supervisor. The Dynamic Worker is a child runtime the parent creates and invokes.

Second, the language surface is constrained. Dynamic Workers support JavaScript and Python, not arbitrary binaries or arbitrary runtimes. That sounds like a limitation, but it is also part of what makes the platform understandable and controllable.

Third, the capability model is much stronger than what people often mean when they talk about sandboxes. In a generic sandbox, a common pattern is to let code make requests and then try to inspect, filter, or block bad behavior after the fact. Dynamic Workers push you toward capability-based design instead. Rather than giving the child broad access and hoping policy catches misuse, the parent gives it specific bindings or service stubs representing only the actions it is allowed to take.

That means the sandbox boundary is not only about isolation. It is also about API design.

For example, if untrusted code needs to post a message to a chat room, you do not have to hand it an API key and let it construct arbitrary outbound requests. You can instead pass it a binding like `CHAT_ROOM.post(text)`. The child code never sees the secret, never sees the raw endpoint, and never gains the ability to post to any other room unless the parent explicitly gives it that capability.

This is a major difference from a more generic sandbox model. Dynamic Workers are meant to run inside a carefully shaped environment, not a broad one.

## Network control is a first-class part of the model

The most immediately visible example of that control is outbound network access. Dynamic Workers let the parent define `globalOutbound`, which determines what the child Worker's global `fetch()` and `connect()` calls can do.

If `globalOutbound` is left unspecified, the child generally inherits the parent's network access. If it is set to `null`, outbound network access is blocked entirely. That means the dynamic code cannot call arbitrary HTTP endpoints or open TCP connections at all. And if `globalOutbound` is set to a service binding, the parent can redirect outbound traffic through a controlled service.

That is more than a simple allowlist. It lets you build policy at the edge of the sandbox. You can inspect requests, rewrite them, attach identity, log them, or deny them. Combined with narrow RPC bindings, this gives you two complementary control layers:

- capability-based APIs for the actions you explicitly want to allow
- outbound interception for the network actions you want to inspect or mediate

This is one of the clearest ways Dynamic Workers differ from a normal sandbox in practice. A generic sandbox might isolate code from the host. Dynamic Workers let the host define the exact shape of the child's external world.

## Bindings are where the model really shines

Dynamic Workers become much more interesting once you stop thinking of bindings as only platform resources like KV or R2. In the Dynamic Worker model, bindings are often custom RPC interfaces implemented by the parent Worker and passed into the child.

That lets you expose high-level capabilities instead of low-level primitives. A child Worker can receive a `GREETER`, a `CHAT_ROOM`, a `SEARCH_INDEX`, or an `INVOICE_SERVICE` binding, each one specialized to the exact scope that instance should have. Because these are service bindings and RPC stubs, the child can call methods on them naturally, while the parent retains the actual implementation and secrets.

This is why Dynamic Workers fit so well with agentic systems and user-defined applications. They let you hand code a narrow working surface rather than a bag of credentials.

Observability is part of the same story. Dynamic Workers can attach Tail Workers so the parent can capture logs, errors, and execution details from individual runs. That matters when the code is dynamic and the operator still needs visibility into what happened.

## Codemode: what it is, and why Dynamic Workers matter to it

Codemode is Cloudflare's answer to a common frustration in LLM tool use: models are often better at writing small pieces of code than they are at performing long, stepwise tool-calling conversations. Modern models have seen huge amounts of real code during training, so code is often a more natural medium for them than repeatedly deciding, one turn at a time, which tool to call next.

Codemode packages that idea into a runtime model. Instead of exposing many tools directly to the LLM and forcing it through a sequence of tool calls, Codemode gives the model a single "write code" tool. The model writes an async JavaScript function that uses typed tool wrappers. That generated code then executes inside an isolated Worker sandbox, and the tool calls are dispatched back to the host through Workers RPC.

This is where Dynamic Workers come in. Codemode's built-in `DynamicWorkerExecutor` uses a Dynamic Worker as the sandbox that runs the generated code. By default, outbound network access is blocked with `globalOutbound: null`, so the generated program cannot simply call the public Internet. It interacts with the outside world by invoking the tool interfaces the host intentionally exposed.

That architecture gives Codemode three important properties.

First, it keeps the execution environment controlled. The model writes code, but that code does not run in the host directly.

Second, it allows richer logic than normal tool calling. Inside the generated code, the model can use variables, loops, `if` statements, branching, filtering, retries, and result composition. The logic is embedded in the generated program itself rather than stretched across repeated model turns.

Third, it can reduce orchestration overhead. In ordinary tool calling, the pattern is often: call one tool, wait for output, ask the model what to do next, call another tool, wait again. Codemode changes that to: write a small program once, then let the program orchestrate the workflow inside the sandbox.

That makes Codemode especially compelling for multi-step workflows, MCP integrations with many fine-grained tools, and any scenario where the model needs real control flow. The difference is not subtle. Normal tool calling is a conversational loop. Codemode is program execution.

## Dynamic Workers and normal tool calling are solving different orchestration problems

This distinction is worth making explicit because it is easy to flatten the two into the same idea.

With normal tool calling, the model remains in the driver's seat at every step. It calls a tool, receives a result, reasons about that result, and decides what to do next. That works well for simple operations and has the advantage of being easy to inspect.

With Codemode running on Dynamic Workers, the model writes the orchestration logic as code up front. The sandbox then executes that code. The model is no longer doing step-by-step orchestration in the same way. It has effectively compiled its plan into a small program.

That is why Codemode can express things that feel awkward in normal tool calling, such as "query three services, ignore null results, sort by confidence, retry failures once, and email only if the highest-confidence result crosses a threshold." In standard tool calling, that becomes a long back-and-forth. In Codemode, it becomes a few lines of code.

## Where Dynamic Workers fit best

The best way to think about Dynamic Workers is as a low-level runtime primitive for controlled dynamic code execution.

Use a normal Worker when the code is known ahead of time and your application logic is statically deployed.

Use Dynamic Workers when the code itself needs to be supplied at runtime, whether because it comes from an LLM, from a database, from user uploads, from tenant-specific customization, or from a live bundling step.

Use Codemode when the problem is not merely "run some code," but specifically "let an LLM express a workflow as code instead of as a long chain of tool calls."

That combination is what makes the feature set distinctive. Dynamic Workers are not just a convenience API for runtime code loading. They are Cloudflare's foundation for building secure, capability-oriented execution environments inside the Workers platform. And once you view them that way, the rest of the design makes sense: controlled bindings, outbound guards, runtime composition, warm reuse with `get()`, observability, and Codemode on top.

The simplest summary is this: a Dynamic Worker is a Worker you assemble at runtime, but the more important truth is that it is a Worker you can supervise. That supervision model is the point.
