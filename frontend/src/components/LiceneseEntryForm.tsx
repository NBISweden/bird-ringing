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
  FormSection,
} from "./InputFields";
import Icon from "./Icon";
import { MultiSelectField } from "./MultiSelectField";
import useSWRImmutable from "swr/immutable";
import { Client } from "@/app/(system)/client";
import { useClient, useFlags } from "@/app/(system)/contexts";
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
  mnr: string;
  status: string;
  permissions: Partial<LicenseInstance["permissions"][number]>[];
  actors: Partial<LicenseInstance["actors"][number]>[];
};

type LicenseFormErrors = Record<string, string | undefined>;

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

function validateLicense(
  value: Partial<LicenseFormData>,
  t: ReturnType<typeof useTranslation>["t"],
): LicenseFormErrors {
  const nextErrors: LicenseFormErrors = {};

  if (!value.mnr?.trim()) {
    nextErrors.mnr = t("licenseFormRequired");
  } else if (!/^\d{4}$/.test(value.mnr.trim())) {
    nextErrors.mnr = t("licenseFormMnrInvalid");
  }

  if (!value.status) {
    nextErrors.status = t("licenseFormRequired");
  }

  if (!value.starts_at) {
    nextErrors.starts_at = t("licenseFormRequired");
  }

  if (!value.ends_at) {
    nextErrors.ends_at = t("licenseFormRequired");
  }

  if (value.starts_at && value.ends_at) {
    const startsAt = new Date(value.starts_at);
    const endsAt = new Date(value.ends_at);

    if (endsAt < startsAt) {
      nextErrors.ends_at = t("licenseFormEndsAtBeforeStartsAt");
    }
  }

  if (!value.location?.trim()) {
    nextErrors.location = t("licenseFormRequired");
  }

  if (!value.report_status) {
    nextErrors.report_status = t("licenseFormRequired");
  }

  return nextErrors;
}

function MockLicenseSections({
  license,
  updateValue,
  options,
}: {
  license: Partial<LicenseFormData>;
  updateValue: (license: Partial<LicenseFormData>) => void;
  options: PermissionOptions & ActorOptions;
}) {
  const { t } = useTranslation();
  const actorIds = (license.actors || []).map((r) => String(r.actor?.id));
  const availableActorOptions = options.actors
    .filter((actor) => !actorIds.includes(actor.id))
    .map((o) => ({ ...o, term: o.label }));
  const { filteredItems, setFilter, filter } = useFilter(availableActorOptions);

  return (
    <>
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
                          updateValue({
                            actors: license.actors.filter((_, i) => i !== key),
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
    </>
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

function MockLicenseOptionsLoader({
  license,
  updateValue,
}: {
  license: Partial<LicenseFormData>;
  updateValue: (license: Partial<LicenseFormData>) => void;
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
    <MockLicenseSections
      license={license}
      updateValue={updateValue}
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

export function LicenseEntryForm({
  initialLicense,
  onSubmit,
  title,
}: {
  initialLicense: Partial<LicenseFormData>;
  onSubmit: (license: Partial<LicenseFormData>) => void;
  title: string;
}) {
  const { t } = useTranslation();
  const flags = useFlags();
  const showMockSections = flags.has("mock-license-editing");

  const [license, updateValue] = useObjectState<Partial<LicenseFormData>>({
    mnr: "",
    status: "",
    starts_at: "",
    ends_at: "",
    location: "",
    description: "",
    report_status: "",
    permissions: [],
    actors: [],
    ...initialLicense,
  });

  const [errors, setErrors] = useState<LicenseFormErrors>({});

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        const validationErrors = validateLicense(license, t);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
          return;
        }

        onSubmit(license);
      }}
    >
      <FieldErrorContext.Provider value={errors}>
        <div className="row">
          <div className="col-12 col-xl-6">
            <div className="card my-4">
              <div className="card-header py-3">
                <h3 className="m-0">{title}</h3>
              </div>

              <div className="card-body">
                <FormSection
                  icon="journal-check"
                  title={t("licenseFormBasicInfoSubtitle")}
                >
                  <VerticalField label={t("licenseId")} id="mnr" required>
                    <TextInput
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder={t("licenseFormMnrPlaceholder")}
                      value={license.mnr || ""}
                      onChange={(event) =>
                        updateValue({
                          mnr: event.target.value.replace(/\D/g, "").slice(0, 4),
                        })
                      }
                    />
                  </VerticalField>

                  <VerticalField label={t("licenseStatus")} id="status" required>
                    <SelectInput
                      value={license.status || ""}
                      onChange={(value) => updateValue({ status: value })}
                      options={[
                        { value: "", label: t("selectOption") },
                        {
                          value: "active",
                          label: t("licenseStatusActive"),
                        },
                        {
                          value: "paused",
                          label: t("licenseStatusPaused"),
                        },
                        {
                          value: "terminated",
                          label: t("licenseStatusTerminated"),
                        },
                      ]}
                    />
                  </VerticalField>

                  <VerticalField
                    label={t("licenseReportStatus")}
                    id="report_status"
                    required
                  >
                    <SelectInput
                      value={license.report_status || ""}
                      onChange={(value) => updateValue({ report_status: value })}
                      options={[
                        { value: "", label: t("selectOption") },
                        {
                          value: "yes",
                          label: t("licenseReportStatusYes"),
                        },
                        {
                          value: "no",
                          label: t("licenseReportStatusNo"),
                        },
                        {
                          value: "incomplete",
                          label: t("licenseReportStatusIncomplete"),
                        },
                      ]}
                    />
                  </VerticalField>
                </FormSection>

                <FormSection
                  icon="calendar2-week"
                  title={t("licenseFormValiditySubtitle")}
                >
                  <VerticalField
                    label={t("licenseStartsAt")}
                    id="starts_at"
                    required
                  >
                    <TextInput
                      type="date"
                      value={license.starts_at || ""}
                      onChange={(event) =>
                        updateValue({ starts_at: event.target.value })
                      }
                    />
                  </VerticalField>

                  <VerticalField label={t("licenseEndsAt")} id="ends_at" required>
                    <TextInput
                      type="date"
                      value={license.ends_at || ""}
                      onChange={(event) =>
                        updateValue({ ends_at: event.target.value })
                      }
                    />
                  </VerticalField>
                </FormSection>

                <FormSection
                  icon="geo-alt"
                  title={t("licenseFormLocationSubtitle")}
                >
                  <VerticalField
                    label={t("licenseLocation")}
                    id="location"
                    required
                  >
                    <TextInput
                      type="text"
                      value={license.location || ""}
                      onChange={(event) =>
                        updateValue({ location: event.target.value })
                      }
                    />
                  </VerticalField>
                </FormSection>

                <FormSection
                  icon="card-text"
                  title={t("licenseFormDetailsSubtitle")}
                >
                  <VerticalField label={t("licenseDescription")} id="description">
                    <TextArea
                      value={license.description || ""}
                      onChange={(event) =>
                        updateValue({ description: event.target.value })
                      }
                    />
                  </VerticalField>
                </FormSection>
              </div>

              <button
                type="submit"
                className="btn btn-secondary align-self-end me-3 mb-3"
              >
                {t("licenseFormSave")}
              </button>
            </div>
          </div>
        </div>

        {showMockSections ? (
          <MockLicenseOptionsLoader
            license={license}
            updateValue={updateValue}
          />
        ) : (
          <></>
        )}
      </FieldErrorContext.Provider>
    </form>
  );
}
