const handleGroq = async ({ apiKey, model, messages, wantsStream, sendEvent }) => {
  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: wantsStream }),
  });

  if (!groqRes.ok) {
    const errBody = await groqRes.text();
    throw new Error(`Groq API error ${groqRes.status}: ${errBody}`);
  }

  let reply = '';

  if (wantsStream) {
    const reader = (groqRes.body as any).getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.replace(/^data:\s*/, '');
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            reply += delta;
            sendEvent({ type: 'delta', content: delta });
          }
        } catch { /* skip malformed SSE chunks */ }
      }
    }
  } else {
    const data = await groqRes.json();
    reply = data.choices[0].message.content;
  }

  return reply;
};

exports.handleGroq = handleGroq;
