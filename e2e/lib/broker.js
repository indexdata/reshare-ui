// Captive API primitives, shared by Playwright and bin/brkr via CommonJS.

// These calls reach the broker directly, with a bare tenant header and no
// login, which only the captive stack allows.
if (process.env.E2E_USERNAME) throw new Error('lib/broker.js is for the captive stack only; name the spec *.captive.spec.ts');

const BROKER = process.env.E2E_BROKER_URL ?? 'http://localhost:8080';
const ILLMOCK = process.env.E2E_ILLMOCK_URL ?? 'http://localhost:8081';
const UI = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const PEER_UI = process.env.E2E_PEER_BASE_URL ?? 'http://localhost:3002';
const TENANT = process.env.E2E_TENANT ?? 'test1';
// The in-broker peer moves only when driven; illmock answers automatically.
const PEER_TENANT = process.env.E2E_PEER_TENANT ?? 'test2';
const ILLMOCK_SYMBOL = process.env.E2E_ILLMOCK_SYMBOL ?? 'ISIL:US-MOCK';
// mirrors the symbols seed/directory.json gives each tenant's institution
const symbolOf = (tenant) => `ISIL:US-${tenant.toUpperCase()}`;

const bare = (symbol) => symbol.slice(symbol.indexOf(':') + 1);
const authority = (symbol) => symbol.slice(0, symbol.indexOf(':'));

async function broker(path, { method = 'GET', json, tenant = TENANT } = {}) {
  const res = await fetch(`${BROKER}${path}`, {
    method,
    headers: { 'X-Okapi-Tenant': tenant, ...(json && { 'Content-Type': 'application/json' }) },
    body: json && JSON.stringify(json),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// supplier: 'illmock' or a tenant. scenario selects illmock's automatic replies.
async function createBorrowing({
  tenant = TENANT, supplier = 'illmock', scenario = 'LOANED', serviceType = 'Loan', title = 'E2E request', patron = 'e2e-patron', note = '',
} = {}) {
  const supplierSymbol = supplier === 'illmock' ? ILLMOCK_SYMBOL : symbolOf(supplier);
  // the token carries the bare agency value, without the authority
  const mockToken = supplier === 'illmock' ? `MOCK:${bare(supplierSymbol)}:${scenario}` : '';
  const created = await broker('/patron_requests', {
    tenant,
    method: 'POST',
    json: {
      illRequest: {
        // return-<symbol>::<id> is what the mock holdings lookup resolves to a supplier
        bibliographicInfo: { title, supplierUniqueRecordId: `return-${supplierSymbol}::${Date.now()}` },
        serviceInfo: { serviceType, note: `${mockToken} ${note}`.trim() },
      },
      patron,
      requesterSymbol: symbolOf(tenant),
    },
  });
  return handle(created.id, 'borrowing', tenant);
}

// Return the lender handle plus the in-broker requester's handle as `peer`.
// requester='illmock' instead uses requester flags in note (#RENEW#, etc.).
async function createLending({ tenant = TENANT, requester = PEER_TENANT, serviceType = 'Loan', title = 'E2E request', note = '' } = {}) {
  let reqId;
  let peer;
  if (requester === 'illmock') {
    reqId = `e2e-${Date.now()}`;
    await illmockRequest({ reqId, supplierSymbol: symbolOf(tenant), serviceType, title, note });
  } else {
    peer = await createBorrowing({ tenant: requester, supplier: tenant, serviceType, title, note });
    reqId = peer.id;
  }
  const found = await poll(async () => {
    const list = await broker(`/patron_requests?side=lending&requester_req_id=${encodeURIComponent(reqId)}`, { tenant });
    return list.items?.[0];
  }, 15_000, `lending request for ${reqId}`);
  return { ...handle(found.id, 'lending', tenant), ...(peer && { peer }) };
}

async function illmockRequest({ reqId, supplierSymbol, serviceType, title, note }) {
  const xmlText = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[char]);
  const agency = (tag, symbol) => `<${tag}><agencyIdType>${xmlText(authority(symbol))}</agencyIdType>` +
    `<agencyIdValue>${xmlText(bare(symbol))}</agencyIdValue></${tag}>`;
  const xml = '<ISO18626Message xmlns="http://illtransactions.org/2013/iso18626" version="1.2"><request>' +
    `<header>${agency('supplyingAgencyId', supplierSymbol)}${agency('requestingAgencyId', ILLMOCK_SYMBOL)}` +
    `<timestamp>${new Date().toISOString()}</timestamp><requestingAgencyRequestId>${xmlText(reqId)}</requestingAgencyRequestId></header>` +
    `<bibliographicInfo><supplierUniqueRecordId>${xmlText(`return-${supplierSymbol}::${reqId}`)}</supplierUniqueRecordId><title>${xmlText(title)}</title></bibliographicInfo>` +
    // the PatronRequest subtype is what makes illmock originate this rather than supply it
    `<serviceInfo><requestType>New</requestType><requestSubType>PatronRequest</requestSubType><serviceType>${xmlText(serviceType)}</serviceType><note>${xmlText(note)}</note></serviceInfo>` +
    '</request></ISO18626Message>';
  const res = await fetch(`${ILLMOCK}/iso18626`, { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: xml });
  if (!res.ok) throw new Error(`illmock request -> ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

// What identifies a request to every other call.
function handle(id, side, tenant) {
  return { id, side, ...(tenant !== TENANT && { tenant }), url: requestUrl(id, side, tenant) };
}

// Just enough to decide the next call: where it is and what can be done.
async function getState(id, side, tenant = TENANT) {
  const [pr, actions] = await Promise.all([
    broker(`/patron_requests/${id}?side=${side}`, { tenant }),
    broker(`/patron_requests/${id}/actions?side=${side}`, { tenant }),
  ]);
  return {
    ...handle(id, side, tenant),
    state: pr.state,
    terminal: Boolean(pr.terminalState),
    actions: (actions.actions ?? []).filter((a) => a.available !== false)
      .map((a) => (a.parameters?.length ? `${a.name}(${a.parameters.join(',')})` : a.name)),
  };
}

async function act(id, side, action, actionParams, tenant = TENANT) {
  const result = await broker(`/patron_requests/${id}/action?side=${side}`, {
    tenant,
    method: 'POST',
    json: { action, ...(actionParams && { actionParams }) },
  });
  // a failed action is still a 200
  if (result?.outcome !== 'success') throw new Error(`${action} on ${id}: ${result?.outcome} — ${result?.message}`);
  return getState(id, side, tenant);
}

// Peer messages arrive asynchronously, so anything after create or act that
// depends on the peer goes through here rather than a sleep.
async function waitFor(id, side, states, { timeoutMs = 20_000, tenant = TENANT } = {}) {
  const wanted = [].concat(states);
  let last;
  await poll(async () => {
    last = await getState(id, side, tenant);
    if (last.terminal && !wanted.includes(last.state)) {
      throw new Error(`${id} ended in ${last.state} while waiting for ${wanted.join('|')}`);
    }
    return wanted.includes(last.state);
  }, timeoutMs, () => `${id} to reach ${wanted.join('|')} (now ${last?.state})`);
  return last;
}

function requestUrl(id, side, tenant = TENANT) {
  const ui = tenant === TENANT ? UI : PEER_UI;
  return `${ui}/${side === 'lending' ? 'supply' : 'request'}/requests/${id}`;
}

async function poll(fn, timeoutMs, what) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await fn();
    if (result) return result;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${typeof what === 'function' ? what() : what}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

module.exports = { createBorrowing, createLending, getState, act, waitFor, requestUrl };
