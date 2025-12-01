"use client"
import { useState, Suspense, useMemo, useEffect } from "react";
import Link from "next/link";
import { Fragment } from "react";
import { useItemSelections, useDebouncedValue } from "../hooks";
import { Pagination } from "../../../components/Pagination";
import useSWR from "swr";
import { usePathname, useSearchParams } from 'next/navigation'
import Spinner from "@/components/Spinner";
import { useRouter } from 'next/navigation';
import {
  ActorLicenseRelation,
  PagedResponse,
  Role,
  getPages,
  hrefWithParams,
  Page,
  ActorListItem,
  TableItem,
} from "../common"
import { Client } from "../client";
import { useClient } from "../contexts";

async function fetchActorPage(
  [client, page, search]: [Client, number, string]
): Promise<PagedResponse<ActorListItem>> {
  return client.fetchActorPage(page, search)
}

const emptyActorPage: PagedResponse<ActorListItem> = {
  results: [],
  next: null,
  previous: null,
  num_pages: 0,
  count: 0,
}

function toActorTable(item: ActorListItem): TableItem {
  const licenses: ActorLicenseRelation[] = item.current_license_relations;
  const roles = new Set<Role>(licenses.map(l => l.role));
  return {
    id: String(item.id),
    properties: {
      "Namn": {
        component: <Link href={`/actors/entry/?entryId=${item.id}`}>{item.full_name}</Link>
      },
      "Typ": {
        component: item.type,
      },
      "Roller": {
        component: Array.from(roles).join(", ")
      },
      "Licenser": {
        component: (
          <>{licenses.map((l, index, list) => {
            return (
              <Fragment key={index}><Link href={`/licenses/entry/?entryId=${l.license_id}`}>{l.mednr ? `${l.mnr}:${l.mednr}` : l.mnr}</Link>{index < list.length - 1 ? ", " : <></>}</Fragment>
            );
          })}</>
        )
      },
      "E-post": {
        component: item.email ? item.email : "-",
      },
      "Ort": {
        component: item.city
      },
      "Senast uppdaterad": {
        component: item.updated_at
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
      router.push(`/system/actors/?search=${activeQuery}`);
    }
  }, [activeQuery, search]);
  
  const {data: actorPage, isLoading} = useSWR(
    [client, page, search],
    fetchActorPage,
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

function BaseListView(
  {actors, count, pages, currentPage, pageCount, query, setQuery, isLoading}: {
    actors: ActorListItem[];
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

  const items = useMemo(() => actors.map<TableItem>(toActorTable), [actors])
  const {
    selectedItems,
    toggleItems,
    handleItemSelection,
    allSelected
  } = useItemSelections(new Set(items.map(r => r.id)));
  const columns = [
    "Namn",
    "Typ",
    "Roller",
    "Licenser",
    "E-post",
    "Ort",
    "Senast uppdaterad",
  ]
  const selectionInfo = isLoading ? "Laddar data" : `${selectedItems.size} valda av ${count}`;
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
          placeholder={"Namn, E-post, Ort"}
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
    <Suspense fallback={<BaseListView query="" setQuery={() => {}} actors={[]} count={0} pages={[]} currentPage="" pageCount={0}/>}>
      <ConnectedListView />
    </Suspense>
  )
}