---
title: Running OpenClaw Locally
description: Run OpenClaw on your own machine with Docker Compose, local volumes, and the built-in gateway UI.
---

# Running OpenClaw Locally

If you want to try OpenClaw without putting it directly on your host system, the easiest path is the Docker setup that ships with the main repository. This gives you a local gateway, a persistent config directory, and a workspace folder that is mounted into the container.

This playbook follows that Docker-based approach rather than the older Wrangler-style local simulation flow.

## Prerequisites

- Docker Desktop or Docker Engine with Compose support
- Git
- A terminal
- An AI provider account you can use during onboarding
- Optional: Telegram if you want to chat with your bot from your phone

## 1. Clone the repository

```bash
git clone https://github.com/openclaw/openclaw
cd openclaw
```

The repository includes a Docker helper script, `docker-setup.sh`, plus a `docker-compose.yml` file.

## 2. Start the Docker setup

Run the setup script from the repository root:

```bash
./docker-setup.sh
```

That script uses Docker Compose and prepares two host directories that are mounted into the container:

- `~/.openclaw` for config, memory, tokens, and other persistent application state
- `~/openclaw/workspace` for files the agent can read and write while it runs

Anything the agent saves into the workspace will remain available on your machine.

## 3. Work through onboarding

On first launch, OpenClaw asks a series of setup questions. One combination that has been reported to work well for a purely local install is:

- Onboarding mode: `manual`
- What do you want to set up?: `Local gateway (this machine)`

From there, choose your model provider.

One practical option is OpenAI Codex with ChatGPT OAuth. That flow opens a browser URL, redirects to a localhost callback that will fail visibly, and then expects you to copy that final localhost URL back into OpenClaw to complete authentication.

If a networking option feels risky or unnecessary during first-time setup, skip it and get the basic gateway working first.

## 4. Confirm the containers are up

Once setup completes, inspect the running containers:

```bash
docker ps
```

You should see the gateway container plus the companion CLI container from the Compose stack.

## 5. Run admin commands through Docker Compose

The Compose setup includes an `openclaw-cli` service for management commands.

Run these commands from the same directory as the repository's `docker-compose.yml`:

```bash
docker compose run --rm openclaw-cli status
```

That is the easiest way to inspect the local instance without entering the container directly.

## 6. Open the dashboard

The local web UI listens on port `18789`:

```text
http://localhost:18789
```

If you open that URL directly, OpenClaw will usually tell you that authentication is required.

To generate a fresh dashboard link with the required token:

```bash
docker compose run --rm openclaw-cli dashboard --no-open
```

Open the URL that command prints.

## 7. Approve device pairing if needed

Even with the dashboard token, you may still hit a pairing error such as:

```text
disconnected (1008): pairing required
```

If that happens, list pending devices from inside the gateway container:

```bash
docker compose exec openclaw-gateway node dist/index.js devices list
```

Find the pending request ID, then approve it:

```bash
docker compose exec openclaw-gateway node dist/index.js devices approve <REQUEST_ID>
```

After approval, reload the dashboard.

## 8. Optional: connect Telegram

Telegram is one of the simpler chat integrations for a local install.

To set it up:

1. Create a bot by talking to `@BotFather` on Telegram.
2. Run `/newbot`.
3. Follow the prompts and copy the bot token.
4. Provide that token during OpenClaw setup.

After that, OpenClaw should send you a pairing code via Telegram. Approve it with:

```bash
docker compose run --rm openclaw-cli pairing approve telegram <CODE>
```

At that point you should be able to message your bot from Telegram.

## 9. Get a root shell in the gateway container

If you need to inspect the container or install extra packages manually, open a shell as `root`:

```bash
docker compose exec -u root openclaw-gateway bash
```

Use that carefully. The default runtime user is intentionally more restricted.

## Local data layout

The main host paths created by the Docker setup are:

| Path | Purpose |
|---|---|
| `~/.openclaw` | Persistent config, memory, credentials, and other OpenClaw state |
| `~/openclaw/workspace` | Files that the agent can access and modify |

Those mounts are what make the Docker setup practical for day-to-day local use.

## Common issues

**The dashboard rejects me even with the token**
You probably still need to approve the current device. Use `devices list` and `devices approve` against the gateway container.

**The CLI command fails unexpectedly**
Make sure you are running `docker compose` commands from the same directory as the repo's `docker-compose.yml`.

**The OAuth callback page shows an error**
That can be normal during browser-based auth flows. Copy the final localhost callback URL and paste it back into OpenClaw if the prompt asks for it.

**I lost the dashboard URL**
Run `docker compose run --rm openclaw-cli dashboard --no-open` again to generate another one.

**I need deeper access inside the container**
Use `docker compose exec -u root openclaw-gateway bash`.
