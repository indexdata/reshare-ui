import { useParams } from 'react-router-dom';
import { Pane } from '@folio/stripes/components';
import { useCloseDirect, useOkapiQuery } from '@projectreshare/stripes-reshare';
import LMSConfigEditor from '../components/LMSConfigEditor';

const CREATE = 'create';
const EDIT = 'edit';
const STALE_QUERY_TIME = 2 * 60 * 1000;
const fieldMap = [
  {
    fieldName: 'address',
    valueType: 'string',
    required: true
  },
  {
    fieldName: 'fromAgency',
    valueType: 'string',
    required: true
  },
  {
    fieldName: 'fromAgencyAuthentication',
    valueType: 'string'
  },
  {
    fieldName: 'toAgency',
    valueType: 'string'
  },
  {
    fieldName: 'lookupUserEnabled',
    valueType: 'boolean',
  },
  {
    fieldName: 'acceptItemEnabled',
    valueType: 'boolean',
  },
  {
    fieldName: 'checkInItemEnabled',
    valueType: 'boolean',
  },
  {
    fieldName: 'checkOutItemEnabled',
    valueType: 'boolean',
  },
  {
    fieldName: 'itemLocation',
    valueType: 'string',
  },
  {
    fieldName: 'requestItemRequestType',
    valueType: 'string',
  },
  {
    fieldName: 'requestItemRequestScopeType',
    valueType: 'string',
  },
  {
    fieldName: 'requestItemPickupLocationEnabled',
    valueType: 'boolean',
  },
  {
    fieldName: 'requestItemBibIdCode',
    valueType: 'string',
  },
  {
    fieldName: 'requesterPickupLocation',
    valueType: 'string',
  },
  {
    fieldName: 'supplierPickupLocation',
    valueType: 'string',
  },
  {
    fieldName: 'requesterPatronPattern',
    valueType: 'string'
  }
];

const EditLMSConfigRoute = () => {
  const { id } = useParams();

  const operation = id ? EDIT : CREATE;

  const close = useCloseDirect(operation === CREATE ? '/rsdir/entries' : `/rsdir/entries/view/${id}`);

  const entryQuery = useOkapiQuery(`rsdir/entries/by-id/${id}`, {
    staleTime: STALE_QUERY_TIME,
    enabled: !!id,
  });

  if (operation === EDIT && !entryQuery.isSuccess) return null;

  return (
    <Pane
      defaultWidth="fill"
      paneTitle="edit lms info"
      onClose={close}
      dismissible
    >
      <LMSConfigEditor id={id} entry={entryQuery.data} fieldMapping={fieldMap} />
    </Pane>
  );
};

export default EditLMSConfigRoute;
