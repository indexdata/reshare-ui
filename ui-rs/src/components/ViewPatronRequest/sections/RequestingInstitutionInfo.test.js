import { screen } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import RequestingInstitutionInfo from './RequestingInstitutionInfo';

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);

const lending = {
  id: 'pr-1',
  side: 'lending',
  requesterSymbol: 'ISIL:REQ-A',
  requesterName: 'Requester Library',
  illRequest: {
    requestingAgencyInfo: {
      name: 'Name the requester sent',
      contactName: 'Jo Staff',
      address: [
        { electronicAddress: { electronicAddressType: { '#text': 'Email' }, electronicAddressData: 'ill@req.example' } },
        { physicalAddress: { line1: '1 Library Way', locality: 'Chicago', region: { '#text': 'IL' }, postalCode: '60616' } },
      ],
    },
  },
};

describe('RequestingInstitutionInfo', () => {
  it('shows the requester and what it sent about itself, linking to its directory entry', () => {
    renderWithRs(<RequestingInstitutionInfo record={lending} />);

    expect(screen.getByText('Requester Library')).toBeInTheDocument();
    expect(screen.getByText('ISIL:REQ-A')).toBeInTheDocument();
    expect(screen.getByText('Jo Staff')).toBeInTheDocument();
    expect(screen.getByText('ill@req.example')).toBeInTheDocument();
    // The matcher collapses the address's line breaks to spaces.
    expect(screen.getByText('1 Library Way Chicago, IL 60616')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ui-rs.viewInDirectory' }))
      .toHaveAttribute('href', '/directory/entries/by-symbol/ISIL:REQ-A');
  });

  it('falls back to the name the requester sent when the broker has none', () => {
    renderWithRs(<RequestingInstitutionInfo record={{ ...lending, requesterName: undefined }} />);

    expect(screen.getByText('Name the requester sent')).toBeInTheDocument();
  });

  it('is not shown on the borrowing side, where the requester is this library', () => {
    renderWithRs(<RequestingInstitutionInfo record={{ ...lending, side: 'borrowing' }} />);

    expect(screen.queryByText('ui-rs.information.heading.requestinginstitution')).not.toBeInTheDocument();
  });
});
