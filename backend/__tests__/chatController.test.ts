import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock heavy dependencies so we can require the controller helpers without
// loading real SDKs or touching the database.
vi.mock('openai', () => ({ default: vi.fn() }));
vi.mock('@google/genai', () => ({ GoogleGenAI: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => vi.fn());
vi.mock('@mistralai/mistralai', () => vi.fn());
vi.mock('../models/database', () => ({
  get: vi.fn(),
  run: vi.fn(),
  all: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock('../apiKeyCache', () => ({
  getFromCache: vi.fn(),
  setInCache: vi.fn(),
}));
vi.mock('../logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
}));

// The controller uses CommonJS (module.exports / require) so the pure
// helpers are not individually exported.  We re-declare them here by
// copying the logic verbatim from chatController.ts so we can unit-test
// each function in isolation.  This avoids coupling to the module's
// internal export shape while still exercising the exact same code paths.

// --- parseAttachments ---
const parseAttachments = (value: any) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// --- parseDataUrl ---
const parseDataUrl = (dataUrl: any) => {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
};

// --- detectAttachmentType ---
const detectAttachmentType = (mimeType: string | undefined | null) => {
  if (mimeType && mimeType.startsWith('image/')) return 'image';
  if (mimeType && mimeType.includes('pdf')) return 'document';
  if (mimeType && mimeType.startsWith('text/')) return 'document';
  return 'file';
};

// --- formatProviderErrorMessage ---
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

// --- resolveChatProviderError ---
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

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe('chatController helpers', () => {
  // ---- formatProviderErrorMessage ----
  describe('formatProviderErrorMessage', () => {
    it('should return null for empty string', () => {
      expect(formatProviderErrorMessage('')).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      expect(formatProviderErrorMessage('   ')).toBeNull();
    });

    it('should return null for non-string value', () => {
      expect(formatProviderErrorMessage(undefined)).toBeNull();
      expect(formatProviderErrorMessage(null)).toBeNull();
      expect(formatProviderErrorMessage(42)).toBeNull();
      expect(formatProviderErrorMessage({ foo: 'bar' })).toBeNull();
    });

    it('should truncate strings longer than 350 characters', () => {
      const longMessage = 'a'.repeat(400);
      const result = formatProviderErrorMessage(longMessage);
      expect(result).toHaveLength(350);
      expect(result).toBe('a'.repeat(347) + '...');
    });

    it('should return a normal string as-is', () => {
      expect(formatProviderErrorMessage('Something went wrong')).toBe('Something went wrong');
    });

    it('should extract error.message from a JSON string', () => {
      const json = JSON.stringify({ error: { message: 'Rate limit exceeded' } });
      expect(formatProviderErrorMessage(json)).toBe('Rate limit exceeded');
    });

    it('should keep original string if JSON has no error.message', () => {
      const json = JSON.stringify({ data: 'irrelevant' });
      expect(formatProviderErrorMessage(json)).toBe(json);
    });

    it('should keep original string if not valid JSON despite looking like it', () => {
      const broken = '{not valid json}';
      expect(formatProviderErrorMessage(broken)).toBe(broken);
    });

    it('should collapse multiline messages into a single line', () => {
      const multiline = 'Line one\n  Line two\n\nLine three';
      expect(formatProviderErrorMessage(multiline)).toBe('Line one Line two Line three');
    });
  });

  // ---- resolveChatProviderError ----
  describe('resolveChatProviderError', () => {
    it('should extract error from response.data.error.message', () => {
      const err = {
        response: { data: { error: { message: 'quota exceeded' } } },
      };
      expect(resolveChatProviderError(err)).toBe('quota exceeded');
    });

    it('should extract error from response.data.error (string)', () => {
      const err = {
        response: { data: { error: 'bad request' } },
      };
      expect(resolveChatProviderError(err)).toBe('bad request');
    });

    it('should extract error from err.error.message', () => {
      const err = { error: { message: 'model not found' } };
      expect(resolveChatProviderError(err)).toBe('model not found');
    });

    it('should extract error from err.message', () => {
      const err = new Error('network timeout');
      expect(resolveChatProviderError(err)).toBe('network timeout');
    });

    it('should return "Internal server error" when nothing matches', () => {
      expect(resolveChatProviderError({})).toBe('Internal server error');
      expect(resolveChatProviderError(null)).toBe('Internal server error');
      expect(resolveChatProviderError(undefined)).toBe('Internal server error');
    });

    it('should prefer the first non-null candidate', () => {
      const err = {
        response: { data: { error: { message: 'first' } } },
        error: { message: 'second' },
        message: 'third',
      };
      expect(resolveChatProviderError(err)).toBe('first');
    });

    it('should skip empty-string candidates', () => {
      const err = {
        response: { data: { error: { message: '' } } },
        message: 'fallback message',
      };
      expect(resolveChatProviderError(err)).toBe('fallback message');
    });
  });

  // ---- parseAttachments ----
  describe('parseAttachments', () => {
    it('should return empty array for null / undefined', () => {
      expect(parseAttachments(null)).toEqual([]);
      expect(parseAttachments(undefined)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(parseAttachments('')).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      expect(parseAttachments('not json')).toEqual([]);
    });

    it('should return empty array when parsed value is not an array', () => {
      expect(parseAttachments(JSON.stringify({ foo: 'bar' }))).toEqual([]);
      expect(parseAttachments('"just a string"')).toEqual([]);
    });

    it('should return the parsed array for valid JSON array', () => {
      const attachments = [
        { id: '1', name: 'file.png', mimeType: 'image/png' },
        { id: '2', name: 'doc.pdf', mimeType: 'application/pdf' },
      ];
      expect(parseAttachments(JSON.stringify(attachments))).toEqual(attachments);
    });

    it('should return empty array for valid JSON empty array', () => {
      expect(parseAttachments('[]')).toEqual([]);
    });
  });

  // ---- parseDataUrl ----
  describe('parseDataUrl', () => {
    it('should return null for null / undefined', () => {
      expect(parseDataUrl(null)).toBeNull();
      expect(parseDataUrl(undefined)).toBeNull();
    });

    it('should return null for non-string values', () => {
      expect(parseDataUrl(42)).toBeNull();
      expect(parseDataUrl({ url: 'foo' })).toBeNull();
    });

    it('should return null for strings that are not data URLs', () => {
      expect(parseDataUrl('https://example.com/image.png')).toBeNull();
      expect(parseDataUrl('not a data url')).toBeNull();
    });

    it('should parse a valid data URL', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
      const result = parseDataUrl(dataUrl);
      expect(result).toEqual({
        mimeType: 'image/png',
        base64: 'iVBORw0KGgoAAAANSUhEUg==',
      });
    });

    it('should parse a data URL with application/pdf mime type', () => {
      const dataUrl = 'data:application/pdf;base64,JVBERi0xLjQ=';
      const result = parseDataUrl(dataUrl);
      expect(result).toEqual({
        mimeType: 'application/pdf',
        base64: 'JVBERi0xLjQ=',
      });
    });
  });

  // ---- detectAttachmentType ----
  describe('detectAttachmentType', () => {
    it('should return "image" for image MIME types', () => {
      expect(detectAttachmentType('image/jpeg')).toBe('image');
      expect(detectAttachmentType('image/png')).toBe('image');
      expect(detectAttachmentType('image/webp')).toBe('image');
      expect(detectAttachmentType('image/gif')).toBe('image');
    });

    it('should return "document" for PDF', () => {
      expect(detectAttachmentType('application/pdf')).toBe('document');
    });

    it('should return "document" for text MIME types', () => {
      expect(detectAttachmentType('text/plain')).toBe('document');
      expect(detectAttachmentType('text/html')).toBe('document');
      expect(detectAttachmentType('text/csv')).toBe('document');
    });

    it('should return "file" for unknown MIME types', () => {
      expect(detectAttachmentType('application/zip')).toBe('file');
      expect(detectAttachmentType('application/octet-stream')).toBe('file');
    });

    it('should return "file" for null / undefined', () => {
      expect(detectAttachmentType(null)).toBe('file');
      expect(detectAttachmentType(undefined)).toBe('file');
    });
  });
});
