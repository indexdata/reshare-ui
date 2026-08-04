import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Settings } from '@folio/stripes/smart-components';

import ScheduledActions from './scheduledActions';
import Templates from './templates';

const sections = [
  {
    label: <FormattedMessage id="ui-rs.meta.title" />,
    pages: [
      {
        route: 'scheduled-actions',
        label: <FormattedMessage id="ui-rs.settings.scheduledActions.heading" />,
        component: ScheduledActions,
      },
      {
        route: 'templates',
        label: <FormattedMessage id="ui-rs.settings.templates.heading" />,
        component: Templates,
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
