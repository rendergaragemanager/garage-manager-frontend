const API_URL = import.meta.env.VITE_API_URL;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let csrfToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setCsrfToken(nextCsrfToken: string | null) {
  csrfToken = nextCsrfToken;
}

export function getCsrfToken() {
  return csrfToken;
}

// el callback que se ejecutará cuando la sesión expire (401)
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const method = (options?.method ?? 'GET').toUpperCase();

  if (
    !headers.has('Content-Type') &&
    options?.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json');
  }

  if (!SAFE_METHODS.has(method) && csrfToken && !headers.has('X-CSRF-Token')) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  let data: unknown = null;

  try {
    data = await res.json();
  } catch {
    // respuesta vacía
  }

  if (!res.ok) {
    // Sesión caducada o inexistente: limpiar estado y redirigir a login
    if (res.status === 401) {
      setCsrfToken(null);
      onUnauthorized?.();
    }

    throw new ApiError(
      (data as { message?: string })?.message || 'Error en la petición',
      res.status,
    );
  }

  return data as T;
}
