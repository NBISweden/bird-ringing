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
import Icon from "./Icon";
import { MultiSelectField, MultiValueField } from "./MultiSelectField";

export type LicenseFormData = Omit<
  LicenseInstance,
  "documents" | "communication" | "created_at" | "updated_at" | "version" | "permissions"
> & {
  permissions: Partial<LicenseInstance["permissions"][number]>[]
};

function PermissionEntrySubform({permission}: {
  permission: Partial<LicenseInstance["permissions"][number]>,
  updateValue: (p: Partial<LicenseInstance["permissions"][number]>) => void
}) {
  const { t, format } = useTranslation();
  const species = permission.species || [];
  const properties = permission.properties || [];
  const speciesField: MultiValueField<string> = {
    label: "Species",
    name: "Species",
    value: species,
    values: species.map(v => ({value: v, label: v})),
    placeholder: "Select a species",
  }
  const propertiesField: MultiValueField<string> = {
    label: "Properties",
    name: "Properties",
    value: properties.map(p => p.name),
    values: properties.map(p => p.name).map(v => ({value: v, label: v})),
    placeholder: "Select a properties",
  }
  return (
    <div className="row mb-3">
      <div className="pb-2">
        <HorizontalField label={t("licensePermissionType")}>
          <SelectInput options={[permission.type?.name || "", "-"].map((v) => ({value: v, label: v}))} value={permission.type?.name || ""} onChange={() => {}}/>
        </HorizontalField>
      </div>
      <div className="col-12 col-lg-6">
        {permission.location && (
          <div className="py-1">
            <HorizontalField label="" icon="geo-alt">
              <TextInput value={permission.location} onChange={() => {}}/>
            </HorizontalField>
          </div>
        )}
        {(permission.starts_at || permission.ends_at) && (
          <div className="py-1 d-flex gap-3">
            <i className="bi bi-calendar2-week text-primary me-2" />
            <VerticalField label={t("licensePermissionStartsAt")}>
              <TextInput type="date" value={permission.starts_at} onChange={() => {}}/>
            </VerticalField>
            <VerticalField label={t("licensePermissionEndsAt")}>
              <TextInput type="date" value={permission.ends_at} onChange={() => {}}/>
            </VerticalField>
          </div>
        )}
        {species.length > 0 && (
          <div className="py-1">
            <div className="mb-2">
              <i className="bi bi-twitter text-primary me-2" />
              <MultiSelectField field={speciesField} minified/>
            </div>
          </div>
        )}
        {permission.description && (
          <div className="pt-3">{permission.description}</div>
        )}
      </div>
      <div className="col-12 col-lg-6 py-3 py-lg-0">
        <MultiSelectField field={propertiesField} minified/>
      </div>
    </div>
  );
}

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
        <div className="mb-4">
          <div className="row g-1">
            <div className="mb-3 mb-sm-0 card border-primary">
              <div className="card-body">
                <h2 className="h3 card-title">
                  {t("licensePermissions")}
                  <button
                    className="btn btn-outline-secondary ms-2"
                    onClick={(e) => {e.preventDefault(); updateValue({permissions: [...(license.permissions || []), {}]})}}
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
                                const permissions = license.permissions.filter((_, i) => i !== key)
                                console.log(permissions)
                                updateValue({
                                  permissions: permissions
                                })
                              }
                            }}
                          >
                            <Icon icon="trash" />
                          </button>
                          <PermissionEntrySubform permission={p} updateValue={(next) => {
                            if (license.permissions) {
                              updateValue({
                                permissions: license.permissions.map((prev, i) => i === key ? {...prev, ...next} : prev)
                              })
                            }
                          }}/>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : <></>}
              </div>
            </div>
          </div>
        </div>
      </FieldErrorContext.Provider>
    </form>
  );
}
