const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

let currentAccessToken: string | null = null;
let refreshInFlight: Promise<string> | null = null;
let csrfToken: string | null = null;
let csrfTokenExpiresAt = 0;
let csrfInFlight: Promise<string> | null = null;

export const setAccessToken = (token: string | null) => {
  currentAccessToken = token;
};

export const getAccessToken = () => currentAccessToken;

async function getCsrfToken(): Promise<string> {
  if (csrfToken && csrfTokenExpiresAt > Date.now()) return csrfToken;

  if (!csrfInFlight) {
    csrfInFlight = (async () => {
      const response = await fetch(`${BASE_URL}/auth/csrf`, { credentials: 'include' });
      if (!response.ok) throw new Error('Token keamanan tidak dapat dibuat.');

      const payload = (await response.json()) as { data?: { csrfToken?: string } };
      const token = payload.data?.csrfToken;
      if (!token) throw new Error('Respons token keamanan tidak valid.');

      csrfToken = token;
      // The backend token has a 30-minute lifetime; refresh it before expiry.
      csrfTokenExpiresAt = Date.now() + 25 * 60 * 1000;
      return token;
    })();
  }

  try {
    return await csrfInFlight;
  } finally {
    csrfInFlight = null;
  }
}

/**
 * Uses a single shared refresh request for all callers. This prevents React
 * StrictMode and concurrent 401 responses from rotating one cookie twice.
 */
export async function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      });

      if (!response.ok) {
        throw new Error('Sesi tidak dapat diperbarui.');
      }

      const payload = (await response.json()) as { data?: { accessToken?: string } };
      const accessToken = payload.data?.accessToken;
      if (!accessToken) {
        throw new Error('Respons refresh token tidak valid.');
      }

      setAccessToken(accessToken);
      return accessToken;
    })();
  }

  try {
    return await refreshInFlight;
  } catch (error) {
    setAccessToken(null);
    throw error;
  } finally {
    refreshInFlight = null;
  }
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, headers = {}, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (requiresAuth && currentAccessToken) {
    finalHeaders['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  if (endpoint === '/auth/logout' || ['POST', 'PATCH', 'PUT', 'DELETE'].includes((rest.method ?? 'GET').toUpperCase())) {
    finalHeaders['X-CSRF-Token'] = await getCsrfToken();
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    credentials: 'include', // Ensures HttpOnly cookies (refresh_token) are sent
    headers: finalHeaders,
    ...rest,
  });

  // Handle 401 and attempt automatic token refresh
  if (response.status === 401 && requiresAuth && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
    try {
      const accessToken = await refreshAccessToken();

      // Retry once with the shared refreshed token; never retry a failed retry.
      finalHeaders['Authorization'] = `Bearer ${accessToken}`;
      const retryRes = await fetch(`${BASE_URL}${endpoint}`, {
        credentials: 'include',
        headers: finalHeaders,
        ...rest,
      });

      if (!retryRes.ok) {
        const errorData = await retryRes.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${retryRes.status}`);
      }
      return retryRes.json();
    } catch {
      // Refresh failed, clear token
      setAccessToken(null);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

