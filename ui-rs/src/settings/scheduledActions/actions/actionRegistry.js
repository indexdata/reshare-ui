import { EmailPullslipsParams, EmailPullslipsView } from './EmailPullslipsParams';
import { AgeRequestsParams, AgeRequestsView } from './AgeRequestsParams';

const actionRegistry = {
  'email-pullslips': { form: EmailPullslipsParams, view: EmailPullslipsView },
  'request-aging': { form: AgeRequestsParams, view: AgeRequestsView },
};

export default actionRegistry;
