import { useCallback, useState } from 'react';
import apiClient from '@/apiClient';

type ApiKeyStatus = Record<string, boolean>;

type UseApiKeysReturn = {
  apiKeys: ApiKeyStatus;
  loading: boolean;
  error: string | null;
  fetchApiKeys: () => Promise<void>;
  saveApiKey: (provider: string, apiKey: string) => Promise<void>;
  deleteApiKey: (provider: string) => Promise<void>;
};

const DEFAULT_PROVIDERS = ['openai', 'gemini', 'claude', 'mistral', 'groq'];

export function useApiKeys(): UseApiKeysReturn {
  const [apiKeys, setApiKeys] = useState<ApiKeyStatus>(() => {
    const initial: ApiKeyStatus = {};
    DEFAULT_PROVIDERS.forEach((p) => {
      initial[p] = false;
    });
    return initial;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/api-keys');
      const providers: string[] = response.data?.providers || [];
      const nextStatus: ApiKeyStatus = {};
      DEFAULT_PROVIDERS.forEach((p) => {
        nextStatus[p] = false;
      });
      providers.forEach((provider) => {
        if (Object.prototype.hasOwnProperty.call(nextStatus, provider)) {
          nextStatus[provider] = true;
        }
      });
      setApiKeys(nextStatus);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des clés API.');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveApiKey = useCallback(async (provider: string, apiKey: string) => {
    setError(null);
    try {
      await apiClient.post('/api/update-api-key', { provider, apiKey });
      setApiKeys((prev) => ({ ...prev, [provider]: true }));
    } catch (err) {
      console.error(err);
      setError(`Erreur lors de l'enregistrement de la clé ${provider.toUpperCase()}.`);
    }
  }, []);

  const deleteApiKey = useCallback(async (provider: string) => {
    setError(null);
    try {
      await apiClient.delete(`/api/api-keys/${provider}`);
      setApiKeys((prev) => ({ ...prev, [provider]: false }));
    } catch (err) {
      console.error(err);
      setError(`Erreur lors de la suppression de la clé ${provider.toUpperCase()}.`);
    }
  }, []);

  return {
    apiKeys,
    loading,
    error,
    fetchApiKeys,
    saveApiKey,
    deleteApiKey,
  };
}
