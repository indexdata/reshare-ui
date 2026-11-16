// Go duration using second/minute/hour units, e.g. "72h3m30s".
const GO_DURATION = /^([0-9]*\.?[0-9]+(s|m|h))+$/;

export default (value) => (
  typeof value === 'string' && GO_DURATION.test(value.trim()) && /[1-9]/.test(value)
);
