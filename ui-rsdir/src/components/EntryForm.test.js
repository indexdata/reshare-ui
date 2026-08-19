import EntryForm from './EntryForm';

jest.mock('@folio/stripes/components', () => ({
  Accordion: 'Accordion',
  AccordionSet: 'AccordionSet',
  Button: 'Button',
  Card: 'Card',
  Col: 'Col',
  IconButton: 'IconButton',
  Row: 'Row',
  Select: 'Select',
  TextField: 'TextField',
}));

jest.mock('@projectreshare/stripes-reshare', () => ({
  useOkapiQuery: jest.fn(),
}));

describe('EntryForm', () => {
  it('loads with the generic address plugin dependency', () => {
    expect(EntryForm).toEqual(expect.any(Function));
  });
});
