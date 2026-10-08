import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Card, KeyValue } from '@folio/stripes/components';
import { useGetSIURL } from '@projectreshare/stripes-reshare';

const ItemCard = ({ request }) => {
  const { bibliographicInfo, publicationInfo } = request.illRequest ?? {};
  const getSIURL = useGetSIURL();
  const siURL = getSIURL(bibliographicInfo?.supplierUniqueRecordId);

  return (
    <Card
      id="item-card"
      headerStart={<strong><FormattedMessage id="ui-update.item" /></strong>}
      headerEnd={siURL && (
        <a target="_blank" rel="noopener noreferrer" href={siURL}>
          <FormattedMessage id="stripes-reshare.viewInSharedIndex" />
        </a>
      )}
      roundedBorder
    >
      <KeyValue label={<FormattedMessage id="ui-update.item.title" />} value={bibliographicInfo?.title} />
      <KeyValue label={<FormattedMessage id="ui-update.item.author" />} value={bibliographicInfo?.author} />
      <KeyValue label={<FormattedMessage id="ui-update.item.date" />} value={publicationInfo?.publicationDate} />
    </Card>
  );
};

export default ItemCard;
