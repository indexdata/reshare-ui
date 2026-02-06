import React, { useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { Field, useForm, useFormState } from 'react-final-form';
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
import { useSetting } from '@projectreshare/stripes-reshare';
import { SERVICE_TYPE_COPY, SERVICE_TYPE_LOAN } from '../../constants/serviceType';

const PatronRequestForm = ({ autopopulate, copyrightTypes, enabledFields,
  serviceLevels, publicationTypes, locations, requesters, tiersByRequester, onSISelect, operation, patronRequest }) => {
  const { change } = useForm();
  const { values } = useFormState();
  const isCopyReq = values?.serviceInfo?.serviceType === SERVICE_TYPE_COPY;
  const stripes = useStripes();
  const EDIT = 'update';

  const currentRequester = values.requesterSymbol?.value ?? requesters[0];
  const tiers = tiersByRequester?.[currentRequester]?.filter(tier => tier.type?.toLowerCase() === values.serviceType?.value) ?? [];
  const showCost = stripes.config?.reshare?.showCost;
  const useTiers = stripes.config?.reshare?.useTiers;
  const resetTier = () => { if (useTiers) change('tier', undefined); };
  const tier = useTiers && values.tier ? tiers.find(t => t.id === values.tier) : undefined;
  useEffect(() => {
    // When using tiers we want the cost/level from the selected tier except when we're editing as we may then be
    // displaying a higher cost from an accepted condition and won't be able to select a different tier as that's
    // not editable once a request is submitted.
    if (tier && operation !== EDIT) {
      if (showCost) change('maximumCostsMonetaryValue', tier?.cost);
      change('serviceLevel.value', tier?.level?.toLowerCase());
    }
  }, [change, operation, showCost, tier]);

  // TODO: Broker API
  // const freePickupLocation = useSetting('free_text_pickup_location');
  // const ncipBorrowerCheck = useSetting('borrower_check', 'hostLMSIntegration');
  // const routingAdapterSetting = useSetting('routing_adapter');
  const freePickupLocation = { value: 'no', isSuccess: true };
  const ncipBorrowerCheck = { value: 'none', isSuccess: true };
  const routingAdapterSetting = { value: 'disabled', isSuccess: true };

  useEffect(() => {
    if (locations?.length === 1) {
      change('pickupLocationSlug', locations[0]?.value);
    }
  }, [locations, change]);

  if ([freePickupLocation, ncipBorrowerCheck, routingAdapterSetting].some(v => v.isSuccess !== true)) return null;

  function applyDisabledToFields(children) {
    return React.Children.map(children, child => {
      if (!React.isValidElement(child)) return child;

      if (child.type === Field) {
        const { name, disabled } = child.props;

        // Only apply if "disabled" is not already set
        if (disabled === undefined && name !== undefined) {
          return React.cloneElement(child, {
            disabled: !enabledFields.includes(name),
            // Can't fulfil the validation if you can't change the field from its current value
            validate: undefined,
          });
        }
        return child;
      }

      // If it has children, recursively process them
      if (child.props && child.props.children) {
        const newChildren = applyDisabledToFields(child.props.children);
        return React.cloneElement(child, {}, newChildren);
      }

      return child;
    });
  }

  const requestForm = (
    <AccordionSet>
      <Row>
        <Col xs={4}>
          <Field
            id="edit-request-metadata-requestingUser"
            name="patronInfo.patronId"
            label={<FormattedMessage id="ui-rs.information.requestingUser" />}
            component={TextField}
            required={(ncipBorrowerCheck?.value && ncipBorrowerCheck?.value !== 'none')}
            validate={(ncipBorrowerCheck?.value && ncipBorrowerCheck?.value !== 'none') && required}
          />
        </Col>
        <Col xs={2}>
          <Field
            id="edit-request-metadata-neededBy"
            name="serviceInfo.needBeforeDate"
            dateFormat="YYYY-MM-DD"
            label={<FormattedMessage id="ui-rs.information.dateNeeded" />}
            component={Datepicker}
          />
        </Col>
        { freePickupLocation.value !== 'yes' &&
        <Col xs={4}>
          <Field
            id="edit-request-metadata-pickupLocation"
            name={routingAdapterSetting?.value === 'disabled' ? 'pickupLocation' : 'pickupLocationSlug'}
            label={<FormattedMessage id="ui-rs.information.pickupLocation" />}
            placeholder=" "
            component={Select}
            dataOptions={locations}
          />
        </Col>
        }
        { freePickupLocation.value === 'yes' &&
        <Col xs={4}>
          <Field
            id="edit-request-metadata-pickupLocation"
            name="pickupLocation"
            label={<FormattedMessage id="ui-rs.information.pickupLocation" />}
            component={TextField}
          />
        </Col>
        }
        <Col xs={2}>
          <Label><FormattedMessage id="ui-rs.information.serviceType" /></Label>
          <Field
            component={RadioButton}
            inline
            onClick={resetTier}
            label={<FormattedMessage id="ui-rs.information.serviceType.loan" />}
            name="serviceInfo.serviceType"
            type="radio"
            value={SERVICE_TYPE_LOAN}
          />
          <Field
            component={RadioButton}
            inline
            onClick={resetTier}
            label={<FormattedMessage id="ui-rs.information.serviceType.copy" />}
            name="serviceInfo.serviceType"
            type="radio"
            value={SERVICE_TYPE_COPY}
          />
        </Col>
      </Row>
      { (ncipBorrowerCheck?.value === 'none' || !ncipBorrowerCheck?.value) && (
      <Row>
        <Col xs={4}>
          <Field
            id="edit-request-metadata-patronGivenName"
            name="patronInfo.givenName"
            label={<FormattedMessage id="ui-rs.information.patronGivenName" />}
            component={TextField}
            required
            validate={required}
          />
        </Col>
        <Col xs={4}>
          <Field
            id="edit-request-metadata-patronSurname"
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
            id="edit-request-metadata-patronEmail"
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
      { (requesters.length > 1 && operation !== EDIT) && (
        <Row>
          <Col xs={3}>
            <Field
              id="edit-request-metadata-requestingInstitution"
              name="requesterSymbol"
              label={<FormattedMessage id="ui-rs.information.requestingInstitution" />}
              placeholder=" "
              component={Select}
              dataOptions={requesters}
              required
              validate={required}
            />
          </Col>
        </Row>
      )}
      { ((patronRequest?.stateModel?.shortcode === 'SLNPRequester' || patronRequest?.stateModel?.shortcode === 'SLNPNonReturnableRequester')
        && operation === EDIT) && (
        <Row>
          <Col xs={3}>
            <Field
              id="edit-request-metadata-requestingInstitution"
              name="requesterSymbol"
              label={<FormattedMessage id="ui-rs.information.requestingInstitution" />}
              component={TextField}
              disabled
            />
          </Col>
        </Row>
      )

      }
      <Row>
        <Col xs={3}>
          <Field
            id="edit-request-metadata-patronNote"
            name="serviceInfo.note"
            label={<FormattedMessage id="ui-rs.information.notes" />}
            component={TextArea}
            rows={5}
            maxLength={255}
          />
        </Col>
        <Col xs={3}>
          <Field
            id="edit-request-metadata-localNote"
            name="localNote"
            label={<FormattedMessage id="ui-rs.information.localNote" />}
            component={TextArea}
            rows={5}
          />
        </Col>
        {/* TODO: Broker API */}
        {/* <Col xs={3}>
          {useTiers &&
            <Row>
              <Col xs={12}>
                <Field
                  id="edit-request-metadata-tier"
                  name="tier"
                  placeholder=" "
                  label={<FormattedMessage id="ui-rs.information.tier" />}
                  component={Select}
                  dataOptions={tiers}
                  required
                  validate={required}
                />
              </Col>
            </Row>
          }
          <Row>
            <Col xs={6}>
              <Field
                id="edit-request-metadata-serviceLevel"
                name="serviceLevel.value"
                label={<FormattedMessage id="ui-rs.information.serviceLevel" />}
                placeholder=" "
                component={Select}
                dataOptions={serviceLevels}
                disabled={useTiers}
                validate={required}
              />
            </Col>
            {showCost &&
              <Col xs={6}>
                <Field
                  id="edit-request-metadata-maximumCostsMonetaryValue"
                  name="maximumCostsMonetaryValue"
                  label={<FormattedMessage id="ui-rs.information.maximumCost" />}
                  component={TextField}
                  disabled={useTiers}
                />
              </Col>
            }
          </Row>
        </Col>
        {isCopyReq &&
        <Col xs={3}>
          <Field
            id="edit-request-metadata-copyright-type"
            name="copyrightType.value"
            label={<FormattedMessage id="ui-rs.information.copyrightType" />}
            placeholder=" "
            component={Select}
            dataOptions={copyrightTypes}
            required
            validate={required}
          />
        </Col>
        } */}
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
              id="edit-patron-request-systemInstanceIdentifier"
              name="systemInstanceIdentifier"
              label={<FormattedMessage id="ui-rs.information.systemInstanceIdentifier" />}
              component={TextField}
              endControl={
                // The padding on endControl the necessitates this margin when using Button rather than IconButton
                // will be removed soon, perhaps Quesnelia
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
              id="edit-patron-request-title"
              name="bibliographicInfo.title"
              label={<FormattedMessage id="ui-rs.information.title" />}
              component={TextField}
              required
              validate={required}
            />
          </Col>
          <Col xs={4}>
            <Field
              id="edit-patron-request-subtitle"
              name="bibliographicInfo.subtitle"
              label={<FormattedMessage id="ui-rs.information.subtitle" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              id="edit-patron-request-author"
              name="bibliographicInfo.author"
              label={<FormattedMessage id="ui-rs.information.author" />}
              component={TextField}
              required
              validate={required}
            />
          </Col>
          <Col xs={4}>
            <Field
              id="edit-patron-request-isbn"
              name="identifiers.ISBN"
              label={<FormattedMessage id="ui-rs.information.isbn" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              id="edit-patron-request-issn"
              name="identifiers.ISSN"
              label={<FormattedMessage id="ui-rs.information.issn" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              id="edit-patron-request-oclcNumber"
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
              id="edit-patron-request-title-of-component"
              name="bibliographicInfo.titleOfComponent"
              label={<FormattedMessage id="ui-rs.information.titleOfComponent" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              id="edit-patron-request-author-of-component"
              name="bibliographicInfo.authorOfComponent"
              label={<FormattedMessage id="ui-rs.information.authorOfComponent" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              id="edit-request-metadata-volume"
              name="bibliographicInfo.volume"
              label={<FormattedMessage id="ui-rs.information.volume" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              id="edit-patron-request-issue"
              name="bibliographicInfo.issue"
              label={<FormattedMessage id="ui-rs.information.issue" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              id="edit-patron-request-pages"
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
              id="edit-patron-request-publisher"
              name="publicationInfo.publisher"
              label={<FormattedMessage id="ui-rs.information.publisher" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              id="edit-patron-request-publicationDate"
              name="publicationInfo.publicationDate"
              label={<FormattedMessage id="ui-rs.information.date" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              id="edit-patron-request-placeOfPublication"
              name="publicationInfo.placeOfPublication"
              label={<FormattedMessage id="ui-rs.information.placeOfPublication" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              id="edit-patron-request-edition"
              name="bibliographicInfo.edition"
              label={<FormattedMessage id="ui-rs.information.edition" />}
              component={TextField}
            />
          </Col>
          <Col xs={4}>
            <Field
              id="edit-patron-request-publicationType"
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

  if (Array.isArray(enabledFields)) {
    return applyDisabledToFields(requestForm);
  } else {
    return requestForm;
  }
};

export default PatronRequestForm;
