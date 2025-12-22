import { ActorListItem, LicenseListItem, PagedResponse } from "./common";

export class Client {
  private _apiRoot: string;

  constructor(apiRoot: string) {
    this._apiRoot = apiRoot;
  }

  async fetchActorPage(page: number, search?: string, ordering?: string, ids?: string[]): Promise<PagedResponse<ActorListItem>> {
    const params = new URLSearchParams();
    if (ids) {
      params.set("ids", ids.join(","))
    }
    return await this._fetchPage("actor", page, search, ordering, params)
  }

  async fetchLicensePage(page: number, search?: string): Promise<PagedResponse<LicenseListItem>> {
    return await this._fetchPage("license_sequence", page, search)
  }

  async _fetchPage<T>(type: string, page: number, search?: string, ordering?: string, params?: URLSearchParams): Promise<PagedResponse<T>> {
    const url = new URL(this._apiRoot + type + "/");
    url.searchParams.set("page", String(page))
    if (search) {
      url.searchParams.set("search", search)
    }
    if (ordering) {
      url.searchParams.set("ordering", ordering)
    }
    url.search = String(new URLSearchParams([...url.searchParams, ...(params ? params : [])]));
    const response = await fetch(`${url.href}`);
    if (response.ok) {
      const pageData: PagedResponse<T> = await response.json();
      return pageData;
    } else {
      const text = await response.text()
      throw new Error(`Failed to get page '${page}': ${text}`)
    }
  }

  static async fetchAll<T>(firstPagePromise: Promise<PagedResponse<T>>): Promise<T[]> {
    let currentPage: PagedResponse<T> | null = await firstPagePromise;
    const items: T[] = []
    while (currentPage) {
      items.push(...currentPage.results);
      if (currentPage.next) {
        const response: Response = await fetch(currentPage.next);

        if (response.ok) {
          currentPage = await response.json()
        } else {
          const text = await response.text()
          throw new Error(`Failed to get next page '${currentPage.next}': ${text}`)
        }
      } else {
        currentPage = null;
      }
    }
    return items
  }
}