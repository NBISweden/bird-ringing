type Message = {
  defaultMessage: string;
  description?: string;
};

const messagesBase = {
  birdRinging: "Bird Ringing",
  userWelcomeHeader: "Welcome, {name}",
  userWelcomeText: "You’re successfully logged in as an expert.",
  dashboard: "Dashboard",

  licenseListView: "Licenses",
  licenseView: "License",
  actorListView: "Ringers",
  welcomeMessageHeader: {
    defaultMessage: "Welcome to Birdy!",
    description: "A welcome message for the start page",
  },
  welcomeMessageText: "The most fantastic place to manage your licenses.",
  goToSystem: "Go to system",
  expertsLogin: "Experts login",

  actorName: "Name",
  actorType: "Type",
  actorRoles: "Roles",
  actorLicenses: "Licenses",
  actorEmail: "E-mail",
  actorCity: "City",
  actorLastUpdated: "Last updated",
  actorFilterLabel: "Filter",
  actorFilterDescription: "Filter ringer list",
  actorFilterPlaceholder: "Name, E-mail, City, Id, Role, Type",
  actorFetchEmailAddresses: "Fetch e-mail addresses",
  actorSendLicenses: "Send licenses",
  actorDeactivate: "Deactivate",
  actorLoadingEmailAddresses: "Loading e-mail addresses",
  actorErrorLoadingActorTitle: "Failed to load ringer",
  actorErrorLoadingActorText:
    "Something went wrong while loading ringer data for ringer {actorId}.",
  actorNoEmailAddress: "no e-mail address",
  actorNoPhoneNumber: "no phone number",
  actorNoAddress: "no address",
  actorNoCity: "no city",
  actorUpdatedAt: "Updated at {date}",
  actorLicenseActive: "Active",
  actorLicenseInactive: "Inactive",
  actorNoCurrentLicenses: "No current licenses",
  actorLicenseValidityPeriod:
    "<from>{startsAt}</from><to><muted>to</muted> {endsAt}</to>",

  licenseId: "Mnr",
  licenseType: "Type",
  licenseHolder: "License holder",
  licenseNumberOfHelpers: "Number of helpers",
  licenseTrappingMethods: "Trapping methods",
  licenseReportStatus: "Final report status",
  licenseStatus: "License status",
  licenseLastEmailSentAt: "Last e-mail sent at",
  licenseFilterLabel: "Filter",
  licenseFilterDescription: "Filter license list",
  licenseFilterPlaceholder:
    "Mnr, Type, License holder, Trapping methods, Last email sent at",
  licenseCreateLicenseDocuments: "Create license documents",
  licenseDownloadLicenses: "Download licenses (ZIP)",
  licenseSendLicenses: "Send licenses",
  licenseDeactivate: "Deactivate",
  licenseCreatingLicenseDocuments: "Creating license documents",
  licenseCreateLicenseDocumentsConfirmText:
    "Do you want to create license cards for all ringers and helpers for selected licenses?",
  licenseSelectedLicenses: "Selected licenses",
  licenseLicenseDownloadLoading: "Preparing licenses package for download...",
  licenseLicenseDownloadSucceeded: "Downloading licenses package",
  licenseDownloadLicensesText: "Downloading license cards",
  licenseSendLicensesOptionsText:
    "Please choose what you want to include in the e-mail:",
  licenseIncludeLicenseCard: "Include license card (PDF)",
  licenseIncludePermit: "Include license permit (PDF)",
  licenseSendingLicenses: "Sending licenses...",
  licenseSendLicensesSucceeded: "{sent} e-mails sent successfully.",
  licenseSendLicensesFailed: "Failed to send licenses. Please try again later.",
  licenseSendLicensesNoAttachmentsWarning:
    "You are trying to send e-mails without any attached documents. Are you sure?",
  licenseErrorLoadingLicenseTitle: "Failed to load license",
  licenseErrorLoadingLicenseText:
    "Something went wrong while loading license with {licenseId}",
  licenseHistory: "History",
  licenseValidityPeriod:
    "<from>Valid from </from>{startsAt}<to> to </to>{endsAt}",
  licenseNoPreviousVerions: "No previous versions",
  licenseCreatedAt: "Created at {date}",
  licenseUpdatedAt: "Updated at {date}",
  licenseActors: "Ringers / helpers",
  licenseNoConnectedActors: "No connected actors",
  licensePermissions: "Permissions",
  licenseNoPermissions: "No permissions",
  licensePermissionPeriodClosed: "<from></from>{startsAt}<to> to </to>{endsAt}",
  licensePermissionPeriodOpenForward: "<from>from </from>{startsAt}",
  licensePermissionPeriodOpenBackward: "<to>until </to>{endsAt}",
  licenseDocuments: "Documents",
  licenseDocumentReference: "Reference",
  licenseNoDocuments: "No documents",
  licenseCommunication: "Communication",
  licenseCommunicationNote: "Note",
  licenseNoCommunication: "No communication",

  permitCreateDocuments: "Create permits",
  permitCreatingDocuments: "Creating permit documents",
  permitCreateDocumentsConfirmText:
    "Do you want to create permits for all ringers and helpers for selected licenses?",
  permitDownloadZip: "Download permits (ZIP)",
  permitDownloadZipText: "Downloading permits",
  permitDownloadLoading: "Preparing permits package for download...",
  permitDownloadSucceeded: "Downloading permits package",

  paginationNext: "Next",
  paginationPrevious: "Previous",
  paginationLast: "Last",
  paginationFirst: "First",

  loadingData: "Loading data",
  selectionSizeComparison: "{selectedCount} selected of {fullCount}",
  selectAll: "Select all",
  selectNone: "Select none",
  batchActions: "Batch actions",
  closeModal: "Close",
  abortModal: "Abort",
  okModal: "Ok",
  backModal: "Back",
  continueModal: "Continue",
  featureNotImplemented: "This feature is not yet implemented",
  unknownError: "An unknown error occurred.",
};

function makeMessageMap<T extends { [P in keyof T]: Message | string }>(
  messages: T,
): { [P in keyof T]: { id: P } & Message } {
  const messageMap = Object.keys(messages).reduce<
    Partial<{ [P in keyof T]: { id: P } & Message }>
  >((acc, key) => {
    const recordKey = key as keyof T;
    const messageOrString = messages[recordKey];
    const message: Message =
      typeof messageOrString === "string"
        ? {
            defaultMessage: messageOrString,
          }
        : messageOrString;
    acc[recordKey] = {
      id: recordKey,
      ...message,
    };
    return acc;
  }, {});
  return messageMap as { [P in keyof T]: { id: P } & Message };
}

function makeTranslationMap<T extends { [P in keyof T]: Message | string }>(
  messages: T,
): { [P in keyof T]: string } {
  const messageMap = Object.keys(messages).reduce<
    Partial<{ [P in keyof T]: string }>
  >((acc, key) => {
    const recordKey = key as keyof T;
    const messageOrString = messages[recordKey];
    acc[recordKey] =
      typeof messageOrString === "string"
        ? messageOrString
        : messageOrString.defaultMessage;
    return acc;
  }, {});
  return messageMap as { [P in keyof T]: string };
}

export const messages = makeMessageMap(messagesBase);
export const defaultMessages = makeTranslationMap(messages);
export type TranslationMap = typeof defaultMessages;
