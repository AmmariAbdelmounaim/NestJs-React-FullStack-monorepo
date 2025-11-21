import axios, { AxiosError } from 'axios';

import { getAuthToken } from '@/features/auth/lib/auth-storage';

export const customInstance = <T>(
  config: string,
  options?: RequestInit,
): Promise<T> => {
  const source = axios.CancelToken.source();

  // Convert RequestInit to axios format
  const headers = new Headers(options?.headers);
  const token = getAuthToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const headerObject: Record<string, string> = {};
  headers.forEach((value, key) => {
    headerObject[key] = value;
  });

  const axiosConfig = {
    url: config,
    method: options?.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    headers: headerObject,
    data: options?.body,
  };

  const baseURL =
    import.meta.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';

  const promise = axios({
    ...axiosConfig,
    cancelToken: source.token,
    baseURL,
  }).then((response) => {
    // Orval expects a response object with data, status, and headers
    // Convert axios headers to Web API Headers format
    const headers = new Headers();
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value) {
        headers.set(
          key,
          Array.isArray(value) ? value.join(', ') : String(value),
        );
      }
    });

    return {
      data: response.data,
      status: response.status,
      headers,
    } as T;
  });

  // @ts-expect-error - cancel is added dynamically for React Query cancellation
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

// Default instance for direct axios usage if needed
export default customInstance;

// Error handling type
export type ErrorType<Error> = AxiosError<Error>;
