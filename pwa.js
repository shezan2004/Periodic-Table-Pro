export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // Avoid noisy errors in file:// and unsupported contexts.
  if (!window.isSecureContext && !location.hostname.includes('localhost')) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // Registration failures are non-fatal for app functionality.
    });
  });
}
