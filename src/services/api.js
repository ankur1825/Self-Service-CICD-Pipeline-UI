const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/pipeline/api';

function authHeaders() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
  } catch (error) {
    return {};
  }
}

export async function apiRequest(path, options = {}) {
  const { headers = {}, ...requestOptions } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...headers,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof body === 'string' ? body : body?.error || body?.message || response.statusText;
    const error = new Error(message);
    error.body = body;
    error.status = response.status;
    throw error;
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
