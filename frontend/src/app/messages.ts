type Message = {
  defaultMessage: string;
  description?: string;
};

const licenseReportStatusOptions = {
  licenseReportStatusYes: "Completed final report",
  licenseReportStatusNo: "No final report",
  licenseReportStatusIncomplete: "Incomplete final report",
};

const licenseStatusOptions = {
  licenseStatusTerminated: "Terminated",
  licenseStatusInactive: "Inactive",
  licenseStatusActive: "Active",
};

const licenseRoleOptions = {
  licenseRoleCommunication: "Communication",
  licenseRoleAffiliate: "Affiliate",
  licenseRoleAssociateRinger: "Associate Ringer",
  licenseRoleRinger: "Ringer",
};

const actorTypeOptions = {
  actorTypePerson: "Person",
  actorTypeStation: "Station",
};

const actorFields = {
  actorAddress: "Address",
  actorAlternativeEmail: "Alternative e-mail",
  actorBirthDate: "Birth date",
  actorCity: "City",
  actorCOAddress: "C/O address",
  actorEmail: "E-mail",
  actorGender: "Gender",
  actorName: "Name",
  actorType: "Type",
  actorPhoneNumber1: "Phone number 1",
  actorPhoneNumber2: "Phone number 2",
  actorFullName: "Full name",
  actorFirstName: "First name",
  actorLastName: "Last name",
  actorCreationDate: "Creation date",
};

const actorForm = {
  actorFormSave: "Save",
  actorFormAddressPlaceholder: "Enter address",
  actorFormPhoneNumberPlaceholder: "Enter phone number",
  actorFormBirthDatePlaceholder: "Enter birth date",
  actorFormEmailPlaceholder: "Enter e-mail",
  actorFormCityPlaceholder: "Enter city name",
  actorFormFullNamePlaceholder: "",
  actorFormFirstNamePlaceholder: "Enter first name",
  actorFormLastNamePlaceholder: "Enter last name",
  actorFormNamePlaceholder: "Enter name",
  actorFormCreationDatePlaceholder: "Enter creation date",
  actorFormTitle: "Editing actor",
};

const messagesBase = {
  ...licenseReportStatusOptions,
  ...licenseStatusOptions,
  ...licenseRoleOptions,
  ...actorTypeOptions,
  ...actorFields,
  ...actorForm,

  birdRinging: "Bird Ringing",
  userPermissions: "User permissions",
  userSignedOut: "You have been signed out.",
  userSignOut: "Sign out",
  userSigningOut: "Signing out",
  userWelcomeHeader: "Welcome, {name}",
  userWelcomeText: "You’re successfully logged in as an expert.",
  dashboard: "Dashboard",
  licenseListView: "Licenses",
  licenseView: "License {licenseHolder} {licenseId}",
  actorListView: "Ringers",
  welcomeMessageHeader: {
    defaultMessage: "Welcome to Birdy!",
    description: "A welcome message for the start page",
  },
  welcomeMessageText: "The most fantastic place to manage your licenses.",
  goToSystem: "Go to system",
  expertsLogin: "Experts login",

  actorCreate: "Add ringer",
  actorDeactivate: "Deactivate",

  actorErrorLoadingActorText:
    "Something went wrong while loading ringer data for ringer {actorId}.",
  actorErrorLoadingActorTitle: "Failed to load ringer",
  actorFetchEmailAddresses: "Fetch e-mail addresses",
  actorFilterDescription: "Filter ringer list",
  actorFilterLabel: "Filter",
  actorFilterPlaceholder: "Name, E-mail, City, Mnr, Role, Type",
  actorLastUpdated: "Last updated",
  actorLicenseActive: "Active",
  actorLicenseInactive: "Inactive",
  actorLicenseValidityPeriod:
    "<from>{startsAt}</from><to><muted>to</muted> {endsAt}</to>",
  actorLicenses: "Licenses",
  actorLoadingEmailAddresses: "Loading e-mail addresses",
  actorNoEmailAddressesFound: "No e-mail addresses were found",
  actorNoAddress: "no address",
  actorNoCity: "no city",
  actorNoCurrentLicenses: "No current licenses",
  actorNoEmailAddress: "no e-mail address",
  actorNoPhoneNumber: "no phone number",
  actorPreviousLicenses: "Previous licenses",
  actorRoles: "Roles",
  actorSendLicenses: "Send licenses",
  actorUpdatedAt: "Updated at {date}",

  licenseActors: "Ringers / associate ringers",
  licenseCommunication: "Communication",
  licenseCommunicationNote: "Note",
  licenseCreateLicenseDocuments: "Create license documents",
  licenseCreateLicenseDocumentsConfirmText:
    "Do you want to create license cards for all ringers and associate ringers for selected licenses?",
  licenseCreatedAt: "Created at {date}",
  licenseCreatingLicenseDocuments: "Creating license documents",
  licenseDeactivate: "Deactivate",
  licenseDocumentReference: "Reference",
  licenseDocuments: "Documents",
  licenseDownloadLicenses: "Download licenses (ZIP)",
  licenseDownloadLicensesText: "Downloading license cards",
  licenseErrorLoadingLicenseText:
    "Something went wrong while loading license with {licenseId}",
  licenseErrorLoadingLicenseTitle: "Failed to load license",
  licenseFilterDescription: "Filter license list",
  licenseFilterLabel: "Filter",
  licenseFilterPlaceholder:
    "Mnr, Type, License holder, Trapping methods, Last email sent at",
  licenseHistory: "History",
  licenseHolder: "License holder",
  licenseId: "Mnr",
  licenseLastEmailSentAt: "Last e-mail sent at",
  licenseCardTableHeader: "Card",
  licensePermitTableHeader: "Permit",
  licenseCardCreated: "License card created",
  licensePermitCreated: "Permit created",
  licenseLicenseDownloadLoading: "Preparing licenses package for download...",
  licenseLicenseDownloadSucceeded: "Downloading licenses package",
  licenseLocation: "Location",
  licenseNoCommunication: "No communication",
  licenseNoConnectedActors: "No connected actors",
  licenseNoDocuments: "No documents",
  licenseNoPermissions: "No permissions",
  licenseNoPreviousVerions: "No previous versions",
  licenseNumberOfAssociateRingers: "Number of associate ringers",
  licensePermissionPeriodClosed: "<from></from>{startsAt}<to> to </to>{endsAt}",
  licensePermissionPeriodOpenBackward: "<to>until </to>{endsAt}",
  licensePermissionPeriodOpenForward: "<from>from </from>{startsAt}",
  licensePermissions: "Permissions",
  licenseReportStatus: "Final report status",
  licenseSelectedLicenses: "Selected licenses",
  licenseNoLicensesSelected:
    "Please choose at least one license from the list to complete this action",
  licenseSendLicenses: "Send licenses",
  licenseSendLicensesConfirmText:
    "Do you want to send license cards to all ringers and associate ringers of the selected licenses?",
  licenseSendLicensesFailed: "Failed to send licenses. Please try again later.",
  licenseSendLicensesSucceeded: "{sent} e-mails sent successfully.",
  licenseSendingLicenses: "Sending licenses...",
  licenseSpecies: "Species",
  licenseSendLicensesSelectedActorsConfirmText:
    "Do you want to send license cards to the selected ringers/associate ringers?",
  licenseSelectedActors: "Selected ringers/associate ringers",
  licenseNoActorsSelected: "No ringer/associate ringer selected.",
  licenseNotifyRinger: "Notify ringer",
  licenseNotifyRingerHelp:
    "Also send a bundled e-mail to the license ringer with the selected associate ringers' documents.",
  licenseRingerBundleMessagesSent: "Ringer bundle e-mails sent: {count}",
  licenseRingerBundleMessageSent: "Ringer bundle e-mail sent.",
  licenseRingerBundleError: "Ringer bundle error: {error}",
  licenseRingerBundleFailedMessages: "Ringer bundle failed messages",
  licenseSkippedMessages: "Skipped messages",
  licenseSkippedMessageRow: "{mnr} {actor} ({reason})",
  licenseFailedMessagesDetails: "Failed messages",
  licenseFailedMessageRow: "{to}: {details}",
  licenseSkippedMessagesCountByReason: "Skipped messages ({reason}): {count}",
  licenseStatus: "License status",
  licenseTrappingMethods: "Trapping methods",
  licenseType: "Type",
  licenseUpdatedAt: "Updated at {date}",
  licenseValidityPeriod:
    "<from>Valid from </from>{startsAt}<to> to </to>{endsAt}",
  buttonCreateDocuments: "Create documents",

  permitCreateDocuments: "Create permits",
  permitCreateDocumentsConfirmText:
    "Do you want to create permits for all ringers and associate ringers for selected licenses?",
  permitCreatingDocuments: "Creating permit documents",
  permitDownloadLoading: "Preparing permits package for download...",
  permitDownloadSucceeded: "Downloading permits package",
  permitDownloadZip: "Download permits (ZIP)",
  permitDownloadZipText: "Downloading permits",

  paginationFirst: "First",
  paginationLast: "Last",
  paginationNext: "Next",
  paginationPrevious: "Previous",

  abortModal: "Abort",
  backModal: "Back",
  batchActions: "Batch actions",
  closeModal: "Close",
  continueModal: "Continue",
  featureNotImplemented: "This feature is not yet implemented",
  loadingData: "Loading data",
  okModal: "Ok",
  selectAll: "Select all",
  selectNone: "Select none",
  selectionSizeComparison: "{selectedCount} selected of {fullCount}",
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
