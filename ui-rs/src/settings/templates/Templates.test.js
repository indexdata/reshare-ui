import React from 'react';
import { Route } from 'react-router-dom';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../../test/renderWithRs';
import { makeOkapiKyMock } from '../../test/okapiKyMock';
import Templates from './Templates';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('../../test/iconMock').default);
jest.mock('@folio/stripes-components/lib/TextArea', () => require('../../test/textAreaMock').default);
jest.mock('@folio/stripes-components/lib/Editor', () => require('../../test/editorMock').default);
jest.mock('@folio/stripes/core', () => require('../../test/stripesCore').makeStripesCoreMock(() => mockOkapi));

const PATH = '/settings/rs/templates';

const TEMPLATE = {
  id: 't1',
  title: 'Received item notification',
  purpose: 'email',
  contentType: 'text',
  subject: 'Your requested item is ready',
  body: 'Your requested item has been received.',
  labels: ['received-notification'],
  audience: 'patron',
  createdAt: '2026-05-01T00:00:00Z',
};

const DEFAULTS = [];

const byId = (id) => document.getElementById(id);

const renderList = () => renderWithRs(
  <Route path={PATH} component={Templates} />,
  { initialEntries: [PATH] },
);

describe('Templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOkapi.setResponses({
      'broker/templates': { about: { count: 1 }, items: [TEMPLATE] },
      'broker/templates/t1': TEMPLATE,
      'broker/state_model/templates': DEFAULTS,
    });
  });

  it('renders a row per template', async () => {
    renderList();

    await waitFor(() => expect(screen.getByText('Received item notification')).toBeInTheDocument());
    expect(mockOkapi.calledUrls()).toContain('broker/templates?limit=100');
    expect(screen.getByText('received-notification')).toBeInTheDocument();
    expect(screen.getByText('ui-rs.settings.templates.audience.patron')).toBeInTheDocument();
  });

  it('creates a template from the entered values', async () => {
    renderList();

    fireEvent.click(await screen.findByRole('button', { name: 'ui-rs.settings.templates.new' }));

    await waitFor(() => expect(byId('template-title')).toBeInTheDocument());
    // Nothing is submittable until a purpose is stated; it cannot be changed later.
    fireEvent.change(byId('template-purpose'), { target: { value: 'email' } });
    fireEvent.change(byId('template-title'), { target: { value: 'Cancelled' } });
    fireEvent.change(byId('template-subject'), { target: { value: 'Cancelled' } });
    fireEvent.change(byId('template-body'), { target: { value: 'Your request was cancelled' } });
    fireEvent.change(byId('template-label-labels[0]'), { target: { value: 'cancelled-notification' } });
    fireEvent.change(byId('template-audience'), { target: { value: 'patron' } });

    await waitFor(() => expect(byId('clickable-save-template')).not.toBeDisabled());
    fireEvent.click(byId('clickable-save-template'));

    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledWith('broker/templates', {
      json: {
        title: 'Cancelled',
        purpose: 'email',
        contentType: 'html',
        subject: 'Cancelled',
        body: 'Your request was cancelled',
        labels: ['cancelled-notification'],
        audience: 'patron',
      },
    }));
  });

  it('updates a template without sending the purpose the broker cannot change', async () => {
    renderList();

    fireEvent.click(await screen.findByText('Received item notification'));
    fireEvent.click(await screen.findByRole('button', { name: 'stripes-components.paneMenuActionsToggleLabel' }));
    // The edit item is a link styled as a dropdown button, so it reports role button.
    fireEvent.click(screen.getByRole('button', { name: 'ui-rs.edit' }));

    await waitFor(() => expect(byId('template-title')).toBeInTheDocument());
    fireEvent.change(byId('template-title'), { target: { value: 'Received (revised)' } });

    await waitFor(() => expect(byId('clickable-save-template')).not.toBeDisabled());
    fireEvent.click(byId('clickable-save-template'));

    await waitFor(() => expect(mockOkapi.put).toHaveBeenCalled());
    const [path, { json }] = mockOkapi.put.mock.calls[0];
    expect(path).toBe('broker/templates/t1');
    expect(json.title).toBe('Received (revised)');
    expect(json).not.toHaveProperty('purpose');
  });

  it('deletes a template once the deletion is confirmed', async () => {
    renderList();

    fireEvent.click(await screen.findByText('Received item notification'));
    fireEvent.click(await screen.findByRole('button', { name: 'stripes-components.paneMenuActionsToggleLabel' }));
    fireEvent.click(screen.getByRole('button', { name: 'ui-rs.delete' }));

    // The confirmation button shares its label with the action-menu item.
    const confirm = await screen.findByRole('button', { name: 'ui-rs.delete' });
    fireEvent.click(confirm);

    await waitFor(() => expect(mockOkapi.delete).toHaveBeenCalledWith('broker/templates/t1'));
  });
});
