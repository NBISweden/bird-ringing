import { createContext, useContext, useState } from "react";
import useSWR from "swr";

export type LanguageDict = {
  terms: Record<
    "role" |
    "roles" |
    "actorType" |
    "license" |
    "licenses" |
    "mnr" |
    "licenseHolder" |
    "numberOfHelpers" |
    "licenseVersion" |
    "finalReportStatus" |
    "city" |
    "updatedAt" |
    "emailAddress" |
    "name" |
    "filter" |

    "username" |
    "password" |
    "signIn" |
    "signOut" |
    
    "licenseListView" |
    "ringerListView" |
    "dashboard" |
    "tableFilter" |
    "batchActions" |
    
    "first" |
    "previous" |
    "next" |
    "last",
    string
  >;
  actions: Record<
    "filterTable" |
    "selectNone" |
    "selectAll" |
    "fetchEmailAddresses" |
    "sendLicenseEmails" |
    "deactivateActor" |
    "expandMenu" |
    "collapseMenu",
    string
  >;
  enums: {
    roles: Record<"ringer" | "helper" | "communication" | "associate", string>;
    actorTypes: Record<"station" | "person", string>;
    languages: Record<"sv", string>
  }
}

type LanguageInfo = {
  id: string,
  dict: LanguageDict
}

const defaultDict: LanguageDict = {
  terms: {
    role: "Roll",
    roles: "Roller",
    actorType: "Type",
    license: "License",
    licenses: "Licenser",
    mnr: "Mnr",
    licenseHolder: "Licensinnehavare",
    numberOfHelpers: "Antal assistenter",
    licenseVersion: "Licensversion",
    finalReportStatus: "Rapportstatus",
    city: "Ort",
    updatedAt: "Senast uppdaterad",
    emailAddress: "E-post",
    name: "Namn",
    filter: "Filter",
    username: "Användarnamn",
    password: "Lösenord",
    signIn: "Logga in",
    signOut: "Logga ut",
    licenseListView: "Licenser",
    ringerListView: "Ringmärkare",
    dashboard: "Instrumentbräda",
    tableFilter: "Tabellfilter",
    batchActions: "Batch-funktioner",
    first: "Första",
    previous: "Föregående",
    next: "Nästa",
    last: "Sista",
  },
  enums: {
    roles: {
      ringer: "Ringmärkare",
      helper: "Assistent",
      communication: "Kommunikation",
      associate: "Anknytning",
    },
    actorTypes: {
      station: "Station",
      person: "Person",
    },
    languages: {
      sv: "Svenska",
    }
  },
  actions: {
    filterTable: "Filtrera tabell",
    fetchEmailAddresses: "Hämta e-postadresser",
    sendLicenseEmails: "Skicka licenser",
    selectNone: "Välj inga",
    selectAll: "Välj alla",
    deactivateActor: "Avaktivera",
    expandMenu: "Utöka menyn",
    collapseMenu: "Krymp menyn",
  }
}

function parseDict(data: unknown): LanguageDict {
  return data as LanguageDict;
}

async function fetchDict([lang]: [string]): Promise<LanguageDict> {
  const response = await fetch(`/lang/${lang}.json`);
  if (response.ok) {
    return parseDict(await response.json());
  } else {
    throw new Error(`Failed to get language dict for '${lang}'`);
  }
}

export function useLanguage(language: string): LanguageInfo {
  const {data} = useSWR(
    [language],
    fetchDict,
    {fallbackData: defaultDict}
  )

  return {
    id: language,
    dict: data
  }
}

export const LanguageContext = createContext<LanguageInfo | null>(null);

export function useCurrentLanguage() {
  const language = useContext(LanguageContext);

  if (language === null) {
    throw new Error("No language available within current scope.")
  }

  return language;
}
