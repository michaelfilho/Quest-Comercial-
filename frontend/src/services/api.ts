export function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (
    typeof window !== 'undefined' &&
    (window.location.pathname === '/comercial' ||
      window.location.pathname.startsWith('/comercial/'))
  ) {
    return '/comercial/api/v1';
  }
  return '/api/v1';
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status: number, code = 'API_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiBase = getApiBaseUrl();
  const url = `${apiBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiClientError(
      data?.message || 'Erro ao processar requisição no servidor.',
      response.status,
      data?.error || 'API_ERROR'
    );
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'DELETE',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
};
