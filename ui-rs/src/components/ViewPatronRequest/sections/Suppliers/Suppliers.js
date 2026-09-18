import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { ReasonUnfilled, useOkapiQuery } from '@projectreshare/stripes-reshare';
import {
  Accordion,
  Card,
  Col,
  KeyValue,
  Loading,
  Row,
} from '@folio/stripes/components';
import css from './Suppliers.css';

// Normalize known open-code values for case-insensitive translation lookup.
const reasonUnfilledCode = (reason) => ReasonUnfilled.find(
  code => code.toLowerCase() === reason.toLowerCase()
) ?? reason;

const SupplierCard = ({ supplier, position }) => {
  const { reasonUnfilled, note } = supplier;

  return (
    <Card
      headerStart={`${position}. ${supplier.supplierName || supplier.supplierSymbol}`}
      headerEnd={supplier.directoryEntryId && (
        <Link to={`/directory/entries/${supplier.directoryEntryId}`}>
          <FormattedMessage id="ui-rs.viewInDirectory" />
        </Link>
      )}
      roundedBorder
      cardClass={css.supplierCard}
      headerClass={css.supplierCardHeader}
    >
      <Row>
        <Col xs={6}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.suppliers.symbol" />}
            value={supplier.supplierSymbol}
          />
        </Col>
        <Col xs={6}>
          <KeyValue label={<FormattedMessage id="ui-rs.suppliers.rotaStatus" />}>
            {supplier.supplierStatus && (
              <FormattedMessage
                id={`ui-rs.suppliers.status.${supplier.supplierStatus}`}
                defaultMessage={supplier.supplierStatus}
              />
            )}
          </KeyValue>
        </Col>
      </Row>
      <Row>
        <Col xs={6}>
          <KeyValue label={<FormattedMessage id="ui-rs.suppliers.lastStatus" />}>
            {supplier.lastStatus && (
              <FormattedMessage
                id={`stripes-reshare.iso18626.Status.${supplier.lastStatus}`}
                defaultMessage={supplier.lastStatus}
              />
            )}
          </KeyValue>
        </Col>
        {reasonUnfilled && (
          <Col xs={6}>
            <KeyValue label={<FormattedMessage id="ui-rs.suppliers.reasonUnfilled" />}>
              <FormattedMessage
                id={`stripes-reshare.iso18626.ReasonUnfilled.${reasonUnfilledCode(reasonUnfilled)}`}
                defaultMessage={reasonUnfilled}
              />
            </KeyValue>
          </Col>
        )}
      </Row>
      {note && (
        <Row>
          <Col xs={12}>
            <KeyValue label={<FormattedMessage id="ui-rs.suppliers.note" />}>
              <div className={css.supplierNote}>{note}</div>
            </KeyValue>
          </Col>
        </Row>
      )}
    </Card>
  );
};

// The rota: every supplier located for this request, tried or skipped. The
// broker scopes it to the requesting tenant, answering others with an empty
// list, so this is a borrowing-side section.
const Suppliers = ({ record = {} }) => {
  const requesterRequestId = record.requesterRequestId;

  const suppliersQuery = useOkapiQuery('broker/located_suppliers', {
    searchParams: { requester_req_id: requesterRequestId },
    enabled: !!requesterRequestId && record.side === 'borrowing',
    staleTime: 2 * 60 * 1000,
    useErrorBoundary: false,
    notifyOnChangeProps: 'tracked',
  });
  const suppliers = Array.isArray(suppliersQuery.data?.items) ? suppliersQuery.data.items : [];

  // Keep the hook order stable if navigation changes the request side.
  if (record.side !== 'borrowing') return null;

  let body = <Loading />;
  if (suppliersQuery.isError) {
    body = <FormattedMessage id="ui-rs.suppliers.error" />;
  } else if (!requesterRequestId || (suppliersQuery.isSuccess && suppliers.length === 0)) {
    body = <FormattedMessage id="ui-rs.suppliers.empty" />;
  } else if (suppliersQuery.isSuccess) {
    // The broker orders by ordinal. Number the cards by position rather than by
    // ordinal itself: ordinals are 0-based and carry on past the existing rota
    // when the locator runs again on retry.
    body = suppliers.map((supplier, i) => (
      <SupplierCard key={supplier.id} supplier={supplier} position={i + 1} />
    ));
  }

  return (
    <Accordion
      id="suppliers"
      label={<FormattedMessage id="ui-rs.information.heading.suppliers" />}
    >
      {body}
    </Accordion>
  );
};

export default Suppliers;
