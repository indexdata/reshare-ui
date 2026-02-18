import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Button, Layout, Accordion } from '@folio/stripes/components';
import renderNamedWithProps from '../../../util/renderNamedWithProps';
import * as moreActions from '../moreActions';
import css from './Flow.css';

const NOOP = () => {};

const ActionAccordion = ({ actions = [], request }) => {
  const actionCodes = actions.filter(Boolean);
  const primaryAction = actionCodes[0];

  return (
    <Accordion
      id="Actions"
      label={<FormattedMessage id="ui-rs.flow.sections.actions" />}
    >
      <>
        {primaryAction &&
          <Layout className="padding-top-gutter">
            <Button
              buttonStyle="primary mega"
              fullWidth
              onClick={NOOP}
            >
              <FormattedMessage id={`stripes-reshare.actions.${primaryAction}`} defaultMessage={primaryAction} />
            </Button>
          </Layout>
        }
        {actionCodes.length > 0 &&
          <Layout className={`padding-top-gutter ${css.optionList} ${css.noBorderRadius}`}>
            <strong><FormattedMessage id="ui-rs.flow.actions.moreOptions" /></strong>
            {renderNamedWithProps(actionCodes, moreActions, { request, performAction: NOOP }, moreActions.Generic)}
          </Layout>
        }
      </>
    </Accordion>
  );
};

export default ActionAccordion;
