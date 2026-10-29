// stack-up.sh imports these fixtures; the list spec derives expectations from them.
// The title marker isolates them from other specs. Dates in 2025 keep them below
// newly created requests in the default newest-first sort.

export const owner = 'ISIL:US-TEST1';
export const marker = 'e2eseed';

// Borrowing spans two 100-row pages; lending only needs filter coverage.
const borrowingCount = 120;
const lendingCount = 12;

// record() converts these to broker imports: cost/unread flags become
// notifications; the broker derives terminal status from the state model.
export interface SeedRequest {
  side: 'borrowing' | 'lending';
  requesterRequestId: string;
  title: string;
  author: string;
  patronId: string;
  surname: string;
  givenName: string;
  state: string;
  terminal: boolean;
  serviceType: 'Loan' | 'Copy';
  serviceLevel: string;
  createdAt: string;
  neededAt?: string;
  isbn?: string;
  issn?: string;
  barcode?: string;
  itemId?: string;
  callNumber?: string;
  peer?: string;
  needsAttention: boolean;
  internalNote?: string;
  hasCost: boolean;
  unread: boolean;
}

const borrowingStates = [
  'NEW', 'VALIDATED', 'SENT', 'WILL_SUPPLY', 'SHIPPED', 'RECEIVED',
  'OVERDUE', 'SHIPPED_RETURNED', 'COMPLETED', 'CANCELLED', 'UNFILLED', 'MANUALLY_CLOSED',
];
const lendingStates = ['NEW', 'WILL_SUPPLY', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'UNFILLED'];
const terminalStates = new Set(['COMPLETED', 'CANCELLED', 'UNFILLED', 'MANUALLY_CLOSED']);
// The default state model offers these only to a loan.
const loanOnly = new Set(['SHIPPED', 'RECEIVED', 'OVERDUE', 'SHIPPED_RETURNED']);
// States in which the requester has no supplier yet.
const unrouted = new Set(['NEW', 'VALIDATED']);
// States in which the borrower holds or has held an item.
const itemHeld = new Set(['SHIPPED', 'RECEIVED', 'OVERDUE', 'SHIPPED_RETURNED']);

const authors = ['Okonkwo', 'Lindqvist', 'Haddad', 'Tanaka'];
const surnames = ['Seedwell', 'Seedham', 'Seedford'];
const givenNames = ['Ada', 'Bram', 'Cleo', 'Dov', 'Esme'];
const serviceLevels = ['Standard', 'Rush', 'Express'];
const peers = ['ISIL:US-TEST2', 'ISIL:US-MOCK'];
export const isbn = '978-0-306-40615-7';
export const issn = '0317-8471';

const day = 86_400_000;
// Noon, so a date filter's day boundary never falls on a row.
const createdBase = Date.parse('2025-01-01T12:00:00Z');
const neededBase = Date.parse('2025-06-01T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');
const pad = (n: number) => String(n).padStart(3, '0');

// Author, surname, service level, peer and patron ID repeat with the state cycle;
// filtering any of them within one state matches all its rows or none.
function borrowing(i: number): SeedRequest {
  const state = borrowingStates[i % borrowingStates.length];
  return {
    side: 'borrowing',
    requesterRequestId: `SEED-B${pad(i + 1)}`,
    // 37 is coprime to 120: unique titles sorted differently from creation order.
    title: `${marker} title ${pad((i * 37) % borrowingCount + 1)}`,
    author: authors[i % authors.length],
    patronId: `seedp${i % 12}`,
    surname: surnames[i % surnames.length],
    givenName: givenNames[i % givenNames.length],
    state,
    terminal: terminalStates.has(state),
    serviceType: i % 5 === 4 && !loanOnly.has(state) ? 'Copy' : 'Loan',
    serviceLevel: serviceLevels[i % serviceLevels.length],
    createdAt: iso(createdBase + i * day),
    ...(i % 6 === 0 && { neededAt: iso(neededBase + i * day) }),
    ...(i % 20 === 0 && { isbn }),
    ...(i % 30 === 1 && { issn }),
    ...(itemHeld.has(state) && { barcode: `seedbc${i}`, itemId: `seeditem${i}`, callNumber: `seedcn${i}` }),
    ...(!unrouted.has(state) && { peer: peers[i % peers.length] }),
    // Distinct flag counts expose miswired filters. Row 0 carries every flag.
    needsAttention: i % 7 === 0,
    ...(i % 9 === 0 && { internalNote: 'Seeded internal note' }),
    hasCost: i % 11 === 0,
    unread: i % 13 === 0,
  };
}

function lending(i: number): SeedRequest {
  const state = lendingStates[i % lendingStates.length];
  return {
    side: 'lending',
    requesterRequestId: `SEED-L${pad(i + 1)}`,
    title: `${marker} lending ${pad(i + 1)}`,
    author: authors[i % authors.length],
    patronId: `seedp${i % 12}`,
    surname: surnames[i % surnames.length],
    givenName: givenNames[i % givenNames.length],
    state,
    terminal: terminalStates.has(state),
    serviceType: 'Loan',
    serviceLevel: serviceLevels[i % serviceLevels.length],
    createdAt: iso(createdBase + i * day),
    peer: peers[i % peers.length],
    needsAttention: i % 4 === 0,
    hasCost: false,
    unread: i % 3 === 0,
  };
}

export const requests: SeedRequest[] = [
  ...Array.from({ length: borrowingCount }, (_, i) => borrowing(i)),
  ...Array.from({ length: lendingCount }, (_, i) => lending(i)),
];

const agency = (symbol: string) => {
  const [authority, value] = symbol.split(':');
  return { agencyIdType: { '#text': authority }, agencyIdValue: value };
};

// Broker ImportResourceRecord; borrowing requests name the broker as supplying agency.
function record(r: SeedRequest) {
  const requester = r.side === 'borrowing' ? owner : r.peer!;
  const supplier = r.side === 'borrowing' ? r.peer : owner;
  // Borrowing uses the requester request ID; lending adds a suffix to avoid collisions.
  const id = r.side === 'borrowing' ? r.requesterRequestId : `${r.requesterRequestId}-${owner}`;
  const identifiers = [
    ...(r.isbn ? [{ bibliographicItemIdentifier: r.isbn, bibliographicItemIdentifierCode: { '#text': 'ISBN' } }] : []),
    ...(r.issn ? [{ bibliographicItemIdentifier: r.issn, bibliographicItemIdentifierCode: { '#text': 'ISSN' } }] : []),
  ];
  // Mark cost notes read to keep cost and unread filters independent.
  const other = r.side === 'borrowing' ? r.peer ?? peers[0] : r.peer!;
  const notifications = [
    ...(r.hasCost ? [{
      id: `${id}-cost`, fromSymbol: other, toSymbol: owner, direction: 'received', kind: 'condition',
      note: 'Seeded condition', cost: 5, currency: 'USD', condition: 'LibraryUseOnly',
      createdAt: r.createdAt, acknowledgedAt: r.createdAt,
    }] : []),
    ...(r.unread ? [{
      id: `${id}-note`, fromSymbol: other, toSymbol: owner, direction: 'received', kind: 'note',
      note: 'Seeded unread message', createdAt: r.createdAt,
    }] : []),
  ];
  return {
    type: 'patronRequest',
    owner,
    data: {
      patronRequest: {
        id,
        createdAt: r.createdAt,
        updatedAt: r.createdAt,
        illRequest: {
          header: {
            requestingAgencyId: agency(requester),
            supplyingAgencyId: agency(r.side === 'borrowing' ? 'ISIL:BROKER' : owner),
            timestamp: r.createdAt,
            requestingAgencyRequestId: r.requesterRequestId,
          },
          bibliographicInfo: {
            title: r.title,
            author: r.author,
            ...(identifiers.length && { bibliographicItemId: identifiers }),
          },
          serviceInfo: {
            serviceType: r.serviceType,
            serviceLevel: { '#text': r.serviceLevel },
            ...(r.neededAt && { needBeforeDate: r.neededAt }),
          },
          patronInfo: { patronId: r.patronId, surname: r.surname, givenName: r.givenName },
        },
        state: r.state,
        stateModel: 'default',
        side: r.side,
        patron: r.patronId,
        requesterSymbol: requester,
        ...(supplier && { supplierSymbol: supplier }),
        requesterRequestId: r.requesterRequestId,
        needsAttention: r.needsAttention,
        ...(r.internalNote && { internalNote: r.internalNote }),
      },
      items: r.barcode ? [{
        id: `${id}-item`, barcode: r.barcode, itemId: r.itemId, callNumber: r.callNumber, createdAt: r.createdAt,
      }] : [],
      notifications,
      locatedSuppliers: [],
    },
  };
}

export const ndjson = () => requests.map((r) => `${JSON.stringify(record(r))}\n`).join('');
