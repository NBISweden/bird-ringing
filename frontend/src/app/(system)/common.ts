import { ReadonlyURLSearchParams } from "next/navigation";
import React from "react";
import { Translation } from "./internationalization";

export type LabeledAttribute = {
  id: string;
  label: string;
}

export type ActorBase = {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  type: LabeledAttribute;
  sex: LabeledAttribute;
  birth_date: string | null;
  birth_year: number | null;
  language: LabeledAttribute;
  phone_number1: string;
  phone_number2: string;
  email: string;
  alternative_email: string;
  address: string;
  co_address: string;
  postal_code: string;
  city: string;
  country: string;
  updated_at: string;
};

export type ActorListItem = ActorBase & {
  license_relations: ActorLicenseRelation[];
  previous_license_relations?: ActorLicenseRelation[];
};

export type ActorLicenseRelation = {
  license_id: number;
  mnr: string;
  role: LabeledAttribute;
  mednr: string;
  version: number;
  starts_at: string;
  ends_at: string;
  communication_type?: LabeledAttribute;
  communication_status?: LabeledAttribute;
};

export type PagedResponse<T> = {
  count: number;
  num_pages: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Page = {
  href: string | null;
  rel: string;
};

export type TableItem<P extends string = string> = {
  id: string;
  properties: Record<P, { component: React.ReactNode }>;
};

export function hrefWithParams(
  pathname: string,
  params?: ReadonlyURLSearchParams,
  page?: number | string,
  search?: string,
  ordering?: string,
) {
  const updatedParams = new URLSearchParams(params);
  if (page) {
    updatedParams.set("page", String(page));
  }
  if (search) {
    updatedParams.set("search", search);
  }
  if (ordering) {
    updatedParams.set("ordering", ordering);
  }
  return `${pathname}?${updatedParams.toString()}`;
}

export function getPageNumber(href: string): number {
  const url = new URL(href);
  const page = url.searchParams.get("page");
  return page ? parseInt(page) : 1;
}

export function getPages<T>(
  pathname: string,
  params: ReadonlyURLSearchParams,
  pageData: PagedResponse<T>,
  t: Translation["t"],
): Page[] {
  const pages: Page[] = [
    {
      rel: t("paginationFirst"),
      href: hrefWithParams(pathname, params, 1),
    },
    {
      rel: t("paginationPrevious"),
      href: pageData.previous
        ? hrefWithParams(pathname, params, getPageNumber(pageData.previous))
        : null,
    },
    ...Array.from({ length: pageData.num_pages }).map<Page>((_, index) => {
      return {
        rel: String(index + 1),
        href: hrefWithParams(pathname, params, index + 1),
      };
    }),
    {
      rel: t("paginationNext"),
      href: pageData.next
        ? hrefWithParams(pathname, params, getPageNumber(pageData.next))
        : null,
    },
    {
      rel: t("paginationLast"),
      href: hrefWithParams(pathname, params, pageData.num_pages),
    },
  ];
  return pages;
}

export type LicenseHistoryItem = {
  version: number;
  starts_at: string;
  ends_at: string;
};

export type LicenseListItem = {
  mnr: string;
  latest: LicenseInstance;
  history?: LicenseHistoryItem[];
  status: LabeledAttribute;
  license_holder: string;
  license_holder_type: LabeledAttribute;
  associate_ringer_count: number;
  methods: string;
  last_email_sent_at: string;
  has_license_card: boolean;
  has_permit: boolean;
};
export type LicensePermissionType = {
  name: string;
  description: string;
};

export type LicensePermissionProperty = {
  name: string;
  description: string;
};

export type LicensePermission = {
  type: LicensePermissionType;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string;
  species: string[];
  properties: LicensePermissionProperty[];
};

export type LicenseDocument = {
  actor: string;
  actor_id: number;
  type: LabeledAttribute;
  reference: string;
};

export type LicenceCommunication = {
  actor: string;
  actor_id: number;
  type: LabeledAttribute;
  status: LabeledAttribute;
  note: string;
};

export type LicenseInstance = {
  actors: LicenseActorRelation[];
  permissions: LicensePermission[];
  documents: LicenseDocument[];
  communication: LicenceCommunication[];
  version: number;
  location: string;
  description: string;
  report_status: LabeledAttribute;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};

export type LicenseActorRelation = {
  actor: ActorBase;
  role: LabeledAttribute;
  mednr?: string;
};

export type BSColor =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "light"
  | "dark";

export type ButtonType = BSColor | "outline-primary";

export type FailedMessage = {
  to: string[];
  details: string;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type MenuAction<T extends Function> =
  | {
      label: string;
      action: T;
    }
  | {
      label: string;
      disabled: true;
    }
  | {
      type: "divider";
    };

export type SkippedMessage = {
  actor_id: number;
  mnr: string;
  reason: string;
};

export interface SendEmailResult {
  messages_sent: number;
  failed_messages: FailedMessage[];
  skipped_messages?: SkippedMessage[];
  ringer_bundle_messages_sent?: number;
  ringer_bundle_message?: string;
  ringer_bundle_failed_messages?: FailedMessage[];
  ringer_bundle_error?: string;
}

export function convertDateToLocale(dateStr: string) {
  if (dateStr) {
    return new Date(dateStr).toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } else {
    return "-";
  }
}

export function convertOnlyDateToLocale(dateStr: string | null | undefined) {
  if (dateStr) {
    return new Date(dateStr).toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  return "";
}
