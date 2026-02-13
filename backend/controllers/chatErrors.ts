const formatProviderErrorMessage = (raw: any) => {
  if (typeof raw !== 'string') return null;
  let message = raw.trim();
  if (!message) return null;

  if (message.startsWith('{') && message.endsWith('}')) {
    try {
      const parsed = JSON.parse(message);
      const parsedMessage = parsed?.error?.message;
      if (typeof parsedMessage === 'string' && parsedMessage.trim()) {
        message = parsedMessage;
      }
    } catch {
      // Keep original message when payload is not valid JSON.
    }
  }

  message = message.split('\n').map(part => part.trim()).filter(Boolean).join(' ');
  if (message.length > 350) {
    return `${message.slice(0, 347)}...`;
  }
  return message;
};

const resolveChatProviderError = (err: any) => {
  const candidates = [
    err?.response?.data?.error?.message,
    err?.response?.data?.error,
    err?.error?.message,
    err?.message,
  ];

  for (const candidate of candidates) {
    const formatted = formatProviderErrorMessage(candidate);
    if (formatted) return formatted;
  }

  return 'Internal server error';
};

exports.formatProviderErrorMessage = formatProviderErrorMessage;
exports.resolveChatProviderError = resolveChatProviderError;
