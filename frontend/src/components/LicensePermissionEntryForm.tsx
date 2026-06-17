import {
  LicenseInstance,
  Options,
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

function PermissionEntrySubform({
  permission,
  updateValue,
  options,
}: {
  permission: Partial<LicenseInstance["permissions"][number]>;
  updateValue: (p: Partial<LicenseInstance["permissions"][number]>) => void;
  options: PermissionOptions;
}) {
  const { t } = useTranslation();
  const [type, setType] = useState(
    options.permissionTypes.filter(
      (pt) => pt.label === permission.type?.name,
    )[0]?.id,
  );
  const permissionProperties =
    type === undefined
      ? []
      : options.permissionProperties.filter(
          (p) => String(p.related_type?.id) === type || !p.related_type,
        );
  return (
    <div className="row mb-3">
      <div className="pb-2">
        <HorizontalField label={t("licensePermissionType")}>
          <SelectInput
            options={[
              { value: "", label: t("selectOption") },
              ...options.permissionTypes.map(toSelectOptions),
            ]}
            value={type}
            onChange={(v) => {
              setType(v);
            }}
          />
        </HorizontalField>
      </div>
      <div className="col-12">
        <div className="py-1">
          <HorizontalField label="" icon="geo-alt">
            <TextInput value={permission.location} onChange={() => {}} />
          </HorizontalField>
        </div>
        <div className="py-1 d-flex gap-3">
          <i className="bi bi-calendar2-week text-primary me-2" />
          <VerticalField label={t("licensePermissionStartsAt")}>
            <TextInput
              type="date"
              value={permission.starts_at}
              onChange={() => {}}
            />
          </VerticalField>
          <VerticalField label={t("licensePermissionEndsAt")}>
            <TextInput
              type="date"
              value={permission.ends_at}
              onChange={() => {}}
            />
          </VerticalField>
        </div>
      </div>

      <div className="col-12 col-lg-6 py-3 py-lg-0">
        <VerticalField label={t("licensePermissionSpecies")} icon="twitter">
          <MultiSelectField
            name={t("licensePermissionSpecies")}
            options={options.species.map(toSelectOptions)}
            filterText={t("licenseFormFilterSpecies")}
            value={options.species
              .filter((v) => permission.species?.includes(v.label))
              .map((v) => v.id)}
            minified
          />
        </VerticalField>
      </div>
      <div className="col-12 col-lg-6 py-3 py-lg-0">
        <VerticalField
          label={t("licensePermissionProperties")}
          icon="list-stars"
        >
          <MultiSelectField
            name={t("licensePermissionProperties")}
            options={permissionProperties.map(toSelectOptions)}
            filterText={t("licenseFormFilterProperties")}
            value={permissionProperties
              .filter((v) =>
                permission.properties?.some((p) => p.name === v.label),
              )
              .map((v) => v.id)}
            minified
          />
        </VerticalField>
      </div>
      <VerticalField label={t("licensePermissionDescription")}>
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
}: {
  initialPermissions: Partial<LicenseInstance["permissions"][number]>[];
  onSubmit: (
    license: Partial<LicenseInstance["permissions"][number]>[],
  ) => Promise<void> | void;
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
        onSubmit(permissions);
      }}
    >
      {permissions?.length ? (
        <ul className="list-group list-group-flush">
          {permissions.map((p, key) => (
            <li className="list-group-item mb-3" key={key}>
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
                  options={options}
                  permission={p}
                  updateValue={(next) => {
                    if (permissions) {
                      setPermissions(
                        permissions.map((prev, i) =>
                          i === key ? { ...prev, ...next } : prev,
                        ),
                      );
                    }
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <></>
      )}
      <div className="d-flex justify-content-between gap-3">
        <button
          type="button"
          className="btn btn-outline-secondary flex-grow-0"
          onClick={() => {
            setPermissions((pp) => [...pp, {}]);
          }}
        >
          <Icon icon="file-earmark-plus" />
          {t("licenseRelationAddPermission")}
        </button>
        <button
          type="submit"
          className="btn btn-secondary flex-grow-0"
          disabled={isSubmitting ? true : undefined}
        >
          {t("licenseRelationFormSave")}
        </button>
      </div>
    </form>
  );
}
