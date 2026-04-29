import { ActorBase, LicenseInstance } from "@/app/(system)/common";
import { useObjectState } from "@/app/(system)/hooks";
import { useTranslation } from "@/app/(system)/internationalization";
import {
  FieldErrorContext,
  HorizontalField,
  SelectInput,
  TextArea,
  TextInput,
  VerticalField,
} from "./InputFields";

export type LicenseFormData = Omit<
  LicenseInstance,
  "documents" | "communication" | "created_at" | "updated_at" | "version"
>;

export function LicenseEntryForm({
  initialLicense,
  onSubmit,
}: {
  initialLicense: Partial<LicenseFormData>;
  onSubmit: (license: Partial<LicenseFormData>) => void;
}) {
  const { t, format } = useTranslation();
  const [license, updateValue] = useObjectState(initialLicense);
  return (
    <form>
      <FieldErrorContext.Provider value={{}}>
        <div className="mb-4">
          {/* Header */}
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
      </FieldErrorContext.Provider>
    </form>
  );
}
