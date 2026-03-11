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

export const locale: TranslationMap = {
  ...licenseReportStatusOptions,
  ...licenseStatusOptions,
  ...licenseRoleOptions,
  ...actorTypeOptions,
  birdRinging: "Ringmärkning",
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

  actorCity: "Ort",
  actorDeactivate: "Avaktivera",
  actorEmail: "E-post",
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
  actorName: "Namn",
  actorNoAddress: "ingen adress",
  actorNoCity: "ingen stad",
  actorNoCurrentLicenses: "Inga nuvarande licenser",
  actorNoEmailAddress: "ingen e-postadress",
  actorNoPhoneNumber: "inget telefonnummer",
  actorRoles: "Roller",
  actorSendLicenses: "Skicka licenser",
  actorType: "Typ",
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
  licenseSendLicenses: "Skicka licenser",
  licenseSendLicensesConfirmText:
    "Vill du skicka licensdokument till alla ringmärkare och hjälpare för valda licenser?",
  licenseSendLicensesFailed:
    "Misslyckades med att skicka licenser. Försök igen senare.",
  licenseSendLicensesSucceeded: "{sent} e-postmeddelanden skickades.",
  licenseSendingLicenses: "Skickar licenser...",
  licenseSpecies: "Arter",
  licenseStatus: "Licensstatus",
  licenseTrappingMethods: "Fångstmetoder",
  licenseType: "Typ",
  licenseUpdatedAt: "Uppdaterad {date}",
  licenseValidityPeriod:
    "<from>Giltig från </from>{startsAt}<to> till </to>{endsAt}",

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
