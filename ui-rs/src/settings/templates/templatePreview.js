import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useOkapiKy } from '@projectreshare/stripes-reshare';

import { cleanLabels } from './mapping';

export const PREVIEW_DELAY = 600;

// Broker template errors carry structured locations; keep the rejected body so
// the editor can ignore locations from an older revision.
export const previewError = (failure, body) => {
  if (failure.status !== 400) return { rejected: false, message: failure.message };
  const { message, part, sample, line, column } = failure.parsedBody?.template ?? {};
  return { rejected: true, body, message: message ?? failure.message, part, sample, line, column };
};

// Preview against built-in samples, keeping the last successful PDF during edits
// and errors. Labels are normalised as saving does, since the broker names the
// template after the first. Remount for a different template to reset that PDF.
export const useTemplatePreview = ({ body, labels }, { delay = 0 } = {}) => {
  const named = cleanLabels(labels);
  const okapiKy = useOkapiKy();
  const [rendered, setRendered] = useState(body);
  useEffect(() => {
    if (!delay) {
      setRendered(body);
      return undefined;
    }
    const timer = setTimeout(() => setRendered(body), delay);
    return () => clearTimeout(timer);
  }, [body, delay]);

  const query = useQuery({
    queryKey: ['broker/templates/preview', named, rendered],
    queryFn: async () => {
      const json = named.length ? { body: rendered, labels: named } : { body: rendered };
      const response = await okapiKy.post('broker/templates/preview', { json });
      return response.blob();
    },
    enabled: !!rendered,
    retry: false,
    // The samples are fixed, so a body always renders to the same slips.
    staleTime: Infinity,
  });

  const [pdf, setPdf] = useState();
  useEffect(() => {
    if (query.data) setPdf(query.data);
    else if (!rendered) setPdf(undefined);
  }, [query.data, rendered]);

  const { error: failure } = query;
  const error = useMemo(() => (failure ? previewError(failure, rendered) : null), [failure, rendered]);

  const refresh = () => {
    if (body !== rendered) setRendered(body);
    else query.refetch();
  };

  return { pdf, error, isFetching: query.isFetching, refresh };
};
