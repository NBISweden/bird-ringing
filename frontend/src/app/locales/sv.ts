import type { TranslationMap } from "@/app/messages";

const licenseReportStatusOptions = {
  licenseReportStatusYes: "Komplett slutrapport",
  licenseReportStatusNo: "Ingen slutrapport",
  licenseReportStatusIncomplete: "Inkomplett slutrapport",
};

const licenseStatusOptions = {
  licenseStatusTerminated: "Avslutad",
  licenseStatusInactive: "Inaktiv",
  licenseStatusActive: "Aktiv",
};

const licenseRoleOptions = {
  licenseRoleCommunication: "Kommunikation",
  licenseRoleAffiliate: "Affilierad",
  licenseRoleAssociateRinger: "Medhjälpare",
  licenseRoleRinger: "Ringmärkare",
};

const actorTypeOptions = {
  actorTypePerson: "Person",
  actorTypeStation: "Station",
};

const actorFields = {
  actorAddress: "Adress",
  actorAlternativeEmail: "Alternativ e-postadress",
  actorBirthDate: "Birth date",
  actorCity: "Ort",
  actorCOAddress: "C/O adress",
  actorEmail: "E-postadress",
  actorGender: "Kön",
  actorName: "Namn",
  actorType: "Typ",
  actorPhoneNumber1: "Telefonnummer 1",
  actorPhoneNumber2: "Telefonnummer 2",
};

const actorForm = {
  actorFormSave: "Spara",
  actorFormAddressPlaceholder: "Skriv en address",
  actorFormPhoneNumberPlaceholder: "Skriv ett telefonnummer",
  actorFormBirthDatePlaceholder: "Skriv ett födelsedatum",
  actorFormEmailPlaceholder: "Skriv en e-postadress",
  actorFormCityPlaceholder: "Skriv ett ortsnamn",
  actorFormTitle: "Redigerar ringmärkare",
};

export const locale: TranslationMap = {
  ...licenseReportStatusOptions,
  ...licenseStatusOptions,
  ...licenseRoleOptions,
  ...actorTypeOptions,
  ...actorFields,
  ...actorForm,
  birdRinging: "Ringmärkning",
  userPermissions: "Användarrättigheter",
  userSignedOut: "Du har blivit utloggad.",
  userSignOut: "Logga ut",
  userSigningOut: "Loggar ut",
  welcomeMessageHeader: "Välkommen till Birdy!",
  welcomeMessageText: "En fantabulös plats att hantera licenser.",
  userWelcomeHeader: "Välkommen, {name}",
  userWelcomeText: "Du är inloggad som expert.",
  dashboard: "Startskärm",
  goToSystem: "Gå till systemet",
  licenseListView: "Licenser",
  licenseView: "{licenseHolder} {licenseId}",
  actorListView: "Ringmärkare",
  expertsLogin: "Expertinloggning",

  actorCreate: "Lägg till ringmärkare",
  actorDeactivate: "Avaktivera",
  actorErrorLoadingActorText:
    "Något gick fel när vi försökte ladda data för ringmärkare med id {actorId}.",
  actorErrorLoadingActorTitle: "Misslyckades att hämta ringmärkare",
  actorFetchEmailAddresses: "Hämta e-postadresser",
  actorFilterDescription: "Filtrera ringmärkarlistan",
  actorFilterLabel: "Filtrera",
  actorFilterPlaceholder: "Namn, E-post, Ort, Mnr, Roll, Typ",
  actorLastUpdated: "Senast uppdaterad",
  actorLicenseActive: "Aktiv",
  actorLicenseInactive: "Inaktiv",
  actorLicenseValidityPeriod:
    "<from>{startsAt}</from><to><muted>till</muted> {endsAt}</to>",
  actorLicenses: "Licenser",
  actorLoadingEmailAddresses: "Laddar e-postadresser",
  actorNoEmailAddressesFound: "Inga e-postadresser fanns ",
  actorNoAddress: "ingen adress",
  actorNoCity: "ingen stad",
  actorNoCurrentLicenses: "Inga nuvarande licenser",
  actorNoEmailAddress: "ingen e-postadress",
  actorNoPhoneNumber: "inget telefonnummer",
  actorPreviousLicenses: "Previous licenses",
  actorRoles: "Roller",
  actorSendLicenses: "Skicka licenser",
  actorUpdatedAt: "Uppdaterad {date}",

  licenseActors: "Ringmärkare / hjälpare",
  licenseCommunication: "Kommunikation",
  licenseCommunicationNote: "Anteckning",
  licenseCreateLicenseDocuments: "Skapa licensdokument",
  licenseCreateLicenseDocumentsConfirmText:
    "Vill du skapa licensdokument för alla ringmärkare associerade med licenser?",
  licenseCreatedAt: "Skapad {date}",
  licenseCreatingLicenseDocuments: "Skapar licensdokument",
  licenseDeactivate: "Avaktivera",
  licenseDocumentReference: "Referens",
  licenseDocuments: "Dokument",
  licenseDownloadLicenses: "Ladda ned licenskort (ZIP)",
  licenseDownloadLicensesText: "Laddar ned licenskort.",
  licenseErrorLoadingLicenseText:
    "Något gick fel när vi försökte ladda data för licensen med id {licenseId}",
  licenseErrorLoadingLicenseTitle: "Misslyckades att hämta licens",
  licenseFilterDescription: "Filtrera licenslistan",
  licenseFilterLabel: "Filtrera",
  licenseFilterPlaceholder:
    "Mnr, Typ, Licensinnehavare, Fångstmetoder, Senaste e-post skickades",
  licenseHistory: "Historik",
  licenseHolder: "Licensinnehavare",
  licenseId: "Mnr",
  licenseLastEmailSentAt: "Senaste e-post skickades",
  licenseCardTableHeader: "Kort",
  licensePermitTableHeader: "Tillstånd",
  licenseCardCreated: "Lisenskort skapat",
  licensePermitCreated: "Tillståndsdokument skapade",
  licenseLicenseDownloadLoading: "Förbereder licenssamling för nedladdning...",
  licenseLicenseDownloadSucceeded: "Laddar ned licenssamling",
  licenseLocation: "Plats",
  licenseNoCommunication: "Ingen kommunikation kopplad till licensen.",
  licenseNoConnectedActors:
    "Inga ringmärkare eller hjälpare kopplade till licensen.",
  licenseNoDocuments: "Inga dokument",
  licenseNoPermissions: "Inga tillstånd att visa.",
  licenseNoPreviousVerions: "Inga tidigare versioner.",
  licenseNumberOfAssociateRingers: "Antal hjälpare",
  licensePermissionPeriodClosed:
    "<from></from>{startsAt}<to> till </to>{endsAt}",
  licensePermissionPeriodOpenBackward: "<to>till </to>{endsAt}",
  licensePermissionPeriodOpenForward: "<from>från </from>{startsAt}",
  licensePermissions: "Tillstånd",
  licenseReportStatus: "Slutrapportstatus",
  licenseSelectedLicenses: "Valda licenser",
  licenseNoLicensesSelected:
    "Välj minst en licens från listan för att slutföra den här åtgärden.",
  licenseSendLicenses: "Skicka licenser",
  licenseSendLicensesConfirmText:
    "Vill du skicka licensdokument till alla ringmärkare och hjälpare för valda licenser?",
  licenseSendLicensesFailed:
    "Misslyckades med att skicka licenser. Försök igen senare.",
  licenseSendLicensesSucceeded: "{sent} e-postmeddelanden skickades.",
  licenseSendLicensesSelectedActorsConfirmText:
    "Vill du skicka licensdokument till de valda ringmärkarna/hjälparna?",
  licenseSelectedActors: "Valda ringmärkare/hjälpare",
  licenseNoActorsSelected: "Ingen ringmärkare/hjälpare vald.",
  licenseNotifyRinger: "Meddela ringmärkare",
  licenseNotifyRingerHelp:
    "Skickar även ett samlat e-postmeddelande till ringmärkaren med de valda hjälparnas dokument.",
  licenseSendingLicenses: "Skickar licenser...",
  licenseSpecies: "Arter",
  licenseRingerBundleMessagesSent:
    "Samlade e-postmeddelanden skickade till ringmärkare: {count}",
  licenseRingerBundleMessageSent:
    "Samlat e-postmeddelande till ringmärkare skickades.",
  licenseRingerBundleError: "Fel vid samlat utskick till ringmärkare: {error}",
  licenseRingerBundleFailedMessages:
    "Misslyckade samlade utskick till ringmärkare",
  licenseSkippedMessages: "Hoppade över",
  licenseSkippedMessageRow: "{mnr} {actor} ({reason})",
  licenseFailedMessagesDetails: "Misslyckade utskick",
  licenseFailedMessageRow: "{to}: {details}",
  licenseSkippedMessagesCountByReason: "Hoppade över ({reason}): {count}",
  licenseStatus: "Licensstatus",
  licenseTrappingMethods: "Fångstmetoder",
  licenseType: "Typ",
  licenseUpdatedAt: "Uppdaterad {date}",
  licenseValidityPeriod:
    "<from>Giltig från </from>{startsAt}<to> till </to>{endsAt}",
  buttonCreateDocuments: "Create documents",
  permitCreateDocuments: "Skapa tillstånd",
  permitCreateDocumentsConfirmText:
    "Vill du skapa tillstånd för alla ringmärkare och hjälpare för valda licenser?",
  permitCreatingDocuments: "Skapar tillståndsdokument",
  permitDownloadLoading: "Förbereder tillståndssamling för nedladdning...",
  permitDownloadSucceeded: "Laddar ned tillståndssamling",
  permitDownloadZip: "Ladda ned tillstånd (ZIP)",
  permitDownloadZipText: "Laddar ned tillstånd.",

  paginationFirst: "Första",
  paginationLast: "Sista",
  paginationNext: "Nästa",
  paginationPrevious: "Föregående",

  abortModal: "Avbryt",
  backModal: "Tillbaka",
  batchActions: "Batch-funktioner",
  closeModal: "Stäng",
  continueModal: "Fortsätt",
  featureNotImplemented: "Den här funktionen är inte implementerad än.",
  loadingData: "Laddar data",
  okModal: "Ok",
  selectAll: "Välj alla",
  selectNone: "Välj inga",
  selectionSizeComparison: "{selectedCount} valda av {fullCount}",
  unknownError: "Ett okänt fel inträffade.",
};
