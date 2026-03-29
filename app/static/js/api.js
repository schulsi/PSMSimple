async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} fehlgeschlagen`);
  }
  return res.json();
}

async function apiSend(url, method, data) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const ct = res.headers.get('Content-Type') || '';

  if (!res.ok) {
    let message = `${method} ${url} fehlgeschlagen`;
    if (ct.includes('application/json')) {
      try {
        const body = await res.json();
        if (body.error) message = body.error;
      } catch {}
    }
    throw new Error(message);
  }

  if (ct.includes('application/json')) {
    return res.json();
  }

  return res;
}