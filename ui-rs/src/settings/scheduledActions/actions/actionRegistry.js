import { EmailPullslipsParams, EmailPullslipsView } from './EmailPullslipsParams';
import { AgeRequestsParams, AgeRequestsView } from './AgeRequestsParams';

// Map from the API's `actionName` string to that action's per-action components:
// `form` is the editable params block (ScheduledActionForm), `view` is the read-only
// block (ViewScheduledAction).
const actionRegistry = {
  'email-pullslips': { form: EmailPullslipsParams, view: EmailPullslipsView },
  'age-requests': { form: AgeRequestsParams, view: AgeRequestsView },
};

export default actionRegistry;
