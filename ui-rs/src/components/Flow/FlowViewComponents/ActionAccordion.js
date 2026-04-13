import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Layout, Accordion } from '@folio/stripes/components';
import kebabToPascal from '../../../util/kebabToPascal';
import usePerformAction from '../../../util/usePerformAction';
import * as primaryActions from '../primaryActions';
import * as moreActions from '../moreActions';
import { actionMeta } from '../actionMeta';
import css from './Flow.css';

const ActionAccordion = ({ actions = [], request }) => {
  const performAction = usePerformAction(request, actions);
  const primaryActionObj = actions.find(a => a.primary);
  const primaryActionName = primaryActionObj?.name;
  const actionCodes = actions.map(a => a.name);

  const moreActionCodes = primaryActionName && actionMeta[primaryActionName]?.primaryOnly
    ? actionCodes.filter(a => a !== primaryActionName)
    : actionCodes;

  const PrimaryAction = primaryActionName
    ? (primaryActions[kebabToPascal(primaryActionName)] || primaryActions.Generic)
    : null;

  return (
    <Accordion
      id="Actions"
      label={<FormattedMessage id="ui-rs.flow.sections.actions" />}
    >
      <>
        {PrimaryAction &&
          <Layout className="padding-top-gutter">
            <PrimaryAction
              request={request}
              name={primaryActionName}
              performAction={performAction}
              withNote={primaryActionObj?.parameters?.includes('note')}
            />
          </Layout>
        }
        {moreActionCodes.length > 0 &&
          <Layout className={`padding-top-gutter ${css.optionList} ${css.noBorderRadius}`}>
            <strong><FormattedMessage id="ui-rs.flow.actions.moreOptions" /></strong>
            {moreActionCodes.map(name => {
              const MoreAction = moreActions[kebabToPascal(name)] || moreActions.Generic;

              return (
                <MoreAction
                  key={name}
                  name={name}
                  request={request}
                  performAction={performAction}
                  actions={actions}
                />
              );
            })}
          </Layout>
        }
      </>
    </Accordion>
  );
};

export default ActionAccordion;
