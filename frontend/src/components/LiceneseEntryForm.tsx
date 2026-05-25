import { useState } from "react";
import { useObjectState } from "@/app/(system)/hooks";
import { useTranslation } from "@/app/(system)/internationalization";
import {
  FieldErrorContext,
  SelectInput,
  TextArea,
  TextInput,
  VerticalField,
  FormSection,
} from "./InputFields";

export type LicenseFormData = {
  mnr: string;
  status: string;
  starts_at: string;
  ends_at: string;
  location: string;
  description: string;
  report_status: string;
};

type LicenseFormErrors = Partial<Record<keyof LicenseFormData, string>>;

export function LicenseEntryForm({
  initialLicense,
  onSubmit,
}: {
  initialLicense: Partial<LicenseFormData>;
  onSubmit: (license: Partial<LicenseFormData>) => void;
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
    ...initialLicense,
  });

  const [errors, setErrors] = useState<LicenseFormErrors>({});

  function validateLicense(value: Partial<LicenseFormData>): LicenseFormErrors {
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        const validationErrors = validateLicense(license);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
          return;
        }

        onSubmit(license);
      }}
    >
      <FieldErrorContext.Provider value={errors}>
        <div className="col-12 col-xl-6">
          <div className="card my-4">
            <div className="card-header py-3">
              <h3 className="m-0">{t("licenseFormAddTitle")}</h3>
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

            <button className="btn btn-secondary align-self-end me-3 mb-3">
              {t("licenseFormSave")}
            </button>
          </div>
        </div>
      </FieldErrorContext.Provider>
    </form>
  );
}
