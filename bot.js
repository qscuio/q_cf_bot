/**
 * https://github.com/cvzi/telegram-bot-cloudflare
 */

const TOKEN = ENV_BOT_TOKEN // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const WEBHOOK = '/endpoint'
const SECRET = ENV_BOT_SECRET // A-Z, a-z, 0-9, _ and -
const GEMINI_KEY = ENV_GEMINI_API_KEY // Get it from https://aistudio.google.com/

// Available Gemini models
const AVAILABLE_MODELS = {
  'flash': 'gemini-2.5-flash',
  'flash-lite': 'gemini-2.5-flash-lite',
  '3-flash': 'gemini-3-flash'
}
const DEFAULT_MODEL = 'gemini-2.5-flash'

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
        '/gemini <text> - Ask Gemini AI (default model)\n' +
        '/gemini:flash <text> - Use gemini-2.5-flash\n' +
        '/gemini:flash-lite <text> - Use gemini-2.5-flash-lite\n' +
        '/gemini:3-flash <text> - Use gemini-3-flash\n' +
        '/models - List available models\n' +
        'Any other text will trigger a random reaction!',
        '`'),
        [
          [{ text: 'Ask Gemini (Fun Fact)', callback_data: 'ask_gemini' }]
        ]
      )
  } else if (message.text && message.text.startsWith('/models')) {
    const modelList = Object.entries(AVAILABLE_MODELS)
      .map(([shortName, fullName]) => `• <b>${shortName}</b> → ${fullName}`)
      .join('\n')
    return sendHtmlText(message.chat.id, `<b>📋 Available Models:</b>\n\n${modelList}\n\n<i>Usage: /gemini:flash-lite Your question here</i>`)
  } else if (message.text && message.text.startsWith('/button2')) {
    return sendTwoButtons(message.chat.id)
  } else if (message.text && message.text.startsWith('/button4')) {
    return sendFourButtons(message.chat.id)
  } else if (message.text && message.text.startsWith('/markdown')) {
    return sendMarkdownExample(message.chat.id)
  } else if (message.text && message.text.startsWith('/gemini')) {
    // Parse model selection: /gemini:flash-lite prompt OR /gemini prompt
    const match = message.text.match(/^\/gemini(?::(\S+))?\s*(.*)$/)
    if (!match) {
      return sendPlainText(message.chat.id, 'Invalid command format.')
    }
    const modelShortName = match[1] // e.g., "flash-lite" or undefined
    const prompt = match[2].trim()
    
    if (!prompt) {
      return sendPlainText(message.chat.id, 'Please provide a prompt. Example: /gemini What is the moon?')
    }
    
    let modelToUse = DEFAULT_MODEL
    if (modelShortName) {
      if (AVAILABLE_MODELS[modelShortName]) {
        modelToUse = AVAILABLE_MODELS[modelShortName]
      } else {
        return sendPlainText(message.chat.id, `Unknown model: ${modelShortName}. Use /models to see available options.`)
      }
    }
    
    return handleGeminiRequest(message.chat.id, prompt, modelToUse)
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
  if (callbackQuery.data === 'ask_gemini') {
    await answerCallbackQuery(callbackQuery.id, 'Asking Gemini...')
    return handleGeminiRequest(callbackQuery.message.chat.id, 'Tell me a random fun fact.')
  }
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

async function handleGeminiRequest(chatId, prompt, model = DEFAULT_MODEL) {
  if (!GEMINI_KEY) {
    return sendPlainText(chatId, 'Error: GEMINI_API_KEY is not set.')
  }
  
  await sendPlainText(chatId, `🤔 Thinking... (using ${model})`)
  
  try {
    const { thinking, response } = await callGemini(prompt, model)
    
    // Send thinking process if available (collapsed/shorter)
    if (thinking) {
      const thinkingHtml = `<b>💭 Thinking Process:</b>\n<i>${escapeHtml(thinking.substring(0, 1000))}${thinking.length > 1000 ? '...' : ''}</i>`
      await sendLongHtmlText(chatId, thinkingHtml)
    }
    
    // Send the main response with HTML formatting
    if (response) {
      const responseHtml = `<b>💬 Response:</b>\n${markdownToHtml(response)}`
      await sendLongHtmlText(chatId, responseHtml)
    } else {
      await sendPlainText(chatId, 'No response from Gemini.')
    }
  } catch (error) {
    await sendPlainText(chatId, `Error calling Gemini: ${error.message}`)
  }
}

async function callGemini(prompt, model = DEFAULT_MODEL) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 55000) // 55s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          thinkingConfig: {
            thinkingBudget: 1024 // Enable thinking with a budget
          }
        }
      }),
      signal: controller.signal
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    let thinkingContent = ''
    let responseContent = ''
    
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.thought === true) {
          thinkingContent += part.text + '\n'
        } else if (part.text) {
          responseContent += part.text + '\n'
        }
      }
    }
    
    return { thinking: thinkingContent.trim(), response: responseContent.trim() }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out.')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

async function sendLongPlainText(chatId, text) {
  const MAX_LENGTH = 4096
  for (let i = 0; i < text.length; i += MAX_LENGTH) {
    await sendPlainText(chatId, text.substring(i, i + MAX_LENGTH))
  }
}

async function sendLongHtmlText(chatId, text) {
  const MAX_LENGTH = 4096
  for (let i = 0; i < text.length; i += MAX_LENGTH) {
    await sendHtmlText(chatId, text.substring(i, i + MAX_LENGTH))
  }
}

async function sendHtmlText(chatId, text) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  }))).json()
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function markdownToHtml(str) {
  return escapeHtml(str)
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/__(.+?)__/g, '<b>$1</b>')
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/_(.+?)_/g, '<i>$1</i>')
    // Code blocks: ```code```
    .replace(/```[\w]*\n?([\s\S]+?)```/g, '<pre>$1</pre>')
    // Inline code: `code`
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Headers: # text -> bold
    .replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>')
    // Lists: * item or - item
    .replace(/^\s*[\*\-]\s+(.+)$/gm, '• $1')
    // Numbered lists: 1. item
    .replace(/^\s*(\d+)\.\s+(.+)$/gm, '$1. $2')
}

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

async function sendMarkdownV2Text (chatId, text, buttons = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'MarkdownV2'
  }
  if (buttons) {
    body.reply_markup = JSON.stringify({
      inline_keyboard: buttons
    })
  }
  return (await fetch(apiUrl('sendMessage', body))).json()
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
