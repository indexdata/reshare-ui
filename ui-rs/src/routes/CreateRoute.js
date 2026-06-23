import React, { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import { Form } from 'react-final-form';
import { useMutation, useQueryClient } from 'react-query';
import { Prompt, useHistory, useLocation } from 'react-router-dom';
import { Button, Pane, Paneset, PaneFooter, KeyValue } from '@folio/stripes/components';
import { CalloutContext, useStripes } from '@folio/stripes/core';
import { useCloseDirect, useOkapiKy } from '@projectreshare/stripes-reshare';
import PatronRequestForm from '../components/PatronRequestForm';
import { CopyrightCompliance, ServiceLevel } from '../constants/iso18626';
import tiersBySymbol from '../util/tiersBySymbol';


const SI_FIELDS = ['title', 'author', 'edition', 'isbn', 'issn', 'oclcNumber', 'publisher', 'publicationDate', 'placeOfPublication', 'publicationType'];
const SI_FIELD_MAP = {
  title: 'bibliographicInfo.title',
  author: 'bibliographicInfo.author',
  edition: 'bibliographicInfo.edition',
  isbn: 'identifiers.ISBN',
  issn: 'identifiers.ISSN',
  oclcNumber: 'identifiers.OCLC',
  publisher: 'publicationInfo.publisher',
  publicationDate: 'publicationInfo.publicationDate',
  placeOfPublication: 'publicationInfo.placeOfPublication',
  publicationType: "publicationInfo.publicationType['#text']",
};

// state, tools parameters are from being used as Final Form "mutator" rather than called directly
const handleSISelect = (args, state, tools) => {
  const leader = args?.[0]?.__leader__;
  if (leader && leader?.[6] === 'a') {
    const stval = state.formState.values?.serviceInfo?.serviceType;
    const leaderField = leader?.[7];
    const pubTypeMatch = {
      'Loan' : {
        'a' : 'chapter',
        'b' : 'article',
        'm' : 'book',
        's' : 'journal'
      },
      'Copy' : {
        'a' : 'chapter',
        'b' : 'article',
        'm' : 'chapter',
        's' : 'article'
      }
    };

    if (stval in pubTypeMatch) {
      const pubTypeVal = pubTypeMatch[stval][leaderField];
      if (pubTypeVal) {
        args[0].publicationType = pubTypeVal;
      }
    }
  }

  Object.entries(args[0]).forEach(([field, value]) => {
    const mappedField = SI_FIELD_MAP[field] ?? field;
    tools.changeValue(state, mappedField, () => value);
  });

  SI_FIELDS.filter(field => !(field in args[0])).forEach(field => {
    const mappedField = SI_FIELD_MAP[field] ?? field;
    tools.changeValue(state, mappedField, () => undefined);
  });
};

const CreateRoute = () => {
  const history = useHistory();
  const routerLocation = useLocation();
  const callout = useContext(CalloutContext);
  const queryClient = useQueryClient();
  const okapiKy = useOkapiKy();
  const close = useCloseDirect();
  // We could provision these vocabs on the form directly but are passing them
  // in because they will end up requiring something from the backend as the
  // terms can vary by consortium.
  const copyrightTypes = CopyrightCompliance.map(value => ({ label: value, value }));
  const copyrightTypesLoaded = true;
  const serviceLevels = ServiceLevel.map(value => ({ label: value, value }));
  const serviceLevelsLoaded = true;
  const stripes = useStripes();

  // TODO: Broker API
  // const defaultRequesterSymbolSetting = useSetting('default_request_symbol', 'requests');
  // const routingAdapterSetting = useSetting('routing_adapter');
  const defaultRequesterSymbolSetting = { value: { label: 'Default', value: 'ISIL:DEFAULT' }, isSuccess: true };
  const routingAdapterSetting = { value: 'disabled', isSuccess: true };

  // const locationQuery = useOkapiQuery(
  //   'directory/entry',
  //   {
  //     searchParams: encodeURI('?filters=tags.value=i=pickup&filters=status.value==managed&perPage=1000'),
  //     kyOpt: { throwHttpErrors: false },
  //     useErrorBoundary: false,
  //     refetchOnWindowFocus: false,
  //     retryOnMount:false,
  //     enabled: routingAdapterSetting.isSuccess === true && routingAdapterSetting.value !== 'disabled'
  //   }
  // );
  const locationQuery = { isSuccess: true, data: [] };

  // const institutionQuery = useOkapiQuery(
  //   'directory/entry',
  //   {
  //     searchParams: encodeURI('?filters=type.value==institution&filters=status.value==managed&perPage=1000'),
  //     kyOpt: { throwHttpErrors: false },
  //     useErrorBoundary: false,
  //     refetchOnWindowFocus: false,
  //     retryOnMount:false,
  //     enabled: routingAdapterSetting.isSuccess === true && routingAdapterSetting.value !== 'disabled'
  //   }
  // );
  const institutionQuery = { isSuccess: true, data: [] };

  const publicationTypesList = ['ArchiveMaterial', 'Article', 'AudioBook',
    'Book', 'Chapter', 'ConferenceProc', 'Game', 'GovernmentPubl', 'Image',
    'Journal', 'Manuscript', 'Map', 'Movie', 'MusicRecording', 'MusicScore',
    'Newspaper', 'Patent', 'Report', 'SoundRecording', 'Thesis'
  ];
  const publicationTypes = publicationTypesList.map(x => ({ label: x, value: x.toLowerCase() }));

  const creator = useMutation({
    mutationFn: (newRecord) => okapiKy
      .post('broker/patron_requests', { json: newRecord }),
    onSuccess: async (res) => {
      const created = await res.json();
      await queryClient.invalidateQueries('broker/patron_requests');

      if (created?.id) {
        // Creation may start at either requests/create or
        // requests/create/:systemInstanceId. In both cases, replace it with
        // the new request's route and retain any list/aside query parameters.
        const requestsPath = routerLocation.pathname.replace(/\/create(?:\/[^/]+)?$/, '');
        history.replace(`${requestsPath}/${created.id}${routerLocation.search}`);
      } else {
        // Fall back to the request list if the server did not return an id.
        close();
      }
    },
  });

  const validRequesterRecords = institutionQuery.isSuccess ? (institutionQuery.data
    .filter(rec => rec?.type?.value === 'institution' && rec?.symbols?.[0]?.authority?.symbol)) : [];
  const requesters = validRequesterRecords?.reduce((acc, cur) => ([...acc, { value: `${cur.symbols[0].authority.symbol}:${cur.symbols[0].symbol}`, label: cur.name }]), []);
  const requesterList = requesters?.length > 0 ? requesters : [defaultRequesterSymbolSetting.value];
  if (!(requesterList?.length)) {
    throw new Error('Cannot resolve symbol to create requests as');
  }

  // const directoryEntriesQuery = useNewDirectoryEntries();
  const directoryEntriesQuery = { isSuccess: true, data: { items: [] } };

  // Only proceed to render once everything is loaded
  if (!routingAdapterSetting.isSuccess) return null;
  const dirQueries = (routingAdapterSetting.value === 'disabled') ? [directoryEntriesQuery] : [locationQuery, institutionQuery];
  if (!routingAdapterSetting.isSuccess ||
     dirQueries.some(q => q.isSuccess !== true) ||
     !serviceLevelsLoaded ||
     !copyrightTypesLoaded) {
    return null;
  }


  // locations are where rec.type.value is 'branch' and there is a tag in rec.type.tags where the value is 'pickup'
  // and are formatted for the Select component as { value: lmsLocationCode, label: name }
  const pickupLocations = locationQuery.isSuccess ? (locationQuery.data
    .filter(rec => rec?.type?.value === 'branch'
      && rec?.tags.reduce((acc, cur) => acc || cur?.value === 'pickup', false))
    .reduce((acc, cur) => ([...acc, { value: cur.slug, label: cur.name }]), [])) : [];


  const apiLocations = directoryEntriesQuery.isSuccess
    ? directoryEntriesQuery.data?.items?.filter(item => item.type === 'branch')?.map(item => ({ label: item.name, value: item.name }))
    : [];

  const tiersByRequester = tiersBySymbol(directoryEntriesQuery.data?.items);

  const initialValues = {
    // TODO: Broker API
    // copyrightType: defaultCopyrightSetting,
    // serviceLevel: { value: config?.useTiers ? undefined : defaultServiceLevelSetting.value },
    serviceInfo: { serviceType: 'Loan' },
  };

  const reg = /.+\/create\/(\d+)/;
  const sysIdMatch = reg.exec(routerLocation?.pathname);
  const autopopulate = !!sysIdMatch;

  if (autopopulate) {
    initialValues.systemInstanceIdentifier = sysIdMatch[1];
  }

  const getEntriesByType = (entryData, typeValue) => {
    return entryData?.items?.filter(entry => { return entry.type === typeValue; });
  };

  const getEntryByName = (entryList, nameValue) => {
    return entryList?.find(entry => { return entry.name === nameValue; });
  };

  const getShippingAddressEntry = entry => entry?.addresses?.find(address => address?.type === 'Shipping');


  const formatAddressEntryObject = (addressComponents, line1 = null) => {
    const addressStruct = {};
    for (let i = 0; i < addressComponents.length; i++) {
      const addressComponent = addressComponents[i];
      addressStruct[addressComponent.type] = addressComponent.value;
    }
    const resultObject = {};

    if (line1 || addressStruct.Other) {
      resultObject.line1 = line1 ?? addressStruct.Other;
      resultObject.line2 = addressStruct.Thoroughfare;
    } else {
      resultObject.line1 = addressStruct.Thoroughfare;
    }
    if (addressStruct.Locality) { resultObject.locality = addressStruct.Locality; }
    if (addressStruct.PostalCode) { resultObject.postalCode = addressStruct.PostalCode; }
    if (addressStruct.AdministrativeArea) { resultObject.region = addressStruct.AdministrativeArea; }
    if (addressStruct.CountryCode) { resultObject.country = addressStruct.CountryCode; }

    return resultObject;
  };

  const getAddressForPickupLocation = (entryData, pickupLocation) => {
    const branchEntries = getEntriesByType(entryData, 'branch');
    const branchEntry = getEntryByName(branchEntries, pickupLocation);
    let shippingAddressEntry = getShippingAddressEntry(branchEntry);
    if (!shippingAddressEntry) {
      const institutionEntry = getEntriesByType(entryData, 'institution')?.at(0);
      shippingAddressEntry = getShippingAddressEntry(institutionEntry);
    }

    const addressString = JSON.stringify(formatAddressEntryObject(
      shippingAddressEntry.addressComponents, pickupLocation
    ));
    return addressString;
  };



  const submit = async submittedRecord => {
    // Separate top-level broker fields and ISO18626 transform inputs from the
    // fields that flow directly into illRequest.
    const {
      internalNote,
      identifiers = {},
      systemInstanceIdentifier,
      ...illRequestFields
    } = submittedRecord;
    const bibliographicItemId = ['ISBN', 'ISSN']
      .filter(code => identifiers[code])
      .map(code => ({
        bibliographicItemIdentifier: identifiers[code],
        bibliographicItemIdentifierCode: { '#text': code }
      }));
    const bibliographicRecordId = identifiers.OCLC ? [{
      bibliographicRecordIdentifier: identifiers.OCLC,
      bibliographicRecordIdentifierCode: { '#text': 'OCLC' }
    }] : [];

    const newRecord = {
      patron: illRequestFields?.patronInfo?.patronId,
      ...(internalNote && { internalNote }),
      illRequest: {
        ...illRequestFields,
        bibliographicInfo: {
          ...illRequestFields.bibliographicInfo,
          ...(bibliographicItemId.length > 0 && { bibliographicItemId }),
          ...(bibliographicRecordId.length > 0 && { bibliographicRecordId }),
          supplierUniqueRecordId: systemInstanceIdentifier,
        },
      },
    };

    const maximumCosts = newRecord.illRequest?.billingInfo?.maximumCosts;

    if (maximumCosts?.monetaryValue == null || maximumCosts.monetaryValue === '') {
      delete newRecord.illRequest?.billingInfo?.maximumCosts;
    } else {
      newRecord.illRequest.billingInfo.maximumCosts.currencyCode = { '#text': stripes.currency };
    }

    try {
      await creator.mutateAsync(newRecord);
    } catch (err) {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rs.create.error" />}
            value={err?.message || ''}
          />
        ),
      });
    }
  };

  return (
    <Paneset>
      <Form onSubmit={submit} initialValues={initialValues} mutators={{ handleSISelect }} keepDirtyOnReinitialize>
        {({ form, handleSubmit, pristine, submitting, submitSucceeded }) => (
          <Pane
            defaultWidth="100%"
            centerContent
            onClose={close}
            dismissible
            footer={
              <PaneFooter
                renderStart={
                  <Button
                    id="clickable-cancel-create-request"
                    buttonStyle="default mega"
                    marginBottom0
                    onClick={close}
                  >
                    <FormattedMessage id="stripes-core.button.cancel" />
                  </Button>
                }
                renderEnd={
                  <Button
                    type="submit"
                    disabled={pristine || submitting}
                    onClick={handleSubmit}
                    buttonStyle="primary mega"
                    marginBottom0
                  >
                    <FormattedMessage id="ui-rs.createPatronRequest" />
                  </Button>
                }
              />
            }
            paneTitle={<FormattedMessage id="ui-rs.createPatronRequest" />}
          >
            <form onSubmit={handleSubmit}>
              <PatronRequestForm
                copyrightTypes={copyrightTypes}
                serviceLevels={serviceLevels}
                publicationTypes={publicationTypes}
                locations={pickupLocations?.length ? pickupLocations : apiLocations}
                requesters={requesterList}
                tiersByRequester={tiersByRequester}
                onSISelect={form.mutators.handleSISelect}
                autopopulate={autopopulate}
                operation="create"
              />
            </form>
            <FormattedMessage id="ui-rs.confirmDirtyNavigate">
              {prompt => <Prompt when={!pristine && !(submitting || submitSucceeded)} message={prompt[0]} />}
            </FormattedMessage>
          </Pane>
        )}
      </Form>
    </Paneset>
  );
};

export default CreateRoute;
