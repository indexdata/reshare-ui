import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Icon, MultiColumnList, Tooltip } from '@folio/stripes/components';
import STATUS from '../scanStatus';

const NoteIcon = ({ id, icon, textId }) => (
  <Tooltip id={id} text={<FormattedMessage id={textId} />}>
    {({ ref, ariaIds }) => <Icon icon={icon} aria-labelledby={ariaIds.text} ref={ref} />}
  </Tooltip>
);

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
      {scan.notes.localNote && <NoteIcon id={`rs-local-note-tooltip-${scan.id}`} icon="report" textId="stripes-reshare.hasLocalNote" />}
      {scan.notes.patronNote && <NoteIcon id={`rs-patron-note-tooltip-${scan.id}`} icon="profile" textId="stripes-reshare.hasPatronNote" />}
    </>
  ),
};

const ScanList = ({ scans, scanData, selectedScan, onRowClick }) => {
  const formattedScans = scans.map(id => {
    const { status, barcode, request } = scanData[id];
    return {
      status,
      hrid: barcode,
      requester: request?.requesterSymbol ?? '',
      supplier: request?.supplierSymbol ?? '',
      title: request?.illRequest?.bibliographicInfo?.title ?? '',
      notes: { localNote: request?.internalNote, patronNote: request?.illRequest?.serviceInfo?.note },
      id,
    };
  });

  return (
    <MultiColumnList
      contentData={formattedScans}
      formatter={scanFormatter}
      visibleColumns={['status', 'hrid', 'notes', 'requester', 'supplier', 'title']}
      isSelected={({ item }) => selectedScan === item.id}
      onRowClick={onRowClick}
      columnMapping={{
        status: '',
        hrid: <FormattedMessage id="ui-update.column.hrid" />,
        requester: <FormattedMessage id="ui-update.column.requester" />,
        supplier: <FormattedMessage id="ui-update.column.supplier" />,
        title: <FormattedMessage id="ui-update.column.title" />,
        notes: ''
      }}
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

export default ScanList;
