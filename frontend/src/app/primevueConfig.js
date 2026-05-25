export function getCspNonce() {
  return document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') || undefined;
}

export function getPrimeVueOptions() {
  const nonce = getCspNonce();

  return {
    unstyled: true,
    ...(nonce ? { csp: { nonce } } : {}),
  };
}
