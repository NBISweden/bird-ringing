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
import Icon from "@/components/Icon"
import { useFetchEmailAddressesAction, useSendLicenseEmailAction } from "./actions";

type ActorPropertyIds = "name" | "type" | "roles" | "licenses" | "email" | "city" | "updated_at";
type ColumnProperties = {
  ordering?: {
    forward: string,
    reverse: string,
  },
  label: string,
}
type BatchAction = {
  label: string;
  action: (itemIds: Set<string>) => void;
  disabled?: boolean;
}

async function fetchActorPage(
  [client, _ctx, page, search, ordering]: [Client, "actors", number, string, string]
): Promise<PagedResponse<ActorListItem>> {
  return client.fetchActorPage(page, search, ordering)
}

const emptyActorPage: PagedResponse<ActorListItem> = {
  results: [],
  next: null,
  previous: null,
  num_pages: 0,
  count: 0,
}

function toActorTable(item: ActorListItem): TableItem<ActorPropertyIds> {
  const licenses: ActorLicenseRelation[] = item.current_license_relations;
  const roles = new Set<Role>(licenses.map(l => l.role));
  return {
    id: String(item.id),
    properties: {
      name: {
        component: <Link href={`/system/actors/entry/?entryId=${item.id}`}>{item.full_name}</Link>
      },
      type: {
        component: item.type,
      },
      roles: {
        component: Array.from(roles).join(", ")
      },
      licenses: {
        component: (
          <>{licenses.map((l, index, list) => {
            return (
              <Fragment key={index}>{l.mednr ? `${l.mnr}:${l.mednr}` : l.mnr}{index < list.length - 1 ? ", " : <></>}</Fragment>
            );
          })}</>
        )
      },
      email: {
        component: item.email ? item.email : "-",
      },
      city: {
        component: item.city
      },
      updated_at: {
        component: item.updated_at
      },
    }
  }
}

function ConnectedListView() {
  const params = useSearchParams();
  const pathname = usePathname();
  const page = params.get("page") || 1;
  const search = params.get("search") || "";
  const ordering = params.get("ordering") || "";
  const [query, setQuery] = useState<string>(search);
  const activeQuery = useDebouncedValue(query, 1000);
  const router = useRouter();
  const client = useClient();
  const fetchEmailAddressesAction = useFetchEmailAddressesAction(client);
  const sendLicenseEmailAction = useSendLicenseEmailAction();
  
  useEffect(() => {
    if (search !== activeQuery) {
      router.push(
        hrefWithParams(pathname, undefined, undefined, activeQuery, ordering)
      );
    }
  }, [pathname, activeQuery, search, ordering]);
  
  const {data: actorPage, isLoading} = useSWR(
    [client, "actors", page, search, ordering],
    fetchActorPage,
    {fallbackData: emptyActorPage, keepPreviousData: true}
  );
  const pages = getPages(pathname, params, actorPage);
  const currentPage = hrefWithParams(pathname, params, page, search)
  const batchActions: ListViewProps["batchActions"] = [
    {
      label: "Hämta e-postadresser",
      action: fetchEmailAddressesAction
    },
    {
      label: "Skicka licenser",
      action: sendLicenseEmailAction
    },
    {type: "divider"},
    {
      label: "Avaktivera",
      action: () => {},
      disabled: true,
    }
  ]
  return (
    <BaseListView
      isLoading={isLoading}
      actors={actorPage.results}
      count={actorPage.count}
      pages={pages}
      query={query}
      setQuery={setQuery}
      params={params}
      currentPage={currentPage} pageCount={actorPage.num_pages}
      batchActions={batchActions}
    />
  )
}

type ListViewProps = {
  actors: ActorListItem[];
  count: number;
  pages: Page[];
  currentPage: string;
  pageCount: number;
  query: string;
  setQuery: (q: string) => void;
  isLoading?: boolean;
  params: URLSearchParams;
  batchActions: (BatchAction | {type: "divider"})[];
}

function BaseListView(
  {actors, count, pages, currentPage, pageCount, query, setQuery, isLoading, params, batchActions}: ListViewProps
) {
  const [actionIsOpen, setActionIsOpen] = useState(false);

  const items = useMemo(() => actors.map<TableItem>(toActorTable), [actors])
  const {
    selectedItems,
    toggleItems,
    handleItemSelection,
    allSelected
  } = useItemSelections(new Set(items.map(r => r.id)), "data-actor-id");
  const ordering = params.get("ordering")
  const columns: Record<ActorPropertyIds, ColumnProperties> = {
    name: {
      label: "Namn",
      ordering: {
        forward: "full_name",
        reverse: "-full_name"
      }
    },
    type: {
      label: "Type",
      ordering: {
        forward: "type,full_name",
        reverse: "-type,full_name"
      }
    },
    roles: {
      label: "Roller",
    },
    licenses: {
      label: "Licenser"
    },
    email: {
      label: "E-post",
      ordering: {
        forward: "email,alternative_email",
        reverse: "-email,-alternative_email"
      }
    },
    city: {
      label: "Ort",
      ordering: {
        forward: "city,full_name",
        reverse: "-city,full_name"
      }
    },
    updated_at: {
      label: "Senast uppdaterad",
      ordering: {
        forward: "updated_at,full_name",
        reverse: "-updated_at,full_name"
      }
    }
  }
  const selectionInfo = isLoading ? "Laddar data" : `${selectedItems.size} valda av ${count}`;
  return (
    <div className="container">
      <h2>Ringare</h2>
      <div className="input-group mb-3">
        <span className="input-group-text">Filter</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="form-control"
          placeholder={"Namn, E-post, Ort, Mnr, Roll, Typ"}
          aria-label="Filtrera tabellen"
          aria-describedby="Tabellfilter"
        />
      </div>
      <div className="input-group mb-3">
        <button className={`btn btn-outline-secondary ${isLoading ? "disabled" : ""}`} type="button" onClick={toggleItems}>{allSelected ? "Välj inga" : "Välj alla"}</button>
        <span className="input-group-text flex-grow-1" >{selectionInfo}</span>
        <button className={`btn btn-outline-secondary dropdown-toggle  ${isLoading ? "disabled" : ""}`} onClick={() => setActionIsOpen(!actionIsOpen)} type="button" aria-expanded={actionIsOpen}>Batch-funktioner</button>
        <ul className={`dropdown-menu batch-action-menu ${actionIsOpen ? "show" : ""}`} data-open={actionIsOpen} onClick={() => setActionIsOpen(false)}>
          {batchActions.map((action, index) => (
            "type" in action ? (
              <li key={index}><hr className="dropdown-divider" /></li>
            ) : (
              <li key={index}><span className={`dropdown-item ${action.disabled ? "disabled" : ""}`} onClick={() => action.action(selectedItems)}>{action.label}</span></li>
            )
          ))}
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
            {Object.entries(columns).map(([key, c]) => {
              const direction = c.ordering?.forward === ordering ? "+" : (
                c.ordering?.reverse === ordering ? "-" : null
              );
              const updatedParams = new URLSearchParams(params);
              if (c.ordering) {
                updatedParams.set("ordering", direction === "+" ? c.ordering.reverse : c.ordering.forward)
              }
              const href = "?" + updatedParams.toString();
              return (
                <th key={key} scope="col">{
                  c.ordering ? (
                    <Link className="text-nowrap" href={href}>{c.label} {direction ? (
                      direction === "+" ? <Icon icon="caret-down-fill"/> : <Icon icon="caret-up-fill"/>
                    ) : (
                      <></>
                    )}</Link>
                  ) : (
                    c.label
                  )
                }</th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            return (
              <tr key={item.id}>
                <th><input type="checkbox" onChange={handleItemSelection} checked={selectedItems.has(item.id)} data-actor-id={item.id}/></th>
                {Object.entries(columns).map(([key, _c]) => <td key={key}>{item.properties[key].component}</td>)}
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
    <Suspense fallback={<BaseListView query="" setQuery={() => {}} actors={[]} count={0} pages={[]} currentPage="" pageCount={0} params={new URLSearchParams()} batchActions={[]}/>}>
      <ConnectedListView />
    </Suspense>
  )
}