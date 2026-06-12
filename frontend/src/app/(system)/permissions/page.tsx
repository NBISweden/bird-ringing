"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  FieldErrorContext,
  TextInput,
  VerticalField,
  TextArea,
} from "@/components/InputFields";
import { Alert } from "@/components/Alert";
import { useFlags, useClient, useModalsContext } from "../contexts";
import { Client, FieldValidationError } from "../client";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import {
  PermissionPropertyItem,
  PermissionTypeInput,
  PermissionTypeWithProperties,
} from "../common";
import { useObjectState } from "../hooks";
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
  initialValues: PermissionTypeInput;
  submitLabel: string;
  successMessage: string;
  onSubmit: (values: PermissionTypeInput) => Promise<void>;
}) {
  const modals = useModalsContext();
  const [values, updateValue] = useObjectState(initialValues);
  const [errors, setErrors] = useState<PermissionFormErrors | undefined>(
    undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
          <button type="button" className="btn btn-primary" onClick={close}>
            OK
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
        <VerticalField label="Name" id="label" required>
          <TextInput
            type="text"
            placeholder="Add a name"
            value={values.label || ""}
            onChange={(e) => updateValue({ label: e.target.value })}
          />
        </VerticalField>
        <VerticalField label="Description" id="description">
          <TextArea
            placeholder="Add a description"
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
            Cancel
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
  const modals = useModalsContext();
  const flags = useFlags();
  const client = useClient();

  if (!flags.has("mock-permission-editing")) {
    notFound();
  }

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
        <span className="ms-3">Loading permissions…</span>
      </div>
    );
  }

  if (!permissionTypes || !unrelatedProperties) {
    return <div>Could not load permissions.</div>;
  }

  const openTypeForm = (type: PermissionTypeWithProperties | null) => {
    modals.add({
      title: type ? "Edit permission type" : "Add permission type",
      content: (
        <PermissionEntryForm
          initialValues={{
            label: type?.label ?? "",
            description: type?.description ?? "",
          }}
          submitLabel={type ? "Save" : "Add"}
          successMessage={
            type ? "Permission type updated." : "Permission type added."
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
    property: PermissionPropertyItem | null;
    type: PermissionTypeWithProperties | null;
  }) => {
    modals.add({
      title: property
        ? "Edit property"
        : type
          ? `Add property to "${type.label}"`
          : "Add global permission property",
      content: (
        <PermissionEntryForm
          initialValues={{
            label: property?.label ?? "",
            description: property?.description ?? "",
          }}
          submitLabel={property ? "Save" : "Add"}
          successMessage={property ? "Property updated." : "Property added."}
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
        <div className="d-flex align-items-start my-5">
          <h2>Permission types</h2>
          <button
            className="btn btn-primary ms-5"
            onClick={() => openTypeForm(null)}
          >
            + Add permission type
          </button>
        </div>
        {permissionTypes.length === 0 ? (
          <p className="fst-italic">No permission types yet.</p>
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
                    <ul className="my-3">
                      {item.properties.length > 0 ? (
                        item.properties.map((property) => (
                          <Fragment key={property.id}>
                            <div className="d-flex justify-content-between align-items-start gap-3 border-bottom">
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
                                onClick={() =>
                                  openPropertyForm({ property, type: item })
                                }
                              >
                                Edit
                              </button>
                            </div>
                          </Fragment>
                        ))
                      ) : (
                        <p className="fst-italic">
                          {item.label} has no properties yet.
                        </p>
                      )}
                    </ul>
                    <div className="d-flex gap-2 mb-3 mt-4 mt-md-5">
                      <button
                        className="btn btn-outline-primary"
                        onClick={() =>
                          openPropertyForm({ property: null, type: item })
                        }
                      >
                        Add property
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => openTypeForm(item)}
                      >
                        Edit permission type
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
          <h2 className="mt-5">Global properties</h2>
          <button
            className="btn btn-primary ms-5 mt-5"
            onClick={() => openPropertyForm({ property: null, type: null })}
          >
            + Add global property
          </button>
        </div>
        <div className="border-top mt-3">
          {unrelatedProperties.map((item) => (
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
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
