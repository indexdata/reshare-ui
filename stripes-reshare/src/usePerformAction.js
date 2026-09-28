/**
 * A hook that performs an action on a ReShare patron request via broker
 * and surfaces a success or error message.
 */

import { useMutation, useQueryClient } from 'react-query';
import useOkapiKy from './useOkapiKy';
import useIntlCallout from './useIntlCallout';
import { LIST_KEY, requestKeys, transactionEventsKeys } from './requestQueries';

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
    // A failed or timed-out action can still have changed the request or
    // logged an event, so invalidate whatever the outcome.
    try {
      let result;

      try {
        const res = await mutateAsync({ id, action, actionParams: payload });
        result = await res.json();
      } catch (err) {
        // okapiKy populates err.message (broker message for HTTP errors, ky's own
        // for timeout/network), so just surface it.
        if (opts.display !== 'none') showError(action, opts, err.message);
        throw err;
      }

      if (result.outcome !== 'success') {
        if (opts.display !== 'none') showError(action, opts, result.message || result.result);
        const actionError = new Error(result.message || result.result || `Action ${action} failed`);
        actionError.action = action;
        actionError.result = result;
        throw actionError;
      }

      if (opts.display !== 'none') {
        if (opts.success) sendCallout(opts.success, 'success');
        else sendCallout('stripes-reshare.actions.generic.success', 'success', { action: `stripes-reshare.actions.${action}` }, ['action']);
      }
      return result;
    } finally {
      const { record, actions, events, transaction } = requestKeys(id);
      // A fetch already running would be reused by the refetch, and its
      // pre-action response would clear the invalidation, so cancel it first.
      [record, actions, events, transaction, ...transactionEventsKeys(id, queryClient), LIST_KEY]
        .forEach((key) => {
          queryClient.cancelQueries(key);
          queryClient.invalidateQueries(key);
        });
    }
  };

  return hookReqId
    ? (action, payload, opts) => performAction(hookReqId, action, payload, opts)
    : performAction;
};
