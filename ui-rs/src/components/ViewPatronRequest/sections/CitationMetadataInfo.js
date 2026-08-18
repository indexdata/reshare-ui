import React from 'react';
import { FormattedMessage } from 'react-intl';
import {
  Accordion,
  Card,
  Col,
  KeyValue,
  Row,
} from '@folio/stripes/components';

import { extractIdentifiers } from '../../../util/bibIdentifiers';
import css from './CitationMetadata.css';

// "Author (1998): Some Title", degrading to whichever parts are present.
const summarise = ({ title, author, publicationDate }) => {
  const cited = title || '[UNKNOWN]';
  if (!author) return cited;
  return `${publicationDate ? `${author} (${publicationDate})` : author}: ${cited}`;
};

const CitationMetadataInfo = ({ record }) => {
  const { bibliographicInfo = {}, publicationInfo = {} } = record?.illRequest ?? {};
  const {
    title,
    author,
    edition,
    titleOfComponent,
    authorOfComponent,
    volume,
    issue,
    pagesRequested,
  } = bibliographicInfo;
  const { publisher, publicationDate } = publicationInfo;
  const identifiers = extractIdentifiers(bibliographicInfo);

  return (
    <Accordion
      id="citationMetadataInfo"
      label={<FormattedMessage id="ui-rs.information.heading.citationMetadata" />}
    >
      <Card
        id="citationMetadataInfo-card"
        headerStart={summarise({ title, author, publicationDate })}
        roundedBorder
        cardClass={css.citationMetadataCard}
        headerClass={css.citationMetadataCardHeader}
      >
        <Row>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.title" />}
              value={title}
            />
          </Col>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.titleOfComponent" />}
              value={titleOfComponent}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.author" />}
              value={author}
            />
          </Col>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.authorOfComponent" />}
              value={authorOfComponent}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.edition" />}
              value={edition}
            />
          </Col>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.publisher" />}
              value={publisher}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={4}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.isbn" />}
              value={identifiers.ISBN}
            />
          </Col>
          <Col xs={4}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.issn" />}
              value={identifiers.ISSN}
            />
          </Col>
          <Col xs={4}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.oclcNumber" />}
              value={identifiers.OCLC}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.volume" />}
              value={volume}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.issue" />}
              value={issue}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.pages" />}
              value={pagesRequested}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.date" />}
              value={publicationDate}
            />
          </Col>
        </Row>
      </Card>
    </Accordion>
  );
};

export default CitationMetadataInfo;
