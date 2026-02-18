import React from 'react';
import { FormattedMessage } from 'react-intl';

import { Headline, Layout } from '@folio/stripes/components';
import { useGetSIURL } from '@projectreshare/stripes-reshare';

import css from './Flow.css';

const TitleAndSILink = ({ request }) => {
  const systemInstanceIdentifier = request?.illRequest?.bibliographicInfo?.bibliographicRecordId?.find(
    id => id?.bibliographicRecordIdentifierCode?.text === 'systemInstanceIdentifier'
  )?.bibliographicRecordIdentifier;
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
        {/* { request.precededBy &&
          <DirectLink to={`../${request.precededBy.id}`} preserveSearch><FormattedMessage id="ui-rs.flow.info.precededByLink" /></DirectLink>
        }
        { request.succeededBy &&
          <DirectLink to={`../${request.succeededBy.id}`} preserveSearch><FormattedMessage id="ui-rs.flow.info.succeededByLink" /></DirectLink>
        } */}
        {inventoryLink}
      </Layout>
    </Layout>
  );
};

export default TitleAndSILink;
