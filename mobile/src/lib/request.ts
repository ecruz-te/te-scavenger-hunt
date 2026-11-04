/** A non-2xx backend response. `message` is the backend's `error` text. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Calls the backend and returns the JSON body, throwing an `ApiError` with the backend's `error` message on failure. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not set. Add it to mobile/.env.local.');
  }

  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error ?? `Request failed with status ${res.status}`, res.status);
  }
  return res.json();
}
