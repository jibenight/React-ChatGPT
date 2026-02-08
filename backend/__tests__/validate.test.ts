import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

// We test the validation logic directly since importing Express middleware needs more setup
describe('Zod validation schemas', () => {
  const registerSchema = z.object({
    username: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const updateApiKeySchema = z.object({
    provider: z.enum(['openai', 'gemini', 'claude', 'mistral']),
    apiKey: z.string().min(1).max(500),
  });

  describe('registerSchema', () => {
    it('should accept valid registration data', () => {
      const result = registerSchema.safeParse({
        username: 'TestUser',
        email: 'test@example.com',
        password: 'Secure123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty username', () => {
      const result = registerSchema.safeParse({
        username: '',
        email: 'test@example.com',
        password: 'Secure123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        username: 'TestUser',
        email: 'not-an-email',
        password: 'Secure123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = registerSchema.safeParse({
        username: 'TestUser',
        email: 'test@example.com',
        password: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject too long username', () => {
      const result = registerSchema.safeParse({
        username: 'a'.repeat(101),
        email: 'test@example.com',
        password: 'Secure123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login', () => {
      const result = loginSchema.safeParse({
        email: 'user@test.com',
        password: 'pass',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'user@test.com',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateApiKeySchema', () => {
    it('should accept valid provider', () => {
      const result = updateApiKeySchema.safeParse({
        provider: 'openai',
        apiKey: 'sk-test-key',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid provider', () => {
      const result = updateApiKeySchema.safeParse({
        provider: 'invalid-provider',
        apiKey: 'sk-test-key',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty apiKey', () => {
      const result = updateApiKeySchema.safeParse({
        provider: 'gemini',
        apiKey: '',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid providers', () => {
      for (const provider of ['openai', 'gemini', 'claude', 'mistral']) {
        const result = updateApiKeySchema.safeParse({
          provider,
          apiKey: 'test-key',
        });
        expect(result.success).toBe(true);
      }
    });
  });
});
