import React from 'react';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import SupplyDocument from './SupplyDocument';

const mockOkapi = makeOkapiKyMock();
let mockReshareConfig = {};

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);
jest.mock('@folio/stripes/core', () => require('#/test/stripesCore').makeStripesCoreMock(() => mockOkapi, () => mockReshareConfig));

const { CalloutContext } = require('@folio/stripes/core');

const sendCallout = jest.fn();

jest.mock('@projectreshare/stripes-reshare', () => ({
  ...jest.requireActual('@projectreshare/stripes-reshare'),
  useIsActionPending: () => false,
}));

const request = {
  id: 'pr-1',
  requesterRequestId: 'REQ-1',
};

const renderSupplyDocument = (performAction, withNote = false) => renderWithRs(
  <CalloutContext.Provider value={{ sendCallout }}>
    <SupplyDocument request={request} performAction={performAction} withNote={withNote} />
  </CalloutContext.Provider>
);

const chooseFile = file => fireEvent.change(document.querySelector('input[type="file"]'), {
  target: { files: [file] },
});

const calloutWith = id => expect.objectContaining({
  type: 'error',
  message: expect.objectContaining({ props: expect.objectContaining({ id }) }),
});

const noteToggle = name => screen.getByRole('button', { name });

describe('SupplyDocument', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReshareConfig = { maxDMSUpload: 1 };
  });

  it('requires a delivery URL', () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderSupplyDocument(performAction);

    const submit = screen.getByText('stripes-reshare.actions.supply-document').closest('button');
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(performAction).not.toHaveBeenCalled();
  });

  it('submits the trimmed delivery URL and an optional disclosed note without requiring a request ID scan', async () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderSupplyDocument(performAction, true);

    expect(screen.queryByText('ui-rs.button.scan')).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(noteToggle('ui-rs.actions.addNote')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('ui-rs.actions.supply-document.deliveryUrl'), {
      target: { value: '  https://documents.example.org/copy/1  ' },
    });
    fireEvent.click(noteToggle('ui-rs.actions.addNote'));
    expect(noteToggle('ui-rs.actions.removeNote')).toHaveAttribute('aria-expanded', 'true');

    const note = screen.getAllByRole('textbox').find(input => input.getAttribute('name') === 'note');
    fireEvent.change(note, { target: { value: 'Document ready' } });
    fireEvent.click(screen.getByText('stripes-reshare.actions.supply-document').closest('button'));

    await waitFor(() => expect(performAction).toHaveBeenCalledWith(
      'supply-document',
      {
        deliveryUrl: 'https://documents.example.org/copy/1',
        note: 'Document ready',
      },
      {
        success: 'ui-rs.actions.supply-document.success',
        error: 'ui-rs.actions.supply-document.error',
      },
    ));
  });

  it('does not show or submit a note when it is not an action parameter', async () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderSupplyDocument(performAction);

    expect(screen.queryByRole('button', { name: 'ui-rs.actions.addNote' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('ui-rs.actions.supply-document.deliveryUrl'), {
      target: { value: 'https://documents.example.org/copy/1' },
    });
    fireEvent.click(screen.getByText('stripes-reshare.actions.supply-document').closest('button'));

    await waitFor(() => expect(performAction).toHaveBeenCalledWith(
      'supply-document',
      { deliveryUrl: 'https://documents.example.org/copy/1' },
      {
        success: 'ui-rs.actions.supply-document.success',
        error: 'ui-rs.actions.supply-document.error',
      },
    ));
  });

  it('uploads a chosen file and fills the delivery URL without submitting', async () => {
    const performAction = jest.fn(() => Promise.resolve());
    const storedUrl = 'https://bucket.example.org/tenant/0d7c5c3e';
    mockOkapi.post.mockResolvedValueOnce({ json: async () => ({ key: 'tenant/0d7c5c3e', url: storedUrl }) });
    renderSupplyDocument(performAction);

    const file = new File(['%PDF'], 'article.pdf', { type: 'application/pdf' });
    chooseFile(file);

    await waitFor(() => expect(screen.getByLabelText('ui-rs.actions.supply-document.deliveryUrl')).toHaveValue(storedUrl));
    expect(mockOkapi.post).toHaveBeenCalledWith('dms/upload', { body: expect.any(FormData) });
    expect(mockOkapi.post.mock.calls[0][1].body.get('file').name).toBe('article.pdf');
    expect(screen.getByText('ui-rs.upload.uploaded')).toBeInTheDocument();
    expect(performAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('stripes-reshare.actions.supply-document').closest('button'));
    await waitFor(() => expect(performAction).toHaveBeenCalledWith(
      'supply-document',
      { deliveryUrl: storedUrl },
      expect.anything(),
    ));
  });

  it('holds off submitting the previous URL while a replacement uploads', async () => {
    const performAction = jest.fn(() => Promise.resolve());
    let finishUpload;
    mockOkapi.post.mockReturnValueOnce(new Promise(resolve => { finishUpload = resolve; }));
    renderSupplyDocument(performAction);

    fireEvent.change(screen.getByLabelText('ui-rs.actions.supply-document.deliveryUrl'), {
      target: { value: 'https://documents.example.org/copy/1' },
    });
    const submit = screen.getByText('stripes-reshare.actions.supply-document').closest('button');
    expect(submit).toBeEnabled();

    chooseFile(new File(['%PDF'], 'article.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(submit).toBeDisabled());
    fireEvent.click(submit);
    expect(performAction).not.toHaveBeenCalled();

    finishUpload({ json: async () => ({ url: 'https://bucket.example.org/tenant/2' }) });
    await waitFor(() => expect(submit).toBeEnabled());
    expect(screen.getByLabelText('ui-rs.actions.supply-document.deliveryUrl')).toHaveValue('https://bucket.example.org/tenant/2');
  });

  it('stops showing the uploaded file once the URL is edited', async () => {
    mockOkapi.post.mockResolvedValueOnce({ json: async () => ({ url: 'https://bucket.example.org/tenant/1' }) });
    renderSupplyDocument(jest.fn());

    chooseFile(new File(['%PDF'], 'article.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(screen.getByText('ui-rs.upload.uploaded')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('ui-rs.actions.supply-document.deliveryUrl'), {
      target: { value: 'https://documents.example.org/copy/1' },
    });
    expect(screen.queryByText('ui-rs.upload.uploaded')).not.toBeInTheDocument();
  });

  it('rejects a file over the configured limit without uploading it', async () => {
    renderSupplyDocument(jest.fn());

    chooseFile(new File([new Uint8Array(1024 * 1024 + 1)], 'scan.tiff', { type: 'image/tiff' }));

    await waitFor(() => expect(sendCallout).toHaveBeenCalledWith(calloutWith('ui-rs.upload.tooLarge')));
    expect(mockOkapi.post).not.toHaveBeenCalled();
  });

  it('reports a failed upload and leaves the delivery URL empty', async () => {
    mockOkapi.post.mockRejectedValueOnce(new Error('unsupported content type'));
    renderSupplyDocument(jest.fn());

    chooseFile(new File(['x'], 'notes.exe', { type: 'application/octet-stream' }));

    await waitFor(() => expect(sendCallout).toHaveBeenCalledWith(calloutWith('ui-rs.upload.error')));
    expect(screen.getByLabelText('ui-rs.actions.supply-document.deliveryUrl')).toHaveValue('');
  });
});
