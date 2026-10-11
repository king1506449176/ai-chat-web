exports.handler = async function(req) {
  // 跨域预检
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  }

  try {
    const { text } = await req.json()

    // 读取环境变量
    const TTS_URL = process.env.TTS_URL
    const TTS_API_KEY = process.env.TTS_API_KEY
    const TTS_VOICE = process.env.TTS_VOICE || 'zh_female_qingxin'

    if (!TTS_URL || !TTS_API_KEY) {
      console.error('缺少语音环境变量')
      return new Response('语音服务配置缺失', {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    }

    // 调用语音接口
    const ttsRes = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TTS_API_KEY}`
      },
      body: JSON.stringify({
        text: text,
        voice: TTS_VOICE,
        speed: 1.0,
        format: 'mp3'
      })
    })

    if (!ttsRes.ok) {
      console.error('语音合成失败，状态码：', ttsRes.status)
      return new Response('语音合成失败', {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    }

    // 返回音频流
    return new Response(ttsRes.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (e) {
    console.error('语音接口异常：', e)
    return new Response('服务器错误', {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  }
}
