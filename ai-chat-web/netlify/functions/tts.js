export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { text, emotion = '平静' } = await req.json()

    // 和桌面版一致：过滤括号内的情绪描述，不送入合成
    const synthText = text
      .replace(/（[^）]*）|\([^)]*\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (!synthText) {
      return new Response('文本为空', { status: 400 })
    }

    // TTS配置（和你桌面版完全对应）
    const TTS_URL = process.env.TTS_URL || 'https://openspeech.bytedance.com/api/v3/tts/unidirectional'
    const TTS_SPEAKER = process.env.TTS_SPEAKER || 'zh_female_xiaohe_uranus_bigtts'
    const TTS_RESOURCE_ID = process.env.TTS_RESOURCE_ID || 'seed-tts-2.0'

    const requestId = Math.random().toString(36).slice(2) + Date.now().toString(36)
    const ttsRes = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.TTS_API_KEY,
        'X-Api-Resource-Id': TTS_RESOURCE_ID,
        'X-Api-Request-Id': requestId
      },
      body: JSON.stringify({
        req_params: {
          text: synthText,
          speaker: TTS_SPEAKER,
          audio_params: {
            format: 'mp3',
            sample_rate: 24000,
            speech_rate: 0.9,
            emotion: emotion
          }
        }
      })
    })

    if (!ttsRes.ok) {
      console.error('TTS HTTP错误：', ttsRes.status)
      return new Response('语音合成失败', { status: 500 })
    }

    // 解析流式返回，拼接音频
    const rawText = await ttsRes.text()
    const lines = rawText.split('\n').filter(line => line.trim())
    let audioBase64 = ''

    for (const line of lines) {
      try {
        const chunk = JSON.parse(line.trim())
        // code=0：音频数据分片，累加
        if (chunk.code === 0 && chunk.data) {
          audioBase64 += chunk.data.replace(/\s/g, '')
        }
        // code=20000000：正常结束（7个0，和你接口对应）
        else if (chunk.code === 20000000) {
          break
        }
        // 其他code为业务错误
        else if (chunk.code) {
          console.error('TTS业务错误：', chunk.message, chunk.code)
          return new Response('语音合成失败', { status: 500 })
        }
      } catch (e) {
        continue
      }
    }

    if (audioBase64.length < 100) {
      return new Response('音频数据为空', { status: 500 })
    }

    // base64转二进制返回
    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400'
      }
    })

  } catch (e) {
    console.error('TTS接口异常：', e)
    return new Response('语音合成失败', { status: 500 })
  }
}
