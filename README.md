# Telegram Bot on Cloudflare Workers

A feature-rich Telegram Bot running on Cloudflare Workers with **Gemini AI integration**.

## Features

- 🤖 **Gemini AI** - Ask questions with `/gemini`, switch models with `/models`
- 💭 **Thinking Process** - See Gemini's reasoning before the answer
- 🔄 **Model Selection** - Choose between flash, flash-lite, and 3-flash models
- 💾 **Persistent Settings** - Your model preference is saved (requires KV)
- ⚡ **Inline Buttons** - Interactive model selection
- 🎲 **Random Reactions** - Bot reacts to messages with random emojis

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

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. **Account ID**: Click any domain → Overview → Copy "Account ID" from the right sidebar.
3. **API Token**:
   - Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens).
   - Click "Create Token" → Use "Edit Cloudflare Workers" template.
   - Include permissions: `Workers Scripts: Edit`, `Workers KV Storage: Edit`.
4. **Workers Subdomain**:
   - Go to Workers & Pages → Overview.
   - Your subdomain is shown as `*.yoursubdomain.workers.dev`.
   - Copy just the subdomain part (e.g., `yoursubdomain`).

### Step 4: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click "Get API Key" → Create new key.
3. Copy the API key.

### Step 5: Configure GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add these secrets:

| Secret Name             | Description                                  | Example               |
| ----------------------- | -------------------------------------------- | --------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API Token                         | `abc123...`           |
| `CLOUDFLARE_ACCOUNT_ID` | 32-character hex Account ID                  | `1a2b3c4d...`         |
| `WORKERS_SUBDOMAIN`     | Your workers.dev subdomain                   | `mysubdomain`         |
| `ENV_BOT_TOKEN`         | Telegram Bot Token from BotFather            | `123456:ABC...`       |
| `ENV_BOT_SECRET`        | Random string for webhook security           | `MySecretKey123`      |
| `GEMINI_API_KEY`        | Google Gemini API Key                        | `AIza...`             |
| `ALLOWED_USERS`         | Comma-separated Telegram user IDs (optional) | `123456789,987654321` |

> **Note:** `ENV_BOT_SECRET` can be any string with A-Z, a-z, 0-9, `_`, `-`.

> **Note:** `ALLOWED_USERS` is optional. If not set, all users can use the bot. To get your Telegram user ID, message [@userinfobot](https://t.me/userinfobot).

### Step 6: Deploy

1. Push to `main` branch or go to **Actions** → **Deploy Worker** → **Run workflow**.
2. The workflow will:
   - ✅ Create a KV namespace for storing user preferences
   - ✅ Deploy the worker to Cloudflare
   - ✅ Register the webhook with Telegram
   - ✅ Register commands for autocomplete

### Step 7: Test

Open your bot in Telegram and send `/start`!

---

## Commands

| Command             | Description                                      |
| ------------------- | ------------------------------------------------ |
| `/start` or `/help` | Show help message                                |
| `/gemini <text>`    | Ask Gemini AI a question                         |
| `/models`           | Show available models (click to select)          |
| `/setmodel <name>`  | Set default model (e.g., `/setmodel flash-lite`) |
| `/button2`          | Demo: Two inline buttons                         |
| `/button4`          | Demo: Four inline buttons                        |

## Available Models

| Short Name   | Full Model Name       |
| ------------ | --------------------- |
| `flash`      | gemini-2.5-flash      |
| `flash-lite` | gemini-2.5-flash-lite |
| `3-flash`    | gemini-3-flash        |

---

## Manual Deployment (Alternative)

If you prefer not to use GitHub Actions:

```bash
# Install wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set secrets
wrangler secret put ENV_BOT_TOKEN
wrangler secret put ENV_BOT_SECRET
wrangler secret put ENV_GEMINI_API_KEY

# Deploy
wrangler deploy
```

Then visit:

- `https://telegram-bot-cloudflare.yoursubdomain.workers.dev/registerWebhook`
- `https://telegram-bot-cloudflare.yoursubdomain.workers.dev/registerCommands`

---

## Troubleshooting

### Commands don't autocomplete

Visit `/registerCommands` endpoint manually, or check if deployment succeeded.

### Model selection doesn't persist

KV namespace might not be configured. Check the GitHub Actions logs for KV creation errors.

### Bot doesn't respond

1. Check if webhook is registered: Visit `/registerWebhook`.
2. Verify `ENV_BOT_TOKEN` is correct.
3. Check Cloudflare Workers logs for errors.

### Gemini returns errors

1. Verify `GEMINI_API_KEY` is valid.
2. Check if the model is available in your region.

---

## License

CC0-1.0
