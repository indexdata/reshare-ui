import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Card, KeyValue } from '@folio/stripes/components';

const ItemCard = ({ request }) => {
  const { bibliographicInfo, publicationInfo } = request.illRequest ?? {};

  return (
    <Card
      id="item-card"
      headerStart={<strong><FormattedMessage id="ui-update.item" /></strong>}
      roundedBorder
    >
      <KeyValue label={<FormattedMessage id="ui-update.item.title" />} value={bibliographicInfo?.title} />
      <KeyValue label={<FormattedMessage id="ui-update.item.author" />} value={bibliographicInfo?.author} />
      <KeyValue label={<FormattedMessage id="ui-update.item.date" />} value={publicationInfo?.publicationDate} />
    </Card>
  );
};

export default ItemCard;
