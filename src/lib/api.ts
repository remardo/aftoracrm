import supabase from './supabase';

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Ошибка ${res.status}`;
    try { const e = await res.json(); msg = e.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T = any>(p: string) => request<T>(p),
  post: <T = any>(p: string, body?: any) => request<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(p: string, body?: any) => request<T>(p, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T = any>(p: string, body?: any) => request<T>(p, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};
