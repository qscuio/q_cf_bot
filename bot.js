/**
 * https://github.com/cvzi/telegram-bot-cloudflare
 */

const TOKEN = ENV_BOT_TOKEN // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const WEBHOOK = '/endpoint'
const SECRET = ENV_BOT_SECRET // A-Z, a-z, 0-9, _ and -

// API Keys for different providers
const GEMINI_KEY = typeof ENV_GEMINI_API_KEY !== 'undefined' ? ENV_GEMINI_API_KEY : ''
const OPENAI_KEY = typeof ENV_OPENAI_API_KEY !== 'undefined' ? ENV_OPENAI_API_KEY : ''
const CLAUDE_KEY = typeof ENV_CLAUDE_API_KEY !== 'undefined' ? ENV_CLAUDE_API_KEY : ''

// Allowed user IDs (comma-separated list, e.g., "123456789,987654321")
// If empty or not set, all users are allowed
const ALLOWED_USERS = typeof ENV_ALLOWED_USERS !== 'undefined' ? ENV_ALLOWED_USERS : ''

// Available AI providers and their models
const PROVIDERS = {
  'gemini': {
    name: 'Gemini',
    models: {
      'flash': 'gemini-2.5-flash',
      'flash-lite': 'gemini-2.5-flash-lite',
      '3-flash': 'gemini-3-flash'
    },
    defaultModel: 'gemini-2.5-flash'
  },
  'openai': {
    name: 'OpenAI',
    models: {
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4-turbo': 'gpt-4-turbo'
    },
    defaultModel: 'gpt-4o-mini'
  },
  'claude': {
    name: 'Claude',
    models: {
      'sonnet': 'claude-sonnet-4-20250514',
      'haiku': 'claude-3-5-haiku-20241022',
      'opus': 'claude-3-opus-20240229'
    },
    defaultModel: 'claude-sonnet-4-20250514'
  }
}
const DEFAULT_PROVIDER = 'gemini'

// Check if user is allowed
function isUserAllowed(userId) {
  if (!ALLOWED_USERS || ALLOWED_USERS.trim() === '') {
    return true // No restriction if ALLOWED_USERS is not set
  }
  const allowedList = ALLOWED_USERS.split(',').map(id => id.trim())
  return allowedList.includes(String(userId))
}

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
  } else if (url.pathname === '/registerCommands') {
    event.respondWith(registerCommands())
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
async function onMessage (message) {
  const chatId = message.chat.id
  const userId = message.from?.id
  
  // Check if user is allowed
  if (!isUserAllowed(userId)) {
    return sendPlainText(chatId, '🚫 Access denied. You are not authorized to use this bot.')
  }
  
  if (message.text && (message.text.startsWith('/start') || message.text.startsWith('/help'))) {
    return sendMarkdownV2Text(chatId, '*Functions:*\n' +
      escapeMarkdown(
        '`/help` - This message\n' +
        '/ai <text> - Ask AI (uses your selected provider)\n' +
        '/providers - List/select AI providers\n' +
        '/models - List/select models for current provider\n' +
        '/button2 - Sends two buttons\n' +
        'Any other text will trigger a random reaction!',
        '`'),
        [
          [{ text: '🤖 Ask AI (Fun Fact)', callback_data: 'ask_ai' }]
        ]
      )
  } else if (message.text && message.text.startsWith('/providers')) {
    const userProvider = await getUserProvider(chatId)
    // Create buttons for each provider
    const providerButtons = Object.entries(PROVIDERS).map(([key, provider]) => [{
      text: `${key === userProvider ? '✅ ' : ''}${provider.name}`,
      callback_data: `set_provider_${key}`
    }])
    return sendInlineButtons(chatId, `<b>🔌 Select AI Provider:</b>\n\n<i>Current: ${PROVIDERS[userProvider]?.name || userProvider}</i>`, providerButtons, 'HTML')
  } else if (message.text && message.text.startsWith('/models')) {
    const userProvider = await getUserProvider(chatId)
    const userModel = await getUserModel(chatId)
    const provider = PROVIDERS[userProvider]
    if (!provider) {
      return sendPlainText(chatId, 'Invalid provider selected.')
    }
    // Create buttons for each model in the current provider
    const modelButtons = Object.entries(provider.models).map(([shortName, fullName]) => [{
      text: `${fullName === userModel ? '✅ ' : ''}${shortName}`,
      callback_data: `set_model_${shortName}`
    }])
    return sendInlineButtons(chatId, `<b>📋 ${provider.name} Models:</b>\n\n<i>Current: ${userModel}</i>`, modelButtons, 'HTML')
  } else if (message.text && message.text.startsWith('/button2')) {
    return sendTwoButtons(chatId)
  } else if (message.text && message.text.startsWith('/button4')) {
    return sendFourButtons(chatId)
  } else if (message.text && message.text.startsWith('/ai')) {
    const prompt = message.text.replace('/ai', '').trim()
    if (!prompt) {
      return sendPlainText(chatId, 'Please provide a prompt. Example: /ai What is the moon?')
    }
    return handleAIRequest(chatId, prompt)
  } else {
    // Random reaction for other messages
    return setMessageReaction(message)
  }
}

// --- User Settings Storage (using KV) ---

async function getUserProvider(chatId) {
  if (typeof NAMESPACE === 'undefined') {
    return DEFAULT_PROVIDER
  }
  const provider = await NAMESPACE.get(`provider_${chatId}`)
  return provider || DEFAULT_PROVIDER
}

async function setUserProvider(chatId, provider) {
  if (typeof NAMESPACE === 'undefined') {
    throw new Error('KV NAMESPACE not configured.')
  }
  await NAMESPACE.put(`provider_${chatId}`, provider)
  // Also reset model to provider's default
  await NAMESPACE.put(`model_${chatId}`, PROVIDERS[provider].defaultModel)
}

async function getUserModel(chatId) {
  if (typeof NAMESPACE === 'undefined') {
    return PROVIDERS[DEFAULT_PROVIDER].defaultModel
  }
  const model = await NAMESPACE.get(`model_${chatId}`)
  if (model) return model
  const provider = await getUserProvider(chatId)
  return PROVIDERS[provider]?.defaultModel || PROVIDERS[DEFAULT_PROVIDER].defaultModel
}

async function setUserModel(chatId, model) {
  if (typeof NAMESPACE === 'undefined') {
    throw new Error('KV NAMESPACE not configured.')
  }
  await NAMESPACE.put(`model_${chatId}`, model)
}


/**
 * Handle incoming callback_query (inline button press)
 * https://core.telegram.org/bots/api#message
 */
async function onCallbackQuery (callbackQuery) {
  const chatId = callbackQuery.message.chat.id
  const userId = callbackQuery.from?.id
  
  // Check if user is allowed
  if (!isUserAllowed(userId)) {
    return answerCallbackQuery(callbackQuery.id, '🚫 Access denied.')
  }
  
  if (callbackQuery.data === 'ask_ai') {
    await answerCallbackQuery(callbackQuery.id, 'Asking AI...')
    return handleAIRequest(chatId, 'Tell me a random fun fact.')
  }
  
  // Handle provider selection: set_provider_gemini, set_provider_openai, etc.
  if (callbackQuery.data.startsWith('set_provider_')) {
    const providerKey = callbackQuery.data.replace('set_provider_', '')
    if (PROVIDERS[providerKey]) {
      await setUserProvider(chatId, providerKey)
      await answerCallbackQuery(callbackQuery.id, `Provider set to ${PROVIDERS[providerKey].name}!`)
      return sendHtmlText(chatId, `✅ Provider set to <b>${PROVIDERS[providerKey].name}</b>\n<i>Model reset to ${PROVIDERS[providerKey].defaultModel}</i>`)
    } else {
      return answerCallbackQuery(callbackQuery.id, 'Unknown provider.')
    }
  }
  
  // Handle model selection: set_model_flash, set_model_gpt-4o, etc.
  if (callbackQuery.data.startsWith('set_model_')) {
    const modelShortName = callbackQuery.data.replace('set_model_', '')
    const userProvider = await getUserProvider(chatId)
    const provider = PROVIDERS[userProvider]
    if (provider && provider.models[modelShortName]) {
      await setUserModel(chatId, provider.models[modelShortName])
      await answerCallbackQuery(callbackQuery.id, `Model set to ${modelShortName}!`)
      return sendHtmlText(chatId, `✅ Model set to <b>${provider.models[modelShortName]}</b>`)
    } else {
      return answerCallbackQuery(callbackQuery.id, 'Unknown model.')
    }
  }
  
  await sendMarkdownV2Text(chatId, escapeMarkdown(`You pressed the button with data=\`${callbackQuery.data}\``, '`'))
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

// Main AI request handler - routes to the correct provider
async function handleAIRequest(chatId, prompt) {
  const provider = await getUserProvider(chatId)
  const model = await getUserModel(chatId)
  
  const providerConfig = PROVIDERS[provider]
  if (!providerConfig) {
    return sendPlainText(chatId, 'Invalid provider selected.')
  }
  
  await sendPlainText(chatId, `🤔 Thinking... (${providerConfig.name}: ${model})`)
  
  try {
    let response
    switch (provider) {
      case 'gemini':
        if (!GEMINI_KEY) return sendPlainText(chatId, 'Error: GEMINI_API_KEY is not set.')
        response = await callGemini(prompt, model)
        break
      case 'openai':
        if (!OPENAI_KEY) return sendPlainText(chatId, 'Error: OPENAI_API_KEY is not set.')
        response = await callOpenAI(prompt, model)
        break
      case 'claude':
        if (!CLAUDE_KEY) return sendPlainText(chatId, 'Error: CLAUDE_API_KEY is not set.')
        response = await callClaude(prompt, model)
        break
      default:
        return sendPlainText(chatId, 'Unknown provider.')
    }
    
    // Send thinking process if available
    if (response.thinking) {
      const thinkingHtml = `<b>💭 Thinking:</b>\n<i>${escapeHtml(response.thinking.substring(0, 1000))}${response.thinking.length > 1000 ? '...' : ''}</i>`
      await sendLongHtmlText(chatId, thinkingHtml)
    }
    
    // Send the main response
    if (response.content) {
      const responseHtml = `<b>💬 ${providerConfig.name}:</b>\n${markdownToHtml(response.content)}`
      await sendLongHtmlText(chatId, responseHtml)
    } else {
      await sendPlainText(chatId, 'No response from AI.')
    }
  } catch (error) {
    await sendPlainText(chatId, `Error: ${error.message}`)
  }
}

// Gemini API call
async function callGemini(prompt, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 55000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { thinkingConfig: { thinkingBudget: 1024 } }
      }),
      signal: controller.signal
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    let thinking = '', content = ''
    
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.thought) thinking += part.text || ''
        else content += part.text || ''
      }
    }
    
    return { thinking, content }
  } finally {
    clearTimeout(timeoutId)
  }
}

// OpenAI API call
async function callOpenAI(prompt, model) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 55000)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096
      }),
      signal: controller.signal
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    return { thinking: '', content: data.choices?.[0]?.message?.content || '' }
  } finally {
    clearTimeout(timeoutId)
  }
}

// Claude API call
async function callClaude(prompt, model) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 55000)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: controller.signal
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Claude API Error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    let thinking = '', content = ''
    
    // Claude can return thinking blocks
    if (data.content) {
      for (const block of data.content) {
        if (block.type === 'thinking') thinking += block.thinking || ''
        else if (block.type === 'text') content += block.text || ''
      }
    }
    
    return { thinking, content }
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

async function sendInlineButtons (chatId, text, buttons, parseMode = null) {
  const body = {
    chat_id: chatId,
    reply_markup: JSON.stringify({
      inline_keyboard: buttons
    }),
    text
  }
  if (parseMode) {
    body.parse_mode = parseMode
  }
  return (await fetch(apiUrl('sendMessage', body))).json()
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

/**
 * Register bot commands for autocomplete
 * https://core.telegram.org/bots/api#setmycommands
 */
async function registerCommands() {
  const commands = [
    { command: 'start', description: 'Show help message' },
    { command: 'help', description: 'Show help message' },
    { command: 'ai', description: 'Ask AI a question' },
    { command: 'providers', description: 'Select AI provider' },
    { command: 'models', description: 'Select AI model' },
    { command: 'button2', description: 'Show two buttons' }
  ]
  
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands })
  })
  
  const result = await r.json()
  return new Response(result.ok ? 'Commands registered!' : JSON.stringify(result, null, 2))
}
