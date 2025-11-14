import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation, useHistory } from 'react-router-dom';
import {
  Accordion,
  AccordionSet,
  Button,
  Col,
  KeyValue,
  Pane,
  PaneMenu,
  Row,
} from '@folio/stripes/components';
import { useCloseDirect, upNLevels } from '@projectreshare/stripes-reshare';

const ViewEntry = ({ entry }) => {
  const location = useLocation();
  const history = useHistory();
  const intl = useIntl();
  const close = useCloseDirect(upNLevels(location, 2));

  const formatSymbols = (symbols) => {
    if (!symbols || symbols.length === 0) return '';
    return symbols
      .map(s => `${s.authority}:${s.symbol}`)
      .join(', ');
  };

  const handleEdit = () => {
    history.push(`/rsdir/entries/edit/${entry.id}`);
  };

  return (
    <Pane
      defaultWidth="fill"
      paneTitle={entry.name || intl.formatMessage({ id: 'ui-rsdir.entries.info' })}
      onClose={close}
      dismissible
      lastMenu={
        <PaneMenu>
          <Button
            id="clickable-edit-entry"
            onClick={handleEdit}
            buttonStyle="primary paneHeaderNewButton"
            marginBottom0
          >
            <FormattedMessage id="ui-rsdir.edit" />
          </Button>
        </PaneMenu>
      }
    >
      <AccordionSet>
        <Accordion
          id="directory-entry-info"
          label={<FormattedMessage id="ui-rsdir.entries.info" />}
        >
          <Row>
            <Col xs={12}>
              <KeyValue
                label={<FormattedMessage id="ui-rsdir.entry.name" />}
                value={entry.name}
              />
            </Col>
          </Row>
          <Row>
            <Col xs={12}>
              <KeyValue
                label={<FormattedMessage id="ui-rsdir.entry.symbols" />}
                value={formatSymbols(entry.symbols)}
              />
            </Col>
          </Row>
        </Accordion>
      </AccordionSet>
    </Pane>
  );
};

export default ViewEntry;
