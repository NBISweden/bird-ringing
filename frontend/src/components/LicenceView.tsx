"use Client";

import Link from "next/link";
import {
  convertDateToLocale,
  convertOnlyDateToLocale,
  LicenseActorRelation,
  LicenseInstance,
  LicensePermissionByRef,
} from "@/app/(system)/common";
import {
  AlertModal,
  useClient,
  useModalsContext,
} from "../app/(system)/contexts";
import { useSendLicenseEmailForActorsAction } from "../app/(system)/licenses/actions";
import { useTranslation } from "@/app/(system)/internationalization";
import { LicensePermissionItem } from "./LicensePermissionItem";
import { useCallback, useState } from "react";
import { LicenseRelationsForm } from "./LicenseRelationsForm";
import { LicensePermissionEntryForm } from "./LicensePermissionEntryForm";
import { LicenseEntryForm, LicenseFormData } from "./LiceneseEntryForm";
import { useFormSubmission } from "@/app/(system)/hooks";
import { FieldErrors } from "./InputFields";
import { Alert } from "./Alert";
import { EditSection } from "./EditSection";

type LicenceViewProps = {
  license: LicenseInstance;
  mnr: string;
  status: string;
  onUpdated: () => unknown | Promise<unknown>;
};

type LicenseDisplayProps = {
  mnr: string;
  license: LicenseInstance;
};

type LicenseEditProps = LicenseDisplayProps & {
  onUpdated: () => unknown | Promise<unknown>;
};

function LicenseInfoEdit({
  mnr,
  license,
  status,
  onUpdated,
}: { status: string } & LicenseEditProps) {
  const { t } = useTranslation();
  const client = useClient();
  const modals = useModalsContext();

  const { submit, isSubmitting, errors } = useFormSubmission(
    async (license: LicenseFormData) =>
      await client.updateLicense(mnr, license),
    async (response) => {
      await response;
      modals.add(
        AlertModal(
          t("licenseUpdateSuccessTitle"),
          <p className="mb-0">{t("licenseUpdateSuccessMessage")}</p>,
          t("closeModal"),
        ),
      );
      await onUpdated();
    },
    async (errors) => {
      const lines = errors.nonField;

      if (lines.length > 0) {
        modals.add(
          AlertModal(
            t("licenseUpdateErrorTitle"),
            lines.length > 1 ? (
              <ul className="mb-0">
                {lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="mb-0">{lines[0]}</p>
            ),
            t("closeModal"),
          ),
        );
      }
    },
  );

  return (
    <div className="card-body">
      {errors && errors.nonField.length > 0 ? (
        <div tabIndex={-1}>
          <Alert type="danger">
            {errors.nonField.length === 1 ? (
              <p className="mb-0">{errors.nonField[0]}</p>
            ) : (
              <ul className="mb-0">
                {errors.nonField.map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
              </ul>
            )}
          </Alert>
        </div>
      ) : null}
      <FieldErrors errors={errors?.fields || {}}>
        <LicenseEntryForm
          initialLicense={{
            mnr: mnr,
            status: status,
            starts_at: license.starts_at,
            ends_at: license.ends_at,
            location: license.location,
            description: license.description,
            report_status: license.report_status,
          }}
          onSubmit={(license) => submit(license)}
          isSubmitting={isSubmitting}
        />
      </FieldErrors>
    </div>
  );
}

function LicenseInfoDisplay({ license }: LicenseDisplayProps) {
  const { t } = useTranslation();

  return (
    <div className="card-body">
      <ul className="list-group list-group-flush">
        {license.description ? (
          <li className="list-group-item">{license.description}</li>
        ) : null}
        <li className="list-group-item ">
          <div className="d-flex align-items-center">
            <div className="me-auto">
              <span className="me-2">{t("licenseReportStatus")}</span>
              <span className="badge rounded-pill border border-primary text-primary text-capitalize">
                {String(license.report_status)}
              </span>
            </div>
            <div className="d-flex gap-3 text-muted small">
              <span>
                {t("licenseCreatedAt", {
                  date: convertDateToLocale(license.created_at),
                })}
              </span>
              <span>
                {t("licenseUpdatedAt", {
                  date: convertDateToLocale(license.updated_at),
                })}
              </span>
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}

function LicenseRelationEdit({ mnr, license, onUpdated }: LicenseEditProps) {
  const { t } = useTranslation();
  const client = useClient();
  const modals = useModalsContext();
  const { submit, isSubmitting, errors } = useFormSubmission(
    (relations: LicenseActorRelation[]) =>
      client.updateLicenseRelations(mnr, relations),
    async (response) => {
      await response;
      modals.add(
        AlertModal(
          t("licenseUpdateSuccessTitle"),
          <p className="mb-0">{t("licenseUpdateSuccessMessage")}</p>,
          t("closeModal"),
        ),
      );
      await onUpdated();
    },
    async (errors) => {
      const lines = errors.nonField;

      if (lines.length > 0) {
        modals.add(
          AlertModal(
            t("licenseUpdateErrorTitle"),
            lines.length > 1 ? (
              <ul className="mb-0">
                {lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="mb-0">{lines[0]}</p>
            ),
            t("closeModal"),
          ),
        );
      }
    },
  );
  return (
    <div className="card-body">
      {errors && errors.nonField.length > 0 ? (
        <div tabIndex={-1}>
          <Alert type="danger">
            {errors.nonField.length === 1 ? (
              <p className="mb-0">{errors.nonField[0]}</p>
            ) : (
              <ul className="mb-0">
                {errors.nonField.map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
              </ul>
            )}
          </Alert>
        </div>
      ) : null}
      <FieldErrors errors={errors?.fields || {}}>
        <LicenseRelationsForm
          initialRelations={license.actors || []}
          onSubmit={submit}
          isSubmitting={isSubmitting}
        />
      </FieldErrors>
    </div>
  );
}

function LicenseRelationDisplay({ license, mnr }: LicenseDisplayProps) {
  const { t, formatOption } = useTranslation();
  const client = useClient();

  const sendEmailForActorsAction = useSendLicenseEmailForActorsAction(client);

  const [selectedActorIds, setSelectedActorIds] = useState(new Set<number>());
  const [notifyRinger, setNotifyRinger] = useState(false);

  const isSelectableRelation = (rel: LicenseInstance["actors"][number]) => {
    const roleOk = rel.role === "ringer" || rel.role === "associate_ringer";
    if (!roleOk) return false;

    // Do not allow selecting the ringer if the ringer is a station
    if (rel.role === "ringer" && rel.actor.type === "station") return false;

    return true;
  };

  const hasSelectedAssociateRinger = license.actors.some(
    (rel) =>
      rel.role === "associate_ringer" && selectedActorIds.has(rel.actor.id),
  );
  const effectiveNotifyRinger = notifyRinger && hasSelectedAssociateRinger;
  return (
    <>
      <div className="card-body">
        {license.actors?.length ? (
          <ul className="list-group list-group-flush">
            {license.actors.map((rel, i) => (
              <li className="list-group-item mb-3" key={i}>
                <div className="row align-items-center g-2">
                  <div className="col-12 col-md-3 fw-semibold text-capitalize">
                    {formatOption(rel.role, {
                      affiliate: "licenseRoleAffiliate",
                      associate_ringer: "licenseRoleAssociateRinger",
                      communication: "licenseRoleCommunication",
                      ringer: "licenseRoleRinger",
                    })}
                  </div>
                  <div className="col-10 col-md-7">
                    <i className="bi bi-person text-primary me-1" />
                    <Link href={`/actors/entry?entryId=${rel.actor.id}`}>
                      {rel.actor.full_name}
                    </Link>
                    ({rel.mednr})
                  </div>
                  <div className="col-2 col-md-2 d-flex justify-content-center">
                    {isSelectableRelation(rel) ? (
                      <input
                        className="form-check-input border border-dark"
                        type="checkbox"
                        checked={selectedActorIds.has(rel.actor.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const id = rel.actor.id;
                          setSelectedActorIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(id);
                            else next.delete(id);
                            return next;
                          });
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted fst-italic">
            {t("licenseNoConnectedActors")}
          </p>
        )}
      </div>
      <div className="card-body d-flex justify-content-end align-items-center gap-3">
        <div className="form-check m-0">
          <input
            className="form-check-input border border-dark"
            type="checkbox"
            checked={effectiveNotifyRinger}
            disabled={!hasSelectedAssociateRinger}
            onChange={(e) => setNotifyRinger(e.target.checked)}
            id="notify-ringer"
          />
          <label
            className={`form-check-label small text-muted ${!hasSelectedAssociateRinger ? "opacity-50" : ""}`}
            htmlFor="notify-ringer"
            title={t("licenseNotifyRingerHelp")}
          >
            {t("licenseNotifyRinger")}
          </label>
        </div>
        <button
          className="btn btn-secondary flex-grow-0"
          onClick={() =>
            sendEmailForActorsAction(
              mnr,
              license.actors
                .filter((rel) => isSelectableRelation(rel))
                .filter((rel) => selectedActorIds.has(rel.actor.id))
                .map((rel) => ({
                  id: rel.actor.id,
                  name: rel.actor.full_name,
                })),
              effectiveNotifyRinger,
            )
          }
        >
          {t("licenseSendLicenses")}
        </button>
      </div>
    </>
  );
}

function LicensePermissionsEdit({ mnr, onUpdated, license }: LicenseEditProps) {
  const { t } = useTranslation();
  const client = useClient();
  const modals = useModalsContext();
  const { submit, isSubmitting, errors } = useFormSubmission(
    async (permissions: LicensePermissionByRef[]) =>
      client.updateLicensePermissions(mnr, permissions),
    async (response) => {
      await response;
      modals.add(
        AlertModal(
          t("licenseUpdateSuccessTitle"),
          <p className="mb-0">{t("licenseUpdateSuccessMessage")}</p>,
          t("closeModal"),
        ),
      );
      await onUpdated();
    },
    async (errors) => {
      const lines = errors.nonField;

      if (lines.length > 0) {
        modals.add(
          AlertModal(
            t("licenseUpdateErrorTitle"),
            lines.length > 1 ? (
              <ul className="mb-0">
                {lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="mb-0">{lines[0]}</p>
            ),
            t("closeModal"),
          ),
        );
      }
    },
  );
  return (
    <>
      {errors && errors.nonField.length > 0 ? (
        <div className="card-body" tabIndex={-1}>
          <Alert type="danger">
            {errors.nonField.length === 1 ? (
              <p className="mb-0">{errors.nonField[0]}</p>
            ) : (
              <ul className="mb-0">
                {errors.nonField.map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
              </ul>
            )}
          </Alert>
        </div>
      ) : null}
      <FieldErrors errors={errors?.fields || {}}>
        <LicensePermissionEntryForm
          startsAt={new Date(license.starts_at)}
          endsAt={new Date(license.ends_at)}
          initialPermissions={license.permissions}
          onSubmit={submit}
          isSubmitting={isSubmitting}
        />
      </FieldErrors>
    </>
  );
}

function LicensePermissionsDisplay({ license }: LicenseDisplayProps) {
  const { t } = useTranslation();
  return (
    <div className="card-body">
      {license.permissions?.length ? (
        <ul className="list-group list-group-flush">
          {license.permissions.map((p, i) => (
            <li className="list-group-item mb-3" key={i}>
              <LicensePermissionItem permission={p} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted fst-italic">{t("licenseNoPermissions")}</p>
      )}
    </div>
  );
}

export function LicenceView({
  license,
  mnr,
  status,
  onUpdated,
}: LicenceViewProps) {
  const [editSection, setEditSection] = useState<
    null | "relations" | "basic" | "permissions"
  >(null);
  const { t, format } = useTranslation();

  const handleUpdated = useCallback(() => {
    setEditSection(null);
    onUpdated();
  }, [onUpdated, setEditSection]);

  return (
    <>
      <div className="mb-4">
        <EditSection
          editHeader={() => (
            <h2 className="h3 card-title m-0">{t("licenseFormTitle")}</h2>
          )}
          displayHeader={() => (
            <>
              <div className="flex-grow-0">
                {format("licenseValidityPeriod", {
                  startsAt: convertOnlyDateToLocale(license.starts_at),
                  endsAt: convertOnlyDateToLocale(license.ends_at),
                  from: (chunks) => (
                    <span className="fst-italic">{chunks}</span>
                  ),
                  to: (chunks) => <span className="fst-italic">{chunks}</span>,
                })}
              </div>
              <div className="flex-grow-0 fw-light">
                {license.location || " "}
              </div>
            </>
          )}
          edit={editSection === "basic"}
          setEdit={(edit) => setEditSection(edit ? "basic" : null)}
          editView={() => (
            <LicenseInfoEdit
              license={license}
              status={status}
              mnr={mnr}
              onUpdated={handleUpdated}
            />
          )}
          displayView={() => <LicenseInfoDisplay license={license} mnr={mnr} />}
        />
      </div>
      <div className="mb-4">
        <EditSection
          title={t("licenseActors")}
          edit={editSection === "relations"}
          setEdit={(edit) => setEditSection(edit ? "relations" : null)}
          editView={() => (
            <LicenseRelationEdit
              license={license}
              mnr={mnr}
              onUpdated={handleUpdated}
            />
          )}
          displayView={() => (
            <LicenseRelationDisplay license={license} mnr={mnr} />
          )}
          isFlat
          isAccented
        />
      </div>
      {/* Permissions */}
      <div className="mb-4">
        <EditSection
          title={t("licensePermissions")}
          edit={editSection === "permissions"}
          setEdit={(edit) => setEditSection(edit ? "permissions" : null)}
          editView={() => (
            <LicensePermissionsEdit
              license={license}
              mnr={mnr}
              onUpdated={handleUpdated}
            />
          )}
          displayView={() => (
            <LicensePermissionsDisplay license={license} mnr={mnr} />
          )}
          isFlat
          isAccented
        />
      </div>
      {/* Documents */}
      <div className="mb-3 pt-3">
        <h3 className="h2">{t("licenseDocuments")}</h3>
        {license.documents?.length ? (
          <ul className="list-group list-group-flush">
            {license.documents.map((doc, i) => (
              <li className="list-group-item mb-3" key={i}>
                <div className="row align-items-center g-2">
                  <div className="col-12 col-md-2 fw-semibold text-capitalize">
                    {doc.type}
                  </div>
                  <div className="col-12 col-md-3">
                    <i className="bi bi-person text-primary me-1" />
                    <Link href={`/actors/entry?entryId=${doc.actor_id}`}>
                      {doc.actor}
                    </Link>
                  </div>
                  <div className="col-12 col-md-5">
                    <span className="text-muted small me-2">
                      {t("licenseDocumentReference")}
                    </span>
                    {doc.type === "license" || doc.type === "permit" ? (
                      <a
                        href={`/api/license_sequence/${mnr}/${doc.type === "license" ? "card-pdf" : "permit-pdf"}/?actor_id=${doc.actor_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="badge rounded-pill border border-primary text-primary text-decoration-none"
                      >
                        {doc.reference}
                      </a>
                    ) : (
                      <span className="badge rounded-pill border border-primary text-primary">
                        {doc.reference}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted fst-italic">{t("licenseNoDocuments")}</p>
        )}
      </div>
      {/* Communication */}
      <div className="mb-3">
        <h3 className="h2">{t("licenseCommunication")}</h3>
        {license.communication?.length ? (
          <ul className="list-group list-group-flush">
            {license.communication.map((item, i) => (
              <li className="list-group-item mb-3" key={i}>
                <div className="row align-items-center g-2">
                  <div className="col-12 col-md-2 fw-semibold text-capitalize">
                    {item.type}
                  </div>
                  <div className="col-12 col-md-3">
                    <i className="bi bi-person text-primary me-1" />
                    <Link href={`/actors/entry?entryId=${item.actor_id}`}>
                      {item.actor}
                    </Link>
                  </div>
                  <div className="col-12 col-md-2">
                    <span className="badge rounded-pill border border-primary text-primary text-capitalize">
                      {item.status}
                    </span>
                  </div>
                  <div className="col-12 col-md-5">
                    <span className="text-muted small me-2">
                      {t("licenseCommunicationNote")}
                    </span>
                    <span className="fst-italic">“{item.note}”</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted fst-italic">{t("licenseNoCommunication")}</p>
        )}
      </div>
    </>
  );
}
