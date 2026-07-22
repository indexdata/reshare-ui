import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useLocation } from 'react-router-dom';

import { Headline, Layout } from '@folio/stripes/components';
import { DirectLink, useGetSIURL } from '@projectreshare/stripes-reshare';

import css from './Flow.css';

const TitleAndSILink = ({ request }) => {
  const location = useLocation();
  const systemInstanceIdentifier = request?.illRequest?.bibliographicInfo?.supplierUniqueRecordId;
  const getSIURL = useGetSIURL();
  const siURL = systemInstanceIdentifier ? getSIURL(systemInstanceIdentifier) : null;
  const inventoryLink = siURL ? (
    <a
      target="_blank"
      rel="noopener noreferrer"
      href={siURL}
    >
      <FormattedMessage id="ui-rs.flow.info.viewInSharedIndex" />
    </a>
  ) : null;

  return (
    <Layout className={css.title_headline}>
      <Headline margin="none" size="xx-large" tag="h2" weight="regular">
        <strong>{`${request.requesterRequestId || request.id}: `}</strong>
        {request?.illRequest?.bibliographicInfo?.title || ''}
      </Headline>
      <Layout className={css.title_links}>
        { request.prevReqId &&
          <DirectLink to={location.pathname.replace(request.id, request.prevReqId)} preserveSearch><FormattedMessage id="ui-rs.flow.info.precededByLink" /></DirectLink>
        }
        { request.nextReqId &&
          <DirectLink to={location.pathname.replace(request.id, request.nextReqId)} preserveSearch><FormattedMessage id="ui-rs.flow.info.succeededByLink" /></DirectLink>
        }
        {inventoryLink}
      </Layout>
    </Layout>
  );
};

export default TitleAndSILink;
