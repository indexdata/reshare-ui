import patronEmail from './patronEmail';

const electronic = (type, data) => ({
  electronicAddress: {
    electronicAddressType: { '#text': type },
    electronicAddressData: data,
  },
});

describe('patronEmail', () => {
  it('picks the Email-typed address, matching the type case-insensitively', () => {
    expect(patronEmail({
      address: [electronic('Chat', 'not-an-email'), electronic('email', 'p@example.org')],
    })).toBe('p@example.org');
  });

  it('returns undefined when no email address is present', () => {
    expect(patronEmail({ address: [{ physicalAddress: { line1: 'somewhere' } }] })).toBeUndefined();
    expect(patronEmail(undefined)).toBeUndefined();
  });
});
