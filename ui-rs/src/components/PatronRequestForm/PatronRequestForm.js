import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Field, useFormState } from 'react-final-form';
import {
  AccordionSet,
  Accordion,
  Col,
  Row,
  Datepicker,
  Label,
  RadioButton,
  Select,
  TextArea,
  TextField,
} from '@folio/stripes/components';
import { required } from '@folio/stripes/util';
import { Pluggable, useStripes } from '@folio/stripes/core';

const PatronRequestForm = ({ autopopulate, selectOptions, onSISelect }) => {
  const { copyrightTypes, publicationTypes, locations } = selectOptions;
  const { values } = useFormState();
  const isCopyReq = values?.serviceInfo?.serviceType === 'Copy';
  const stripes = useStripes();

  // TODO: Broker API; stubbed until it can supply hostLMSIntegration's borrower_check
  const ncipBorrowerCheck = { value: 'none', isSuccess: true };

  if (ncipBorrowerCheck.isSuccess !== true) return null;

  return (
    <AccordionSet>
      <Row>
        <Col xs={4}>
          <Field
            name="patronInfo.patronId"
            label={<FormattedMessage id="ui-rs.information.requestingUser" />}
            component={TextField}
            required={(ncipBorrowerCheck?.value && ncipBorrowerCheck?.value !== 'none')}
            validate={(ncipBorrowerCheck?.value && ncipBorrowerCheck?.value !== 'none') && required}
          />
        </Col>
        <Col xs={2}>
          <Field
            name="serviceInfo.needBeforeDate"
            dateFormat="YYYY-MM-DD"
            label={<FormattedMessage id="ui-rs.information.dateNeeded" />}
            component={Datepicker}
          />
        </Col>
        <Col xs={4}>
          <Field
            name="pickupLocation"
            label={<FormattedMessage id="ui-rs.information.pickupLocation" />}
            placeholder=" "
            component={Select}
            dataOptions={locations}
          />
        </Col>
        <Col xs={2}>
          <Label><FormattedMessage id="ui-rs.information.serviceType" /></Label>
          <Field
            component={RadioButton}
            inline
            label={<FormattedMessage id="ui-rs.information.serviceType.Loan" />}
            name="serviceInfo.serviceType"
            type="radio"
            value="Loan"
          />
          <Field
            component={RadioButton}
            inline
            label={<FormattedMessage id="ui-rs.information.serviceType.Copy" />}
            name="serviceInfo.serviceType"
            type="radio"
            value="Copy"
          />
        </Col>
      </Row>
      { (ncipBorrowerCheck?.value === 'none' || !ncipBorrowerCheck?.value) && (
      <Row>
        <Col xs={4}>
          <Field
            name="patronInfo.givenName"
            label={<FormattedMessage id="ui-rs.information.patronGivenName" />}
            component={TextField}
            required
            validate={required}
          />
        </Col>
        <Col xs={4}>
          <Field
            name="patronInfo.surname"
            label={<FormattedMessage id="ui-rs.information.patronSurname" />}
            component={TextField}
            required
            validate={required}
          />
        </Col>
        {/* TODO: Broker API - patronEmail previously readOnly and populated from institution */}
        {/* <Col xs={4}>
          <Field
            name="patronInfo.patronEmail"
            label={<FormattedMessage id="ui-rs.information.patronEmail" />}
            component={TextField}
            required
            validate={required}
            readOnly
          />
        </Col> */}
      </Row>
      )}
      <Row>
        <Col xs={3}>
          <Field
            name="serviceInfo.note"
            label={<FormattedMessage id="ui-rs.information.notes" />}
            component={TextArea}
            rows={5}
            maxLength={255}
          />
        </Col>
        <Col xs={3}>
          <Field
            name="internalNote"
            label={<FormattedMessage id="ui-rs.information.internalNote" />}
            component={TextArea}
            rows={5}
          />
        </Col>
        {/* TODO: tiers pending directory endpoint to fetch entry corresponding to tenant */}
        {/* <Col xs={3}>
          <Field
            name="tier"
            placeholder=" "
            label={<FormattedMessage id="ui-rs.information.tier" />}
            component={Select}
            dataOptions={tiers}
            required
            validate={required}
          />
        </Col> */}
        {isCopyReq &&
        <Col xs={3}>
          <Field
            name="serviceInfo.copyrightCompliance['#text']"
            label={<FormattedMessage id="ui-rs.information.copyrightType" />}
            placeholder=" "
            component={Select}
            dataOptions={copyrightTypes}
            required
            validate={required}
          />
        </Col>
        }
      </Row>

      <Accordion
        label={<FormattedMessage id="ui-rs.information.heading.requestedTitle" />}
        displayWhenOpen={<Pluggable
          type="rs-siquery"
          endpoint={stripes.config?.reshare?.sharedIndex?.query}
          searchButtonStyle="primary marginBottom0"
          searchLabel={<FormattedMessage id="ui-rs.requestform.populateFromSI" />}
          selectInstance={onSISelect}
        />}
      >
        <Row>
          <Col xs={8}>
            <Field
              name="systemInstanceIdentifier"
              label={<FormattedMessage id="ui-rs.information.systemInstanceIdentifier" />}
              component={TextField}
              endControl={
                // TextField endControl still has right padding as of Sunflower; offset it
                // when using Button rather than IconButton so the button sits flush.
                <span style={{ marginRight: '-6px' }}>
                  <Pluggable
                    type="rs-siquery"
                    endpoint={stripes.config?.reshare?.sharedIndex?.query}
                    searchButtonStyle="noRadius primary marginBottom0"
                    searchLabel={<FormattedMessage id="ui-rs.requestform.populateById" />}
                    selectInstance={onSISelect}
                    specifiedId={values?.systemInstanceIdentifier}
                    autopopulate={autopopulate}
                    disabled={!values?.systemInstanceIdentifier}
                  />
                </span>
              }
            />
          </Col>
        </Row>
        <Row>
          <Col xs={4}>
            <Field
              name="bibliographicInfo.title"
              label={<FormattedMessage id="ui-rs.information.title" />}
              component={TextField}
              required
              validate={required}
            />
          </Col>
          <Col xs={4}>
            <Field
              name="bibliographicInfo.subtitle"
              label={<FormattedMessage id="ui-rs.information.subtitle" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              name="bibliographicInfo.author"
              label={<FormattedMessage id="ui-rs.information.author" />}
              component={TextField}
              required
              validate={required}
            />
          </Col>
          <Col xs={4}>
            <Field
              name="identifiers.ISBN"
              label={<FormattedMessage id="ui-rs.information.isbn" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              name="identifiers.ISSN"
              label={<FormattedMessage id="ui-rs.information.issn" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              name="identifiers.OCLC"
              label={<FormattedMessage id="ui-rs.information.oclcNumber" />}
              component={TextField}
            />
          </Col>
        </Row>
      </Accordion>
      <Accordion label={<FormattedMessage id="ui-rs.information.heading.partDetails" />}>
        <Row>
          <Col xs={4}>
            <Field
              name="bibliographicInfo.titleOfComponent"
              label={<FormattedMessage id="ui-rs.information.titleOfComponent" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              name="bibliographicInfo.authorOfComponent"
              label={<FormattedMessage id="ui-rs.information.authorOfComponent" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              name="bibliographicInfo.volume"
              label={<FormattedMessage id="ui-rs.information.volume" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              name="bibliographicInfo.issue"
              label={<FormattedMessage id="ui-rs.information.issue" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              name="bibliographicInfo.pagesRequested"
              label={<FormattedMessage id="ui-rs.information.pages" />}
              component={TextField}
            />
          </Col>
        </Row>
      </Accordion>
      <Accordion label={<FormattedMessage id="ui-rs.information.heading.publicationDetails" />}>
        <Row>
          <Col xs={4}>
            <Field
              name="publicationInfo.publisher"
              label={<FormattedMessage id="ui-rs.information.publisher" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              name="publicationInfo.publicationDate"
              label={<FormattedMessage id="ui-rs.information.date" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              name="publicationInfo.placeOfPublication"
              label={<FormattedMessage id="ui-rs.information.placeOfPublication" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              name="bibliographicInfo.edition"
              label={<FormattedMessage id="ui-rs.information.edition" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              name="publicationInfo.publicationType['#text']"
              label={<FormattedMessage id="ui-rs.information.publicationType" />}
              placeholder=" "
              component={Select}
              dataOptions={publicationTypes}
            />
          </Col>
        </Row>
      </Accordion>
    </AccordionSet>
  );
};

export default PatronRequestForm;
