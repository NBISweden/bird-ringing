"use client";
import { useState, Suspense, useMemo, useEffect } from "react";
import Link from "next/link";
import { useItemSelections, useDebouncedValue } from "../hooks";
import { Pagination } from "../../../components/Pagination";
import useSWR from "swr";
import { usePathname, useSearchParams } from "next/navigation";
import Spinner from "@/components/Spinner";
import { useRouter } from "next/navigation";
import {
  ActorLicenseRelation,
  PagedResponse,
  getPages,
  hrefWithParams,
  Page,
  ActorListItem,
  TableItem,
  convertDateToLocale,
  MenuAction,
} from "../common";
import { Client } from "../client";
import { useClient } from "../contexts";
import Icon from "@/components/Icon";
import { useFetchEmailAddressesAction } from "./actions";
import { Translation, useTranslation } from "../internationalization";
import { Badge } from "@/components/Badge";
import { DropDownMenu } from "@/components/DropDownMenu";

type ActorPropertyIds =
  | "name"
  | "type"
  | "roles"
  | "licenses"
  | "email"
  | "city"
  | "updated_at";
type ColumnProperties = {
  ordering?: {
    forward: string;
    reverse: string;
  };
  label: string;
};

type BatchAction = MenuAction<(itemIds: Set<string>) => void>;

async function fetchActorPage([client, _ctx, page, search, ordering]: [
  Client,
  "actors",
  number,
  string,
  string,
]): Promise<PagedResponse<ActorListItem>> {
  return client.fetchActorPage(page, search, ordering);
}

const emptyActorPage: PagedResponse<ActorListItem> = {
  results: [],
  next: null,
  previous: null,
  num_pages: 0,
  count: 0,
};

function toActorTable(
  item: ActorListItem,
  formatOption: Translation["formatOption"],
): TableItem<ActorPropertyIds> {
  const licenses: ActorLicenseRelation[] = item.license_relations;
  const roles = new Set<string>(licenses.map((l) => l.role.id));
  return {
    id: String(item.id),
    properties: {
      name: {
        component: (
          <Link href={`/actors/entry/?entryId=${item.id}`}>
            {item.full_name}
          </Link>
        ),
      },
      type: {
        component: formatOption(item.type.id, {
          person: "actorTypePerson",
          station: "actorTypeStation",
        }),
      },
      roles: {
        component: (
          <div className="table-row-max-height">
            {Array.from(roles).map((r) => (
              <Badge color="info" rounded outline key={r}>
                {formatOption(r, {
                  affiliate: "licenseRoleAffiliate",
                  associate_ringer: "licenseRoleAssociateRinger",
                  communication: "licenseRoleCommunication",
                  ringer: "licenseRoleRinger",
                })}
              </Badge>
            ))}
          </div>
        ),
      },
      licenses: {
        component: (
          <div className="table-row-max-height">
            {licenses.map((l, index) => (
              <Link
                key={index}
                href={`/licenses/entry?mnr=${l.mnr}`}
                className="text-decoration-none"
              >
                <Badge color="info" rounded outline>
                  {l.mednr ? `${l.mnr}:${l.mednr}` : l.mnr}
                </Badge>
              </Link>
            ))}
          </div>
        ),
      },
      email: {
        component: item.email ? item.email : "-",
      },
      city: {
        component: item.city,
      },
      updated_at: {
        component: convertDateToLocale(item.updated_at),
      },
    },
  };
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
  const { t } = useTranslation();

  useEffect(() => {
    if (search !== activeQuery) {
      router.push(
        hrefWithParams(pathname, undefined, undefined, activeQuery, ordering),
      );
    }
  }, [pathname, activeQuery, search, ordering, router]);

  const { data: actorPage, isLoading } = useSWR(
    [client, "actors", page, search, ordering],
    fetchActorPage,
    { fallbackData: emptyActorPage, keepPreviousData: true },
  );
  const pages = getPages(pathname, params, actorPage, t);
  const currentPage = hrefWithParams(pathname, params, page, search);
  const batchActions: BatchAction[] = [
    {
      label: t("actorFetchEmailAddresses"),
      action: fetchEmailAddressesAction,
    },
  ];
  return (
    <BaseListView
      isLoading={isLoading}
      actors={actorPage.results}
      count={actorPage.count}
      pages={pages}
      query={query}
      setQuery={setQuery}
      params={params}
      currentPage={currentPage}
      batchActions={batchActions}
    />
  );
}

type ListViewProps = {
  actors: ActorListItem[];
  count: number;
  pages: Page[];
  currentPage: string;
  query: string;
  setQuery: (q: string) => void;
  isLoading?: boolean;
  params: URLSearchParams;
  batchActions: BatchAction[];
};

function BaseListView({
  actors,
  count,
  pages,
  currentPage,
  query,
  setQuery,
  isLoading,
  params,
  batchActions,
}: ListViewProps) {
  const { t, formatOption } = useTranslation();
  const [actionIsOpen, setActionIsOpen] = useState(false);

  const items = useMemo(
    () => actors.map<TableItem>((actor) => toActorTable(actor, formatOption)),
    [actors, formatOption],
  );
  const { selectedItems, toggleItems, handleItemSelection, allSelected } =
    useItemSelections(new Set(items.map((r) => r.id)), "data-actor-id");
  const ordering = params.get("ordering");
  const columns: Record<ActorPropertyIds, ColumnProperties> = {
    name: {
      label: t("actorName"),
      ordering: {
        forward: "full_name",
        reverse: "-full_name",
      },
    },
    type: {
      label: t("actorType"),
      ordering: {
        forward: "type,full_name",
        reverse: "-type,full_name",
      },
    },
    roles: {
      label: t("actorRoles"),
    },
    licenses: {
      label: t("actorLicenses"),
    },
    email: {
      label: t("actorEmail"),
      ordering: {
        forward: "email,alternative_email",
        reverse: "-email,-alternative_email",
      },
    },
    city: {
      label: t("actorCity"),
      ordering: {
        forward: "city,full_name",
        reverse: "-city,full_name",
      },
    },
    updated_at: {
      label: t("actorLastUpdated"),
      ordering: {
        forward: "updated_at,full_name",
        reverse: "-updated_at,full_name",
      },
    },
  };
  const selectionInfo = isLoading
    ? t("loadingData")
    : t("selectionSizeComparison", {
        selectedCount: selectedItems.size,
        fullCount: count,
      });
  return (
    <div className="container">
      <h2>{t("actorListView")}</h2>
      <div className="input-group mb-3">
        <label
          className="input-group-text"
          id="table-filter-label"
          htmlFor="table-filter"
        >
          {t("actorFilterLabel")}
        </label>
        <input
          id="table-filter"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="form-control"
          placeholder={t("actorFilterPlaceholder")}
          aria-label={t("actorFilterDescription")}
          aria-describedby="table-filter-label"
        />
      </div>
      <div className="input-group mb-3">
        <button
          className={`btn btn-outline-secondary ${isLoading ? "disabled" : ""}`}
          type="button"
          onClick={toggleItems}
        >
          {allSelected ? t("selectNone") : t("selectAll")}
        </button>
        <span className="input-group-text flex-grow-1">{selectionInfo}</span>
        <button
          className={`btn btn-outline-secondary dropdown-toggle  ${isLoading ? "disabled" : ""}`}
          onClick={() => setActionIsOpen(!actionIsOpen)}
          type="button"
          aria-expanded={actionIsOpen}
        >
          {t("batchActions")}
        </button>
        <DropDownMenu
          isOpen={actionIsOpen}
          setIsOpen={setActionIsOpen}
          actions={batchActions.map((action) =>
            "action" in action
              ? {
                  label: action.label,
                  action: () => action.action(selectedItems),
                }
              : action,
          )}
        />
      </div>
      <div className="d-flex flex-row align-items-center gap-3">
        <Pagination pages={pages} currentPage={currentPage} />
        {isLoading ? <Spinner className="mb-3" /> : <></>}
      </div>
      <table className="table">
        <thead>
          <tr>
            <th scope="col"></th>
            {Object.entries(columns).map(([key, c]) => {
              const direction =
                c.ordering?.forward === ordering
                  ? "+"
                  : c.ordering?.reverse === ordering
                    ? "-"
                    : null;
              const updatedParams = new URLSearchParams(params);
              if (c.ordering) {
                updatedParams.set(
                  "ordering",
                  direction === "+" ? c.ordering.reverse : c.ordering.forward,
                );
              }
              const href = "?" + updatedParams.toString();
              return (
                <th key={key} scope="col">
                  {c.ordering ? (
                    <Link className="text-nowrap" href={href}>
                      {c.label}{" "}
                      {direction ? (
                        direction === "+" ? (
                          <Icon icon="caret-down-fill" />
                        ) : (
                          <Icon icon="caret-up-fill" />
                        )
                      ) : (
                        <></>
                      )}
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
          {items.map((item) => {
            return (
              <tr key={item.id}>
                <th>
                  <input
                    type="checkbox"
                    onChange={handleItemSelection}
                    checked={selectedItems.has(item.id)}
                    data-actor-id={item.id}
                  />
                </th>
                {Object.entries(columns).map(([key, _c]) => (
                  <td key={key}>{item.properties[key].component}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination pages={pages} currentPage={currentPage} />
    </div>
  );
}

export default function ListView() {
  return (
    <Suspense
      fallback={
        <BaseListView
          query=""
          setQuery={() => {}}
          actors={[]}
          count={0}
          pages={[]}
          currentPage=""
          params={new URLSearchParams()}
          batchActions={[]}
        />
      }
    >
      <ConnectedListView />
    </Suspense>
  );
}
