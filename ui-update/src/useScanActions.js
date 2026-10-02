import { useOkapiQuery } from '@projectreshare/stripes-reshare';

export default () => {
  const settingsQuery = useOkapiQuery('rs/settings/appSettings', {
    searchParams: { filters: 'section==state_action_config', perPage: '1000' },
    staleTime: 10 * 60 * 1000,
    cacheTime: 8 * 60 * 60 * 1000,
  });
  if (!settingsQuery.isSuccess) return null;
  const settings = settingsQuery.data.reduce((acc, el) => ({ ...acc, [el.key]: el.value === 'yes' }), {});
  const supplierMaybeCombined = settings.combine_fill_and_ship ? ['supplierCheckInToReshareAndSupplierMarkShipped'] : ['supplierCheckInToReshare', 'supplierMarkShipped'];
  const requesterMaybeCombined = settings.combine_returned_by_patron_and_return_ship ? ['patronReturnedItemAndShippedReturn'] : ['patronReturnedItem', 'shippedReturn'];
  return [
    ...supplierMaybeCombined,
    'supplierCheckOutOfReshare',
    'requesterReceived',
    ...requesterMaybeCombined,
  ];
};
