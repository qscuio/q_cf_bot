/**
 * https://github.com/cvzi/telegram-bot-cloudflare
 */

const TOKEN = ENV_BOT_TOKEN // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const WEBHOOK = '/endpoint'
const SECRET = ENV_BOT_SECRET // A-Z, a-z, 0-9, _ and -

const reactions_ = ['👍', '👎', '❤', '🔥', '🥰', '👏', '😁', '🤔', '🤯', '😱', '🤬', '😢', '🎉', '🤩', '🤮', '💩', '🙏', '👌', '🕊', '🤡', '🥱', '🥴', '😍', '🐳', '❤‍🔥', '🌚', '🌭', '💯', '🤣', '⚡', '🍌', '🏆', '💔', '🤨', '😐', '🍓', '🍾', '💋', '🖕', '😈', '😴', '😭', '🤓', '👻', '👨‍💻', '👀', '🎃', '🙈', '😇', '😨', '🤝', '✍', '🤗', '🫡', '🎅', '🎄', '☃', '💅', '🤪', '🗿', '🆒', '💘', '🙉', '🦄', '😘', '💊', '🙊', '😎', '👾', '🤷‍♂', '🤷', '🤷‍♀', '😡']

/**
 * Wait for requests to the worker
 */
addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname === WEBHOOK) {
    event.respondWith(handleWebhook(event))
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET))
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event))
  } else {
    event.respondWith(new Response('No handler for this request'))
  }
})

/**
 * Handle requests to WEBHOOK
 * https://core.telegram.org/bots/api#update
 */
async function handleWebhook (event) {
  // Check secret
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 })
  }

  // Read request body synchronously
  const update = await event.request.json()
  // Deal with response asynchronously
  event.waitUntil(onUpdate(update))

  return new Response('Ok')
}

/**
 * Handle incoming Update
 * supports messages, callback queries (inline button presses), and inline queries
 * https://core.telegram.org/bots/api#update
 */
async function onUpdate (update) {
  if ('message' in update) {
    await onMessage(update.message)
  } else if ('callback_query' in update) {
    await onCallbackQuery(update.callback_query)
  } else if ('inline_query' in update) {
    await onInlineQuery(update.inline_query)
  }
}

/**
 * Handle incoming Message
 * https://core.telegram.org/bots/api#message
 */
function onMessage (message) {
  if (message.text && (message.text.startsWith('/start') || message.text.startsWith('/help'))) {
    return sendMarkdownV2Text(message.chat.id, '*Functions:*\n' +
      escapeMarkdown(
        '`/help` - This message\n' +
        '/button2 - Sends a message with two button\n' +
        '/button4 - Sends a message with four buttons\n' +
        '/markdown - Sends some MarkdownV2 examples\n' +
        'Any other text will trigger a random reaction!',
        '`'))
  } else if (message.text && message.text.startsWith('/button2')) {
    return sendTwoButtons(message.chat.id)
  } else if (message.text && message.text.startsWith('/button4')) {
    return sendFourButtons(message.chat.id)
  } else if (message.text && message.text.startsWith('/markdown')) {
    return sendMarkdownExample(message.chat.id)
  } else {
    // Random reaction for other messages
    return setMessageReaction(message)
  }
}

/**
 * Handle incoming callback_query (inline button press)
 * https://core.telegram.org/bots/api#message
 */
async function onCallbackQuery (callbackQuery) {
  await sendMarkdownV2Text(callbackQuery.message.chat.id, escapeMarkdown(`You pressed the button with data=\`${callbackQuery.data}\``, '`'))
  return answerCallbackQuery(callbackQuery.id, 'Button press acknowledged!')
}

/**
 * Handle incoming query
 * https://core.telegram.org/bots/api#InlineQuery
 * This will reply with a voice message but can be changed in type
 * The input file is defined in the environment variables.
 */
async function onInlineQuery (inlineQuery) {
  const results = []
  const search = inlineQuery.query
  // Check if NAMESPACE is defined (it might not be if user hasn't set it up)
  if (typeof NAMESPACE === 'undefined') {
      console.log("NAMESPACE not defined, skipping inline query")
      return
  }
  
  const jsonInputFiles = await NAMESPACE.get('input_files')
  if (!jsonInputFiles) return

  const parsedInputFiles = JSON.parse(jsonInputFiles)
  const number = Object.keys(parsedInputFiles).length
  for (let i = 0; i < number; i++) {
    const caption = parsedInputFiles[i][3]
    const title = parsedInputFiles[i][0]
    if ((caption.toLowerCase().includes(search.toLowerCase())) || title.toLowerCase().includes(search.toLowerCase())) {
      results.push({
        type: 'voice',
        id: crypto.randomUUID(),
        voice_url: parsedInputFiles[i][1],
        title: parsedInputFiles[i][0],
        voice_duration: parsedInputFiles[i][2],
        caption: parsedInputFiles[i][3],
        parse_mode: 'HTML'
      })
    }
  }
  const res = JSON.stringify(results)
  return SendInlineQuery(inlineQuery.id, res)
}

// --- Helper Functions ---

function sendTwoButtons (chatId) {
  return sendInlineButtonRow(chatId, 'Press one of the two button', [{
    text: 'Button One',
    callback_data: 'data_1'
  }, {
    text: 'Button Two',
    callback_data: 'data_2'
  }])
}

function sendFourButtons (chatId) {
  return sendInlineButtons(chatId, 'Press a button', [
    [
      {
        text: 'Button top left',
        callback_data: 'Utah'
      }, {
        text: 'Button top right',
        callback_data: 'Colorado'
      }
    ],
    [
      {
        text: 'Button bottom left',
        callback_data: 'Arizona'
      }, {
        text: 'Button bottom right',
        callback_data: 'New Mexico'
      }
    ]
  ])
}

async function sendMarkdownExample (chatId) {
  await sendMarkdownV2Text(chatId, 'This is *bold* and this is _italic_')
  await sendMarkdownV2Text(chatId, escapeMarkdown('You can write it like this: *bold* and _italic_'))
  return sendMarkdownV2Text(chatId, escapeMarkdown('...but users may write ** and __ e.g. `**bold**` and `__italic__`', '`'))
}

async function setMessageReaction (message) {
  const reaction_ = []
  const min = 0
  const max = reactions_.length
  const re = Math.floor(Math.random() * (max - min) + min)
  const emoji = reactions_[re]
  let big = false
  if (emoji === '🎉') {
    big = true
  }

  reaction_.push({
    type: 'emoji',
    emoji
  })
  return (await fetch(apiUrl('setMessageReaction', {
    chat_id: message.chat.id,
    message_id: message.message_id,
    reaction: JSON.stringify(reaction_),
    is_big: big
  }))).json()
}

async function sendPlainText (chatId, text) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    text
  }))).json()
}

async function sendMarkdownV2Text (chatId, text) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'MarkdownV2'
  }))).json()
}

function escapeMarkdown (str, except = '') {
  const all = '_*[]()~`>#+-=|{}.!\\'.split('').filter(c => !except.includes(c))
  const regExSpecial = '^$*+?.()|{}[]\\'
  const regEx = new RegExp('[' + all.map(c => (regExSpecial.includes(c) ? '\\' + c : c)).join('') + ']', 'gim')
  return str.replace(regEx, '\\$&')
}

async function sendInlineButtonRow (chatId, text, buttonRow) {
  return sendInlineButtons(chatId, text, [buttonRow])
}

async function sendInlineButtons (chatId, text, buttons) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    reply_markup: JSON.stringify({
      inline_keyboard: buttons
    }),
    text
  }))).json()
}

async function answerCallbackQuery (callbackQueryId, text = null) {
  const data = {
    callback_query_id: callbackQueryId
  }
  if (text) {
    data.text = text
  }
  return (await fetch(apiUrl('answerCallbackQuery', data))).json()
}

async function SendInlineQuery (inlineQueryId, results) {
  return (await fetch(apiUrl('answerInlineQuery', {
    inline_query_id: inlineQueryId,
    results
  }))).json()
}

async function registerWebhook (event, requestUrl, suffix, secret) {
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`
  const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

async function unRegisterWebhook (event) {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

function apiUrl (methodName, params = null) {
  let query = ''
  if (params) {
    query = '?' + new URLSearchParams(params).toString()
  }
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`
}
