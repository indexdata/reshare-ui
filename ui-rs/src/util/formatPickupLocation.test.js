import { formatPickupLocationFull, formatPickupLocationShort } from './formatPickupLocation';

const owned = { byId: new Map(), isSettled: true };

const withAddress = physicalAddress => ({
  illRequest: { requestedDeliveryInfo: [{ address: { physicalAddress } }] },
});

const address = {
  line1: 'East Branch',
  line2: '1 Branch Street',
  locality: 'Chicago',
  region: { '#text': 'IL' },
  postalCode: '60616',
  country: { '#text': 'US' },
};

describe('formatPickupLocation', () => {
  it('shows nothing for a chosen branch until owned entries have loaded', () => {
    const record = { requesterPickupLocationId: 'branch-e' };
    [formatPickupLocationShort, formatPickupLocationFull].forEach(format => {
      expect(format(record, { byId: new Map(), isSettled: false })).toBeUndefined();
      expect(format(record, owned)).toBe('branch-e');
    });
  });

  it('shortens a delivery address to its first line and locality', () => {
    expect(formatPickupLocationShort(withAddress(address), owned)).toBe('East Branch, Chicago');
  });

  it('lays out a full delivery address on lines', () => {
    expect(formatPickupLocationFull(withAddress(address), owned))
      .toBe('East Branch\n1 Branch Street\nChicago, IL 60616\nUS');
  });

  it('drops missing parts without leaving separators behind', () => {
    expect(formatPickupLocationFull(withAddress({ line1: '1 Branch Street', postalCode: '60616' }), owned))
      .toBe('1 Branch Street\n60616');
  });
});
