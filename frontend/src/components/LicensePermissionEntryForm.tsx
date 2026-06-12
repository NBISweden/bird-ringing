import {
  idToReference,
  LicensePermissionByRef,
  ObjectReference,
  Options,
  referenceToId,
  toSelectOptions,
} from "@/app/(system)/common";
import { useOptions } from "@/app/(system)/hooks";
import { useTranslation } from "@/app/(system)/internationalization";
import {
  HorizontalField,
  SelectInput,
  TextArea,
  TextInput,
  VerticalField,
} from "./InputFields";
import Icon from "./Icon";
import { MultiSelectField } from "./MultiSelectField";
import { useState } from "react";

type PermissionOptions = {
  permissionTypes: Options["permission_type"][];
  permissionProperties: Options["permission_property"][];
  species: Options["species"][];
};

function toDateString(d: Date | undefined): string {
  return d?.toISOString().slice(0, 10) || "";
}

function PermissionEntrySubform({
  permission,
  updateValue,
  options,
  id,
  startsAt,
  endsAt,
}: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  permission: Partial<LicensePermissionByRef>;
  updateValue: (p: Partial<LicensePermissionByRef>) => void;
  options: PermissionOptions;
}) {
  const { t } = useTranslation();
  const type = options.permissionTypes.filter(
    (pt) => pt.id === referenceToId(permission.type),
  )[0]?.id;
  const permissionProperties =
    type === undefined
      ? []
      : options.permissionProperties.filter(
          (p) => p.related_type?.id === type || !p.related_type,
        );
  const [periodStart, periodEnd] = (permission.period
    ? permission.period.map((e) => new Date(e))
    : undefined) || [startsAt, endsAt];
  const permissionStartsAt = periodStart
    ? new Date(Math.max(startsAt.getTime(), periodStart.getTime()))
    : undefined;
  const permissionEndsAt = periodEnd
    ? new Date(Math.min(endsAt.getTime(), periodEnd.getTime()))
    : undefined;
  return (
    <div className="row">
      <div className="pb-2">
        <HorizontalField label={t("licensePermissionType")} id={`${id}.type`}>
          <SelectInput
            options={[
              { value: "", label: t("selectOption") },
              ...options.permissionTypes.map(toSelectOptions),
            ]}
            value={type}
            onChange={(v) => {
              updateValue({
                type: idToReference(v),
                properties: [],
              });
            }}
          />
        </HorizontalField>
      </div>
      <div className="col-12">
        <div className="py-1">
          <HorizontalField label="" icon="geo-alt" id={`${id}.location`}>
            <TextInput value={permission.location} onChange={() => {}} />
          </HorizontalField>
        </div>
        <div className="py-1 d-flex gap-3">
          <i className="bi bi-calendar2-week text-primary me-2" />
          <VerticalField
            label={t("licensePermissionStartsAt")}
            id={`${id}.period`}
          >
            <TextInput
              type="date"
              value={toDateString(permissionStartsAt)}
              min={toDateString(startsAt)}
              max={toDateString(endsAt)}
              onChange={(v) => {
                updateValue({
                  period: [v.target.value, toDateString(permissionEndsAt)],
                });
              }}
            />
          </VerticalField>
          <VerticalField
            label={t("licensePermissionEndsAt")}
            id={`${id}.period`}
          >
            <TextInput
              type="date"
              value={toDateString(permissionEndsAt)}
              min={toDateString(permissionStartsAt ?? startsAt)}
              max={toDateString(endsAt)}
              onChange={(v) => {
                updateValue({
                  period: [toDateString(permissionStartsAt), v.target.value],
                });
              }}
            />
          </VerticalField>
        </div>
      </div>

      <div className="col-12 col-lg-6 py-3 py-lg-0">
        <VerticalField
          label={t("licensePermissionSpecies")}
          icon="twitter"
          id={`${id}.species_list`}
        >
          <MultiSelectField
            name={t("licensePermissionSpecies")}
            options={options.species.map(toSelectOptions)}
            filterText={t("licenseFormFilterSpecies")}
            onChange={(v) => {
              updateValue({
                species_list: v
                  .map((id) => idToReference(id))
                  .filter((ref): ref is ObjectReference => ref !== undefined),
              });
            }}
            value={options.species
              .filter((v) =>
                permission.species_list?.some((s) => referenceToId(s) === v.id),
              )
              .map((v) => v.id)}
            minified
          />
        </VerticalField>
      </div>
      <div className="col-12 col-lg-6 py-3 py-lg-0">
        <VerticalField
          label={t("licensePermissionProperties")}
          icon="list-stars"
          id={`${id}.properties`}
        >
          <MultiSelectField
            name={t("licensePermissionProperties")}
            options={permissionProperties.map(toSelectOptions)}
            filterText={t("licenseFormFilterProperties")}
            onChange={(v) => {
              updateValue({
                properties: v
                  .map((id) => idToReference(id))
                  .filter((ref): ref is ObjectReference => ref !== undefined),
              });
            }}
            value={permissionProperties
              .filter((v) =>
                permission.properties?.some((p) => referenceToId(p) === v.id),
              )
              .map((v) => v.id)}
            minified
          />
        </VerticalField>
      </div>
      <VerticalField
        label={t("licensePermissionDescription")}
        id={`${id}.description`}
      >
        <TextArea
          value={permission.description}
          onChange={(event) => updateValue({ description: event.target.value })}
        />
      </VerticalField>
    </div>
  );
}

export function LicensePermissionEntryForm({
  initialPermissions,
  onSubmit,
  isSubmitting,
  startsAt,
  endsAt,
}: {
  startsAt: Date;
  endsAt: Date;
  initialPermissions: Partial<LicensePermissionByRef>[];
  onSubmit: (license: LicensePermissionByRef[]) => Promise<void> | void;
  isSubmitting?: boolean;
}) {
  const { t } = useTranslation();
  const { data: permissionTypes, isLoading: ptIsLoading } =
    useOptions("permission_type");
  const { data: permissionProperties, isLoading: ppIsLoading } = useOptions(
    "permission_property",
  );
  const { data: species, isLoading: sIsLoading } = useOptions("species");
  const [permissions, setPermissions] = useState(initialPermissions);
  const options = {
    permissionTypes,
    permissionProperties,
    species,
  };
  const isLoading = ptIsLoading || ppIsLoading || sIsLoading;
  return isLoading ? (
    <></>
  ) : (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(permissions as LicensePermissionByRef[]);
      }}
    >
      {permissions?.length ? (
        <>
          {permissions.map((p, key) => (
            <div className="card-body" key={key}>
              <span className="d-flex gap-3 align-items-start">
                <button
                  className="btn btn-danger ms-2"
                  onClick={(e) => {
                    e.preventDefault();
                    if (permissions) {
                      const nextPermissions = permissions.filter(
                        (_, i) => i !== key,
                      );
                      setPermissions(nextPermissions);
                    }
                  }}
                >
                  <Icon icon="trash" />
                </button>
                <PermissionEntrySubform
                  id={`latest.permissions.${key}`}
                  startsAt={startsAt}
                  endsAt={endsAt}
                  options={options}
                  permission={p}
                  updateValue={(next) => {
                    if (permissions) {
                      const nextPermissions = permissions.map((prev, i) =>
                        i === key ? { ...prev, ...next } : prev,
                      );
                      setPermissions(nextPermissions);
                    }
                  }}
                />
              </span>
            </div>
          ))}
        </>
      ) : (
        <></>
      )}
      <div className="card-body">
        <div className="d-flex justify-content-between gap-3">
          <button
            type="button"
            className="btn btn-outline-secondary flex-grow-0"
            onClick={() => {
              setPermissions((pp) => [...pp, {}]);
            }}
          >
            <Icon icon="file-earmark-plus me-2" />
            {t("licenseFormAddPermission")}
          </button>
          <button
            type="submit"
            className="btn btn-secondary flex-grow-0"
            disabled={isSubmitting ? true : undefined}
          >
            {t("licenseFormSavePermissions")}
          </button>
        </div>
      </div>
    </form>
  );
}
