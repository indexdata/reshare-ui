import { EmailPullslipsParams, EmailPullslipsView } from './EmailPullslipsParams';
import { AgeRequestsParams, AgeRequestsView } from './AgeRequestsParams';
import { ArchiveParams, ArchiveView } from './ArchiveParams';

const actionRegistry = {
  'email-pullslips': { form: EmailPullslipsParams, view: EmailPullslipsView },
  'request-aging': { form: AgeRequestsParams, view: AgeRequestsView },
  'archive-borrowing-requests': { form: ArchiveParams, view: ArchiveView },
  'archive-lending-requests': { form: ArchiveParams, view: ArchiveView },
  'archive-ill-transactions': { form: ArchiveParams, view: ArchiveView },
};

export default actionRegistry;
