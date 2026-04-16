/**
 * A hook that performs an action on a ReShare patron request via broker
 * and surfaces a success or error message.
 */

import { useMutation, useQueryClient } from 'react-query';
import { useOkapiKy } from '@folio/stripes/core';
import useIntlCallout from './useIntlCallout';

export default (hookReqId) => {
  const ky = useOkapiKy();
  const queryClient = useQueryClient();
  const sendCallout = useIntlCallout();

  const { mutateAsync } = useMutation(
    ['@reshare/stripes-reshare', 'performAction'],
    ({ id, action, actionParams }) => ky.post(
      `broker/patron_requests/${id}/action`,
      { json: { action, actionParams } }
    )
  );

  const showError = (action, opts, errMsg) => {
    if (opts.error) sendCallout(opts.error, 'error', { errMsg });
    else sendCallout('stripes-reshare.actions.generic.error', 'error', { action: `stripes-reshare.actions.${action}`, errMsg }, ['action']);
  };

  const performAction = async (id, action, payload = {}, opts = {}) => {
    try {
      const res = await mutateAsync({ id, action, actionParams: payload });
      const result = await res.json();
      if (result.outcome !== 'success') {
        if (opts.display !== 'none') showError(action, opts, result.message || result.result);
        return result;
      }
      if (opts.display !== 'none') {
        if (opts.success) sendCallout(opts.success, 'success');
        else sendCallout('stripes-reshare.actions.generic.success', 'success', { action: `stripes-reshare.actions.${action}` }, ['action']);
      }
      queryClient.invalidateQueries(`broker/patron_requests/${id}`);
      queryClient.invalidateQueries(`broker/patron_requests/${id}/actions`);
      queryClient.invalidateQueries('broker/patron_requests');
      return result;
    } catch (err) {
      if (opts.display !== 'none') {
        if (err?.response?.json) err.response.json().then(r => showError(action, opts, r.message));
        else showError(action, opts, err.message);
      }
      return err;
    }
  };

  return hookReqId
    ? (action, payload, opts) => performAction(hookReqId, action, payload, opts)
    : performAction;
};
