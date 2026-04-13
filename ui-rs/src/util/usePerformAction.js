import { useMutation, useQueryClient } from 'react-query';
import { useOkapiKy } from '@folio/stripes/core';
import { useIntlCallout } from '@projectreshare/stripes-reshare';

export default (request, _actions) => {
  const ky = useOkapiKy();
  const queryClient = useQueryClient();
  const sendCallout = useIntlCallout();

  const { mutateAsync } = useMutation(
    ({ action, actionParams }) =>
      ky.post(`broker/patron_requests/${request.id}/action`, { json: { action, actionParams } })
  );

  const showError = (action, opts, errMsg) => {
    if (opts.error) sendCallout(opts.error, 'error', { errMsg });
    else sendCallout('stripes-reshare.actions.generic.error', 'error', { action: `stripes-reshare.actions.${action}`, errMsg }, ['action']);
  };

  return async (action, payload = {}, opts = {}) => {
    try {
      const res = await mutateAsync({ action, actionParams: payload });
      const result = await res.json();
      if (result.outcome !== 'success') {
        if (opts.display !== 'none') showError(action, opts, result.message || result.result);
        return result;
      }
      if (opts.display !== 'none') {
        if (opts.success) sendCallout(opts.success, 'success');
        else sendCallout('stripes-reshare.actions.generic.success', 'success', { action: `stripes-reshare.actions.${action}` }, ['action']);
      }
      queryClient.invalidateQueries(`broker/patron_requests/${request.id}`);
      queryClient.invalidateQueries(`broker/patron_requests/${request.id}/actions`);
      queryClient.invalidateQueries('broker/patron_requests');
      return result;
    } catch (err) {
      if (opts.display !== 'none') {
        if (err?.response?.json) err.response.json().then(res => showError(action, opts, res.message));
        else showError(action, opts, err.message);
      }
      return err;
    }
  };
};
