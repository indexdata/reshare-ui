import EmailPullslipsParams from './EmailPullslipsParams';
import AgeRequestsParams from './AgeRequestsParams';

// Map from the API's `actionName` string to that action's per-action settings
// component. The form reads the current actionName and renders the matching
// entry. Adding an action type = one entry + a params component; the common
// section (action select / schedule / batchQuery) and CRUD shells are untouched.
const actionRegistry = {
  'email-pullslips': EmailPullslipsParams,
  'age-requests': AgeRequestsParams,
};

export default actionRegistry;
