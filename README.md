# Telegram Bot on Cloudflare Workers

A feature-rich Telegram Bot running on Cloudflare Workers with **multi-provider AI support** (Gemini, OpenAI, Claude).

## Features

- 🤖 **Multi-Provider AI** - Switch between Gemini, OpenAI, and Claude
- 🔄 **Model Selection** - Choose models per provider (flash, gpt-4o, sonnet, etc.)
- 💭 **Thinking Process** - See AI reasoning (where supported)
- 💾 **Persistent Settings** - Provider and model preferences saved per user
- 🔒 **User Whitelist** - Restrict bot access to specific users
- ⚡ **Inline Buttons** - Interactive provider/model selection

---

## Quick Deploy (GitHub Actions)

### Step 1: Fork or Clone

```bash
git clone https://github.com/your-username/telegram-bot-cloudflare.git
cd telegram-bot-cloudflare
```

### Step 2: Create a Telegram Bot

1. Open [@BotFather](https://t.me/botfather) in Telegram.
2. Send `/newbot` and follow the prompts.
3. Copy the **Bot Token** (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`).

### Step 3: Get Cloudflare Credentials

1. **Account ID**: Cloudflare Dashboard → Any domain → Overview → Copy "Account ID".
2. **API Token**: [API Tokens](https://dash.cloudflare.com/profile/api-tokens) → "Edit Cloudflare Workers" template.
3. **Subdomain**: Workers & Pages → Overview → Copy subdomain from `*.yoursubdomain.workers.dev`.

### Step 4: Get API Keys (At least one required)

| Provider             | Get API Key                                             |
| -------------------- | ------------------------------------------------------- |
| **Gemini** (default) | [Google AI Studio](https://aistudio.google.com/)        |
| **OpenAI**           | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **Claude**           | [Anthropic Console](https://console.anthropic.com/)     |

### Step 5: Configure GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**.

**Required:**

| Secret Name             | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API Token                             |
| `CLOUDFLARE_ACCOUNT_ID` | 32-character hex Account ID                      |
| `WORKERS_SUBDOMAIN`     | Your workers.dev subdomain (e.g., `mysubdomain`) |
| `ENV_BOT_TOKEN`         | Telegram Bot Token from BotFather                |
| `ENV_BOT_SECRET`        | Random string (A-Z, a-z, 0-9, \_, -)             |

**AI Provider Keys (at least one):**

| Secret Name      | Description              |
| ---------------- | ------------------------ |
| `GEMINI_API_KEY` | Google Gemini API Key    |
| `OPENAI_API_KEY` | OpenAI API Key           |
| `CLAUDE_API_KEY` | Anthropic Claude API Key |

**Optional:**

| Secret Name     | Description                                                    |
| --------------- | -------------------------------------------------------------- |
| `ALLOWED_USERS` | Comma-separated Telegram user IDs (limits who can use the bot) |

> To get your Telegram user ID, message [@userinfobot](https://t.me/userinfobot).

### Step 6: Deploy

1. Push to `main` branch or go to **Actions** → **Deploy Worker** → **Run workflow**.
2. The workflow automatically:
   - ✅ Creates KV namespace for user preferences
   - ✅ Deploys the worker
   - ✅ Registers webhook and commands

### Step 7: Test

Open your bot in Telegram and send `/start`!

---

## Commands

| Command             | Description                                |
| ------------------- | ------------------------------------------ |
| `/start` or `/help` | Show help message                          |
| `/ai <text>`        | Ask AI (uses your selected provider/model) |
| `/providers`        | List/select AI providers                   |
| `/models`           | List/select models for current provider    |
| `/button2`          | Demo: Two inline buttons                   |

---

## Available Providers and Models

### Gemini (Default)

| Short Name   | Model                 |
| ------------ | --------------------- |
| `flash`      | gemini-2.5-flash      |
| `flash-lite` | gemini-2.5-flash-lite |
| `3-flash`    | gemini-3-flash        |

### OpenAI

| Short Name    | Model       |
| ------------- | ----------- |
| `gpt-4o`      | gpt-4o      |
| `gpt-4o-mini` | gpt-4o-mini |
| `gpt-4-turbo` | gpt-4-turbo |

### Claude

| Short Name | Model                     |
| ---------- | ------------------------- |
| `sonnet`   | claude-sonnet-4-20250514  |
| `haiku`    | claude-3-5-haiku-20241022 |
| `opus`     | claude-3-opus-20240229    |

---

## Troubleshooting

### Commands don't autocomplete

The workflow auto-registers commands. If still not working, visit `/registerCommands` endpoint manually.

### Provider shows "API key not set"

Add the corresponding API key secret in GitHub and redeploy.

### Model selection doesn't persist

KV namespace might not be configured. Check GitHub Actions logs.

---

## License

CC0-1.0
