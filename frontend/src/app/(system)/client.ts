import { LicenseFormData } from "@/components/LiceneseEntryForm";
import {
  ActorBase,
  ActorListItem,
  LicenseActorRelation,
  LicenseListItem,
  Options,
  PagedResponse,
  SendEmailResult,
  PermissionTypeWithProperties,
  UnrelatedPermissionProperty,
  PermissionTypeInput,
  PermissionPropertyInput,
  PermissionProperty,
} from "./common";
import { getCookie, parseCompleteUrl } from "./utils";

export class FieldValidationError extends Error {
  fieldErrors: Record<string, string[]>;
  nonFieldErrors: string[];

  constructor(
    fieldErrors: Record<string, string[]>,
    nonFieldErrors: string[],
    message: string,
  ) {
    super(message);
    this.name = "FieldValidationError";
    this.fieldErrors = fieldErrors;
    this.nonFieldErrors = nonFieldErrors;
  }
}

type ErrorTree = { [x: string]: ErrorTree | ErrorTree[] | string[] };

export class Client {
  private _apiRoot: string;

  constructor(apiRoot: string) {
    this._apiRoot = parseCompleteUrl(apiRoot);
  }

  private async _getJson<T>(path: string): Promise<T> {
    const url = new URL(this._apiRoot + path);
    const resp = await fetch(url.href);

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(
        `GET ${url.href} failed: ${resp.status} ${resp.statusText} ${body}`,
      );
    }

    return (await resp.json()) as T;
  }

  async fetchLicenseSequenceByMnr(mnr: string): Promise<LicenseListItem> {
    return this._getJson<LicenseListItem>(
      `license_sequence/${encodeURIComponent(mnr)}/`,
    );
  }

  async fetchActorById(actorId: string): Promise<ActorListItem> {
    return await this._getJson<ActorListItem>(`actor/${actorId}/`);
  }

  async fetchActorPage(
    page: number,
    search?: string,
    ordering?: string,
    ids?: string[],
  ): Promise<PagedResponse<ActorListItem>> {
    const params = new URLSearchParams();
    if (ids) {
      params.set("ids", ids.join(","));
    }
    return await this._fetchPage("actor", page, search, ordering, params);
  }

  async fetchLicensePage(
    page: number,
    search?: string,
    ordering?: string,
  ): Promise<PagedResponse<LicenseListItem>> {
    return await this._fetchPage("license_sequence", page, search, ordering);
  }

  async _fetchPage<T>(
    type: string,
    page: number,
    search?: string,
    ordering?: string,
    params?: URLSearchParams,
  ): Promise<PagedResponse<T>> {
    const url = new URL(this._apiRoot + type + "/");
    url.searchParams.set("page", String(page));
    if (search) {
      url.searchParams.set("search", search);
    }
    if (ordering) {
      url.searchParams.set("ordering", ordering);
    }
    url.search = String(
      new URLSearchParams([...url.searchParams, ...(params ? params : [])]),
    );
    const response = await fetch(`${url.href}`, {
      credentials: "same-origin",
    });
    if (response.ok) {
      const pageData: PagedResponse<T> = await response.json();
      return pageData;
    } else {
      const text = await response.text();
      throw new Error(`Failed to get page '${page}': ${text}`);
    }
  }

  static async fetchAll<T>(
    firstPagePromise: Promise<PagedResponse<T>>,
  ): Promise<T[]> {
    let currentPage: PagedResponse<T> | null = await firstPagePromise;
    const items: T[] = [];
    while (currentPage) {
      items.push(...currentPage.results);
      if (currentPage.next) {
        const response: Response = await fetch(currentPage.next, {
          credentials: "same-origin",
        });

        if (response.ok) {
          currentPage = await response.json();
        } else {
          const text = await response.text();
          throw new Error(
            `Failed to get next page '${currentPage.next}': ${text}`,
          );
        }
      } else {
        currentPage = null;
      }
    }
    return items;
  }

  async fetchOptions<T extends keyof Options>(
    option: T,
  ): Promise<Options[T][]> {
    const options = await this._getJson<Options[T][]>(`property/${option}`);
    return options;
  }

  async batchCreateLicenseCards(
    mnrs: string[],
  ): Promise<{ filenames: string[] }> {
    return this._batchCreateDocuments("license_sequence/card-create", mnrs);
  }

  private async _batchCreateDocuments(
    endpoint: string,
    mnrs: string[],
  ): Promise<{ filenames: string[] }> {
    const qs = new URLSearchParams({ mnrs: mnrs.join(",") });
    const csrf = getCookie("csrftoken");
    return this.fetchJson<{ filenames: string[] }>(
      `${endpoint}/?${qs.toString()}`,
      { method: "PUT", headers: csrf ? { "X-CSRFToken": csrf } : {} },
    );
  }

  private _isStringArray(arr: string[] | ErrorTree[]): arr is string[] {
    return typeof arr[0] === "string";
  }

  private _flattenErrors(
    node: ErrorTree["string"],
    path: string = "",
  ): Record<string, string[]> {
    if (Array.isArray(node) && this._isStringArray(node)) {
      return { [path]: node };
    } else {
      return Object.entries(node).reduce<Record<string, string[]>>(
        (acc, [key, value]) => {
          const nextPath = path ? `${path}.${key}` : key;
          return {
            ...acc,
            ...this._flattenErrors(value, nextPath),
          };
        },
        {},
      );
    }
  }

  private _flattenMessage(
    data: object | string | (object | string)[],
  ): string | null {
    if (Array.isArray(data)) {
      return data
        .map((d) => this._flattenMessage(d))
        .filter((d) => d !== null)
        .join("\n");
    } else if (typeof data === "string") {
      return data;
    } else if ("detail" in data) {
      return data.detail as string;
    }
    return data && typeof data === "object" ? JSON.stringify(data) : null;
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const url = new URL(path, this._apiRoot);

    const response = await fetch(url.href, {
      ...init,
      credentials: init?.credentials ?? "same-origin",
      headers: {
        Accept: "application/json",
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) {
      if (response.status === 422) {
        return (await response.json()) as T;
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json().catch(() => null);

        if (
          response.status === 400 &&
          data &&
          typeof data === "object" &&
          !Array.isArray(data) &&
          !("detail" in data)
        ) {
          const normalized = this._flattenErrors(data);
          const { non_field_errors: nonFieldErrors = [], ...fieldErrors } =
            normalized;
          const message =
            Object.entries(normalized)
              .map(([k, v]) => `${k}: ${v.join(", ")}`)
              .join("\n") || `Request failed (${response.status})`;
          throw new FieldValidationError(fieldErrors, nonFieldErrors, message);
        }
        const detail =
          this._flattenMessage(data) ?? `Request failed (${response.status})`;

        throw new Error(detail);
      }

      const text = await response.text().catch(() => "");
      throw new Error(text || `Request failed (${response.status})`);
    }
    return (await response.json()) as T;
  }

  async fetchLicenseCardsZipBlob(mnrs: string[]): Promise<Blob> {
    return this._fetchZipBlob("license_sequence/card-pdf", mnrs);
  }

  private async _fetchZipBlob(endpoint: string, mnrs: string[]): Promise<Blob> {
    const url = new URL(this._apiRoot + endpoint + "/");
    url.searchParams.set("mnrs", mnrs.join(","));

    const resp = await fetch(url.href, { credentials: "same-origin" });

    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      const detail =
        data?.detail ??
        (data ? JSON.stringify(data) : null) ??
        `Request failed (${resp.status})`;
      throw new Error(detail);
    }

    return await resp.blob();
  }

  async batchCreatePermits(mnrs: string[]): Promise<{ filenames: string[] }> {
    return this._batchCreateDocuments("license_sequence/permit-create", mnrs);
  }

  async fetchPermitsZipBlob(mnrs: string[]): Promise<Blob> {
    return this._fetchZipBlob("license_sequence/permit-pdf", mnrs);
  }

  async batchSendLicenseEmails(
    mnrs: string[],
    includeCard: boolean,
    includePermit: boolean,
  ): Promise<SendEmailResult> {
    const qs = new URLSearchParams({ mnrs: mnrs.join(",") });
    if (includeCard) {
      qs.set("include_card", "1");
    }
    if (includePermit) {
      qs.set("include_permit", "1");
    }

    const csrf = getCookie("csrftoken");
    return this.fetchJson<SendEmailResult>(
      `license_sequence/send-license-emails/?${qs.toString()}`,
      { method: "PUT", headers: csrf ? { "X-CSRFToken": csrf } : {} },
    );
  }

  async sendLicenseEmailsForActors(
    mnr: string,
    actorIds: number[],
    includeCard: boolean,
    includePermit: boolean,
    notifyRinger?: boolean,
  ): Promise<SendEmailResult> {
    const qs = new URLSearchParams({ actor_ids: actorIds.join(",") });
    if (includeCard) {
      qs.set("include_card", "1");
    }
    if (includePermit) {
      qs.set("include_permit", "1");
    }
    if (notifyRinger) {
      qs.set("notify_ringer", "1");
    }

    const csrf = getCookie("csrftoken");
    return this.fetchJson<SendEmailResult>(
      `license_sequence/${encodeURIComponent(mnr)}/send-license-emails/?${qs.toString()}`,
      { method: "PUT", headers: csrf ? { "X-CSRFToken": csrf } : {} },
    );
  }

  async createActor(actor: Partial<ActorBase>): Promise<ActorListItem> {
    const csrf = getCookie("csrftoken");
    return this.fetchJson<ActorListItem>("actor/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
      body: JSON.stringify(actor),
    });
  }

  async updateActor(
    actorId: number,
    actor: Partial<ActorBase>,
  ): Promise<ActorListItem> {
    const csrf = getCookie("csrftoken");
    return this.fetchJson<ActorListItem>(`actor/${actorId}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
      body: JSON.stringify(actor),
    });
  }

  async createLicense(license: LicenseFormData): Promise<LicenseListItem> {
    const csrf = getCookie("csrftoken");
    return this.fetchJson<LicenseListItem>("license_sequence/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
      body: JSON.stringify({
        mnr: license.mnr,
        status: license.status,
        latest: {
          location: license.location,
          description: license.description,
          report_status: license.report_status,
          starts_at: license.starts_at,
          ends_at: license.ends_at,
        },
      }),
    });
  }

  async updateLicense(
    mnr: string,
    license: LicenseFormData,
  ): Promise<LicenseListItem> {
    const csrf = getCookie("csrftoken");
    return this.fetchJson<LicenseListItem>(`license_sequence/${mnr}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
      body: JSON.stringify({
        mnr: license.mnr,
        status: license.status,
        latest: {
          location: license.location,
          description: license.description,
          report_status: license.report_status,
          starts_at: license.starts_at,
          ends_at: license.ends_at,
        },
      }),
    });
  }

  async updateLicenseRelations(
    mnr: string,
    relations: LicenseActorRelation[],
  ): Promise<LicenseListItem> {
    const csrf = getCookie("csrftoken");
    return this.fetchJson<LicenseListItem>(`license_sequence/${mnr}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
      body: JSON.stringify({ latest: { actors: relations } }),
    });
  }

  async fetchPermissionTypesWithProperties(): Promise<
    PermissionTypeWithProperties[]
  > {
    return this._getJson<PermissionTypeWithProperties[]>(
      "property/permission_type/",
    );
  }

  async fetchUnrelatedPermissionProperties(): Promise<
    UnrelatedPermissionProperty[]
  > {
    return this._getJson<UnrelatedPermissionProperty[]>(
      "property/permission_property/?unrelated=1",
    );
  }

  async createPermissionType(
    type: PermissionTypeInput,
  ): Promise<PermissionTypeWithProperties> {
    const csrf = getCookie("csrftoken");
    return this.fetchJson<PermissionTypeWithProperties>(
      "property/permission_type/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFToken": csrf } : {}),
        },
        body: JSON.stringify(type),
      },
    );
  }

  async updatePermissionType(
    typeId: string,
    type: PermissionTypeInput,
  ): Promise<PermissionTypeWithProperties> {
    const csrf = getCookie("csrftoken");
    return this.fetchJson<PermissionTypeWithProperties>(
      `property/permission_type/${typeId}/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFToken": csrf } : {}),
        },
        body: JSON.stringify(type),
      },
    );
  }

  async createPermissionProperty(
    property: PermissionPropertyInput,
  ): Promise<PermissionProperty> {
    const csrf = getCookie("csrftoken");
    return this.fetchJson<PermissionProperty>(
      "property/permission_property/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFToken": csrf } : {}),
        },
        body: JSON.stringify(property),
      },
    );
  }

  async updatePermissionProperty(
    propertyId: string,
    property: PermissionPropertyInput,
  ): Promise<PermissionProperty> {
    const csrf = getCookie("csrftoken");
    return this.fetchJson<PermissionProperty>(
      `property/permission_property/${propertyId}/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFToken": csrf } : {}),
        },
        body: JSON.stringify(property),
      },
    );
  }
}
