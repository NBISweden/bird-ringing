"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ActorBase,
  LicenseDocument,
  LicenseActorRelation,
  LicenseInstance,
  LicenseCommunication,
  Options,
} from "@/app/(system)/common";
import {
  TranslationId,
  useTranslation,
} from "@/app/(system)/internationalization";
import { useOptions } from "@/app/(system)/hooks";
import Icon from "./Icon";
import Spinner from "./Spinner";

type LicenseActorRelationInstance = LicenseInstance["actors"][number];

function getActorSortingFunction(
  order: string,
  options: {
    licenseRoles?: Options["license_role"][];
    actorDocuments?: Record<number, LicenseDocument[]>;
    direction?: -1 | 1;
  } = {},
): (
  a: LicenseActorRelation & { actor: ActorBase },
  b: LicenseActorRelation & { actor: ActorBase },
) => number {
  const direction = options.direction === undefined ? 1 : options.direction;
  switch (order) {
    case "name": {
      return (a, b) => {
        const aName = a.actor.last_name || a.actor.first_name;
        const bName = b.actor.last_name || b.actor.first_name;
        return direction * aName.localeCompare(bName);
      };
    }
    case "role":
    default: {
      return (a, b) => {
        const roles = options.licenseRoles ?? [];
        const roleOrder = new Map(roles.map((r, index) => [r.id, index]));
        return (
          direction *
          ((roleOrder.get(a.role) ?? 0) - (roleOrder.get(b.role) ?? 0))
        );
      };
    }
    case "documents": {
      return (a, b) => {
        const aReference =
          options.actorDocuments?.[a.actor.id]?.[0]?.reference ?? "";
        const bReference =
          options.actorDocuments?.[b.actor.id]?.[0]?.reference ?? "";
        return direction * aReference.localeCompare(bReference);
      };
    }
  }
}

type RelationSortingOrder = {
  name: "role" | "name" | "documents";
  direction: 1 | -1;
};

type LicenseActorListProps = {
  actors: LicenseActorRelationInstance[];
  documents: LicenseDocument[];
  communication?: LicenseCommunication[];
  licenseNumber: string;
  selectedActorIds: Set<number>;
  onSelectionChange: (actorId: number, selected: boolean) => void;
  isSelectable: (rel: LicenseActorRelationInstance) => boolean;
  disabled: boolean;
};

export function LicenseActorList({
  actors,
  documents,
  licenseNumber,
  selectedActorIds,
  onSelectionChange,
  isSelectable,
  disabled,
  communication,
}: LicenseActorListProps) {
  const { t, formatOption } = useTranslation();
  const [sortingOrder, setSortingOrder] = useState<RelationSortingOrder>({
    name: "role",
    direction: 1,
  });
  const { data: licenseRoles, isLoading: isLoadingRoles } =
    useOptions("license_role");

  const actorDocumentsMap = useMemo(() => {
    const map: Record<number, LicenseDocument[]> = {};
    for (const doc of documents) {
      if (doc.type === "license") {
        (map[doc.actor_id] ??= []).push(doc);
      }
    }
    return map;
  }, [documents]);

  const actorDeliveryStatusMap = useMemo(() => {
    const map: Record<number, string | undefined> = {};
    for (const com of communication ?? []) {
      if (com.type === "license delivery") {
        map[com.actor_id] = com.status;
      }
    }
    return map;
  }, [communication]);

  const sortingFunc = getActorSortingFunction(sortingOrder.name, {
    licenseRoles,
    actorDocuments: actorDocumentsMap,
    direction: sortingOrder.direction,
  });
  const sortedActors = [...(actors || [])].sort(sortingFunc);
  const sortingOrderSelection: Array<
    [RelationSortingOrder["name"], string, TranslationId]
  > = [
    ["role", "col-12 col-md-2", "licenseRole"],
    ["name", "col-12 col-md-4", "actorName"],
    ["documents", "col-12 col-md-4", "actorLicenses"],
  ];

  return (
    <>
      {isLoadingRoles ? <Spinner /> : <></>}
      {sortedActors.length && !isLoadingRoles ? (
        <ul className="list-group list-group-flush">
          <li className="list-group-item mb-3">
            <div className="row align-items-center g-2">
              {sortingOrderSelection.map(([so, className, messageId]) => (
                <div className={`${className} fw-semibold`} key={so}>
                  <span
                    className="text-nowrap link-primary text-decoration-underline"
                    role="button"
                    onClick={() =>
                      setSortingOrder({
                        name: so,
                        direction:
                          sortingOrder.name === so
                            ? sortingOrder.direction === 1
                              ? -1
                              : 1
                            : 1,
                      })
                    }
                  >
                    {t(messageId)}
                    {sortingOrder.name === so ? (
                      <Icon
                        icon={
                          sortingOrder.direction === 1
                            ? "caret-down-fill"
                            : "caret-up-fill"
                        }
                      />
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </li>
          {sortedActors.map((rel, i) => {
            const docs = actorDocumentsMap[rel.actor.id] ?? [];
            const isRinger =
              rel.role === "ringer" || rel.role === "associate_ringer";
            const status = actorDeliveryStatusMap[rel.actor.id];

            return (
              <li className="list-group-item mb-3" key={i}>
                <div className="row align-items-center g-2">
                  <div className="col-12 col-md-2 fw-semibold">
                    {formatOption(rel.role, {
                      affiliate: "licenseRoleAffiliate",
                      associate_ringer: "licenseRoleAssociateRinger",
                      communication: "licenseRoleCommunication",
                      ringer: "licenseRoleRinger",
                    })}
                  </div>
                  <div className="col-12 col-md-4">
                    <Link href={`/actors/entry?entryId=${rel.actor.id}`}>
                      {rel.actor.full_name}
                    </Link>
                    ({rel.associate_number})
                  </div>
                  <div className="col-10 col-md-4">
                    {isRinger &&
                      docs.map((doc, index) => (
                        <a
                          key={index}
                          href={`/api/license_sequence/${licenseNumber}/card-pdf/?actor_id=${doc.actor_id}`}
                          target="_blank"
                          rel="noreferrer"
                          title={t("licenseDocumentReference")}
                        >
                          <i className="bi bi-file-earmark-pdf me-1" />
                        </a>
                      ))}
                    {status && isRinger && docs.length > 0 ? (
                      <span className="badge rounded-pill border border-primary text-primary">
                        {formatOption(status, {
                          sent: "licenseDeliveryStatusSent",
                          received: "licenseDeliveryStatusReceived",
                          bounced: "licenseDeliveryStatusBounced",
                          failed: "licenseDeliveryStatusFailed",
                        })}
                      </span>
                    ) : null}
                  </div>

                  <div className="col-2 col-md-2 d-flex justify-content-center">
                    {isSelectable(rel) ? (
                      <input
                        className="form-check-input border border-dark"
                        type="checkbox"
                        checked={selectedActorIds.has(rel.actor.id)}
                        disabled={disabled}
                        title={
                          disabled
                            ? t("licenseSendDisabledInactive")
                            : undefined
                        }
                        onChange={(e) =>
                          onSelectionChange(rel.actor.id, e.target.checked)
                        }
                      />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted fst-italic">{t("licenseNoConnectedActors")}</p>
      )}
    </>
  );
}
