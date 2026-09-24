import { LicenseInstance } from "@/app/(system)/common";
import { useObjectState } from "@/app/(system)/hooks";
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
  mnr: string;
  status: string;
  permissions: Partial<LicenseInstance["permissions"][number]>[];
  actors: Partial<LicenseInstance["actors"][number]>[];
};

function getUnsetFields(
  license: Partial<LicenseFormData>,
): (keyof LicenseFormData)[] {
  const keys: (keyof LicenseFormData)[] = [
    "mnr",
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

function validateLicense(
  value: Partial<LicenseFormData>,
  t: ReturnType<typeof useTranslation>["t"],
): {
  errors: FieldErrorGroup;
  license?: LicenseFormData;
} {
  const errors: FieldErrorGroup = {};

  if (value.mnr && !/^\d{4}$/.test(value.mnr.trim())) {
    errors.mnr = t("licenseFormMnrInvalid");
  }

  if (value.starts_at && value.ends_at) {
    const startsAt = new Date(value.starts_at);
    const endsAt = new Date(value.ends_at);

    if (endsAt < startsAt) {
      errors["latest.ends_at"] = t("licenseFormEndsAtBeforeStartsAt");
    }
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
  initialLicense,
  onSubmit,
  isSubmitting,
}: {
  initialLicense: Partial<LicenseFormData>;
  onSubmit: (license: LicenseFormData) => void;
  isSubmitting?: boolean;
}) {
  const { t } = useTranslation();
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

  const [errors, setErrors] = useState<FieldErrorGroup>({});

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        const { errors: validationErrors, license: validatedLicense } =
          validateLicense(license, t);
        setErrors(errors);

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
        </FormSection>

        <FormSection
          icon="calendar2-week"
          title={t("licenseFormValiditySubtitle")}
        >
          <VerticalField
            label={t("licenseStartsAt")}
            id="latest.starts_at"
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

          <VerticalField
            label={t("licenseEndsAt")}
            id="latest.ends_at"
            required
          >
            <TextInput
              type="date"
              value={license.ends_at || ""}
              onChange={(event) => updateValue({ ends_at: event.target.value })}
            />
          </VerticalField>
        </FormSection>

        <FormSection icon="geo-alt" title={t("licenseFormLocationSubtitle")}>
          <VerticalField
            label={t("licenseLocation")}
            id="latest.location"
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
