// ISO 18626 codes from the 2017 revision (v1.2)
// Closed codes: enumerated in XSD (ISO-18626-v1_2.xsd)
// Open codes: https://illtransactions.org/opencode/2017/

// --- Closed codes (enumerated in XSD) ---

export const Action = [
  'StatusRequest',
  'Received',
  'Cancel',
  'Renew',
  'ShippedReturn',
  'ShippedForward',
  'Notification',
];

export const ErrorType = [
  'UnsupportedActionType',
  'UnsupportedReasonForMessageType',
  'UnrecognisedDataElement',
  'UnrecognisedDataValue',
  'BadlyFormedMessage',
];

export const MessageStatus = [
  'OK',
  'ERROR',
];

export const ReasonForMessage = [
  'RequestResponse',
  'StatusRequestResponse',
  'RenewResponse',
  'CancelResponse',
  'StatusChange',
  'Notification',
];

export const RequestType = [
  'New',
  'Retry',
  'Reminder',
];

export const RequestSubType = [
  'BookingRequest',
  'MultipleItemRequest',
  'PatronRequest',
  'TransferRequest',
  'SupplyingLibrarysChoice',
];

export const ServiceType = [
  'Copy',
  'Loan',
  'CopyOrLoan',
];

export const Status = [
  'RequestReceived',
  'ExpectToSupply',
  'WillSupply',
  'Loaned',
  'Overdue',
  'Recalled',
  'RetryPossible',
  'Unfilled',
  'CopyCompleted',
  'LoanCompleted',
  'CompletedWithoutReturn',
  'Cancelled',
];

export const YesNo = [
  'Y',
  'N',
];

// --- Open codes (type_schemeValuePair in XSD, values from open code registry) ---

export const AgencyIdType = [
  'DNUCNI',
  'ISIL',
];

export const BibliographicItemIdCode = [
  'ISBN',
  'ISSN',
  'ISMN',
];

export const BibliographicRecordIdCode = [
  'AMICUS',
  'BL',
  'FAUST',
  'JNB',
  'LA',
  'LCCN',
  'Medline',
  'NCID',
  'OCLC',
  'PID',
  'PMID',
  'TP',
];

export const BillingMethod = [
  'Account',
  'FreeOfCharge',
  'Invoice',
  'Other',
  'ReciprocityAgreement',
];

export const CopyrightCompliance = [
  'AU-CopyRCatS183ComW',
  'AU-CopyRCatS183State',
  'AU-CopyrightActS49',
  'AU-CopyrightActS50-1',
  'AU-CopyrightActS50-7A',
  'AU-CopyrightActS50-7B',
  'AU-CopyrightCleared',
  'AU-GenBus',
  'NZ-CopyrightActS54',
  'NZ-CopyrightActS55',
  'Other',
  'UK-CopyRFeePaid',
  'UK-FairDealing',
  'US-CCG',
  'US-CCL',
];

export const ElectronicAddressType = [
  'Chat',
  'Email',
  'FTP',
  'Skype',
];

export const Format = [
  'Blu-ray',
  'Braille',
  'CassetteTape',
  'CD',
  'CD-ROM',
  'Daisy-ROM',
  'DVD',
  'JPEG',
  'LargePrint',
  'LP',
  'Microform',
  'MP3',
  'Multimedia',
  'PaperCopy',
  'PDF',
  'Printed',
  'Tape',
  'TIFF',
  'VHS',
];

export const LoanCondition = [
  'LibraryUseOnly',
  'NoReproduction',
  'SignatureRequired',
  'SpecCollSupervReq',
  'WatchLibraryUseOnly',
];

export const PatronType = [
  'Adult',
  'Child',
  'Faculty',
  'GraduateStudent',
  'Researcher',
  'Staff',
  'Student',
  'UnderGraduateStudent',
];

export const PaymentMethod = [
  'BankTransfer',
  'CreditCard',
  'DebitCard',
  'EFTS',
  'IBS',
  'IIBS',
  'IFLAVoucher',
  'IFM',
  'LAPS',
  'Paypal',
];

export const PublicationType = [
  'ArchiveMaterial',
  'Article',
  'AudioBook',
  'Book',
  'Chapter',
  'ConferenceProc',
  'Game',
  'GovernmentPubl',
  'Image',
  'Journal',
  'Manuscript',
  'Map',
  'Movie',
  'MusicRecording',
  'MusicScore',
  'Newspaper',
  'Patent',
  'Report',
  'SoundRecording',
  'Thesis',
];

export const ReasonRetry = [
  'AtBindery',
  'CostExceedsMaxCost',
  'LoanPossible',
  'NotCurrentAvailableForILL',
  'NotFoundAsCited',
  'OnLoan',
  'OnOrder',
  'ReqDelDateNotPossible',
  'ReqDelMethodNotSupp',
];

export const ReasonUnfilled = [
  'NonCirculating',
  'NotAvailableForILL',
  'NotHeld',
  'NotOnShelf',
  'PolicyProblem',
  'PoorCondition',
];

export const SentVia = [
  'ArticleExchange',
  'Ariel',
  'Email',
  'Mail',
  'Odyssey',
  'URL',
  'FTP',
];

export const ServiceLevel = [
  'Express',
  'Normal',
  'Rush',
  'SecondaryMail',
  'Standard',
  'Urgent',
];
