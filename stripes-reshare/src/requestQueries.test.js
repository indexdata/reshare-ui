import { QueryClient } from 'react-query';
import { requestIdsForEvent, requestKeys } from './requestQueries';

let queryClient;

const seed = (record) => queryClient.setQueryData(requestKeys(record.id).record, record);

const supplierMessage = (header) => ({
  event: 'message-requester',
  data: { supplyingAgencyMessage: { header } },
});

const requesterMessage = (header) => ({
  event: 'message-supplier',
  data: { requestingAgencyMessage: { header } },
});

const idsFor = (payload) => requestIdsForEvent(payload, queryClient);

describe('requestIdsForEvent', () => {
  beforeEach(() => {
    queryClient = new QueryClient();
  });

  // Borrowing records hold the requester id as their own.
  it('resolves a borrowing request from the requesting-agency id', () => {
    seed({ id: 'pr-1', requesterRequestId: 'pr-1' });

    expect(idsFor(supplierMessage({ requestingAgencyRequestId: 'pr-1' }))).toEqual(['pr-1']);
  });

  // A lending record is keyed by an id the message never carries, so the match
  // has to go through the requester id it holds.
  it('resolves a lending request from the requester id it stores', () => {
    seed({ id: 'lending-1', requesterRequestId: 'their-1' });

    expect(idsFor(supplierMessage({ requestingAgencyRequestId: 'their-1' }))).toEqual(['lending-1']);
  });

  it('matches a requesting-agency message on the supplying id', () => {
    seed({ id: 'pr-1', requesterRequestId: 'pr-1' });

    expect(idsFor(requesterMessage({ supplyingAgencyRequestId: 'pr-1' }))).toEqual(['pr-1']);
  });

  it('resolves nothing for a request that has never been fetched', () => {
    seed({ id: 'pr-1', requesterRequestId: 'pr-1' });

    expect(idsFor(supplierMessage({ requestingAgencyRequestId: 'never-seen' }))).toEqual([]);
  });

  // Production keys are arrays: useOkapiQuery appends search params and
  // unshareable options after the path.
  it('resolves a record cached under a production-shaped key', () => {
    queryClient.setQueryData(
      [requestKeys('pr-1').record, { notifyOnChangeProps: 'tracked' }],
      { id: 'pr-1', requesterRequestId: 'pr-1' }
    );

    expect(idsFor(supplierMessage({ requestingAgencyRequestId: 'pr-1' }))).toEqual(['pr-1']);
  });

  it('resolves nothing without an ISO 18626 header', () => {
    seed({ id: 'pr-1', requesterRequestId: 'pr-1' });

    expect(idsFor({ event: 'message-requester', data: {} })).toEqual([]);
  });
});
