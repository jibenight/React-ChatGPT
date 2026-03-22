const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data: { error?: string } = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data?.error || res.statusText), { status: res.status, data });
  }
  return res.json() as Promise<T>;
}
