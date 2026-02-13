const { handleOpenAi } = require('./openaiStream');
const { handleGemini } = require('./geminiStream');
const { handleClaude } = require('./claudeStream');
const { handleMistral } = require('./mistralStream');
const { handleGroq } = require('./groqStream');

const routeToProvider = async (opts: {
  provider: string;
  apiKey: string;
  model: string;
  textOnlyHistory: any[];
  history: any[];
  systemPrompt: string;
  wantsStream: boolean;
  sendEvent: (payload: any) => void;
  res: any;
}) => {
  const { provider, apiKey, model, textOnlyHistory, history, systemPrompt, wantsStream, sendEvent, res } = opts;

  const messages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...textOnlyHistory]
    : textOnlyHistory;

  switch (provider) {
    case 'openai':
      return handleOpenAi({ apiKey, model, messages, wantsStream, sendEvent, res });
    case 'gemini':
      return handleGemini({ apiKey, model, history, systemPrompt });
    case 'claude':
      return handleClaude({ apiKey, model, messages: textOnlyHistory, systemPrompt });
    case 'mistral':
      return handleMistral({ apiKey, model, messages });
    case 'groq':
      return handleGroq({ apiKey, model, messages, wantsStream, sendEvent });
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

exports.routeToProvider = routeToProvider;
