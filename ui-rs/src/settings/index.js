import React from 'react';
import { Settings } from '@folio/stripes/smart-components';

import ScheduledActionsSettings from './ScheduledActionsSettings';

const sections = [
  {
    label: 'Resource Sharing',
    pages: [
      {
        route: 'scheduled-actions',
        label: 'Scheduled Actions',
        component: ScheduledActionsSettings,
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
