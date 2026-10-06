import { useOkapiKy, usePerformAction } from '@projectreshare/stripes-reshare';
import { scanActionsByName } from './scanActions';
import STATUS from './scanStatus';
import { addScan, getScanState, requestItemBarcode, scanError, updateScan } from './scanStore';

const useScan = () => {
  const ky = useOkapiKy();
  const performAction = usePerformAction();

  return (barcode) => {
    const { action } = getScanState();
    const { side, promptItem } = scanActionsByName[action];
    const id = addScan(barcode);

    // Ask for the item without waiting for the lookup, and leave the prompt open
    // if the lookup fails: the operator's next scan is the item barcode either
    // way, and it must not land in the request field.
    const itemBarcode = promptItem ? requestItemBarcode(id) : null;
    // After a failed lookup nothing awaits the prompt, so its rejection would go unhandled.
    itemBarcode?.catch(() => {});

    (async () => {
      try {
        // An empty result arrives as `items: null`.
        const items = (await ky('broker/patron_requests', {
          searchParams: { side, requester_req_id: barcode },
        }).json()).items ?? [];
        if (items.length === 0) throw scanError('ui-update.error.noRequest');
        if (items.length > 1) throw scanError('ui-update.error.multipleRequests');
        const request = items[0];
        updateScan(id, { request });

        const params = itemBarcode ? { barcode: await itemBarcode } : {};
        // An action change or login cleared this scan while it was looking up.
        if (!getScanState().scans.includes(id)) return;
        await performAction(request.id, action, params, { display: 'none' });
        updateScan(id, { status: STATUS.SUCCESS });
      } catch (error) {
        updateScan(id, { status: STATUS.FAIL, error });
      }
    })();
  };
};

export default useScan;
