import React, { useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Form, Field } from 'react-final-form';
import { Layout, MessageBanner, Modal, Row, Col, Pane, Paneset, PaneHeader, PaneHeaderIconButton, PaneMenu, Select, TextField, Tooltip } from '@folio/stripes/components';

import ScanList from '../components/ScanList';
import SelectedRequest from '../components/SelectedRequest';
import scanActions from '../scanActions';
import STATUS from '../scanStatus';
import { answerPrompt, dismissPrompt, selectScan, setAction, useScanState } from '../scanStore';
import useScan from '../useScan';
import css from './ScanRoute.css';
import emptyPlaceholder from '../update-empty.svg';

const SIDE_GROUPS = [
  { side: 'borrowing', label: 'ui-update.action.asRequester' },
  { side: 'lending', label: 'ui-update.action.asSupplier' },
];

const actionLabel = (action) => <FormattedMessage id={`stripes-reshare.actions.${action}`} />;

const ScanError = ({ error }) => (error.messageId ? <FormattedMessage id={error.messageId} /> : error.message);

const ScanRoute = () => {
  const intl = useIntl();
  const { action, scans, scanData, selected, prompt } = useScanState();
  const scan = useScan();
  const scanInput = useRef();
  const itemInput = useRef();
  const selData = scanData[selected];
  const selReq = selData?.request;
  const promptData = scanData[prompt];
  const lookupFailed = promptData?.status === STATUS.FAIL;

  const actionChange = e => {
    setAction(e.target.value);
    scanInput.current.focus();
  };

  const onSubmit = ({ hrid }, form) => {
    // Clear the field at once so the next request can be scanned while this one runs.
    form.initialize({});
    if (hrid?.trim()) scan(hrid.trim());
  };

  return (
    <Paneset>
      <Pane
        defaultWidth="fill"
        renderHeader={renderProps => (
          <PaneHeader
            renderProps={renderProps}
            header={(
              <Row style={{ width: '100%' }}>
                <Col xs={6}>
                  <Select
                    aria-label={intl.formatMessage({ id: 'ui-update.action' })}
                    onChange={actionChange}
                    value={action}
                    marginBottom0
                  >
                    {SIDE_GROUPS.map(({ side, label }) => (
                      <optgroup key={side} label={intl.formatMessage({ id: label })}>
                        {scanActions.filter(a => a.side === side).map(({ action: a }) => (
                          <option key={a} value={a}>{intl.formatMessage({ id: `stripes-reshare.actions.${a}` })}</option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                </Col>
                <Col xs={6}>
                  <Form
                    onSubmit={onSubmit}
                    render={({ handleSubmit }) => (
                      <form onSubmit={handleSubmit} autoComplete="off">
                        <Field
                          name="hrid"
                          component={TextField}
                          marginBottom0
                          inputRef={scanInput}
                          autoFocus
                          aria-label={intl.formatMessage({ id: 'ui-update.scanPlaceholder' })}
                          placeholder={intl.formatMessage({ id: 'ui-update.scanPlaceholder' })}
                        />
                      </form>
                    )}
                  />
                </Col>
              </Row>
            )}
          />
        )}
      >
        {scans.length > 0 &&
          <ScanList
            scans={scans}
            scanData={scanData}
            selectedScan={selected}
            onRowClick={(e, row) => selectScan(row.id)}
          />
        }
      </Pane>
      {!selData && (
        <Pane
          defaultWidth="40%"
          renderHeader={null}
          padContent={false}
        >
          <div className={css.emptyPlaceholder}>
            <img src={emptyPlaceholder} alt="" />
            <Layout className="marginTop1"><FormattedMessage id="ui-update.placeholder" /></Layout>
          </div>
        </Pane>
      )}
      {selData && (
        <Pane
          defaultWidth="40%"
          renderHeader={renderProps => (
            <PaneHeader
              {...renderProps}
              paneTitle={selData.barcode}
            />
          )}
          lastMenu={selReq?.id &&
            <PaneMenu>
              <Tooltip
                id="ui-update-request-link-tooltip"
                text={<FormattedMessage id="ui-update.requestLink" />}
              >
                {({ ref, ariaIds }) => (
                  <PaneHeaderIconButton
                    key="icon-request"
                    icon="document"
                    to={`/${selReq.side === 'lending' ? 'supply' : 'request'}/requests/${selReq.id}`}
                    aria-labelledby={ariaIds.text}
                    ref={ref}
                  />
                )}
              </Tooltip>
            </PaneMenu>
          }
        >
          {selData.status === STATUS.SUCCESS && (
            <Layout className="padding-bottom-gutter">
              <MessageBanner type="success">
                <FormattedMessage id="stripes-reshare.actions.generic.success" values={{ action: actionLabel(selData.action) }} />
              </MessageBanner>
            </Layout>
          )}
          {selData.status === STATUS.FAIL && (
            <Layout className="padding-bottom-gutter">
              <MessageBanner type="error">
                <FormattedMessage
                  id="stripes-reshare.actions.generic.error"
                  values={{ action: actionLabel(selData.action), errMsg: <ScanError error={selData.error} /> }}
                />
              </MessageBanner>
            </Layout>
          )}
          {selReq && <SelectedRequest key={selected} initialRequest={selReq} />}
        </Pane>
      )}
      <Modal
        open={prompt !== null}
        onOpen={() => itemInput.current?.focus()}
        onClose={() => dismissPrompt()}
        label={<FormattedMessage id="ui-update.itemPrompt" values={{ barcode: promptData?.barcode }} />}
        dismissible
        restoreFocus
      >
        {/* A failed lookup leaves the prompt open to catch the item scan, so say why it will go nowhere. */}
        {lookupFailed && (
          <Layout className="padding-bottom-gutter">
            <MessageBanner type="error">
              <FormattedMessage id="ui-update.itemPrompt.lookupFailed" values={{ errMsg: <ScanError error={promptData.error} /> }} />
            </MessageBanner>
          </Layout>
        )}
        <Form
          onSubmit={({ itemBarcode }) => { if (itemBarcode?.trim()) answerPrompt(itemBarcode.trim()); }}
          render={({ handleSubmit }) => (
            <form onSubmit={handleSubmit} autoComplete="off">
              <Field
                name="itemBarcode"
                inputRef={itemInput}
                component={TextField}
                aria-label={intl.formatMessage({ id: 'ui-update.itemBarcode' })}
                placeholder={lookupFailed ? intl.formatMessage({ id: 'ui-update.itemPrompt.lookupFailedPlaceholder' }) : undefined}
                autoFocus
              />
            </form>
          )}
        />
      </Modal>
    </Paneset>
  );
};

export default ScanRoute;
