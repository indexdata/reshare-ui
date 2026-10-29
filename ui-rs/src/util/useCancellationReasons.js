import useTenantReasons from './useTenantReasons';

const useCancellationReasons = ({ enabled }) => useTenantReasons({ field: 'cancellationReasons', enabled });

export default useCancellationReasons;
