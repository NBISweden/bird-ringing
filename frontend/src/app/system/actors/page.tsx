"use client"
import { useState, CSSProperties, Suspense, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Fragment } from "react";
import { useItemSelections, SearchableItem } from "../hooks";
import { Page, Pagination } from "../../../components/Pagination";
import useSWR from "swr";
import { ReadonlyURLSearchParams, usePathname, useSearchParams } from 'next/navigation'
import Spinner from "@/components/Spinner";
import { useRouter } from 'next/navigation';

const dropdownOpenStyle: CSSProperties = {
  position: "absolute",
  inset: "0px 0px auto auto",
  margin: "0px",
  transform: "translate(0px, 40px)",
}

type Actor = {
  id: number,
  full_name: string,
  first_name: string,
  last_name: string,
  type: string,
  sex: string,
  birth_date: string,
  language: string,
  phone_number1: string,
  phone_number2: string,
  email: string,
  alternative_email: string,
  address: string,
  co_address: string,
  postal_code: string,
  city: string,
  country: string,
  updated_at: string,
  licenses: License[],
}

type License = {
  license_id: number;
  mnr: string;
  role: string;
  mednr: string;
}

type Role = string;

type PaginatedResult<T> = {
  count: number;
  num_pages: number,
  next: string | null;
  previous: string | null;
  results: T[]
}

function hrefWithParams(pathname: string, params: ReadonlyURLSearchParams, page: number | string, search?: string) {
  const updatedParams = new URLSearchParams(params)
  updatedParams.set("page", String(page))
  if (search) {
    updatedParams.set("search", search)
  }
  return `${pathname}?${updatedParams.toString()}`
}

function getPageNumber(href: string): number {
  const url = new URL(href);
  const page = url.searchParams.get("page");
  return page ? parseInt(page) : 1
}

function getPages(pathname: string, params: ReadonlyURLSearchParams, pageData: PaginatedResult<Actor>): Page[] {
  const pages: Page[] = [
    {
      rel: "First",
      href: hrefWithParams(pathname, params, 1),
    },
    {
      rel: "Previous",
      href: pageData.previous ? hrefWithParams(pathname, params, getPageNumber(pageData.previous)) : null,
    },
    ...Array.from({length: pageData.num_pages}).map<Page>((_, index) => {
      return {
        rel: String(index + 1),
        href: hrefWithParams(pathname, params, index + 1)
      }
    }),
    {
      rel: "Next",
      href: pageData.next ? hrefWithParams(pathname, params, getPageNumber(pageData.next)) : null,
    },
    {
      rel: "Last",
      href: hrefWithParams(pathname, params, pageData.num_pages),
    }
  ];
  return pages;
}

class Client {
  apiRoot: string = "http://localhost:3210/api/";

  async fetchActorPage(page: number, search?: string): Promise<PaginatedResult<Actor>> {
    return await this._fetchPage("actor", page, search)
  }

  async fetchLicensePage(page: number): Promise<PaginatedResult<unknown>> {
    return await this._fetchPage("license", page)
  }

  async _fetchPage<T>(type: string, page: number, search?: string): Promise<PaginatedResult<T>> {
    const url = new URL(this.apiRoot + type + "/");
    url.searchParams.set("page", String(page))
    if (search) {
      url.searchParams.set("search", search)
    }
    const response = await fetch(`${url.href}`);
    if (response.ok) {
      const pageData: PaginatedResult<T> = await response.json();
      return pageData;
    } else {
      throw new Error(`Failed to get actor page: '${page}'`)
    }
  }
}

async function useClientAction(
  [client, ...action]: (
    [Client, "fetchActorPage", number, string] |
    [Client, "fetchLicensePage", number]
)) {
  switch(action[0]) {
    case "fetchActorPage":
      return await client.fetchActorPage(action[1], action[2])
    case "fetchLicensePage":
      return await client.fetchActorPage(action[1])
  }
}

const emptyActorPage: PaginatedResult<Actor> = {
  results: [],
  next: null,
  previous: null,
  num_pages: 0,
  count: 0,
}

function useDebouncedValue<T>(value: T, timeout: number = 5000) {
  const [activeValue, setActiveValue] = useState<T>(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = window.setTimeout(() => {
      setActiveValue(value);
      console.log("Set active:", value);
    }, timeout);
  }, [value, setActiveValue, timeout, timerRef]);
  return activeValue;
}

function ConnectedListView() {
  const params = useSearchParams();
  const page = params.get("page") || 1;
  const search = params.get("search") || "";
  const [query, setQuery] = useState<string>(search);
  const activeQuery = useDebouncedValue(query, 1000);
  const router = useRouter()
  
  useEffect(() => {
    router.push(`/system/actors/?search=${activeQuery}`);
  }, [activeQuery])

  const client = useMemo(() => new Client(), []);
  const {data: actorPage, isLoading} = useSWR(
    [client, "fetchActorPage", page, search],
    useClientAction,
    {fallbackData: emptyActorPage, keepPreviousData: true}
  );
  const pathname = usePathname();
  const pages = getPages(pathname, params, actorPage);
  const currentPage = hrefWithParams(pathname, params, page, search)
  return (
    <BaseListView
      isLoading={isLoading}
      actors={actorPage.results}
      count={actorPage.count}
      pages={pages}
      query={query}
      setQuery={setQuery}
      currentPage={currentPage} pageCount={actorPage.num_pages}
    />
  )
}

function toActorTable(item: Actor) {
  const licenses: License[] = item.licenses;
  const roles = new Set<Role>(licenses.map(l => l.role));
  return {
    id: String(item.id),
    properties: {
      "Name": {
        term: item.full_name,
        component: <Link href={`/actors/entry/?entryId=${item.id}`}>{item.full_name}</Link>
      },
      "Type": {
        term: item.type,
        component: item.type,
      },
      "Roles": {
        term: Array.from(roles).join(" "),
        component: Array.from(roles).join(", ")
      },
      "Licenses": {
        term: licenses.map((l) => {
          return (
            l.mednr ? `${l.mnr}:${l.mednr}` : l.mnr
          );
        }).join(" "),
        component: (
          <>{licenses.map((l, index, list) => {
            return (
              <Fragment key={index}><Link href={`/licenses/entry/?entryId=${l.license_id}`}>{l.mednr ? `${l.mnr}:${l.mednr}` : l.mnr}</Link>{index < list.length - 1 ? ", " : <></>}</Fragment>
            );
          })}</>
        )
      },
      "E-mail": {
        term: item.email ? item.email : "-",
        component: item.email ? item.email : "-",
      },
      "City": {
        term: item.city,
        component: item.city
      },
      "Updated At": {
        term: item.updated_at,
        component: item.updated_at
      },
    }
  }
}

function BaseListView(
  {actors, count, pages, currentPage, pageCount, query, setQuery, isLoading}: {
    actors: Actor[],
    count: number,
    pages: Page[],
    currentPage: string,
    pageCount: number,
    query: string,
    setQuery: (q: string) => void; 
    isLoading?: boolean,
  }
) {
  const [actionIsOpen, setActionIsOpen] = useState(false);

  const items = useMemo(() => actors.map<SearchableItem>(toActorTable), [actors])
  const {
    selectedItems,
    toggleItems,
    handleItemSelection,
    allSelected
  } = useItemSelections(new Set(items.map(r => r.id)));
  const columns = [
    "Name",
    "Type",
    "Roles",
    "Licenses",
    "E-mail",
    "City",
    "Updated At",
  ]
  const selectionInfo = isLoading ? "Loading data" : `${selectedItems.size} of ${count} selected`;
  return (
    <div className="container">
      <h2>Actor List View</h2>
      <div className="input-group mb-3">
        <span className="input-group-text">Filter</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="form-control"
          placeholder={"Name, E-mail, City"}
          aria-label="Filter for actor table"
          aria-describedby="basic-addon1"
        />
      </div>
      <div className="input-group mb-3">
        <button className={`btn btn-outline-secondary ${isLoading ? "disabled" : ""}`} type="button" onClick={toggleItems}>{allSelected ? "Select None" : "Select All"}</button>
        <span className="input-group-text flex-grow-1" >{selectionInfo}</span>
        <button className={`btn btn-outline-secondary dropdown-toggle  ${isLoading ? "disabled" : ""}`} onClick={() => setActionIsOpen(!actionIsOpen)} type="button" aria-expanded={actionIsOpen}>Batch action</button>
        <ul className={`dropdown-menu ${actionIsOpen ? "show" : ""}`} style={actionIsOpen ? dropdownOpenStyle : {}} onClick={() => setActionIsOpen(false)}>
          <li><a className="dropdown-item" href="#">Send license</a></li>
          <li><a className="dropdown-item" href="#">Generate new license</a></li>
          <li><a className="dropdown-item" href="#">Download licenses</a></li>
          <li><hr className="dropdown-divider" /></li>
          <li><a className="dropdown-item" href="#">Disable</a></li>
          <li><a className="dropdown-item" href="#">Enable</a></li>
        </ul>
      </div>
      <div className="d-flex flex-row align-items-center gap-3">
        <Pagination pages={pages} currentPage={currentPage} pageCount={pageCount} />
        {isLoading ? <Spinner className="mb-3"/> : <></>}
      </div>
      <table className="table">
        <thead>
          <tr>
            <th scope="col"></th>
            {columns.map(c => <th key={c} scope="col">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            return (
              <tr key={item.id}>
                <th><input type="checkbox" onChange={handleItemSelection} checked={selectedItems.has(item.id)} data-actor-id={item.id}/></th>
                {columns.map(c => <td key={c}>{item.properties[c].component}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
      <Pagination pages={pages} currentPage={currentPage} pageCount={pageCount} />
    </div>
  )
}


export default function ListView() {
  return (
    <Suspense fallback={<BaseListView query="" setQuery={() => {}} actors={[]} count={0} pages={[]} currentPage="" pageCount={0}/>}>
      <ConnectedListView />
    </Suspense>
  )
}