import { LicenseDefaults, LicenseInstance } from "@/app/(system)/common";
import {
  useLicenseDefaults,
  useObjectState,
  useOptions,
} from "@/app/(system)/hooks";
import { useTranslation } from "@/app/(system)/internationalization";
import {
  SelectInput,
  TextArea,
  TextInput,
  VerticalField,
  FormSection,
  FieldErrors,
  FieldErrorGroup,
} from "./InputFields";
import { useState } from "react";

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
  license_number: string;
  status: string;
  permissions: Partial<LicenseInstance["permissions"][number]>[];
  actors: Partial<LicenseInstance["actors"][number]>[];
};

function getUnsetFields(
  license: Partial<LicenseFormData>,
): (keyof LicenseFormData)[] {
  const keys: (keyof LicenseFormData)[] = [
    "license_number",
    "status",
    "report_status",
    "location",
    "starts_at",
    "ends_at",
    "description",
  ];
  return keys.filter((key) => license[key] === undefined);
}

function isLicenseFormData(
  license: Partial<LicenseFormData>,
): license is LicenseFormData {
  return getUnsetFields(license).length === 0;
}

// Pre-fill only; the formula mirrors licensing.utils.get_default_license_end_date.
function computeDefaultEndsAt(
  startsAt: string | undefined,
  defaults: LicenseDefaults | undefined,
): string {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(startsAt || "");
  if (!match || !defaults) return "";
  const year = Number(match[1]) + defaults.end_year_offset;
  return `${year}-${defaults.end_month_day}`;
}

function validateLicense(
  value: Partial<LicenseFormData>,
  t: ReturnType<typeof useTranslation>["t"],
): {
  errors: FieldErrorGroup;
  license?: LicenseFormData;
} {
  const errors: FieldErrorGroup = {};

  if (value.license_number && !/^\d{4}$/.test(value.license_number.trim())) {
    errors.license_number = t("licenseFormLicenseNumberInvalid");
  }

  if (value.starts_at && value.ends_at && value.ends_at < value.starts_at) {
    errors["latest.ends_at"] = t("licenseFormEndsAtBeforeStartsAt");
  }

  let license: LicenseFormData | undefined = undefined;
  if (isLicenseFormData(value)) {
    license = value;
  } else {
    throw new Error("Incomplete license data.");
  }

  return {
    errors,
    license,
  };
}

export function LicenseEntryForm({
  isCreating = false,
  initialLicense,
  onSubmit,
  isSubmitting,
}: {
  isCreating?: boolean;
  initialLicense: Partial<LicenseFormData>;
  onSubmit: (license: LicenseFormData) => void;
  isSubmitting?: boolean;
}) {
  const { t } = useTranslation();
  const [license, updateValue] = useObjectState<Partial<LicenseFormData>>({
    license_number: "",
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

  // On create, the end date follows the start date until edited by hand.
  const [endsAtTouched, setEndsAtTouched] = useState(
    Boolean(initialLicense.ends_at),
  );

  const [errors, setErrors] = useState<FieldErrorGroup>({});
  const { data: locationPresets, isLoading: lpIsLoading } = useOptions(
    "location_preset_group",
  );
  const { data: licenseDefaults, isLoading: ldIsLoading } =
    useLicenseDefaults();

  // Wait for the defaults so the end date can be pre-filled from the first
  if (ldIsLoading) {
    return <></>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        const { errors: validationErrors, license: validatedLicense } =
          validateLicense(license, t);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0 || !validatedLicense) {
          return;
        }

        onSubmit(validatedLicense);
      }}
    >
      <FieldErrors errors={errors}>
        <FormSection
          icon="journal-check"
          title={t("licenseFormBasicInfoSubtitle")}
        >
          <VerticalField label={t("licenseId")} id="license_number" required>
            <TextInput
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder={t("licenseFormLicenseNumberPlaceholder")}
              value={license.license_number || ""}
              onChange={(event) =>
                updateValue({
                  license_number: event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 4),
                })
              }
            />
          </VerticalField>

          {isCreating ? (
            <></>
          ) : (
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
          )}

          {isCreating ? (
            <></>
          ) : (
            <VerticalField
              label={t("licenseReportStatus")}
              id="latest.report_status"
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
          )}
          <VerticalField
            label={t("licenseStartsAt")}
            id="latest.starts_at"
            required
          >
            <TextInput
              type="date"
              value={license.starts_at || ""}
              onChange={(event) => {
                const startsAt = event.target.value;
                updateValue(
                  endsAtTouched
                    ? { starts_at: startsAt }
                    : {
                        starts_at: startsAt,
                        ends_at: computeDefaultEndsAt(
                          startsAt,
                          licenseDefaults,
                        ),
                      },
                );
              }}
            />
          </VerticalField>

          <VerticalField
            label={t("licenseEndsAt")}
            id="latest.ends_at"
            required
          >
            <TextInput
              type="date"
              value={license.ends_at || ""}
              min={license.starts_at || undefined}
              onChange={(event) => {
                setEndsAtTouched(true);
                updateValue({ ends_at: event.target.value });
              }}
            />
          </VerticalField>
        </FormSection>

        <div className="row">
          <div
            className={
              lpIsLoading || locationPresets.length === 0
                ? "col-12"
                : "col-lg-6"
            }
          >
            <FormSection
              icon="geo-alt"
              title={t("licenseFormLocationSubtitle")}
            >
              <VerticalField label={t("licenseLocation")} id="latest.location">
                <TextInput
                  type="text"
                  value={license.location || ""}
                  onChange={(event) =>
                    updateValue({ location: event.target.value })
                  }
                />
              </VerticalField>
            </FormSection>
          </div>
          {lpIsLoading || locationPresets.length === 0 ? (
            <></>
          ) : (
            <div className="col-lg-6">
              <FormSection
                icon="collection"
                title={t("licenseFormLocationPresetSubtitle")}
              >
                {locationPresets.map((lp) => (
                  <VerticalField label={lp.name} key={lp.id}>
                    <SelectInput
                      options={[
                        { value: "", label: "-" },
                        ...lp.items.map((i) => ({
                          value: i.name,
                          label: i.name,
                        })),
                      ]}
                      value={
                        lp.items.some((i) => i.name === license.location)
                          ? license.location
                          : ""
                      }
                      onChange={(value) => updateValue({ location: value })}
                    />
                  </VerticalField>
                ))}
              </FormSection>
            </div>
          )}
        </div>

        <FormSection icon="card-text" title={t("licenseFormDetailsSubtitle")}>
          <VerticalField
            label={t("licenseDescription")}
            id="latest.description"
          >
            <TextArea
              value={license.description || ""}
              onChange={(event) =>
                updateValue({ description: event.target.value })
              }
            />
          </VerticalField>
        </FormSection>
        <div className="d-flex justify-content-end">
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={isSubmitting ? true : undefined}
          >
            {t("licenseFormSave")}
          </button>
        </div>
      </FieldErrors>
    </form>
  );
}
