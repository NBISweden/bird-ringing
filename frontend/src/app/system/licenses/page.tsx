"use client"
import { useState, Suspense, useMemo, useEffect } from "react";
import Link from "next/link";
import { useItemSelections, useDebouncedValue } from "../hooks";
import { Pagination } from "../../../components/Pagination";
import Icon from "@/components/Icon";
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
  convertDateToLocale,
} from "../common"
import { Client } from "../client";
import { useClient } from "../contexts";

import { useBatchCreateLicenseCardsAction } from "./actions";
import { useDownloadLicenseCardsZipAction } from "./actions";

type LicensePropertyIds = | "mnr" | "type" | "license_holder" | "helpers" | "methods" | "final_report_status" | "license_status" | "last_email_sent_at";
type ColumnProperties = {
  ordering?: {
    forward: string;
    reverse: string;
  };
  label: string;
};

type BatchAction = {
  label: string;
  action: (itemIds: Set<string>) => void;
  disabled?: boolean;
};

async function fetchLicensePage(
  [client, _ctx, page, search, ordering]: [Client, "licenses", number, string, string]
): Promise<PagedResponse<LicenseListItem>> {
  return client.fetchLicensePage(page, search, ordering)
}

const emptyLicensePage: PagedResponse<LicenseListItem> = {
  results: [],
  next: null,
  previous: null,
  num_pages: 0,
  count: 0,
}

function toLicenseTable(item: LicenseListItem): TableItem<LicensePropertyIds> {
  return {
    id: item.mnr,
    properties: {
      mnr: {
        component: <Link href={`licenses/entry/?mnr=${item.mnr}`}>{item.mnr}</Link>
      },
      type: {
        component: item.license_holder_type || "-",
      },
      license_holder: {
        component: item.license_holder,
      },
      helpers: {
        component: String(item.helper_count || "0"),
      },
      methods: {
        component: item.methods,
      },
      final_report_status: {
        component: item.current.report_status,
      },
      license_status: {
        component: item.status,
      },
      last_email_sent_at: {
        component: convertDateToLocale(item.last_email_sent_at),
      },
    },
  };
}

function ConnectedListView() {
  const params = useSearchParams();
  const page = params.get("page") || 1;
  const search = params.get("search") || "";
  const ordering = params.get("ordering") || "mnr";
  const [query, setQuery] = useState<string>(search);
  const activeQuery = useDebouncedValue(query, 1000);
  const router = useRouter();
  const client = useClient();
  const pathname = usePathname();

  useEffect(() => {
    if (search !== activeQuery) {
      router.push(
        hrefWithParams(pathname, undefined, undefined, activeQuery, ordering)
      );
    }
  }, [pathname, activeQuery, search, ordering]);
  
  const {data: LicensePage, isLoading} = useSWR(
    [client, "licenses", page, search, ordering],
    fetchLicensePage,
    {fallbackData: emptyLicensePage, keepPreviousData: true}
  );
  // const pathname = usePathname();
  const pages = getPages(pathname, params, LicensePage);
  const currentPage = hrefWithParams(pathname, params, page, search, ordering)

  const createDocsAction = useBatchCreateLicenseCardsAction(client);
  const downloadZipAction = useDownloadLicenseCardsZipAction(client);

  const batchActions: (BatchAction | { type: "divider" })[] = [
    {
      label: "Skapa licensdokument",
      action: createDocsAction,
    },
    { type: "divider" },
    { label: "Ladda ned licenskort (ZIP)",
      action: downloadZipAction
    },
    { type: "divider" },
    {
      label: "Avaktivera",
      action: () => {},
      disabled: true,
    },
  ];
  return (
    <BaseListView
      isLoading={isLoading}
      licenses={LicensePage.results}
      count={LicensePage.count}
      pages={pages}
      query={query}
      setQuery={setQuery}
      currentPage={currentPage} pageCount={LicensePage.num_pages}
      batchActions={batchActions}
      params={params}
    />
  )
}

function BaseListView(
  {licenses, count, pages, currentPage, pageCount, query, setQuery, isLoading, batchActions, params}: {
    licenses: LicenseListItem[];
    count: number;
    pages: Page[];
    currentPage: string;
    pageCount: number;
    query: string;
    setQuery: (q: string) => void;
    isLoading?: boolean;
    batchActions: (BatchAction | {type: "divider"})[];
    params: URLSearchParams;
  }
) {
  const [actionIsOpen, setActionIsOpen] = useState(false);

  const items = useMemo(() => licenses.map<TableItem>(toLicenseTable), [licenses])
  const {
    selectedItems,
    toggleItems,
    handleItemSelection,
    allSelected
  } = useItemSelections(new Set(items.map(r => r.id)), "data-license-id");
  const ordering = params.get("ordering") || "mnr";

  const columns: Record<LicensePropertyIds, ColumnProperties> = {
    mnr: {
      label: "Mnr",
      ordering: { forward: "mnr", reverse: "-mnr" },
    },
    type: {
      label: "Type",
      ordering: { forward: "license_holder_type,mnr", reverse: "-license_holder_type,mnr" },
    },
    license_holder: {
      label: "License holder",
      ordering: { forward: "license_holder,mnr", reverse: "-license_holder,mnr" },
    },
    helpers: {
      label: "Number of helpers",
      ordering: { forward: "helper_count,mnr", reverse: "-helper_count,mnr" },
    },
    methods: {
      label: "Trapping methods",
      ordering: { forward: "methods,mnr", reverse: "-methods,mnr" },
    },
    final_report_status: {
      label: "Final report status",
      ordering: {
        forward: "report_status_label,mnr",
        reverse: "-report_status_label,mnr",
      },
    },
    license_status: {
      label: "License status",
      ordering: { forward: "status_label,mnr", reverse: "-status_label,mnr" },
    },
    last_email_sent_at: {
      label: "Last email sent at",
      ordering: { forward: "last_email_sent_at,mnr", reverse: "-last_email_sent_at,mnr" },
    },
  };
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
          placeholder={"Mnr, Type, License holder, Trapping methods, Last email sent at"}
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
              <li key={index}><span className={`dropdown-item ${action.disabled ? "disabled" : ""}`} onClick={() => !action.disabled && action.action(selectedItems)}>{action.label}</span></li>
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
              const direction =
                c.ordering?.forward === ordering ? "+" :
                c.ordering?.reverse === ordering ? "-" :
                null;

              const updatedParams = new URLSearchParams(params);
              if (c.ordering) {
                updatedParams.set(
                  "ordering",
                  direction === "+" ? c.ordering.reverse : c.ordering.forward
                );
              }
              const href = "?" + updatedParams.toString();

              return (
                <th key={key} scope="col">
                  {c.ordering ? (
                    <Link className="text-nowrap" href={href}>
                      {c.label}{" "}
                      {direction ? (
                        direction === "+" ? <Icon icon="caret-down-fill" /> : <Icon icon="caret-up-fill" />
                      ) : null}
                    </Link>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            return (
              <tr key={item.id}>
                <th><input type="checkbox" onChange={handleItemSelection} checked={selectedItems.has(item.id)} data-license-id={item.id} /></th>
                {Object.entries(columns).map(([key]) => { return (<td key={key}>{item.properties[key as LicensePropertyIds].component}</td>) })}
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
    <Suspense fallback={<BaseListView query="" setQuery={() => {}} licenses={[]} count={0} params={new URLSearchParams()} pages={[]} currentPage="" pageCount={0} batchActions={[]}/>}>
      <ConnectedListView />
    </Suspense>
  )
}