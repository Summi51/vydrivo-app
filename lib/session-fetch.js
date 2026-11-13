let refreshPromise = null;

async function csrfToken() {
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Could not prepare the request. Refresh the page and try again.');
  const payload = await response.json();
  return payload.data.csrfToken;
}

async function runRefresh() {
  try {
    const token = await csrfToken();
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: '{}',
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return payload?.data?.csrfToken || null;
  } catch {
    return null;
  }
}

function refreshToken() {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function refreshSession() {
  return Boolean(await refreshToken());
}

async function requestOnce(path, { method = 'GET', body, headers: customHeaders = {} } = {}, csrfOverride) {
  const headers = { ...customHeaders };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfOverride || await csrfToken();
  return fetch(path, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function apiRequest(path, options = {}) {
  const response = await requestOnce(path, options);
  if (response.status !== 401) return response;
  const csrf = await refreshToken();
  if (!csrf) return response;
  // Reuse the token issued with the refreshed cookies. Fetching another CSRF
  // token here would rotate the cookie and invalidate concurrent retries.
  return requestOnce(path, options, csrf);
}
