// Health check only: fail fast with a useful message if the captive stack
// isn't up. Does not start or stop anything — see README, "Stack lifecycle".
const okapiUrl = process.env.E2E_OKAPI_URL ?? 'http://localhost:9130';
const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

async function check(url: string, what: string) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch (e) {
    throw new Error(`${what} is not responding at ${url} — is the stack up? Run: yarn stack:up (${e})`);
  }
  if (!res.ok) {
    throw new Error(`${what} at ${url} returned ${res.status} — check the stack: yarn stack:health`);
  }
}

export default async function globalSetup() {
  // With E2E_USERNAME set the target is an existing system (real Okapi,
  // real login): only its UI origin is ours to probe.
  if (!process.env.E2E_USERNAME) {
    await check(`${okapiUrl}/saml/check`, 'mock-okapi (nginx)');
    await check(`${okapiUrl}/broker/patron_requests?limit=1`, 'broker (via mock-okapi proxy)');
    await check(`${okapiUrl}/directory/entries/owned?limit=1`, 'directory (via mock-okapi proxy)');
    await check('http://localhost:9131/broker/patron_requests?limit=1', 'peer broker (via mock-okapi proxy)');
  }
  await check(`${baseUrl}/`, 'UI');
  if (!process.env.E2E_USERNAME || process.env.E2E_PEER_BASE_URL) {
    await check(`${process.env.E2E_PEER_BASE_URL ?? 'http://localhost:3002'}/`, 'peer UI');
  }
}
