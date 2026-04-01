async function apiGet(url) {
  const res = await fetch(url, {
    credentials: 'same-origin'
  });

  const contentType = res.headers.get('Content-Type') || '';

  if (!res.ok) {
    let message = `GET ${url} fehlgeschlagen`;
    if (contentType.includes('application/json')) {
      try {
        const body = await res.json();
        if (body.error) message = body.error;
      } catch (_) {}
    }
    throw new Error(message);
  }

  if (contentType.includes('application/json')) {
    return res.json();
  }

  return res;
}

async function apiSend(url, method, data = null) {
  const options = {
    method,
    credentials: 'same-origin',
    headers: {}
  };

  if (data !== null) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  const res = await fetch(url, options);
  const contentType = res.headers.get('Content-Type') || '';

  if (!res.ok) {
    let message = `${method} ${url} fehlgeschlagen`;
    if (contentType.includes('application/json')) {
      try {
        const body = await res.json();
        if (body.error) message = body.error;
      } catch (_) {}
    }
    throw new Error(message);
  }

  if (contentType.includes('application/json')) {
    return res.json();
  }

  return res;
}

async function apiPost(url, data) {
  return apiSend(url, 'POST', data);
}

async function apiPut(url, data) {
  return apiSend(url, 'PUT', data);
}

async function apiDelete(url) {
  return apiSend(url, 'DELETE');
}