import { ActorListItem, LicenseListItem, PagedResponse } from "./common";

export class Client {
  private _apiRoot: string;

  constructor(apiRoot: string) {
    this._apiRoot = apiRoot;
  }

  async fetchActorPage(page: number, search?: string, ordering?: string): Promise<PagedResponse<ActorListItem>> {
    return await this._fetchPage("actor", page, search, ordering)
  }

  async fetchActorProperty(ids: string[], property: string): Promise<string[]> {
    const url = new URL(this._apiRoot + "actor_property/");
    url.searchParams.set("ids", ids.join(","));
    url.searchParams.set("property", property);
    const response = await fetch(`${url.href}`);
    if (response.ok) {
      const data: string[] = await response.json();
      return data;
    } else {
      const text = await response.text();
      throw new Error(`Failed to get actor property: '${property}', ${text}`)
    }
  }

  async fetchLicensePage(page: number, search?: string): Promise<PagedResponse<LicenseListItem>> {
    return await this._fetchPage("license_sequence", page, search)
  }

  async _fetchPage<T>(type: string, page: number, search?: string, ordering?: string): Promise<PagedResponse<T>> {
    const url = new URL(this._apiRoot + type + "/");
    url.searchParams.set("page", String(page))
    if (search) {
      url.searchParams.set("search", search)
    }
    if (ordering) {
      url.searchParams.set("ordering", ordering)
    }
    const response = await fetch(`${url.href}`);
    if (response.ok) {
      const pageData: PagedResponse<T> = await response.json();
      return pageData;
    } else {
      throw new Error(`Failed to get actor page: '${page}'`)
    }
  }
}