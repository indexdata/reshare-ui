// Keep Stripes' session timers below the browser's signed 32-bit limit
// (~24.8 days). A fixed far-future expiry can trigger immediate logout.
const TTL_MS = 24 * 24 * 60 * 60 * 1000;

function expiry() {
  return new Date(Date.now() + TTL_MS).toISOString();
}

export default { expiry };
