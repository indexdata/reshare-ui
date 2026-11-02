import omit from 'lodash/omit';
import { useForm } from 'react-final-form';
import { useMutation } from 'react-query';
import { useIntlCallout, useOkapiKy } from '@projectreshare/stripes-reshare';
import { brokerToForm } from './formMapping';

// Replace these fields on lookup; preserve request details such as chapter and pages.
const RECORD_FIELDS = [
  'supplierUniqueRecordId',
  'title',
  'subtitle',
  'author',
  'seriesTitle',
  'edition',
  'bibliographicItemId',
  'bibliographicRecordId',
];

const usePrefill = () => {
  const form = useForm();
  const okapiKy = useOkapiKy();
  const sendCallout = useIntlCallout();
  const { mutate, isLoading } = useMutation({
    mutationFn: identifier => okapiKy('broker/patron_requests/prefill', { searchParams: { identifier } }).json(),
  });

  const apply = (response, identifier) => {
    const { bibliographicInfo, publicationInfo, identifiers } = brokerToForm({ illRequest: response });
    const current = form.getState().values;
    form.batch(() => {
      form.change('identifiers', identifiers);
      form.change('publicationInfo', publicationInfo);
      form.change('bibliographicInfo', {
        ...omit(current.bibliographicInfo, RECORD_FIELDS),
        ...bibliographicInfo,
        supplierUniqueRecordId: bibliographicInfo.supplierUniqueRecordId || identifier,
      });
    });
  };

  const prefill = id => {
    const identifier = id?.trim();
    if (!identifier) return;
    // Per-call callbacks ignore earlier lookups and stop running after unmount.
    mutate(identifier, {
      onSuccess: response => {
        if (!response?.bibliographicInfo && !response?.publicationInfo) {
          sendCallout('ui-rs.requestform.prefill.notFound', 'error', { identifier });
        } else {
          apply(response, identifier);
        }
      },
      onError: err => sendCallout('ui-rs.requestform.prefill.error', 'error', { identifier, message: err.message }),
    });
  };

  return { prefill, isLoading };
};

export default usePrefill;
