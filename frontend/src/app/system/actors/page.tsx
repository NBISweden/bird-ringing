"use client"
import { useState, CSSProperties, Suspense } from "react";
import Link from "next/link";
import { Fragment } from "react";
import { useItemSelections, SearchableItem } from "../hooks";
import { Page, Pagination } from "../../../components/Pagination";
import useSWR from "swr";
import { ReadonlyURLSearchParams, usePathname, useSearchParams } from 'next/navigation'

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

function hrefWithPage(pathname: string, params: ReadonlyURLSearchParams, pageNumber: number | string) {
  const updatedParams = new URLSearchParams(params)
  updatedParams.set("page", String(pageNumber))
  return `${pathname}?${updatedParams.toString()}`
}

async function fetchActorPage([actorHref, pageNumber]: [string, number | string]): Promise<PaginatedResult<Actor>> {
  const url = new URL(actorHref);
  url.searchParams.set("page", String(pageNumber))
  const pageData: PaginatedResult<Actor> = await (await fetch(`${url.href}`)).json();
  return pageData;
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
      href: hrefWithPage(pathname, params, 1),
    },
    {
      rel: "Previous",
      href: pageData.previous ? hrefWithPage(pathname, params, getPageNumber(pageData.previous)) : null,
    },
    ...Array.from({length: pageData.num_pages}).map<Page>((_, index) => {
      return {
        rel: String(index + 1),
        href: hrefWithPage(pathname, params, index + 1)
      }
    }),
    {
      rel: "Next",
      href: pageData.next ? hrefWithPage(pathname, params, getPageNumber(pageData.next)) : null,
    },
    {
      rel: "Last",
      href: hrefWithPage(pathname, params, pageData.num_pages),
    }
  ];
  return pages;
}

const emptyActorPage: PaginatedResult<Actor> = {
  results: [],
  next: null,
  previous: null,
  num_pages: 0,
  count: 0,
}

function ConnectedListView() {
  const params = useSearchParams();
  const {data: actorPage, error, isLoading} = useSWR(["http://localhost:3210/api/actor/", params.get("page")], fetchActorPage, {fallbackData: emptyActorPage});
  const pathname = usePathname();
  const pages = getPages(pathname, params, actorPage);
  const currentPage = hrefWithPage(pathname, params, params.get("page") || "0")
  return (
    <BaseListView actors={actorPage.results} count={actorPage.count} pages={pages} currentPage={currentPage} pageCount={actorPage.num_pages} />
  )
}

function BaseListView(
  {actors, count, pages, currentPage, pageCount}: {
    actors: Actor[],
    count: number,
    pages: Page[],
    currentPage: string,
    pageCount: number,
  }
) {
  const [actionIsOpen, setActionIsOpen] = useState(false);

  const items = actors.map<SearchableItem>(item => {
    const licenses: License[] = item.licenses;
    const roles = new Set<Role>([]);
    return {
      id: String(item.id),
      properties: {
        "Name": {
          term: item.full_name,
          component: <Link href={`/bird-ringing/actor-view/?entryId=${item.id}`}>{item.full_name}</Link>
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
                <Fragment key={index}><Link href={`/bird-ringing/license-view/?entryId=${l.license_id}`}>{l.mednr ? `${l.mnr}:${l.mednr}` : l.mnr}</Link>{index < list.length - 1 ? ", " : <></>}</Fragment>
              );
            })}</>
          )
        },
        "E-mail": {
          term: item.email ? item.email : "-",
          component: item.email ? item.email : "-",
        },
        "Sex": {
          term: item.sex,
          component: item.sex
        },
        "Updated At": {
          term: item.updated_at,
          component: item.updated_at
        },
      }
    }
  })
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
    "Sex",
    "Updated At",
  ]
  return (
    <div className="container">
      <h2>Actor List View</h2>
      <div className="input-group mb-3">
        <span className="input-group-text">Filter</span>
        <input
          type="text"
          value={""}
          onChange={(event) => {}}
          className="form-control"
          placeholder={columns.join(", ")}
          aria-label="Filter for actor table"
          aria-describedby="basic-addon1"
        />
      </div>
      <div className="input-group mb-3">
        <button className="btn btn-outline-secondary" type="button" onClick={toggleItems}>{allSelected ? "Select None" : "Select All"}</button>
        <span className="input-group-text flex-grow-1" >{selectedItems.size} of {count} selected</span>
        <button className="btn btn-outline-secondary dropdown-toggle" onClick={() => setActionIsOpen(!actionIsOpen)} type="button" aria-expanded={actionIsOpen}>Batch action</button>
      </div>
      <ul className={`dropdown-menu ${actionIsOpen ? "show" : ""}`} style={actionIsOpen ? dropdownOpenStyle : {}} onClick={() => setActionIsOpen(false)}>
        <li><a className="dropdown-item" href="#">Send license</a></li>
        <li><a className="dropdown-item" href="#">Generate new license</a></li>
        <li><a className="dropdown-item" href="#">Download licenses</a></li>
        <li><hr className="dropdown-divider" /></li>
        <li><a className="dropdown-item" href="#">Disable</a></li>
        <li><a className="dropdown-item" href="#">Enable</a></li>
      </ul>
      <Pagination pages={pages} currentPage={currentPage} pageCount={pageCount} />
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
    <Suspense fallback={<BaseListView actors={[]} count={0} pages={[]} currentPage="" pageCount={0}/>}>
      <ConnectedListView />
    </Suspense>
  )
}