const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/pipeline/api';
const LOGIN_URL = '/pipeline/login?reason=session-expired';
let redirectingForExpiredSession = false;

export function clearExpiredSession(navigate = (url) => window.location.replace(url)) {
  localStorage.removeItem('user');
  if (!redirectingForExpiredSession && window.location.pathname !== '/pipeline/login') {
    redirectingForExpiredSession = true;
    navigate(LOGIN_URL);
  }
}

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
    if (response.status === 401 && path !== '/login') {
      clearExpiredSession();
    }
    const message = typeof body === 'string' ? body : body?.detail || body?.error || body?.message || response.statusText;
    const error = new Error(message);
    error.body = body;
    error.status = response.status;
    throw error;
  }

  return body;
}

export async function callBackend(path, method = 'GET', payload = undefined, headers = {}) {
  return apiRequest(path, {
    method,
    body: payload === undefined ? undefined : JSON.stringify(payload),
    headers,
  });
}

export default apiRequest;
