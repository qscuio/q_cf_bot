# Telegram Bot on Cloudflare Workers

10. Optional: Change the `WEBHOOK` variable to a different path. See https://core.telegram.org/bots/api#setwebhook
11. Click on "Save and Deploy"
12. In the middle panel append `/registerWebhook` to the url. For example: https://my-worker-123.username.workers.dev/registerWebhook
13. Click "Send". In the right panel should appear `Ok`. If 401 Unauthorized appears, you may have used a wrong bot token.
14. That's it, now you can send a text message to your Telegram bot
15. That's it, now you can send a text message to your Telegram bot

The bot will send the original message back with `Echo:` prepended.
If you want to change it, look at the function `onMessage()`. It receives a [Message](https://core.telegram.org/bots/api#message) object and sends a text back:

```javascript
/**
 * Handle incoming Message
 * https://core.telegram.org/bots/api#message
 */
function onMessage(message) {
  return sendPlainText(message.chat.id, "Echo:\n" + message.text);
}
```

## bot2.js

The file [bot2.js](bot2.js) contains an improved bot, that demonstrates how to react to commands,
send and receive [inline buttons](https://core.telegram.org/bots/api#inlinekeyboardbutton),
and create [MarkdownV2](https://core.telegram.org/bots/api#markdownv2-style)-formatted text.

## bot3.js

The file [bot3.js](bot3.js) contains an improved version that replies inline queries with voice messages.
The voice messages should be stored in OPUS format and .ogg in the cloud you most like.
The audio files are listed in a JSON array with the following structure in a KV namespace called `NAMESPACE` and with following content under the key `input_files`.

Go to _Workers & Pages_ -> _KV_ and create a new namespace. Add a new key `input_files` and store the JSON structure from below with your own audio files.

Now in _Overview_ -> your-worker -> _Settings_ -> _Variables_ -> _KV Namespace Bindings_ bind the namespace to a variable called `NAMESPACE`.

```javascript
[
  ["File Name", "URL", duration, "<tg-spoiler> caption </tg-spoiler>"],
  [
    "test",
    "https://example.com/my_file.ogg",
    5,
    "<tg-spoiler>Description in a spoiler</tg-spoiler>",
  ],
];
```

## bot4.js

The bot4 is a bot that randomly reacts to messages received. It demostrates how to use big reactions when the 🎉 emoji gets chosen.

## License

The source-code is licensed under the CC0-1.0 license. If you need a different license, there are also branches with the [MIT](https://github.com/cvzi/telegram-bot-cloudflare/tree/mit) and [GPL 3](https://github.com/cvzi/telegram-bot-cloudflare/tree/gnu-gpl-v3-or-later) license.

---

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)
