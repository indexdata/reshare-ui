import React, { useContext, useEffect, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { Form } from 'react-final-form';
import { useQueryClient } from 'react-query';
import { Redirect, useHistory, useLocation } from 'react-router-dom';
import { MessageBanner } from '@folio/stripes/components';
import { CalloutContext } from '@folio/stripes/core';
import { DirectLink, useCloseDirect, useIsActionPending, useOkapiKy, useOkapiQuery, upNLevels } from '@projectreshare/stripes-reshare';
import PatronRequestForm from '../components/PatronRequestForm';
import PatronRequestFormPane from '../components/PatronRequestForm/PatronRequestFormPane';
import submissionError from '../components/PatronRequestForm/submissionError';
import useOptions from '../components/PatronRequestForm/useOptions';
import { brokerToForm, formToRevision } from '../components/PatronRequestForm/formMapping';
import handleSISelect from '../components/PatronRequestForm/handleSISelect';

const RerequestRoute = ({ match }) => {
  const id = match.params?.id;
  const history = useHistory();
  const routerLocation = useLocation();
  const callout = useContext(CalloutContext);
  const queryClient = useQueryClient();
  const okapiKy = useOkapiKy();
  const requestView = upNLevels(routerLocation, 1);
  const requestsPath = routerLocation.pathname.replace(/\/[^/]+\/rerequest$/, '');
  const close = useCloseDirect(requestView);

  // Fixed once set: reinitialising Final Form on a refetch would discard edits.
  const initialValues = useRef(null);
  // Only a failure before the form opens reaches the error boundary; later
  // ones must not take the draft with them.
  const queryErrorOptions = { useErrorBoundary: () => !initialValues.current };

  const recordKey = `broker/patron_requests/${id}`;
  const actionsKey = `${recordKey}/actions`;
  // Open on fresh data, not cache: someone may already have revised it.
  const { data: request, isFetchedAfterMount: hasRequestLoaded } = useOkapiQuery(
    recordKey,
    { notifyOnChangeProps: 'tracked', ...queryErrorOptions }
  );
  const { data: actionsData, isFetchedAfterMount: haveActionsLoaded } = useOkapiQuery(actionsKey, queryErrorOptions);
  const { options, isSuccess: optionsLoaded } = useOptions();
  const actionPending = useIsActionPending(id);

  // The POSTs outlive the form; don't navigate if staff have already left.
  const unmounted = useRef(false);
  useEffect(() => () => { unmounted.current = true; }, []);

  if (!hasRequestLoaded || !haveActionsLoaded || !optionsLoaded) return null;

  const canRerequest = (actionsData?.actions ?? []).some(a => a.name === 'rerequest');

  if (!initialValues.current) {
    if (!canRerequest) return <Redirect to={requestView} />;
    initialValues.current = brokerToForm(request);
  }

  // Cancel first: a fetch already running would be reused, and its response
  // from before the POSTs would clear the invalidation.
  const refresh = keys => Promise.all(keys.map(key => {
    queryClient.cancelQueries(key);
    return queryClient.invalidateQueries(key);
  }));

  const fail = async (labelId, err) => {
    const result = submissionError(callout, labelId, err);
    // A competing revision may be why; refresh to show its link.
    await refresh([recordKey, actionsKey]);
    return result;
  };

  const submit = async submittedRecord => {
    // Rerequest first: the broker withdraws it once the new request is linked.
    // noop stops it creating its own unedited copy. Not usePerformAction, which
    // would invalidate between the POSTs.
    try {
      const res = await okapiKy.post(`${recordKey}/action`, {
        json: { action: 'rerequest', actionParams: { noop: true } },
      });
      const result = await res.json();
      if (result.outcome !== 'success') throw new Error(result.message || result.result || '');
    } catch (err) {
      return fail('ui-rs.rerequest.actionError', err);
    }

    let created;
    try {
      const res = await okapiKy.post('broker/patron_requests', {
        json: formToRevision(submittedRecord, id),
      });
      created = await res.json();
    } catch (err) {
      return fail('ui-rs.rerequest.createError', err);
    }

    refresh([recordKey, actionsKey, `${recordKey}/events`, 'broker/patron_requests']);
    if (unmounted.current) return undefined;
    history.replace(`${requestsPath}/${created.id}${routerLocation.search}`);
    return undefined;
  };

  return (
    <Form onSubmit={submit} initialValues={initialValues.current} mutators={{ handleSISelect }}>
      {({ form }) => (
        <PatronRequestFormPane
          titleId="ui-rs.rerequestPatronRequest"
          submitDisabled={actionPending || !canRerequest}
          onClose={close}
        >
          {!canRerequest &&
            <MessageBanner type="warning">
              <FormattedMessage id="ui-rs.rerequest.unavailable" />
              {request?.nextReqId &&
                <>
                  {' '}
                  <DirectLink to={`${requestsPath}/${request.nextReqId}`} preserveSearch>
                    <FormattedMessage id="ui-rs.flow.info.succeededByLink" />
                  </DirectLink>
                </>
              }
            </MessageBanner>
          }
          <PatronRequestForm selectOptions={options} onSISelect={form.mutators.handleSISelect} />
        </PatronRequestFormPane>
      )}
    </Form>
  );
};

// The router reuses the component across ids; a new id needs a fresh draft.
export default props => <RerequestRoute key={props.match.params?.id} {...props} />;
