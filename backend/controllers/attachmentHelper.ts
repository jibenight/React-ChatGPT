const { Blob } = require('buffer');

const parseAttachments = (value: any) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseDataUrl = (dataUrl: any) => {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
};

const detectAttachmentType = (mimeType: any) => {
  if (mimeType && mimeType.startsWith('image/')) return 'image';
  if (mimeType && mimeType.includes('pdf')) return 'document';
  if (mimeType && mimeType.startsWith('text/')) return 'document';
  return 'file';
};

const uploadGeminiAttachments = async (genAI: any, attachments: any[]) => {
  const results: any[] = [];
  for (const attachment of attachments) {
    if (!attachment) continue;
    if (attachment.fileUri) {
      results.push({
        id: attachment.id,
        name: attachment.name || null,
        mimeType: attachment.mimeType || null,
        type: attachment.type || detectAttachmentType(attachment.mimeType),
        fileUri: attachment.fileUri,
      });
      continue;
    }

    const parsed = parseDataUrl(attachment.dataUrl);
    if (!parsed?.base64) continue;
    const mimeType = attachment.mimeType || parsed.mimeType;
    const buffer = Buffer.from(parsed.base64, 'base64');
    const blob = new Blob([buffer], { type: mimeType });
    const file = await genAI.files.upload({
      file: blob,
      config: {
        mimeType,
        displayName: attachment.name || undefined,
      },
    });

    const resolvedFileUri =
      file.uri ||
      (file.name && file.name.startsWith('files/')
        ? `https://generativelanguage.googleapis.com/${file.name}`
        : file.name) ||
      null;

    results.push({
      id: attachment.id,
      name: attachment.name || file.displayName || file.name || null,
      mimeType: file.mimeType || mimeType || null,
      type: detectAttachmentType(file.mimeType || mimeType),
      fileUri: resolvedFileUri,
      sizeBytes: file.sizeBytes || null,
    });
  }

  return results.filter(item => item.fileUri);
};

exports.parseAttachments = parseAttachments;
exports.parseDataUrl = parseDataUrl;
exports.detectAttachmentType = detectAttachmentType;
exports.uploadGeminiAttachments = uploadGeminiAttachments;
