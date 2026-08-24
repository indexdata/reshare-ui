import React, { useEffect, useMemo, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Field, useForm, useFormState } from 'react-final-form';
import {
  Accordion,
  AccordionSet,
  Col,
  Select,
  Row,
  TextField,
} from '@folio/stripes/components';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import PropTypes from 'prop-types';
import SymbolsField from './SymbolsField';
import { required } from '../util/validators';
import AddressesField from './AddressesField';

const types = [
  {
    label: 'Institution',
    value: 'Institution'
  },
  {
    label: 'Consortium',
    value: 'Consortium'
  },
  {
    label: 'Branch',
    value: 'Branch'
  }
];

const normalizeList = data => {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.items || [];
};

const entryLabel = entry => entry?.name || entry?.id || '';

const parseParent = value => value || undefined;

const formatParent = value => value || '';

const validateParent = (value, values) => (
  values.type === 'Branch' ? required(value) : undefined
);

const ParentField = () => {
  const intl = useIntl();
  const form = useForm();
  const { values } = useFormState({ subscription: { values: true } });
  const isConsortium = values.type === 'Consortium';
  const isBranch = values.type === 'Branch';
  const parentType = isBranch ? 'Institution' : values.type === 'Institution' ? 'Consortium' : undefined;
  const previousTypeRef = useRef(values.type);

  const parentEntriesQuery = useOkapiQuery('directory/entries', {
    enabled: !!parentType,
    staleTime: 2 * 60 * 1000,
    searchParams: {
      cql: `type=${parentType}`,
      limit: '1000',
    },
  });

  const parentEntries = useMemo(
    () => normalizeList(parentEntriesQuery.data),
    [parentEntriesQuery.data]
  );

  const parentOptions = useMemo(() => [
    {
      label: intl.formatMessage({ id: 'ui-rsdir.entry.parent.select' }),
      value: '',
    },
    ...parentEntries
      .filter(entry => entry.id)
      .map(entry => ({
        label: entryLabel(entry),
        value: entry.id,
      })),
  ], [intl, parentEntries]);

  useEffect(() => {
    const typeChanged = previousTypeRef.current !== values.type;

    if (values.parent && (isConsortium || typeChanged)) {
      form.change('parent', undefined);
    }

    previousTypeRef.current = values.type;
  }, [form, isConsortium, values.parent, values.type]);

  return (
    <Field
      name="parent"
      component={Select}
      dataOptions={parentOptions}
      disabled={!parentType || !parentEntriesQuery.isSuccess}
      format={formatParent}
      label={<FormattedMessage id="ui-rsdir.entry.parent" />}
      parse={parseParent}
      required={isBranch}
      validate={validateParent}
    />
  );
};

const EntryForm = ({ addressPlugin }) => {
  return (
    <AccordionSet>
      <Accordion
        id="entry-info"
        label={<FormattedMessage id="ui-rsdir.entries.info" />}
      >
        <Row>
          <Col xs={6}>
            <Field
              name="name"
              component={TextField}
              label={<FormattedMessage id="ui-rsdir.entry.name" />}
              required
              validate={required}
            />
          </Col>
          <Col xs={6}>
            <Field
              name="type"
              component={Select}
              label={<FormattedMessage id="ui-rsdir.entry.type" />}
              required
              dataOptions={types}
              validate={required}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <ParentField />
          </Col>
          <Col xs={6}>
            <Field
              name="description"
              component={TextField}
              label={<FormattedMessage id="ui-rsdir.entry.description" />}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <Field
              name="organizationId"
              component={TextField}
              label={<FormattedMessage id="ui-rsdir.entry.organizationId" />}
            />
          </Col>
          <Col>
            <Field
              name="contactName"
              component={TextField}
              label={<FormattedMessage id="ui-rsdir.entry.contactName" />}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <Field
              name="email"
              component={TextField}
              label={<FormattedMessage id="ui-rsdir.entry.email" />}
            />
          </Col>
          <Col>
            <Field
              name="phoneNumber"
              component={TextField}
              label={<FormattedMessage id="ui-rsdir.entry.phoneNumber" />}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <SymbolsField />
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <AddressesField addressPlugin={addressPlugin} />
          </Col>
        </Row>
      </Accordion>
    </AccordionSet>
  );
};

EntryForm.propTypes = {
  addressPlugin: PropTypes.shape({
    addressFields: PropTypes.elementType.isRequired,
  }).isRequired,
};

export default EntryForm;
