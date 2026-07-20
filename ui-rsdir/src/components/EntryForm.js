import React, { useEffect, useMemo } from 'react';
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

const ParentField = () => {
  const intl = useIntl();
  const form = useForm();
  const { values } = useFormState({ subscription: { values: true } });
  const isConsortium = values.type === 'Consortium';
  const consortiumEntriesPath = useMemo(() => {
    const params = new URLSearchParams();

    /*
    params.append('q', 'type=Consortium');
    params.append('limit', '1000');
    */
    return `rsdir/entries?${params.toString()}`;
  }, []);

  const consortiumEntriesQuery = useOkapiQuery(consortiumEntriesPath, {
    staleTime: 2 * 60 * 1000,
    searchParams: {
      q: 'type=Consortium',
      limit: '1000',
    },
  });

  const consortiumEntries = useMemo(
    () => normalizeList(consortiumEntriesQuery.data),
    [consortiumEntriesQuery.data]
  );

  const parentOptions = useMemo(() => [
    {
      label: intl.formatMessage({ id: 'ui-rsdir.entry.parent.select' }),
      value: '',
    },
    ...consortiumEntries
      .filter(entry => entry.id)
      .map(entry => ({
        label: entryLabel(entry),
        value: entry.id,
      })),
  ], [consortiumEntries, intl]);

  useEffect(() => {
    if (isConsortium && values.parent) {
      form.change('parent', undefined);
    }
  }, [form, isConsortium, values.parent]);

  return (
    <Field
      name="parent"
      component={Select}
      dataOptions={parentOptions}
      disabled={isConsortium || !consortiumEntriesQuery.isSuccess}
      format={formatParent}
      label={<FormattedMessage id="ui-rsdir.entry.parent" />}
      parse={parseParent}
    />
  );
};

const EntryForm = () => {
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
            <AddressesField />
          </Col>
        </Row>
      </Accordion>
    </AccordionSet>
  );
};

export default EntryForm;
