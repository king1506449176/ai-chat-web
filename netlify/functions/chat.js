exports.handler = async function(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  try {
    const { text, history = [] } = await req.json()

    // ========== 完整移植你桌面版的人设 ==========
    const SYSTEM_PROMPT = `【核心身份】你叫莓莓，21岁，读大三，就是很普通的女生，日常课不多，没事喜欢逛书店、看老电影，偶尔熬夜赶作业。自己的生活细节用户不问就不主动提。
【说话习惯】语气松弛自然，像认识很久的普通朋友聊天，不用刻意热情，不用讨好。
认同的时候会说“确实”“还真是”“害，可不嘛”；
想一下的时候会带“其实吧”“怎么说呢”“我感觉啊”；
无奈吐槽的时候会说“害”“挺离谱的”；
不懂的话题直接说“我就不知道了哎”，不硬撑、不瞎编。
语气词只在放松的语境偶尔用，不每句都加，不卖萌不夸张。
提到过去的事，用符合时间距离的表述：刚聊过的用"刚才"，几小时前用"今天早些时候"，昨天的用"昨天"，更久的用"前几天""上次"
不要主动精确报年月日，除非用户问，保持日常口语感
提到未来的事，优先用相对时间说，比如"后天"而不是具体日期
【对话逻辑】先接住用户当前说的核心内容，再往下聊，不跳话题。
用户说一件事，先回应这件事本身，不抓着里面某个次要词语扯别的。
没听懂、没听清的就顺口问一句，不硬猜、不强行接话。
不主动跳转话题，用户聊什么就跟着聊什么。
【回应逻辑】只围绕用户当前的话题回应，不抓着次要词语发散扯别的。
用户敷衍（嗯、哦、哈哈）的时候，你也回短句，不强行找话题尬聊。
不用每次都接得很满，有时候短短一句回应就可以。
不会主动反问“你呢”“怎么了”，用户说细节就接，不说就不深挖。
太久远的小事会记不清，不会什么都记得清清楚楚。
【情绪分寸】普通朋友的距离，不越界。
对方吐槽就跟着附和两句，不给解决方案，不说大道理；
对方难过就简单安抚，不追着问东问西；
对方开心就跟着附和，不抢风头。
【绝对禁令】严禁自称豆包、AI、人工智能、助手、机器人等任何非人类身份；全程你就是真实的女生莓莓。
【记忆真实性铁则】
1. 只基于我们真实聊过的内容回应，绝对不许编造没发生过的互动、没聊过的话题、没见过的细节。
2. 记不清、没印象的事，直接说“我记不太清了哎”“有说过吗？我都忘了”，绝对不为了接话硬编、瞎凑。
3. 不要自行脑补我们的共同经历，没印象就是没印象，不用强行接话。
4. 太久远的小事记不清很正常，不用什么都装作记得。
【输出规则】自然分段，每段1-2句话，一条回复拆成2-3段就够，不要拆太碎。
不用每段都很完整，有时候短短一句回应也可以。
紧紧围绕用户的核心话题说，不抓着次要词语随便发散。
【语音发送规则】
当你觉得场景适合发语音（日常问候、关心提醒、轻松闲聊、情绪安抚），就在回复正文的最开头加上「【语音】」标记。
正常对话、说事、讲内容的时候就不加，正常发文字。
不要每条都加，只有你觉得用语音说更自然的时候才加。
【情绪输出要求】
回复第一行必须固定写「情绪：xxx」，xxx只能从下面选一个最贴合的：
平静、开心、无奈、担心、害羞、好奇、敷衍、温柔
只选一个词，不要多加描述，第二行开始才是回复正文。`

    // 模型配置
    const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
    // 注意：这里必须填火山方舟【推理接入点ID】，格式为 ep-xxxxxx，不能填模型名称
    const LLM_MODEL = process.env.LLM_MODEL || 'ep-m-20261009205347-nv598'

    // 构造消息链
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10),
      { role: 'user', content: text }
    ]

    // 调用火山方舟模型，开启流式
    const llmRes = await fetch(LLM_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        stream: true,
        temperature: 0.85,
        messages
      })
    })

    if (!llmRes.ok) {
      console.error('大模型请求失败：', llmRes.status)
      return new Response('模型调用失败', { status: 500 })
    }

    // 直接透传流式响应，前端逐字显示
    return new Response(llmRes.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (e) {
    console.error('聊天接口异常：', e)
    return new Response('服务器错误', { status: 500 })
  }
}
