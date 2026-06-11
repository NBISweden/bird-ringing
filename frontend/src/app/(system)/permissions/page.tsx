"use client";

import useSWR from "swr";
import {
  SelectInput,
  TextInput,
  VerticalField,
} from "@/components/InputFields";
import { useFlags, useClient, useModalsContext } from "../contexts";
import { Client } from "../client";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { PermissionTypeWithProperties } from "../common";
import { Accordion, AccordionEntry } from "@/components/Accordion";

async function fetchPermissionTypes([client]: [Client]) {
  return client.fetchPermissionTypesWithProperties();
}

async function fetchUnrelatedProperties([client]: [Client]) {
  return client.fetchUnrelatedPermissionProperties();
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
  } = useSWR([client, "permission-types"], fetchPermissionTypes);
  const {
    data: unrelatedProperties,
    isLoading: unrelatedPropertiesLoading,
    error: unrelatedPropertiesError,
  } = useSWR([client, "unrelated-properties"], fetchUnrelatedProperties);

  if (typesError) {
    return <p>{typesError.message}</p>;
  }
  if (unrelatedPropertiesError) {
    return <p>{unrelatedPropertiesError.message}</p>;
  }

  if (!permissionTypes) {
    return <div>No permission types collected.</div>;
  }

  if (!unrelatedProperties) {
    return <div>No permission types collected.</div>;
  }

  const PermissionTypeForm = () => {
    return (
      <form>
        <VerticalField label="Name" id="name" required>
          <TextInput type="text" placeholder="Add a name" />
        </VerticalField>
        <VerticalField label="Description" id="description" required>
          <TextInput type="text" placeholder="Add a description" />
        </VerticalField>
      </form>
    );
  };

  const PropertiesForm = () => {
    return (
      <form>
        <VerticalField label="Name" id="name" required>
          <TextInput type="text" placeholder="Add a name" />
        </VerticalField>
        <VerticalField label="Description" id="description" required>
          <TextInput type="text" placeholder="Add a description" />
        </VerticalField>
      </form>
    );
  };

  const openTypeAddForm = () => {
    modals.add({
      title: "Add permission type",
      content: PermissionTypeForm(),
      actions: [
        {
          label: "Save",
          action: () => {},
        },
      ],
    });
  };
  const openPropertyAddForm = (type: PermissionTypeWithProperties | null) => {
    modals.add({
      title: type
        ? `Add property to "${type.label}"`
        : `Add global permission property`,
      content: PropertiesForm(),
      actions: [
        {
          label: "Save",
          action: () => {},
        },
      ],
    });
  };

  return (
    <>
      <div className="container">
        <div className="d-flex align-items-start mb-5">
          <h2>Permission types</h2>
          <button className="btn btn-primary ms-5" onClick={openTypeAddForm}>
            + Add permission type
          </button>
        </div>
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
                      {item.properties.map((property) => (
                        <Fragment key={property.id}>
                          <p className="fw-bold mb-1">{property.label}</p>
                          <p className="text-muted">{property.description}</p>
                        </Fragment>
                      ))}
                    </ul>
                    <button
                      className="btn btn-outline-primary my-3"
                      onClick={() => openPropertyAddForm(item)}
                    >
                      Add property
                    </button>
                  </>
                ),
              };
              return acc;
            },
            {},
          )}
        />

        <div className="d-flex align-items-start mt-5">
          <h2>Global properties</h2>
          <button
            className="btn btn-primary ms-5"
            onClick={() => openPropertyAddForm(null)}
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
                <div className="py-4 ps-xl-5">
                  <p className="text-muted mb-0">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
