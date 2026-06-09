import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Settings } from '@folio/stripes/smart-components';

import ScheduledActions from './scheduledActions';

const sections = [
  {
    label: <FormattedMessage id="ui-rs.meta.title" />,
    pages: [
      {
        route: 'scheduled-actions',
        label: <FormattedMessage id="ui-rs.settings.scheduledActions.heading" />,
        component: ScheduledActions,
      },
    ],
  },
];

const ResourceSharingSettings = (props) => (
  <Settings
    {...props}
    sections={sections}
    paneTitle="Resource Sharing"
  />
);

export default ResourceSharingSettings;
