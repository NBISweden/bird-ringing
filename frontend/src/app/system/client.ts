import { ActorListItem, PagedResponse } from "./common";

export class Client {
  private _apiRoot: string;

  constructor(apiRoot: string) {
    this._apiRoot = apiRoot;
  }

  async fetchActorPage(page: number, search?: string): Promise<PagedResponse<ActorListItem>> {
    return await this._fetchPage("actor", page, search)
  }

  async fetchLicensePage(page: number, search?: string): Promise<PagedResponse<unknown>> {
    return await this._fetchPage("license", page, search)
  }

  async _fetchPage<T>(type: string, page: number, search?: string): Promise<PagedResponse<T>> {
    const url = new URL(this._apiRoot + type + "/");
    url.searchParams.set("page", String(page))
    if (search) {
      url.searchParams.set("search", search)
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