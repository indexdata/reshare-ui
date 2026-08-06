// Format broker error/problem payloads for summaries or detail blocks.
const formatError = (err, pretty = false) => {
  if (!err) return null;
  if (typeof err === 'string') return err;
  if (err.Message) return err.Cause ? `${err.Message}: ${err.Cause}` : err.Message;
  if (err.Kind) return err.Details ? `${err.Kind}: ${err.Details}` : err.Kind;
  return pretty ? JSON.stringify(err, null, 2) : JSON.stringify(err);
};

export default formatError;
