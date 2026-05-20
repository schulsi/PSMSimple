export function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

export async function apiGet(url) {
  const response = await fetch(url, {
    credentials: 'same-origin',
  });

  const contentType = response.headers.get('Content-Type') || '';
  if (!response.ok) {
    throw await parseApiError(response, `GET ${url} fehlgeschlagen`);
  }

  return contentType.includes('application/json') ? response.json() : response;
}

export async function apiSend(url, method, data = null) {
  const options = {
    method,
    credentials: 'same-origin',
    headers: {
      'X-CSRFToken': getCsrfToken(),
    },
  };

  if (data !== null) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const contentType = response.headers.get('Content-Type') || '';
  if (!response.ok) {
    throw await parseApiError(response, `${method} ${url} fehlgeschlagen`);
  }

  return contentType.includes('application/json') ? response.json() : response;
}

export function apiPost(url, data) {
  return apiSend(url, 'POST', data);
}

export function apiPut(url, data) {
  return apiSend(url, 'PUT', data);
}

export function apiDelete(url) {
  return apiSend(url, 'DELETE');
}

async function parseApiError(response, fallback) {
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return new Error(fallback);
  }

  const body = await response.json().catch(() => ({}));
  return new Error(body.error || fallback);
}
