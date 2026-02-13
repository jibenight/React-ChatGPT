const Anthropic = require('@anthropic-ai/sdk');

const handleClaude = async ({ apiKey, model, messages, systemPrompt }) => {
  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt || undefined,
    messages,
  });
  return msg.content[0].text;
};

exports.handleClaude = handleClaude;
