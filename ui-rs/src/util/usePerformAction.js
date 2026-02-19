import { useMutation } from 'react-query';
import { useOkapiKy } from '@folio/stripes/core';
import { useIntlCallout } from '@projectreshare/stripes-reshare';

export default (request, _actions) => {
  const ky = useOkapiKy();
  const sendCallout = useIntlCallout();

  const { mutateAsync } = useMutation(
    ({ action, actionParams }) =>
      ky.post(`broker/patron_requests/${request.id}/action`, { json: { action, actionParams } })
  );

  return async (action, payload = {}, opts = {}) => {
    try {
      const res = await mutateAsync({ action, actionParams: payload });
      if (opts.display !== 'none') {
        if (opts.success) sendCallout(opts.success, 'success');
        else sendCallout('stripes-reshare.actions.generic.success', 'success', { action: `stripes-reshare.actions.${action}` }, ['action']);
      }
      return res;
    } catch (err) {
      if (opts.display !== 'none') {
        const showError = errMsg => {
          if (opts.error) sendCallout(opts.error, 'error', { errMsg });
          else sendCallout('stripes-reshare.actions.generic.error', 'error', { action: `stripes-reshare.actions.${action}`, errMsg }, ['action']);
        };
        if (err?.response?.json) err.response.json().then(res => showError(res.message));
        else showError(err.message);
      }
      return err;
    }
  };
};
