# Telegram Bot on Cloudflare Workers

A unified Telegram Bot running on Cloudflare Workers, combining features from multiple examples.

## Features

- **Commands**: `/start`, `/help`, `/button2`, `/button4`, `/markdown`
- **Gemini AI**: `/gemini <text>` or use the "Ask Gemini" button.
- **Inline Buttons**: Interactive buttons with callback handling.
- **Inline Query**: Search and send voice messages (requires KV Namespace).
- **Reactions**: Randomly reacts to text messages.

## Project Structure

- `bot.js`: The main worker script containing all features.
- `example/`: Contains the original example scripts (`bot2.js`, `bot3.js`, `bot4.js`) for reference.

## Setup

1.  **Get Token**: Get your bot token from [@BotFather](https://t.me/botfather).
2.  **Cloudflare Account**: Sign up to [Cloudflare Workers](https://workers.cloudflare.com/).
3.  **Subdomain**: Register your `workers.dev` subdomain in the Cloudflare Dashboard (Workers Onboarding).
4.  **Create Worker**: Create a new worker named `telegram-bot-cloudflare`.
5.  **KV Namespace (Optional)**:
    - If you want to use the Inline Query (Voice) feature, create a KV Namespace named `NAMESPACE`.
    - Add a key `input_files` with your JSON data (see `example/bot3.js` for format).
    - Bind it to your worker in Settings -> Variables -> KV Namespace Bindings.

## Deployment via GitHub Actions

1.  **Configure Secrets** in GitHub Repository -> Settings -> Secrets -> Actions:

    - `CLOUDFLARE_API_TOKEN`: API Token with Workers and KV permissions.
    - `CLOUDFLARE_ACCOUNT_ID`: Your Account ID (hex string).
    - `ENV_BOT_TOKEN`: Your Telegram Bot Token.
    - `ENV_BOT_SECRET`: A secret string (A-Z, a-z, 0-9, \_, -).
    - `GEMINI_API_KEY`: Your Google Gemini API Key (from [Google AI Studio](https://aistudio.google.com/)).

2.  **Push to Main**: Pushing to the `main` branch triggers deployment.

3.  **Register Webhook**:
    - After deployment, visit: `https://<YOUR_WORKER_URL>/registerWebhook`
    - You should see `Ok`.

## Usage

- **/start**: Shows the help message.
- **/button2**: Sends a message with two buttons.
- **/gemini <text>**: Ask Gemini AI a question (e.g., `/gemini Tell me a joke`).
- **Inline Query**: Type `@YourBotName <query>` in any chat to search for voice messages (if KV is set up).
- **Any Text**: The bot will react with a random emoji.

## License

CC0-1.0
