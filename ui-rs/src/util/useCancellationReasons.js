import useConsortiumReasons from './useConsortiumReasons';

const useCancellationReasons = ({ enabled }) => useConsortiumReasons({ field: 'cancellationReasons', enabled });

export default useCancellationReasons;
