import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useHistory, useLocation } from 'react-router-dom';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import { Button, Icon } from '@folio/stripes/components';

import actionMeta from '../actionMeta';

// Opens the revision form; the form posts the action itself on submit.
const Rerequest = ({ request }) => {
  const history = useHistory();
  const location = useLocation();
  const actionPending = !!useIsActionPending(request.id);

  const open = () => history.push({
    // Relative: replaces the flow route's last segment.
    pathname: 'rerequest',
    search: location.search,
    state: { direct: true },
  });

  return (
    <Button buttonStyle="dropdownItem" onClick={open} disabled={actionPending}>
      <Icon icon={actionMeta.rerequest.icon}>
        <FormattedMessage id="stripes-reshare.actions.rerequest" />
      </Icon>
    </Button>
  );
};

export default Rerequest;
