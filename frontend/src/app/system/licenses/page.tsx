"use client"
import { useState, Suspense, useMemo, useEffect } from "react";
import Link from "next/link";
import { useItemSelections, useDebouncedValue } from "../hooks";
import { Pagination } from "../../../components/Pagination";
import useSWR from "swr";
import { usePathname, useSearchParams } from 'next/navigation'
import Spinner from "@/components/Spinner";
import { useRouter } from 'next/navigation';
import {
  PagedResponse,
  getPages,
  hrefWithParams,
  Page,
  LicenseListItem,
  TableItem,
} from "../common"
import { Client } from "../client";
import { useClient } from "../contexts";

async function fetchLicensePage(
  [client, _ctx, page, search]: [Client, "licenses", number, string]
): Promise<PagedResponse<LicenseListItem>> {
  return client.fetchLicensePage(page, search)
}

const emptyLicensePage: PagedResponse<LicenseListItem> = {
  results: [],
  next: null,
  previous: null,
  num_pages: 0,
  count: 0,
}

function toLicenseTable(item: LicenseListItem): TableItem {
  const licenseHolderInfo = item.current.actors.find(r => r.role === "ringer");
  const licenseHolder = licenseHolderInfo ? licenseHolderInfo.actor : undefined;

  const licenseHelperInfo = item.current.actors.filter(r => r.role === "helper");

  return {
    id: item.mnr,
      properties: {
        "Mnr": {
          component: <Link href={`license-view/?entryId=${item.mnr}`}>{item.mnr}</Link>
        },
        "Type": {
          component: licenseHolder?.type,
        },
        "License holder": {
          component: item.license_holder,
        },
        "Number of helpers": {
          component: String(licenseHelperInfo.length)
        },
        "Trapping methods": {
          component: item.methods,
        },
        "License version": {
          component: String(item.current.version),
        },
        "Final report status": {
          component: item.current.report_status,
        },
        "License status": {
          component: item.status,
        },
        "Last email sent at": {
          component: item.last_email_sent_at,
        },
      }
  }
}

function ConnectedListView() {
  const params = useSearchParams();
  const page = params.get("page") || 1;
  const search = params.get("search") || "";
  const [query, setQuery] = useState<string>(search);
  const activeQuery = useDebouncedValue(query, 1000);
  const router = useRouter();
  const client = useClient();
  
  useEffect(() => {
    if (search !== activeQuery) {
      router.push(`/system/licenses/?search=${activeQuery}`);
    }
  }, [activeQuery, search]);
  
  const {data: LicensePage, isLoading} = useSWR(
    [client, "licenses", page, search],
    fetchLicensePage,
    {fallbackData: emptyLicensePage, keepPreviousData: true}
  );
  const pathname = usePathname();
  const pages = getPages(pathname, params, LicensePage);
  const currentPage = hrefWithParams(pathname, params, page, search)
  return (
    <BaseListView
      isLoading={isLoading}
      licenses={LicensePage.results}
      count={LicensePage.count}
      pages={pages}
      query={query}
      setQuery={setQuery}
      currentPage={currentPage} pageCount={LicensePage.num_pages}
    />
  )
}

function BaseListView(
  {licenses, count, pages, currentPage, pageCount, query, setQuery, isLoading}: {
    licenses: LicenseListItem[];
    count: number;
    pages: Page[];
    currentPage: string;
    pageCount: number;
    query: string;
    setQuery: (q: string) => void;
    isLoading?: boolean;
  }
) {
  const [actionIsOpen, setActionIsOpen] = useState(false);

  const items = useMemo(() => licenses.map<TableItem>(toLicenseTable), [licenses])
  const {
    selectedItems,
    toggleItems,
    handleItemSelection,
    allSelected
  } = useItemSelections(new Set(items.map(r => r.id)));
  const columns = [
    "Mnr",
    "Type",
    "License holder",
    "Number of helpers",
    "Trapping methods",
    "License version",
    "Final report status",
    "License status",
    "Last email sent at"
  ]
  const selectionInfo = isLoading ? "Laddar data" : `${selectedItems.size} valda av ${count}`;
  return (
    <div className="container">
      <h2>License List View</h2>
      <div className="input-group mb-3">
        <span className="input-group-text">Filter</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="form-control"
          placeholder={"Mnr, License holder, Trapping methods, Last email sent at"}
          aria-label="Filtrera tabellen"
          aria-describedby="Tabellfilter"
        />
      </div>
      <div className="input-group mb-3">
        <button className={`btn btn-outline-secondary ${isLoading ? "disabled" : ""}`} type="button" onClick={toggleItems}>{allSelected ? "Välj inga" : "Välj alla"}</button>
        <span className="input-group-text flex-grow-1" >{selectionInfo}</span>
        <button className={`btn btn-outline-secondary dropdown-toggle  ${isLoading ? "disabled" : ""}`} onClick={() => setActionIsOpen(!actionIsOpen)} type="button" aria-expanded={actionIsOpen}>Batch-funktioner</button>
        <ul className={`dropdown-menu batch-action-menu ${actionIsOpen ? "show" : ""}`} data-open={actionIsOpen} onClick={() => setActionIsOpen(false)}>
          <li><a className="dropdown-item" href="#">Skicka licens</a></li>
          <li><a className="dropdown-item" href="#">Skapa ny licens</a></li>
          <li><a className="dropdown-item" href="#">Ladda ned licenser</a></li>
          <li><hr className="dropdown-divider" /></li>
          <li><a className="dropdown-item" href="#">Avaktivera</a></li>
          <li><a className="dropdown-item" href="#">Aktivera</a></li>
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
    <Suspense fallback={<BaseListView query="" setQuery={() => {}} licenses={[]} count={0} pages={[]} currentPage="" pageCount={0}/>}>
      <ConnectedListView />
    </Suspense>
  )
}