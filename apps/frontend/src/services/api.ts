const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

let currentAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  currentAccessToken = token;
};

export const getAccessToken = () => currentAccessToken;

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

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    credentials: 'include', // Ensures HttpOnly cookies (refresh_token) are sent
    headers: finalHeaders,
    ...rest,
  });

  // Handle 401 and attempt automatic token refresh
  if (response.status === 401 && requiresAuth && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setAccessToken(refreshData.data.accessToken);

        // Retry original request with new token
        finalHeaders['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
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
      }
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

