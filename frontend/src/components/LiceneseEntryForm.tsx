import {
  ActorBase,
  LicenseInstance,
  Options,
  Option,
} from "@/app/(system)/common";
import { useFilter, useObjectState } from "@/app/(system)/hooks";
import { useTranslation } from "@/app/(system)/internationalization";
import {
  FieldErrorContext,
  HorizontalField,
  SelectInput,
  TextArea,
  TextInput,
  VerticalField,
} from "./InputFields";
import Icon from "./Icon";
import { MultiSelectField } from "./MultiSelectField";
import useSWRImmutable from "swr/immutable";
import { Client } from "@/app/(system)/client";
import { useClient } from "@/app/(system)/contexts";
import { useEffect, useState } from "react";
import { Alert } from "./Alert";

export type LicenseFormData = Omit<
  LicenseInstance,
  | "documents"
  | "communication"
  | "created_at"
  | "updated_at"
  | "version"
  | "permissions"
  | "actors"
> & {
  permissions: Partial<LicenseInstance["permissions"][number]>[];
  actors: Partial<LicenseInstance["actors"][number]>[];
};

type PermissionOptions = {
  permissionTypes: Options["permission_type"][];
  permissionProperties: Options["permission_property"][];
  species: Options["species"][];
};

type ActorOptions = {
  actors: Options["actor"][];
  licenseRoles: Options["license_role"][];
};

function toSelectOptions(v: Option): { value: string; label: string } {
  return {
    value: v.id,
    label: v.label,
  };
}

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
          (p) => String(p.related_type.id) === type,
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

type LicenseRelation = Omit<LicenseInstance["actors"][number], "actor"> & {
  actor: string;
};

function ActorEntrySubform({
  initialRelation,
  options,
}: {
  initialRelation: Partial<LicenseRelation>;
  updateValue: (r: Partial<LicenseRelation>) => void;
  options: ActorOptions;
}) {
  const { t } = useTranslation();
  const [relation, updateRelation] = useObjectState(initialRelation);
  const currentActor = options.actors.filter((r) => r.id === relation.actor)[0];

  useEffect(() => {
    updateRelation(initialRelation);
  }, [initialRelation, updateRelation]);

  return (
    <div className="row align-items-center g-2">
      <div className="col-12 col-md-4">
        <VerticalField label={t("licenseFormRole")} icon="journal">
          <SelectInput
            options={[
              { value: "", label: t("selectOption") },
              ...options.licenseRoles.map(toSelectOptions),
            ]}
            value={
              options.licenseRoles.filter((r) => r.label === relation.role)[0]
                ?.id
            }
            onChange={(v) =>
              v &&
              updateRelation({
                role: options.licenseRoles.filter((r) => r.id === v)[0].label,
              })
            }
          />
        </VerticalField>
      </div>
      <div className="col-12 col-md-4">
        <VerticalField label={t("licenseFormActor")} icon="person">
          <SelectInput
            options={[
              { value: "", label: t("selectOption") },
              ...options.actors.map(toSelectOptions),
            ]}
            value={currentActor?.id}
            onChange={(v) => v && updateRelation({ actor: v })}
            disabled
          />
        </VerticalField>
      </div>
      <div className="col-12 col-md-4">
        <VerticalField label={t("licenseFormRelationId")} icon="hash">
          <TextInput
            type="string"
            value={relation.mednr || ""}
            maxLength={4}
            onChange={(e) =>
              updateRelation({ mednr: e.target.value.toUpperCase() })
            }
          />
        </VerticalField>
      </div>
    </div>
  );
}

export function LicenseEntryFormBase({
  initialLicense,
  onSubmit,
  options,
}: {
  initialLicense: Partial<LicenseFormData>;
  onSubmit: (license: Partial<LicenseFormData>) => void;
  options: PermissionOptions & ActorOptions;
}) {
  const { t } = useTranslation();
  const [license, updateValue] = useObjectState(initialLicense);
  const actorIds = (license.actors || []).map((r) => String(r.actor?.id));
  const availableActorOptions = options.actors
    .filter((actor) => !actorIds.includes(actor.id))
    .map((o) => ({ ...o, term: o.label }));
  const { filteredItems, setFilter, filter } = useFilter(availableActorOptions);

  return (
    <form>
      <FieldErrorContext.Provider value={{}}>
        <div className="mb-4">
          <div className="card border-primary">
            <div className="card-header">
              <div className="row g-2">
                <div className="col-12 col-md-7">
                  <div>
                    <HorizontalField label={t("licenseStartsAt")}>
                      <TextInput type="date" defaultValue={license.starts_at} />
                    </HorizontalField>
                    <HorizontalField label={t("licenseEndsAt")}>
                      <TextInput type="date" defaultValue={license.ends_at} />
                    </HorizontalField>
                  </div>
                </div>
                <div className="col-12 col-md-3">
                  <VerticalField label={t("licenseLocation")}>
                    <TextInput type="text" defaultValue={license.location} />
                  </VerticalField>
                </div>
              </div>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                <li className="list-group-item">
                  <VerticalField label={t("licenseDescription")}>
                    <TextArea defaultValue={license.description} />
                  </VerticalField>
                </li>
                <li className="list-group-item ">
                  <div className="d-flex align-items-center">
                    <div className="me-auto">
                      <HorizontalField label={t("licenseReportStatus")}>
                        <SelectInput
                          options={["yes", "no", "incomplete"].map((v) => ({
                            value: v,
                            label: v,
                          }))}
                          defaultValue={license.report_status}
                        />
                      </HorizontalField>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="row g-1 mb-4">
          <div className="card border-primary">
            <div className="card-body">
              <h2 className="h3 card-title col-5 col-sm-7 col-md-7">
                {t("licenseActors")}
              </h2>
              <VerticalField label={t("licenseFormActor")} icon="person">
                <div className="input-group mb-3">
                  <TextInput
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={t("licenseFormFilterActors")}
                  />
                  <button
                    className="btn btn-outline-secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      setFilter("");
                    }}
                  >
                    <Icon icon="x-circle" />
                  </button>
                </div>
              </VerticalField>
              {filter ? (
                filteredItems.length > 0 ? (
                  <ul className="list-group list-group-flush">
                    {filteredItems.map((option, key) => (
                      <li className="list-group-item mb-3" key={key}>
                        <div className="d-flex">
                          <label className="flex-fill">{option.label}</label>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={(e) => {
                              e.preventDefault();
                              updateValue({
                                actors: [
                                  ...(license.actors || []),
                                  {
                                    actor: {
                                      id: parseInt(option?.id),
                                      full_name: option?.label,
                                    } as ActorBase,
                                  },
                                ],
                              });
                            }}
                          >
                            {t("licenseFormAddActor")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Alert type="info">{t("licenseFormNoMatchingActors")}</Alert>
                )
              ) : (
                <></>
              )}
              <ul className="list-group list-group-flush">
                {license.actors?.map((relation, key) => (
                  <li className="list-group-item mb-3" key={key}>
                    <span className="d-flex gap-3 align-items-start">
                      <button
                        className="btn btn-danger ms-2"
                        onClick={(e) => {
                          e.preventDefault();
                          if (license.actors) {
                            const actors = license.actors.filter(
                              (_, i) => i !== key,
                            );
                            updateValue({
                              actors: actors,
                            });
                          }
                        }}
                      >
                        <Icon icon="trash" />
                      </button>
                      <ActorEntrySubform
                        initialRelation={{
                          ...relation,
                          actor: options.actors.filter(
                            (a) => String(relation.actor?.id) === a.id,
                          )[0]?.id,
                        }}
                        options={options}
                        updateValue={(v) => console.log(v)}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="mb-4">
          <div className="row g-1">
            <div className="mb-3 mb-sm-0 card border-primary">
              <div className="card-body">
                <h2 className="h3 card-title">
                  {t("licensePermissions")}
                  <button
                    className="btn btn-outline-secondary ms-2"
                    onClick={(e) => {
                      e.preventDefault();
                      updateValue({
                        permissions: [...(license.permissions || []), {}],
                      });
                    }}
                  >
                    <Icon icon="file-earmark-plus" />
                  </button>
                </h2>
                <p className="card-text"></p>
                {license.permissions?.length ? (
                  <ul className="list-group list-group-flush">
                    {license.permissions.map((p, key) => (
                      <li className="list-group-item mb-3" key={key}>
                        <span className="d-flex gap-3 align-items-start">
                          <button
                            className="btn btn-danger ms-2"
                            onClick={(e) => {
                              e.preventDefault();
                              if (license.permissions) {
                                const permissions = license.permissions.filter(
                                  (_, i) => i !== key,
                                );
                                updateValue({
                                  permissions: permissions,
                                });
                              }
                            }}
                          >
                            <Icon icon="trash" />
                          </button>
                          <PermissionEntrySubform
                            options={options}
                            permission={p}
                            updateValue={(next) => {
                              if (license.permissions) {
                                updateValue({
                                  permissions: license.permissions.map(
                                    (prev, i) =>
                                      i === key ? { ...prev, ...next } : prev,
                                  ),
                                });
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
              </div>
            </div>
          </div>
        </div>
      </FieldErrorContext.Provider>
      <button
        className="btn btn-secondary"
        onClick={(e) => {
          e.preventDefault();
          onSubmit(license);
        }}
      >
        {t("licenseFormSave")}
      </button>
    </form>
  );
}

async function fetchOptions<T extends keyof Options>([client, option]: [
  Client,
  T,
]): Promise<Options[T][]> {
  return client.fetchOptions<T>(option);
}

function useOptions<T extends keyof Options>(
  option: T,
): { data: Options[T][]; isLoading: boolean; error: unknown } {
  const client = useClient();
  const { data, isLoading, error } = useSWRImmutable(
    [client, option],
    fetchOptions<T>,
    { fallback: [] },
  );
  return {
    data: data || [],
    isLoading,
    error,
  };
}

export function LicenseEntryForm({
  initialLicense,
  onSubmit,
}: {
  initialLicense: Partial<LicenseFormData>;
  onSubmit: (license: Partial<LicenseFormData>) => void;
}) {
  const { data: permissionTypes, isLoading: ptIsLoading } =
    useOptions("permission_type");
  const { data: permissionProperties, isLoading: ppIsLoading } = useOptions(
    "permission_property",
  );
  const { data: species, isLoading: sIsLoading } = useOptions("species");
  const { data: actors, isLoading: aIsLoading } = useOptions("actor");
  const { data: licenseRoles, isLoading: lrIsLoading } =
    useOptions("license_role");
  return ptIsLoading ||
    ppIsLoading ||
    sIsLoading ||
    aIsLoading ||
    lrIsLoading ? (
    <></>
  ) : (
    <LicenseEntryFormBase
      initialLicense={initialLicense}
      onSubmit={onSubmit}
      options={{
        permissionProperties,
        permissionTypes,
        species,
        actors,
        licenseRoles,
      }}
    />
  );
}
