import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Accordion, Icon, MultiColumnList } from '@folio/stripes/components';
import volumeStateStatus from '../../../util/volumeStateStatus';

const Volumes = ({
  request: {
    state: { code } = {},
    volumes = []
  } = {}
}) => {
  if (volumes.length > 1) {
    const volumeFormatter = {
      status: vol => {
        const vss = volumeStateStatus(vol, code);
        return (
          <>
            <Icon
              icon={vss ? 'check-circle' : 'exclamation-circle'}
              size="small"
              status={vss ? 'success' : 'warn'}
            >
              <FormattedMessage id={`ui-rs.flow.volumes.status.${vol.status.value}`} />
            </Icon>
          </>
        );
      }
    };

    return (
      <Accordion
        id="volumes"
        label={<FormattedMessage id="ui-rs.flow.sections.volumes" />}
      >
        <MultiColumnList
          columnMapping={{
            name: <FormattedMessage id="ui-rs.flow.volumes.label" />,
            itemId: <FormattedMessage id="ui-rs.flow.volumes.itemBarcode" />,
            status: <FormattedMessage id="ui-rs.flow.volumes.status" />,
          }}
          contentData={volumes}
          formatter={volumeFormatter}
          visibleColumns={['name', 'itemId', 'status']}
        />
      </Accordion>
    );
  }
  return null;
};

export default Volumes;
