const OpenAI = require('openai').default;

const streamOpenAi = async ({ client, model, messages, onDelta, onComplete, onError, signal }) => {
  const stream = await client.chat.completions.create({ model, messages, stream: true });
  try {
    for await (const chunk of stream) {
      if (signal?.aborted) {
        stream.controller?.abort();
        break;
      }
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) onDelta?.(delta);
    }
    onComplete?.();
  } catch (err) {
    onError?.(err);
  }
};

const handleOpenAi = async ({ apiKey, model, messages, wantsStream, sendEvent, res }) => {
  const client = new OpenAI({ apiKey });
  let reply = '';

  if (wantsStream) {
    const abortController = new AbortController();
    res.on('close', () => abortController.abort());
    await streamOpenAi({
      client,
      model,
      messages,
      signal: abortController.signal,
      onDelta: (delta) => {
        reply += delta;
        sendEvent({ type: 'delta', content: delta });
      },
      onComplete: () => {},
      onError: (err) => {
        sendEvent({ type: 'error', error: err?.message || 'Stream error' });
      },
    });
  } else {
    const response = await client.chat.completions.create({ model, messages });
    reply = response.choices[0].message.content;
  }

  return reply;
};

exports.handleOpenAi = handleOpenAi;
