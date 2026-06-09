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

export default function PermissionListView() {
  const modals = useModalsContext();
  const flags = useFlags();
  const client = useClient();

  if (!flags.has("mock-permission-editing")) {
    notFound();
  }

  const { data, isLoading, error } = useSWR([client], fetchPermissionTypes);

  if (error) {
    return <p>{error.message}</p>;
  }

  if (!data) {
    return <div>No data collected.</div>;
  }

  const permissionTypes = data;
  console.log(permissionTypes);

  // const permissionTypes = [
  //   {
  //     name: "Biological Sample Extraction",
  //     description:
  //       "Covers removal of biological material from a living bird, including fluids, tissues, or feathers, for research or diagnostic purposes.",
  //   },
  //   {
  //     name: "Restricted Species Interaction",
  //     description:
  //       "Applies to species designated as protected, experimental, or ecologically critical, requiring heightened authorization.",
  //   },
  //   {
  //     name: "Environmental Condition Manipulation",
  //     description:
  //       "Authorizes deliberate deviation from established environmental baselines such as temperature, humidity, or atmospheric composition within a habitat.",
  //   },
  // ];

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
        <VerticalField label="Add permission properties">
          <div className="flex-column">
            {properties.map((p) => {
              return (
                <div className="form-check" key={p.name}>
                  <label className="form-check-label">
                    <input className="form-check-input" type="checkbox" />
                    {p.name}
                  </label>
                </div>
              );
            })}
          </div>
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
        <VerticalField label="Related permission type">
          <SelectInput
            options={[
              { value: null, label: "no related permission type" },
              ...permissionTypes.map((p) => {
                return { value: p.name, label: p.name };
              }),
            ]}
          />
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
          <div className="accordion pt-4 ps-xl-5">
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
                  <button className="btn btn-outline-primary">
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
  const openPropertyAddForm = () => {
    modals.add({
      title: "Add permission property",
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
      <div>
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
      </div>

      <div className="mt-5">
        <h2>Permission properties</h2>
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Related to</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((item) => {
              return (
                <tr key={item.name}>
                  <td>
                    <button className="btn btn-outline-primary">Edit</button>
                  </td>
                  <td>{item.name}</td>
                  <td>{item.relatedType ? item.relatedType : "-"}</td>
                  <td>{item.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className="btn btn-primary" onClick={openPropertyAddForm}>
          + Add
        </button>
      </div>
    </>
  );
}
