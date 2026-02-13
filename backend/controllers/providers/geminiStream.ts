const { GoogleGenAI } = require('@google/genai');

const handleGemini = async ({ apiKey, model, history, systemPrompt }) => {
  const genAI = new GoogleGenAI({ apiKey });
  const contents: any[] = [];

  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
  }

  history.forEach((entry: any) => {
    const parts: any[] = [];
    if (entry.content) parts.push({ text: entry.content });
    if (entry.role === 'user' && Array.isArray(entry.attachments)) {
      entry.attachments.forEach((att: any) => {
        if (!att?.fileUri) return;
        const fileUri =
          typeof att.fileUri === 'string' && att.fileUri.startsWith('files/')
            ? `https://generativelanguage.googleapis.com/${att.fileUri}`
            : att.fileUri;
        parts.push({ fileData: { fileUri, mimeType: att.mimeType || undefined } });
      });
    }
    if (parts.length === 0) return;
    contents.push({ role: entry.role === 'assistant' ? 'model' : 'user', parts });
  });

  const response = await genAI.models.generateContent({ model, contents });
  return response.text || '';
};

exports.handleGemini = handleGemini;
