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
import { useState } from "react";
import { PermissionTypeWithProperties } from "../common";

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

  const properties = [
    {
      name: "manual handling required",
      description:
        "The activity requires physically holding the bird with hands, directly controlling its movement.",
      relatedType: "Biological Sample Extraction",
    },
    {
      name: "mechanical restraint permitted",
      description:
        "Use of devices such as nets, cages, or other mechanical methods to restrain birds is allowed.",
      relatedType: "Biological Sample Extraction",
    },
    {
      name: "sedation permitted",
      description:
        "Temporary pharmacological restraint is allowed to reduce stress or facilitate handling.",
      relatedType: "Restricted Species Interaction",
    },
    {
      name: "juveniles included",
      description:
        "Dependent young birds may be captured and handled under this permit.",
      relatedType: null,
    },
  ];

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

  const ExpandableRow = ({ item }: { item: PermissionTypeWithProperties }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <div className="row border-bottom g-0">
        <div className="col-12 col-md-6 col-lg-8 ">
          <div className="py-4 pe-3 pe-xl-5">
            <p className="fw-bold mb-1">{item.label}</p>
            <p className="text-muted mb-0">{item.description}</p>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-4 ">
          <div className="accordion py-4 ps-xl-5">
            <div className="accordion-item">
              <h3 className="accordion-header">
                <button
                  type="button"
                  className={`accordion-button ${isExpanded ? "" : "collapsed"}`}
                  onClick={() => setIsExpanded((v) => !v)}
                  aria-expanded={isExpanded}
                >
                  {`${item.properties.length} properties`}
                </button>
              </h3>
              <div
                className={`accordion-collapse collapse ${isExpanded ? "show" : ""}`}
              >
                <div className="accordion-body">
                  <ul className="ps-3">
                    {item.properties.map((p) => (
                      <li key={p.id}>{p.label}</li>
                    ))}
                  </ul>
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => openPropertyAddForm(item)}
                  >
                    Add property
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
        <div className="border-top">
          {permissionTypes.map((item) => (
            <ExpandableRow key={item.id} item={item} />
          ))}
        </div>

        <div className="d-flex align-items-start mt-5">
          <h2>Global properties</h2>
          <button
            className="btn btn-primary ms-5"
            onClick={() => openPropertyAddForm(null)}
          >
            + Add property
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
