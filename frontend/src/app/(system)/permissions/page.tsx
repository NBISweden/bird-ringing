"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  FieldErrorContext,
  TextInput,
  VerticalField,
  TextArea,
} from "@/components/InputFields";
import { Alert } from "@/components/Alert";
import { useClient, useModalsContext } from "../contexts";
import { Client, FieldValidationError } from "../client";
import {
  PermissionBase,
  PermissionInput,
  PermissionTypeWithProperties,
} from "../common";
import { useObjectState } from "../hooks";
import { useTranslation } from "../internationalization";
import { Accordion, AccordionEntry } from "@/components/Accordion";
import Spinner from "@/components/Spinner";

async function fetchPermissionTypes([client]: [Client]) {
  return client.fetchPermissionTypesWithProperties();
}

async function fetchUnrelatedProperties([client]: [Client]) {
  return client.fetchUnrelatedPermissionProperties();
}

type PermissionFormErrors = {
  fields: Record<string, string[]>;
  nonField: string[];
};

function PermissionEntryForm({
  initialValues,
  submitLabel,
  successMessage,
  onSubmit,
}: {
  initialValues: PermissionInput;
  submitLabel: string;
  successMessage: string;
  onSubmit: (values: PermissionInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const modals = useModalsContext();
  const [values, updateValue] = useObjectState(initialValues);
  const [errors, setErrors] = useState<PermissionFormErrors | undefined>(
    undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const okButtonRef = useRef<HTMLButtonElement | null>(null);

  // Move focus to the confirmation's OK button so keyboard/SR users aren't
  // stranded when the form is replaced by the success message.
  useEffect(() => {
    if (submitted) {
      okButtonRef.current?.focus();
    }
  }, [submitted]);

  const close = () => {
    const current = modals.stack[0];
    if (current) {
      modals.remove(current);
    }
  };

  const fieldErrors = useMemo<Record<string, string | undefined>>(() => {
    if (!errors) return {};
    const flat: Record<string, string | undefined> = {};
    for (const [field, messages] of Object.entries(errors.fields)) {
      flat[field] = messages.join(", ");
    }
    return flat;
  }, [errors]);

  if (submitted) {
    return (
      <>
        <Alert type="success">{successMessage}</Alert>
        <div className="d-flex justify-content-end mt-4">
          <button
            ref={okButtonRef}
            type="button"
            className="btn btn-primary"
            onClick={close}
          >
            {t("okModal")}
          </button>
        </div>
      </>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setErrors(undefined);
        setIsSubmitting(true);
        try {
          await onSubmit(values);
          setSubmitted(true);
        } catch (error) {
          if (error instanceof FieldValidationError) {
            setErrors({
              fields: error.fieldErrors,
              nonField: error.nonFieldErrors,
            });
          } else {
            const message =
              error instanceof Error ? error.message : String(error);
            setErrors({ fields: {}, nonField: [message] });
          }
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <FieldErrorContext.Provider value={fieldErrors}>
        {errors && errors.nonField.length > 0 ? (
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
        ) : null}
        <VerticalField label={t("permissionFormNameLabel")} id="label" required>
          <TextInput
            type="text"
            placeholder={t("permissionFormNamePlaceholder")}
            value={values.label || ""}
            onChange={(e) => updateValue({ label: e.target.value })}
          />
        </VerticalField>
        <VerticalField
          label={t("permissionFormDescriptionLabel")}
          id="description"
        >
          <TextArea
            placeholder={t("permissionFormDescriptionPlaceholder")}
            value={values.description || ""}
            onChange={(e) => updateValue({ description: e.target.value })}
          />
        </VerticalField>
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={close}
            disabled={isSubmitting}
          >
            {t("abortModal")}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {submitLabel}
          </button>
        </div>
      </FieldErrorContext.Provider>
    </form>
  );
}

export default function PermissionListView() {
  const { t } = useTranslation();
  const modals = useModalsContext();
  const client = useClient();

  const {
    data: permissionTypes,
    isLoading: typesLoading,
    error: typesError,
    mutate: mutateTypes,
  } = useSWR([client, "permission-types"], fetchPermissionTypes);
  const {
    data: unrelatedProperties,
    isLoading: unrelatedPropertiesLoading,
    error: unrelatedPropertiesError,
    mutate: mutateUnrelated,
  } = useSWR([client, "unrelated-properties"], fetchUnrelatedProperties);

  if (typesError) {
    return <p>{typesError.message}</p>;
  }
  if (unrelatedPropertiesError) {
    return <p>{unrelatedPropertiesError.message}</p>;
  }

  if (typesLoading || unrelatedPropertiesLoading) {
    return (
      <div className="container my-5 d-flex align-items-center">
        <Spinner />
        <span className="ms-3">{t("permissionLoading")}</span>
      </div>
    );
  }

  if (!permissionTypes || !unrelatedProperties) {
    return <div>{t("permissionLoadError")}</div>;
  }

  const openTypeForm = (type: PermissionTypeWithProperties | null) => {
    modals.add({
      title: type ? t("permissionTypeEditTitle") : t("permissionTypeAddTitle"),
      content: (
        <PermissionEntryForm
          initialValues={{
            label: type?.label ?? "",
            description: type?.description ?? "",
          }}
          submitLabel={type ? t("permissionFormSave") : t("permissionFormAdd")}
          successMessage={
            type
              ? t("permissionTypeUpdatedMessage")
              : t("permissionTypeAddedMessage")
          }
          onSubmit={async (values) => {
            if (type) {
              await client.updatePermissionType(type.id, values);
            } else {
              await client.createPermissionType(values);
            }
            await mutateTypes();
          }}
        />
      ),
      actions: [],
    });
  };

  const openPropertyForm = ({
    property,
    type,
  }: {
    property: PermissionBase | null;
    type: PermissionTypeWithProperties | null;
  }) => {
    modals.add({
      title: property
        ? t("permissionPropertyEditTitle")
        : type
          ? t("permissionPropertyAddToTypeTitle", { label: type.label })
          : t("permissionPropertyAddGlobalTitle"),
      content: (
        <PermissionEntryForm
          initialValues={{
            label: property?.label ?? "",
            description: property?.description ?? "",
          }}
          submitLabel={
            property ? t("permissionFormSave") : t("permissionFormAdd")
          }
          successMessage={
            property
              ? t("permissionPropertyUpdatedMessage")
              : t("permissionPropertyAddedMessage")
          }
          onSubmit={async (values) => {
            if (property) {
              await client.updatePermissionProperty(property.id, values);
            } else {
              await client.createPermissionProperty({
                ...values,
                related_type_id: type ? type.id : null,
              });
            }
            if (type) {
              await mutateTypes();
            } else {
              await mutateUnrelated();
            }
          }}
        />
      ),
      actions: [],
    });
  };

  return (
    <>
      <div className="container">
        <h1 className="mt-5 mb-4">{t("permissionsHeading")}</h1>
        <div className="d-flex align-items-start mb-3">
          <h2>{t("permissionTypesHeading")}</h2>
          <button
            className="btn btn-primary ms-5"
            onClick={() => openTypeForm(null)}
          >
            <i className="bi bi-plus-lg me-2" aria-hidden="true" />
            {t("permissionTypeAddTitle")}
          </button>
        </div>
        {permissionTypes.length === 0 ? (
          <p className="fst-italic">{t("permissionTypesEmpty")}</p>
        ) : null}
        <Accordion
          items={permissionTypes.reduce<Record<string, AccordionEntry>>(
            (acc, item) => {
              acc[item.id] = {
                header: (
                  <div className="d-flex gap-3 justify-content-between align-items-center w-100 me-3 me-lg-5">
                    <div className="flex-grow-0">
                      <p className="fw-bold my-3">{item.label}</p>
                      <p className="text-muted mb-3 lh-base">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ),
                content: (
                  <>
                    <ul className="my-3 list-unstyled">
                      {item.properties.length > 0 ? (
                        item.properties.map((property) => (
                          <li
                            key={property.id}
                            className="d-flex justify-content-between align-items-start gap-3 border-bottom"
                          >
                            <div>
                              <p className="fw-bold mb-1 pt-3">
                                {property.label}
                              </p>
                              <p className="text-muted">
                                {property.description}
                              </p>
                            </div>
                            <button
                              className="btn btn-outline-secondary btn-sm align-self-md-center mt-3 mt-md-0"
                              aria-label={t("permissionPropertyEditAriaLabel", {
                                label: property.label,
                              })}
                              onClick={() =>
                                openPropertyForm({ property, type: item })
                              }
                            >
                              {t("edit")}
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="fst-italic">
                          {t("permissionTypeNoPropertiesYet", {
                            label: item.label,
                          })}
                        </li>
                      )}
                    </ul>
                    <div className="d-flex gap-2 mb-3 mt-4 mt-md-5">
                      <button
                        className="btn btn-outline-primary"
                        aria-label={t("permissionPropertyAddToTypeTitle", {
                          label: item.label,
                        })}
                        onClick={() =>
                          openPropertyForm({ property: null, type: item })
                        }
                      >
                        {t("permissionPropertyAddButton")}
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        aria-label={t("permissionTypeEditAriaLabel", {
                          label: item.label,
                        })}
                        onClick={() => openTypeForm(item)}
                      >
                        {t("permissionTypeEditTitle")}
                      </button>
                    </div>
                  </>
                ),
              };
              return acc;
            },
            {},
          )}
        />

        <div className="d-flex align-items-start my-5">
          <h2 className="mt-5">{t("permissionGlobalPropertiesHeading")}</h2>
          <button
            className="btn btn-primary ms-5 mt-5"
            onClick={() => openPropertyForm({ property: null, type: null })}
          >
            <i className="bi bi-plus-lg me-2" aria-hidden="true" />
            {t("permissionPropertyAddGlobalButton")}
          </button>
        </div>
        <div className="border-top mt-3">
          {unrelatedProperties.length > 0 ? (
            unrelatedProperties.map((item) => (
              <div key={item.id} className="row border-bottom g-0">
                <div className="col-12 col-md-6 col-lg-4">
                  <div className="py-4 pe-3 pe-xl-5">
                    <p className="fw-bold mb-0">{item.label}</p>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-8">
                  <div className="py-4 ps-xl-5 d-flex justify-content-between align-items-start gap-3">
                    <p className="text-muted mb-0">{item.description}</p>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      aria-label={t("permissionPropertyEditAriaLabel", {
                        label: item.label,
                      })}
                      onClick={() =>
                        openPropertyForm({
                          property: {
                            id: item.id,
                            label: item.label,
                            description: item.description,
                          },
                          type: null,
                        })
                      }
                    >
                      {t("edit")}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="fst-italic p-5">
              {t("permissionPropertiesGlobalEmpty")}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
