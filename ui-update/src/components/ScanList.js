import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Icon, MultiColumnList, Tooltip } from '@folio/stripes/components';
import STATUS from '../scanStatus';

const scanFormatter = {
  status: scan => {
    if (scan.status === STATUS.SUCCESS) {
      return <Icon size="large" icon="check-circle" status="success" />;
    }
    if (scan.status === STATUS.FAIL) {
      return <Icon size="large" icon="times-circle-solid" status="error" />;
    }
    return <Icon size="large" icon="clock" />;
  },
  notes: scan => (
    <>
      {scan.notes?.localNote &&
        <Tooltip
          id="rs-local-note-tooltip"
          text={<FormattedMessage id="stripes-reshare.hasLocalNote" />}
        >
          {({ ref, ariaIds }) => (
            <Icon
              icon="report"
              aria-labelledby={ariaIds.text}
              ref={ref}
            />
          )}
        </Tooltip>
      }
      {scan.notes?.patronNote &&
        <Tooltip
          id="rs-patron-note-tooltip"
          text={<FormattedMessage id="stripes-reshare.hasPatronNote" />}
        >
          {({ ref, ariaIds }) => (
            <Icon
              icon="profile"
              aria-labelledby={ariaIds.text}
              ref={ref}
            />
          )}
        </Tooltip>
      }
    </>
  )
};

const ScanList = ({ scans, scanData, selectedScan, onRowClick }) => {
  const formattedScans = scans.map(scannedAt => {
    const scan = scanData[scannedAt];
    return {
      status: scan?.status ?? '',
      hrid: scan?.hrid ?? '',
      requester: scan?.request?.requestingInstitutionSymbol ?? '',
      supplier: scan?.request?.supplyingInstitutionSymbol ?? '',
      title: scan?.request?.title ?? '',
      notes: { localNote: scan?.request?.localNote, patronNote: scan?.request?.patronNote },
      scannedAt,
    };
  });

  return (
    <MultiColumnList
      contentData={formattedScans}
      formatter={scanFormatter}
      visibleColumns={['status', 'hrid', 'notes', 'requester', 'supplier', 'title']}
      isSelected={({ item }) => selectedScan === item.scannedAt}
      onRowClick={onRowClick}
      columnMapping={{
        status: '',
        hrid: <FormattedMessage id="ui-update.column.hrid" />,
        requester: <FormattedMessage id="ui-update.column.requester" />,
        supplier: <FormattedMessage id="ui-update.column.supplier" />,
        title: <FormattedMessage id="ui-update.column.title" />,
        notes: ''
      }}
      // It would be better to express the fixed-width columns in em and let
      // the remaining space go to Title, alas there seems to be an MCL bug
      // preventing this. Adding up to less than 100% is necessary to avoid
      // scrollbars introduced by some negative margin somewhere.
      columnWidths={{
        status: { max: 40 },
        hrid: { max: 100 },
        notes: { max: 48, min: 0 },
        requester: { min: 140 },
        supplier: { min: 140 },
      }}
    />
  );
};

ScanList.propTypes = {
  scans: PropTypes.arrayOf(PropTypes.number),
  scanData: PropTypes.object.isRequired,
  selectedScan: PropTypes.number.isRequired,
  onRowClick: PropTypes.func.isRequired,
};

export default ScanList;
