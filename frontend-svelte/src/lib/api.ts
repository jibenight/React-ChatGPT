export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)__csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const data: { error?: string } = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data?.error || res.statusText), { status: res.status, data });
  }
  return res.json() as Promise<T>;
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const csrf = getCsrfToken();
  if (csrf) headers['X-CSRF-Token'] = csrf;

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data: { error?: string } = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data?.error || res.statusText), { status: res.status, data });
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T = unknown>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const csrf = getCsrfToken();
  if (csrf) headers['X-CSRF-Token'] = csrf;

  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data: { error?: string } = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data?.error || res.statusText), { status: res.status, data });
  }
  return res.json() as Promise<T>;
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const csrf = getCsrfToken();
  if (csrf) headers['X-CSRF-Token'] = csrf;

  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers,
  });
  if (!res.ok) {
    const data: { error?: string } = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data?.error || res.statusText), { status: res.status, data });
  }
  return res.json() as Promise<T>;
}
