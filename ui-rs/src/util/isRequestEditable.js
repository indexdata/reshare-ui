// Match the request against an editable requester-side state.
const isRequestEditable = (stateModel, request) => {
  if (!stateModel?.states || !request?.state) return false;
  return stateModel.states.some(
    s => s.side === 'REQUESTER' && s.name === request.state && s.editable === true
  );
};

export default isRequestEditable;
