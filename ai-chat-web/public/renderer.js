// ========== DOM 元素获取 ==========
const messageList = document.getElementById('messageList')
const messageInput = document.getElementById('messageInput')
const sendBtn = document.getElementById('sendBtn')
const settingsBtn = document.getElementById('settingsBtn')
const settingsPanel = document.getElementById('settingsPanel')
const overlay = document.getElementById('overlay')
const setEnterSend = document.getElementById('setEnterSend')
const setLongMemory = document.getElementById('setLongMemory')
const viewMemoryBtn = document.getElementById('viewMemoryBtn')
const clearMemoryBtn = document.getElementById('clearMemoryBtn')
const editRemarkBtn = document.getElementById('editRemarkBtn')
const remarkModal = document.getElementById('remarkModal')
const remarkInput = document.getElementById('remarkInput')
const cancelRemarkBtn = document.getElementById('cancelRemarkBtn')
const saveRemarkBtn = document.getElementById('saveRemarkBtn')
const headerName = document.getElementById('headerName')
const clearChatBtn = document.getElementById('clearChatBtn')
const clearModal = document.getElementById('clearModal')
const cancelClearBtn = document.getElementById('cancelClearBtn')
const confirmClearBtn = document.getElementById('confirmClearBtn')
const memoryPanel = document.getElementById('memoryPanel')
const closeMemoryBtn = document.getElementById('closeMemoryBtn')
const memoryBody = document.getElementById('memoryBody')
const headerStatus = document.getElementById('headerStatus')
const aiAvatarBtn = document.getElementById('aiAvatarBtn')
const aiProfilePanel = document.getElementById('aiProfilePanel')
const closeAiProfileBtn = document.getElementById('closeAiProfileBtn')
const aiAvatarWrap = document.getElementById('aiAvatarWrap')
const aiAvatarInput = document.getElementById('aiAvatarInput')
const aiProfileAvatar = document.getElementById('aiProfileAvatar')
const aiProfileName = document.getElementById('aiProfileName')
const userAvatarBtn = document.getElementById('userAvatarBtn')
const userProfilePanel = document.getElementById('userProfilePanel')
const closeUserProfileBtn = document.getElementById('closeUserProfileBtn')
const userAvatarWrap = document.getElementById('userAvatarWrap')
const userAvatarInput = document.getElementById('userAvatarInput')
const userProfileAvatar = document.getElementById('userProfileAvatar')
const chatHeaderAvatar = document.querySelector('.chat-header-avatar')
const userAvatarNav = document.querySelector('.user-avatar')
const moreBtn = document.getElementById('moreBtn')
const moreDropdown = document.getElementById('moreDropdown')
const searchHistoryBtn = document.getElementById('searchHistoryBtn')
const searchModal = document.getElementById('searchModal')
const searchCloseBtn = document.getElementById('searchCloseBtn')
const searchInput = document.getElementById('searchInput')
const searchResultList = document.getElementById('searchResultList')
const cropModal = document.getElementById('cropModal')
const cropImage = document.getElementById('cropImage')
const cropFrame = document.getElementById('cropFrame')
const cropStage = document.getElementById('cropStage')
const cropCloseBtn = document.getElementById('cropCloseBtn')
const cropCancelBtn = document.getElementById('cropCancelBtn')
const cropConfirmBtn = document.getElementById('cropConfirmBtn')
const convList = document.getElementById('convList')
let typingElement = null
let isAtBottom = true
let localChatHistory = []
let lastOpenPanel = null
// 语音播放与缓存
const voiceCache = new Map()
let currentAudio = null
let currentVoiceBubble = null
let currentEmotion = '平静'

// ========== 工具函数 ==========
function formatMessageTime(date) {
    if (!(date instanceof Date)) date = new Date(date)
    const hh = date.getHours().toString().padStart(2, '0')
    const mm = date.getMinutes().toString().padStart(2, '0')
    return `${hh}:${mm}`
}
function throttle(fn, delay) {
    let timer = null
    return function(...args) {
        if (!timer) {
            timer = setTimeout(() => { fn.apply(this, args); timer = null }, delay)
        }
    }
}

// ========== 头像工具 ==========
function getAvatarImageUrl(role) {
    if (role === 'ai' || role === 'assistant') {
        return localStorage.getItem('ai_avatar') || ''
    }
    return localStorage.getItem('user_avatar') || ''
}
function getAvatarStyle(role) {
    const url = getAvatarImageUrl(role)
    if (url) {
        return {
            background: 'transparent',
            backgroundImage: `url(${url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '50%'
        }
    }
    return {
        background: role === 'ai' ? 'var(--secondary-gradient)' : 'var(--primary-gradient)'
    }
}
function loadAvatarCache() {
    const aiAvatar = getAvatarImageUrl('ai')
    const userAvatar = getAvatarImageUrl('user')
    if (aiAvatar) {
        aiProfileAvatar.src = aiAvatar
        if (chatHeaderAvatar) {
            chatHeaderAvatar.style.background = 'transparent'
            chatHeaderAvatar.style.backgroundImage = `url("${aiAvatar}")`
            chatHeaderAvatar.style.backgroundSize = 'cover'
            chatHeaderAvatar.style.backgroundPosition = 'center'
        }
        syncConversationAvatar()
    }
    if (userAvatar) {
        userProfileAvatar.src = userAvatar
        if (userAvatarNav) {
            userAvatarNav.style.background = 'transparent'
            userAvatarNav.style.backgroundImage = `url("${userAvatar}")`
            userAvatarNav.style.backgroundSize = 'cover'
            userAvatarNav.style.backgroundPosition = 'center'
        }
    }
}
function syncConversationAvatar() {
    const convAvatar = document.querySelector('.conv-avatar')
    const url = getAvatarImageUrl('ai')
    if (convAvatar && url) {
        convAvatar.style.background = 'transparent'
        convAvatar.style.backgroundImage = `url("${url}")`
        convAvatar.style.backgroundSize = 'cover'
        convAvatar.style.backgroundPosition = 'center'
    }
}

// ========== 会话列表初始化 ==========
function initConvList() {
    const convItem = document.createElement('div')
    convItem.className = 'conv-item active'
    convItem.innerHTML = `
        <div class="conv-avatar-wrap">
            <div class="conv-avatar"></div>
            <div class="online-dot"></div>
        </div>
        <div class="conv-info">
            <div class="conv-name">莓莓</div>
            <div class="conv-preview">在线</div>
        </div>
        <div class="conv-meta">
            <div class="conv-time">刚刚</div>
        </div>
    `
    convList.appendChild(convItem)
    loadAvatarCache()
}
initConvList()

// ========== 语音播放核心 ==========
function stopCurrentVoice() {
    if (currentAudio) {
        currentAudio.pause()
        currentAudio = null
    }
    if (currentVoiceBubble) {
        currentVoiceBubble.classList.remove('playing')
        currentVoiceBubble = null
    }
}
function playVoiceBubble(base64, bubble) {
    const durationEl = bubble.querySelector('.voice-duration')
    stopCurrentVoice()
    if (!base64 || base64.length < 200) {
        durationEl.textContent = '失败'
        return
    }
    try {
        const audio = new Audio('data:audio/mp3;base64,' + base64)
        currentAudio = audio
        currentVoiceBubble = bubble
        const timer = setTimeout(() => {
            if (durationEl.textContent === '0"') durationEl.textContent = '失败'
        }, 800)
        audio.onloadedmetadata = () => {
            clearTimeout(timer)
            const sec = Math.max(1, Math.round(audio.duration))
            durationEl.textContent = sec + '"'
        }
        audio.onended = () => {
            clearTimeout(timer)
            bubble.classList.remove('playing')
            currentAudio = null
            currentVoiceBubble = null
        }
        audio.onerror = () => {
            clearTimeout(timer)
            durationEl.textContent = '失败'
            currentAudio = null
            currentVoiceBubble = null
        }
        audio.play().then(() => {
            bubble.classList.add('playing')
        }).catch(() => {
            clearTimeout(timer)
            durationEl.textContent = '失败'
        })
    } catch (e) {
        durationEl.textContent = '失败'
    }
}

// 调用网页端TTS接口工具函数
async function fetchTTS(text, emotion) {
    const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, emotion })
    })
    if (!res.ok) throw new Error('TTS请求失败')
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

async function handleVoiceBubbleClick(bubble) {
    const text = bubble.dataset.text
    const emotion = bubble.dataset.emotion || '平静'
    if (currentAudio && currentVoiceBubble === bubble && !currentAudio.paused) {
        currentAudio.pause()
        bubble.classList.remove('playing')
        return
    }
    stopCurrentVoice()
    try {
        let base64
        const cache = getVoiceCache(text, emotion)
        if (cache) {
            base64 = cache.base64
        } else {
            base64 = await fetchTTS(text, emotion)
            if (!base64) throw new Error('合成失败')
            // 合成成功自动存缓存
            const audio = new Audio('data:audio/mp3;base64,' + base64)
            audio.onloadedmetadata = () => {
                setVoiceCache(text, emotion, base64, Math.max(1, Math.round(audio.duration)))
            }
        }
        playVoiceBubble(base64, bubble)
    } catch (err) {
        console.error('语音播放失败', err)
        bubble.querySelector('.voice-duration').textContent = '失败'
    }
}

// ========== 渲染文字消息 ==========
function appendMessage(role, content, time) {
    if (!content?.trim()) return
    const msgTime = time ? new Date(time) : new Date()
    const timeStr = msgTime.toISOString()
    const msgDiv = document.createElement('div')
    msgDiv.className = 'message ' + (role === 'user' ? 'sent' : 'received')
    msgDiv.dataset.time = timeStr
    const avatar = document.createElement('div')
    avatar.className = 'msg-avatar'
    Object.assign(avatar.style, getAvatarStyle(role))
    const body = document.createElement('div')
    body.className = 'msg-body'
    const bubble = document.createElement('div')
    bubble.className = 'msg-bubble'
    bubble.textContent = content
    const timeEl = document.createElement('div')
    timeEl.className = 'msg-time'
    timeEl.textContent = formatMessageTime(msgTime)
    body.appendChild(bubble)
    body.appendChild(timeEl)
    if (role === 'user') {
        msgDiv.appendChild(body)
        msgDiv.appendChild(avatar)
    } else {
        msgDiv.appendChild(avatar)
        msgDiv.appendChild(body)
    }
    messageList.appendChild(msgDiv)
    localChatHistory.push({ role, content, time: timeStr, type: 'text' })
    localStorage.setItem('chat_history', JSON.stringify(localChatHistory))
    if (isAtBottom) {
        requestAnimationFrame(() => messageList.scrollTop = messageList.scrollHeight)
    }
}

// ========== 语音持久化缓存 ==========
const VOICE_CACHE_EXPIRE = 999 * 365 * 24 * 60 * 60 * 1000
const VOICE_CACHE_MAX = 9999
function getVoiceCacheKey(text, emotion) {
    return `voice:${emotion}:${text.trim().slice(0, 100)}`
}
function getVoiceCache(text, emotion) {
    const key = getVoiceCacheKey(text, emotion)
    if (voiceCache.has(text)) {
        return { base64: voiceCache.get(text) }
    }
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        const data = JSON.parse(raw)
        if (Date.now() - data.time > VOICE_CACHE_EXPIRE) {
            localStorage.removeItem(key)
            return null
        }
        voiceCache.set(text, data.base64)
        return data
    } catch (e) {
        return null
    }
}
function setVoiceCache(text, emotion, base64, duration) {
    const key = getVoiceCacheKey(text, emotion)
    voiceCache.set(text, base64)
    try {
        const allKeys = Object.keys(localStorage).filter(k => k.startsWith('voice:'))
        if (allKeys.length >= VOICE_CACHE_MAX) {
            let oldestKey = allKeys[0]
            let oldestTime = JSON.parse(localStorage.getItem(oldestKey)).time
            for (const k of allKeys) {
                const t = JSON.parse(localStorage.getItem(k)).time
                if (t < oldestTime) {
                    oldestTime = t
                    oldestKey = k
                }
            }
            localStorage.removeItem(oldestKey)
        }
        localStorage.setItem(key, JSON.stringify({
            base64,
            duration,
            time: Date.now()
        }))
    } catch (e) {
        Object.keys(localStorage)
            .filter(k => k.startsWith('voice:'))
            .forEach(k => localStorage.removeItem(k))
    }
}

// ========== 渲染纯语音消息 ==========
function appendVoiceMessage(role, text, time, emotion = '平静') {
    text = text
        .replace(/^【语音】|^\[语音\]|^（发语音）|^\(发语音\)|^【发语音】|^\[发语音\]/, '')
        .replace(/\n{2,}/g, '\n')
        .trim()
    if (!text) return
    const msgTime = time ? new Date(time) : new Date()
    const timeStr = msgTime.toISOString()
    const msgDiv = document.createElement('div')
    msgDiv.className = 'message ' + (role === 'user' ? 'sent' : 'received')
    msgDiv.dataset.time = timeStr
    const avatar = document.createElement('div')
    avatar.className = 'msg-avatar'
    Object.assign(avatar.style, getAvatarStyle(role))
    const body = document.createElement('div')
    body.className = 'msg-body'
    const bubble = document.createElement('div')
    bubble.className = 'msg-bubble voice-bubble'
    bubble.dataset.text = text
    bubble.dataset.emotion = emotion
    bubble.style.position = 'relative'
    bubble.style.minWidth = '120px'
    bubble.style.flexDirection = 'column'
    bubble.style.alignItems = 'stretch'

    const toggleBtn = document.createElement('div')
    toggleBtn.textContent = '文'
    toggleBtn.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fff;
        color: var(--primary);
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 2;
    `
    toggleBtn.title = '查看文字'
    bubble.addEventListener('mouseenter', () => toggleBtn.style.opacity = '1')
    bubble.addEventListener('mouseleave', () => toggleBtn.style.opacity = '0')

    const voiceRow = document.createElement('div')
    voiceRow.style.cssText = 'display:flex;align-items:center;gap:8px;height:22px;'
    const playBtn = document.createElement('div')
    playBtn.className = 'voice-play-btn'
    playBtn.innerHTML = '<svg class="icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
    const wave = document.createElement('div')
    wave.className = 'voice-wave'
    wave.style.height = '16px'
    let waveHtml = ''
    for (let i = 0; i < 5; i++) waveHtml += '<span></span>'
    wave.innerHTML = waveHtml
    const duration = document.createElement('div')
    duration.className = 'voice-duration'
    duration.textContent = '0"'
    voiceRow.appendChild(playBtn)
    voiceRow.appendChild(wave)
    voiceRow.appendChild(duration)

    const textContent = document.createElement('div')
    textContent.textContent = text
    textContent.style.cssText = `
        display: none;
        margin-top: 2px;
        padding-top: 4px;
        border-top: 1px solid rgba(0,0,0,0.06);
        font-size: 14px;
        line-height: 1.45;
        word-break: break-word;
    `

    bubble.appendChild(toggleBtn)
    bubble.appendChild(voiceRow)
    bubble.appendChild(textContent)

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const isShow = textContent.style.display === 'block'
        textContent.style.display = isShow ? 'none' : 'block'
        toggleBtn.style.background = isShow ? '#fff' : 'var(--primary)'
        toggleBtn.style.color = isShow ? 'var(--primary)' : '#fff'
    })

    bubble.addEventListener('click', () => handleVoiceBubbleClick(bubble))
    const timeEl = document.createElement('div')
    timeEl.className = 'msg-time'
    timeEl.textContent = formatMessageTime(msgTime)
    body.appendChild(bubble)
    body.appendChild(timeEl)
    if (role === 'user') {
        msgDiv.appendChild(body)
        msgDiv.appendChild(avatar)
    } else {
        msgDiv.appendChild(avatar)
        msgDiv.appendChild(body)
    }
    messageList.appendChild(msgDiv)
    localChatHistory.push({ role, content: text, time: timeStr, type: 'voice', emotion })
    localStorage.setItem('chat_history', JSON.stringify(localChatHistory))
    if (isAtBottom) {
        requestAnimationFrame(() => messageList.scrollTop = messageList.scrollHeight)
    }

    // 后台预加载：缓存优先 + 失败重试
    ;(async () => {
      const cache = getVoiceCache(text, emotion)
      if (cache && cache.duration) {
        duration.textContent = cache.duration + '"'
        return
      }
      const tryLoad = async () => {
        const base64 = await fetchTTS(text, emotion)
        if (!base64) throw new Error()
        return new Promise((resolve, reject) => {
          const audio = new Audio('data:audio/mp3;base64,' + base64)
          audio.onloadedmetadata = () => {
            const dur = Math.max(1, Math.round(audio.duration))
            setVoiceCache(text, emotion, base64, dur)
            resolve(dur)
          }
          audio.onerror = reject
        })
      }
      try {
        let dur = await tryLoad().catch(() => tryLoad())
        duration.textContent = dur + '"'
      } catch {
        duration.textContent = '失败'
      }
    })()
}

// ========== 滚动监听 ==========
messageList.addEventListener('scroll', throttle(() => {
    isAtBottom = messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 20
}, 100))

// ========== 发送消息（网页端流式版） ==========
async function sendMessage() {
    const text = messageInput.value.trim()
    if (!text) return
    stopCurrentVoice()
    appendMessage('user', text, new Date())
    messageInput.value = ''
    messageInput.style.height = 'auto'

    // 显示打字状态
    showTyping()
    headerStatus.textContent = '正在输入中…'

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text, 
                history: localChatHistory.slice(-10) 
            })
        })

        if (!response.ok) throw new Error('请求失败')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ''
        let isVoice = false
        const voiceMarks = ['【语音】', '[语音]', '（发语音）', '(发语音)', '【发语音】', '[发语音]']

        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            fullText += decoder.decode(value, { stream: true })

            // 实时判断是否语音消息
            if (!isVoice) {
                for (const mark of voiceMarks) {
                    if (fullText.startsWith(mark)) {
                        isVoice = true
                        break
                    }
                }
            }
        }

        // 消息接收完成
        hideTyping()
        headerStatus.textContent = '在线'

        // 渲染消息
        let cleanText = fullText
        if (isVoice) {
            for (const mark of voiceMarks) {
                if (cleanText.startsWith(mark)) {
                    cleanText = cleanText.slice(mark.length).trim()
                    break
                }
            }
            appendVoiceMessage('ai', cleanText, new Date(), currentEmotion)
        } else {
            appendMessage('ai', cleanText, new Date())
        }

        // 更新会话预览
        const lastMsg = messageList.lastElementChild
        const lastBubble = lastMsg?.querySelector('.msg-bubble')
        if (lastBubble) {
            const convPreview = document.querySelector('.conv-preview')
            if (convPreview) {
                convPreview.textContent = lastBubble.classList.contains('voice-bubble') ? '[语音]' : lastBubble.textContent.slice(0, 15)
            }
        }

    } catch (e) {
        hideTyping()
        headerStatus.textContent = '在线'
        appendMessage('ai', '网络出错了，稍后再试吧', new Date())
    }
}

sendBtn.addEventListener('click', sendMessage)
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && setEnterSend?.checked) {
        e.preventDefault()
        sendMessage()
    }
})
messageInput.addEventListener('input', () => {
    const maxHeight = 120
    messageInput.style.height = 'auto'
    const scrollH = messageInput.scrollHeight
    if (scrollH <= maxHeight) {
        messageInput.style.height = scrollH + 'px'
        messageInput.style.overflowY = 'hidden'
    } else {
        messageInput.style.height = maxHeight + 'px'
        messageInput.style.overflowY = 'auto'
    }
})

// ========== 打字状态 ==========
function showTyping() {
    if (typingElement) return
    typingElement = document.createElement('div')
    typingElement.className = 'message received'
    const avatar = document.createElement('div')
    avatar.className = 'msg-avatar'
    Object.assign(avatar.style, getAvatarStyle('ai'))
    const body = document.createElement('div')
    body.className = 'msg-body'
    const bubble = document.createElement('div')
    bubble.className = 'msg-bubble typing-bubble'
    bubble.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>'
    body.appendChild(bubble)
    typingElement.appendChild(avatar)
    typingElement.appendChild(body)
    messageList.appendChild(typingElement)
    if (isAtBottom) messageList.scrollTop = messageList.scrollHeight
}
function hideTyping() {
    if (!typingElement) return
    typingElement.remove()
    typingElement = null
}

// ========== 面板通用控制 ==========
settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('show')
    overlay.classList.add('show')
})
function closeAllPanels() {
    settingsPanel.classList.remove('show')
    remarkModal.classList.remove('show')
    clearModal.classList.remove('show')
    memoryPanel.classList.remove('show')
    aiProfilePanel.classList.remove('show')
    userProfilePanel.classList.remove('show')
    cropModal.classList.remove('show')
    searchModal.style.display = 'none'
    moreDropdown.style.display = 'none'
    overlay.classList.remove('show')
}
overlay.addEventListener('click', closeAllPanels)

// ========== 个人主页 ==========
aiAvatarBtn.addEventListener('click', () => {
    closeAllPanels()
    aiProfilePanel.classList.add('show')
    overlay.classList.add('show')
})
closeAiProfileBtn.addEventListener('click', closeAllPanels)
userAvatarBtn.addEventListener('click', () => {
    closeAllPanels()
    userProfilePanel.classList.add('show')
    overlay.classList.add('show')
})
closeUserProfileBtn.addEventListener('click', closeAllPanels)

// ========== 头像裁剪上传 ==========
let currentCropTarget = null
let cropRect = { x: 0, y: 0, size: 160 }
let isDraggingCrop = false
let isResizingCrop = false
let dragStart = { x: 0, y: 0, rx: 0, ry: 0 }
let imgDisplay = { x: 0, y: 0, w: 0, h: 0, scale: 1 }
function openCropModal(file, target) {
    const reader = new FileReader()
    reader.onload = (ev) => {
        cropImage.src = ev.target.result
        currentCropTarget = target
        if (target === 'ai' && aiProfilePanel.classList.contains('show')) {
            lastOpenPanel = 'ai'
            aiProfilePanel.classList.remove('show')
        } else if (target === 'user' && userProfilePanel.classList.contains('show')) {
            lastOpenPanel = 'user'
            userProfilePanel.classList.remove('show')
        }
        cropModal.classList.add('show')
        resetCropFrame()
    }
    reader.readAsDataURL(file)
}
function resetCropFrame() {
    cropImage.onload = () => {
        const stageW = cropStage.clientWidth
        const stageH = cropStage.clientHeight
        const naturalW = cropImage.naturalWidth
        const naturalH = cropImage.naturalHeight
        const scale = Math.min(stageW / naturalW, stageH / naturalH)
        const displayW = naturalW * scale
        const displayH = naturalH * scale
        const imgX = (stageW - displayW) / 2
        const imgY = (stageH - displayH) / 2
        imgDisplay = { x: imgX, y: imgY, w: displayW, h: displayH, scale }
        const initSize = Math.min(displayW, displayH) * 0.6
        cropRect = {
            x: imgX + (displayW - initSize) / 2,
            y: imgY + (displayH - initSize) / 2,
            size: initSize
        }
        applyCropFrame()
    }
}
function applyCropFrame() {
    cropFrame.style.left = cropRect.x + 'px'
    cropFrame.style.top = cropRect.y + 'px'
    cropFrame.style.width = cropRect.size + 'px'
    cropFrame.style.height = cropRect.size + 'px'
}
function closeCropModal() {
    cropModal.classList.remove('show')
    currentCropTarget = null
    cropImage.src = ''
    if (lastOpenPanel === 'ai') aiProfilePanel.classList.add('show')
    else if (lastOpenPanel === 'user') userProfilePanel.classList.add('show')
    lastOpenPanel = null
}
cropCloseBtn.addEventListener('click', closeCropModal)
cropCancelBtn.addEventListener('click', closeCropModal)
document.querySelector('.crop-modal-mask').addEventListener('click', closeCropModal)
cropFrame.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('crop-handle')) return
    isDraggingCrop = true
    dragStart.x = e.clientX
    dragStart.y = e.clientY
    dragStart.rx = cropRect.x
    dragStart.ry = cropRect.y
    e.preventDefault()
})
document.querySelectorAll('.crop-handle').forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
        isResizingCrop = true
        dragStart.x = e.clientX
        dragStart.y = e.clientY
        dragStart.size = cropRect.size
        dragStart.handle = handle
        e.stopPropagation()
        e.preventDefault()
    })
})
document.addEventListener('mousemove', (e) => {
    if (!isDraggingCrop && !isResizingCrop) return
    if (isDraggingCrop) {
        let dx = e.clientX - dragStart.x
        let dy = e.clientY - dragStart.y
        let newX = dragStart.rx + dx
        let newY = dragStart.ry + dy
        newX = Math.max(imgDisplay.x, Math.min(imgDisplay.x + imgDisplay.w - cropRect.size, newX))
        newY = Math.max(imgDisplay.y, Math.min(imgDisplay.y + imgDisplay.h - cropRect.size, newY))
        cropRect.x = newX
        cropRect.y = newY
        applyCropFrame()
    }
    if (isResizingCrop) {
        const handle = dragStart.handle
        const dx = e.clientX - dragStart.x
        const dy = e.clientY - dragStart.y
        let newSize = dragStart.size
        if (handle.classList.contains('handle-br')) newSize = dragStart.size + Math.max(dx, dy)
        else if (handle.classList.contains('handle-tl')) newSize = dragStart.size - Math.min(dx, dy)
        else if (handle.classList.contains('handle-tr')) newSize = dragStart.size + Math.max(dx, -dy)
        else if (handle.classList.contains('handle-bl')) newSize = dragStart.size + Math.max(-dx, dy)
        newSize = Math.max(60, Math.min(Math.min(imgDisplay.w, imgDisplay.h), newSize))
        
        if (handle.classList.contains('handle-tl')) {
            let newX = dragStart.rx + (dragStart.size - newSize)
            let newY = dragStart.ry + (dragStart.size - newSize)
            newX = Math.max(imgDisplay.x, newX)
            newY = Math.max(imgDisplay.y, newY)
            cropRect.x = newX
            cropRect.y = newY
        } else if (handle.classList.contains('handle-tr')) {
            let newY = dragStart.ry + (dragStart.size - newSize)
            newY = Math.max(imgDisplay.y, newY)
            cropRect.y = newY
        } else if (handle.classList.contains('handle-bl')) {
            let newX = dragStart.rx + (dragStart.size - newSize)
            newX = Math.max(imgDisplay.x, newX)
            cropRect.x = newX
        }
        if (cropRect.x + newSize > imgDisplay.x + imgDisplay.w) {
            newSize = imgDisplay.x + imgDisplay.w - cropRect.x
        }
        if (cropRect.y + newSize > imgDisplay.y + imgDisplay.h) {
            newSize = imgDisplay.y + imgDisplay.h - cropRect.y
        }
        cropRect.size = newSize
        applyCropFrame()
    }
})
document.addEventListener('mouseup', () => {
    isDraggingCrop = false
    isResizingCrop = false
})
cropConfirmBtn.addEventListener('click', () => {
    const img = cropImage
    if (!img.src || !currentCropTarget) return
    const sx = (cropRect.x - imgDisplay.x) / imgDisplay.scale
    const sy = (cropRect.y - imgDisplay.y) / imgDisplay.scale
    const sSize = cropRect.size / imgDisplay.scale
    const canvas = document.createElement('canvas')
    const outSize = 400
    canvas.width = outSize
    canvas.height = outSize
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, outSize, outSize)
    const croppedBase64 = canvas.toDataURL('image/png')
    
    if (currentCropTarget === 'ai') {
        localStorage.setItem('ai_avatar', croppedBase64)
        aiProfileAvatar.src = croppedBase64
        if (chatHeaderAvatar) {
            chatHeaderAvatar.style.background = 'transparent'
            chatHeaderAvatar.style.backgroundImage = `url("${croppedBase64}")`
            chatHeaderAvatar.style.backgroundSize = 'cover'
            chatHeaderAvatar.style.backgroundPosition = 'center'
        }
        syncConversationAvatar()
        document.querySelectorAll('.message.received .msg-avatar').forEach(avatar => {
            Object.assign(avatar.style, getAvatarStyle('ai'))
        })
    } else {
        localStorage.setItem('user_avatar', croppedBase64)
        userProfileAvatar.src = croppedBase64
        if (userAvatarNav) {
            userAvatarNav.style.background = 'transparent'
            userAvatarNav.style.backgroundImage = `url("${croppedBase64}")`
            userAvatarNav.style.backgroundSize = 'cover'
            userAvatarNav.style.backgroundPosition = 'center'
        }
        document.querySelectorAll('.message.sent .msg-avatar').forEach(avatar => {
            Object.assign(avatar.style, getAvatarStyle('user'))
        })
    }
    closeCropModal()
})
aiAvatarWrap.addEventListener('click', () => aiAvatarInput.click())
aiAvatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (!file) return
    openCropModal(file, 'ai')
    aiAvatarInput.value = ''
})
userAvatarWrap.addEventListener('click', () => userAvatarInput.click())
userAvatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (!file) return
    openCropModal(file, 'user')
    userAvatarInput.value = ''
})

// ========== 长期记忆（本地存储版） ==========
setLongMemory.addEventListener('change', () => {
    localStorage.setItem('long_memory_enable', setLongMemory.checked)
})
viewMemoryBtn.addEventListener('click', () => {
    closeAllPanels()
    memoryPanel.classList.add('show')
    overlay.classList.add('show')
    const memoryData = JSON.parse(localStorage.getItem('long_memory') || '{}')
    renderMemory(memoryData)
})
closeMemoryBtn.addEventListener('click', closeAllPanels)
clearMemoryBtn.addEventListener('click', () => {
    if (confirm('确定要清空所有长期记忆吗？清空后无法恢复。')) {
        localStorage.removeItem('long_memory')
        renderMemory({
            profile: {}, preferences: { likes: [], dislikes: [], chatStyle: '', topics: [] },
            events: [], promises: [], knowledge: []
        })
    }
})

function renderMemory(data) {
    if (!data) {
        memoryBody.innerHTML = '<div class="memory-empty">暂无记忆数据</div>'
        return
    }
    let html = ''
    html += '<div class="memory-category"><h4>基本信息</h4>'
    const profileKeys = Object.keys(data.profile || {})
    if (profileKeys.length === 0) {
        html += '<div class="memory-empty">暂无记录</div>'
    } else {
        profileKeys.forEach(key => {
            html += `
            <div class="memory-item">
                <div class="memory-item-text"><b>${key}：</b>${data.profile[key]}</div>
                <div class="memory-item-del" data-cat="profile" data-key="${key}">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </div>
            </div>`
        })
    }
    html += '</div>'
    html += '<div class="memory-category"><h4>偏好设置</h4>'
    const prefs = data.preferences || {}
    if (prefs.chatStyle) {
        html += `
        <div class="memory-item">
            <div class="memory-item-text"><b>聊天风格：</b>${prefs.chatStyle}</div>
            <div class="memory-item-del" data-cat="preferences" data-key="chatStyle">
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </div>
        </div>`
    }
    const renderPrefArray = (list, label, field) => {
        if (!list || list.length === 0) return ''
        let str = ''
        list.forEach((item, idx) => {
            str += `
            <div class="memory-item">
                <div class="memory-item-text"><b>${label}：</b>${item.text || item}</div>
                <div class="memory-item-del" data-cat="preferences" data-key="${field}::${idx}">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </div>
            </div>`
        })
        return str
    }
    html += renderPrefArray(prefs.likes, '喜欢', 'likes')
    html += renderPrefArray(prefs.dislikes, '不喜欢', 'dislikes')
    html += renderPrefArray(prefs.topics, '感兴趣话题', 'topics')
    html += '</div>'
    html += '<div class="memory-category"><h4>重要事件</h4>'
    if (!data.events || data.events.length === 0) {
        html += '<div class="memory-empty">暂无记录</div>'
    } else {
        data.events.forEach((item, idx) => {
            html += `
            <div class="memory-item">
                <div class="memory-item-text">${item.text || item}</div>
                <div class="memory-item-del" data-cat="events" data-key="${idx}">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </div>
            </div>`
        })
    }
    html += '</div>'
    html += '<div class="memory-category"><h4>约定承诺</h4>'
    if (!data.promises || data.promises.length === 0) {
        html += '<div class="memory-empty">暂无记录</div>'
    } else {
        data.promises.forEach((item, idx) => {
            html += `
            <div class="memory-item">
                <div class="memory-item-text">${item.text || item}</div>
                <div class="memory-item-del" data-cat="promises" data-key="${idx}">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </div>
            </div>`
        })
    }
    html += '</div>'
    html += '<div class="memory-category"><h4>专属知识</h4>'
    if (!data.knowledge || data.knowledge.length === 0) {
        html += '<div class="memory-empty">暂无记录</div>'
    } else {
        data.knowledge.forEach((item, idx) => {
            html += `
            <div class="memory-item">
                <div class="memory-item-text">${item.text || item}</div>
                <div class="memory-item-del" data-cat="knowledge" data-key="${idx}">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </div>
            </div>`
        })
    }
    html += '</div>'
    memoryBody.innerHTML = html
    document.querySelectorAll('.memory-item-del').forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.dataset.cat
            const key = btn.dataset.key
            const item = btn.closest('.memory-item')
            item.style.transition = 'all 0.2s ease'
            item.style.opacity = '0'
            item.style.transform = 'translateX(-10px)'
            setTimeout(() => {
                const memory = JSON.parse(localStorage.getItem('long_memory') || '{}')
                if (memory[cat]) {
                    if (key.includes('::')) {
                        const [field, idx] = key.split('::')
                        if (memory[cat][field]) memory[cat][field].splice(idx, 1)
                    } else {
                        delete memory[cat][key]
                    }
                    localStorage.setItem('long_memory', JSON.stringify(memory))
                }
                renderMemory(memory)
            }, 200)
        })
    })
}

// ========== 修改备注 ==========
editRemarkBtn.addEventListener('click', () => {
    remarkInput.value = headerName.textContent
    remarkModal.classList.add('show')
    overlay.classList.add('show')
})
cancelRemarkBtn.addEventListener('click', closeAllPanels)
saveRemarkBtn.addEventListener('click', () => {
    const val = remarkInput.value.trim()
    if (val) {
        headerName.textContent = val
        aiProfileName.textContent = val
        const convName = document.querySelector('.conv-name')
        if (convName) convName.textContent = val
    }
    closeAllPanels()
})

// ========== 清空聊天 ==========
clearChatBtn.addEventListener('click', () => {
    clearModal.classList.add('show')
    overlay.classList.add('show')
})
cancelClearBtn.addEventListener('click', closeAllPanels)
confirmClearBtn.addEventListener('click', () => {
    closeAllPanels()
    messageList.style.transition = 'opacity 0.3s ease'
    messageList.style.opacity = '0'
    setTimeout(() => {
        localStorage.removeItem('chat_history')
        messageList.innerHTML = ''
        localChatHistory = []
        const convPreview = document.querySelector('.conv-preview')
        if (convPreview) convPreview.textContent = '在线'
        setTimeout(() => messageList.style.opacity = '1', 100)
    }, 250)
})

// ========== 搜索功能 ==========
moreBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    moreDropdown.style.display = moreDropdown.style.display === 'block' ? 'none' : 'block'
})
document.addEventListener('click', () => moreDropdown.style.display = 'none')
searchHistoryBtn.addEventListener('click', () => {
    moreDropdown.style.display = 'none'
    searchModal.style.display = 'block'
    setTimeout(() => searchInput.focus(), 100)
})
searchCloseBtn.addEventListener('click', () => {
    searchModal.style.display = 'none'
    searchInput.value = ''
    searchResultList.innerHTML = '<div class="search-empty">输入关键词搜索聊天记录</div>'
})
document.querySelector('.search-modal-mask').addEventListener('click', () => {
    searchModal.style.display = 'none'
})
searchInput.addEventListener('input', () => {
    const keyword = searchInput.value.trim()
    if (!keyword) {
        searchResultList.innerHTML = '<div class="search-empty">输入关键词搜索聊天记录</div>'
        return
    }
    const results = localChatHistory.filter(msg => 
        msg.content && msg.content.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 50)
    if (results.length === 0) {
        searchResultList.innerHTML = '<div class="search-empty">暂无相关聊天记录</div>'
        return
    }
    searchResultList.innerHTML = results.map(msg => {
        const roleClass = msg.role === 'user' ? 'user' : 'ai'
        const roleText = msg.role === 'user' ? '你' : '莓莓'
        const highlightContent = msg.content.replace(
            new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
            '<span class="highlight">$&</span>'
        )
        const timeText = formatMessageTime(new Date(msg.time))
        return `
        <div class="search-result-item" data-time="${msg.time}" data-content="${encodeURIComponent(msg.content)}">
            <div class="result-role ${roleClass}"></div>
            <div class="result-content">${roleText}：${highlightContent}</div>
            <div class="result-time">${timeText}</div>
        </div>
        `
    }).join('')
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            jumpToMessage(item.dataset.time, item.dataset.content)
            searchModal.style.display = 'none'
        })
    })
})
function jumpToMessage(time, content) {
    const allMessages = document.querySelectorAll('.message')
    let target = null
    let minDiff = Infinity
    if (time) {
        allMessages.forEach(msg => {
            const msgTime = msg.dataset.time
            if (msgTime) {
                const diff = Math.abs(new Date(msgTime) - new Date(time))
                if (diff < minDiff) { minDiff = diff; target = msg }
            }
        })
    }
    if (!target && content) {
        const decodeContent = decodeURIComponent(content)
        const matchKey = decodeContent.slice(0, 8)
        allMessages.forEach(msg => {
            const bubbleText = msg.querySelector('.msg-bubble')?.textContent || ''
            if (bubbleText.includes(matchKey)) target = msg
        })
    }
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target.classList.add('highlight-target')
        setTimeout(() => target.classList.remove('highlight-target'), 2000)
    }
}

// ========== 页面初始化 ==========
window.addEventListener('DOMContentLoaded', () => {
    loadAvatarCache()
    // 读取本地聊天历史
    const history = JSON.parse(localStorage.getItem('chat_history') || '[]')
    if (history.length) {
        messageList.innerHTML = ''
        localChatHistory = []
        history.forEach(msg => {
            if (msg.role === 'user') {
                appendMessage('user', msg.content, msg.time)
            } else {
                if (msg.type === 'voice') {
                    appendVoiceMessage('ai', msg.content, msg.time, msg.emotion || '平静')
                } else {
                    appendMessage('ai', msg.content, msg.time)
                }
            }
        })
    }
    // 初始化长期记忆开关状态
    setLongMemory.checked = localStorage.getItem('long_memory_enable') === 'true'
})
