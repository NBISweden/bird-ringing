import { TranslationMap } from "../messages";

type OptionMap<T extends string | number | symbol = string> = Record<T, keyof TranslationMap>;

export const actorRole: OptionMap = {
    affiliate: "licenseRoleAffiliate",
    associate_ringer: "licenseRoleAssociateRinger",
    communication: "licenseRoleCommunication",
    ringer: "licenseRoleRinger",
}

export const licenseStatus: OptionMap = {
    active: "licenseStatusActive",
    inactive: "licenseStatusInactive",
    terminated: "licenseStatusTerminated",
}

export const actorType: OptionMap = {
    person: "actorTypePerson",
    station: "actorTypeStation",
}

export const licenseReportStatus: OptionMap = {
    yes: "licenseReportStatusYes",
    no: "licenseReportStatusNo",
    incomplete: "licenseReportStatusIncomplete",
}

export const documentType: OptionMap = {
    document: "documentTypeDocument",
    license: "documentTypeLicense",
    permit: "documentTypePermit",
}

export const communicationType: OptionMap = {
    license_delivery: "communicationTypeLicenseDelivery",
    license_update: "communicationTypeLicenseUpdate",
}

export const communicationStatus: OptionMap = {
    sent: "communicationStatusSent",
    received: "communicationStatusReceived",
    bounced: "communicationStatusBounced",
    failed: "communicationStatusFailed",
}