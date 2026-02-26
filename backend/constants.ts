const SUPPORTED_PROVIDERS = ['openai', 'gemini', 'claude', 'mistral', 'groq'] as const;
type Provider = typeof SUPPORTED_PROVIDERS[number];

module.exports = { SUPPORTED_PROVIDERS };
module.exports.SUPPORTED_PROVIDERS = SUPPORTED_PROVIDERS;
