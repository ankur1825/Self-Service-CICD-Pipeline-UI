const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/pipeline/api';

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof body === 'string' ? body : body?.error || body?.message || response.statusText;
    throw new Error(message);
  }

  return body;
}

export async function callBackend(path, method = 'GET', payload = undefined) {
  return apiRequest(path, {
    method,
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

export default apiRequest;
