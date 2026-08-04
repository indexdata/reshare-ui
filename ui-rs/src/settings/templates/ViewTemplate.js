import React, { useContext, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import {
  Button,
  Col,
  ConfirmationModal,
  Editor,
  KeyValue,
  Pane,
  Row,
} from '@folio/stripes/components';
import { CalloutContext } from '@folio/stripes/core';
import { DirectLink, useOkapiKy, useOkapiQuery, useCloseDirect } from '@projectreshare/stripes-reshare';

import css from './ViewTemplate.css';

const ViewTemplate = ({ match }) => {
  const { id } = match.params;
  const intl = useIntl();
  const okapiKy = useOkapiKy();
  const queryClient = useQueryClient();
  const callout = useContext(CalloutContext);
  const close = useCloseDirect();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isSuccess } = useOkapiQuery(`broker/templates/${id}`);

  const remover = useMutation({
    mutationFn: () => okapiKy.delete(`broker/templates/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries('broker/templates');
      close();
    },
    onError: () => callout?.sendCallout({
      type: 'error',
      message: <FormattedMessage id="ui-rs.settings.templates.delete.error" />,
    }),
  });

  if (!isSuccess) return null;

  const isHtml = data.contentType === 'html';

  return (
    <Pane
      defaultWidth="fill"
      paneTitle={data.title}
      onClose={close}
      dismissible
      actionMenu={({ onToggle }) => (
        <>
          <DirectLink
            component={Button}
            buttonStyle="dropdownItem"
            onClick={onToggle}
            to={`${match.url}/edit`}
          >
            <FormattedMessage id="ui-rs.edit" />
          </DirectLink>
          <Button
            buttonStyle="dropdownItem"
            onClick={() => { onToggle(); setConfirmDelete(true); }}
          >
            <FormattedMessage id="ui-rs.delete" />
          </Button>
        </>
      )}
    >
      <Row>
        <Col xs={12} md={6}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.settings.templates.field.purpose" />}
            value={intl.formatMessage({ id: `ui-rs.settings.templates.purpose.${data.purpose}`, defaultMessage: data.purpose })}
          />
          <KeyValue
            label={<FormattedMessage id="ui-rs.settings.templates.field.labels" />}
            value={(data.labels ?? []).join(', ')}
          />
          <KeyValue
            label={<FormattedMessage id="ui-rs.settings.templates.field.audience" />}
            value={<FormattedMessage id={`ui-rs.settings.templates.audience.${data.audience || 'both'}`} />}
          />
        </Col>
        <Col xs={12} md={6}>
          {/* Pull slips have no subject; showing a blank row would imply one is missing. */}
          {data.purpose !== 'pullslip' && (
            <KeyValue
              label={<FormattedMessage id="ui-rs.settings.templates.field.subject" />}
              value={data.subject}
            />
          )}
          <KeyValue
            label={<FormattedMessage id="ui-rs.settings.templates.field.contentType" />}
            value={intl.formatMessage({ id: `ui-rs.settings.templates.contentType.${data.contentType}`, defaultMessage: data.contentType })}
          />
        </Col>
      </Row>
      <Row>
        <Col xs={12}>
          <KeyValue label={<FormattedMessage id="ui-rs.settings.templates.field.body" />} />
          {/* Rendered through the editor rather than injected as raw HTML: staff-authored
              markup is untrusted and nothing in the tree sanitizes it. */}
          {isHtml
            ? <Editor id="template-body-view" value={data.body} readOnly onChange={() => {}} />
            : <pre id="template-body-view" className={css.bodyText}>{data.body}</pre>}
        </Col>
      </Row>
      <ConfirmationModal
        open={confirmDelete}
        heading={<FormattedMessage id="ui-rs.settings.templates.delete.heading" />}
        message={<FormattedMessage id="ui-rs.settings.templates.delete.message" values={{ title: data.title }} />}
        confirmLabel={<FormattedMessage id="ui-rs.delete" />}
        onConfirm={() => { setConfirmDelete(false); remover.mutate(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Pane>
  );
};

export default ViewTemplate;
