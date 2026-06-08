"use client";

import {
  SelectInput,
  TextInput,
  VerticalField,
} from "@/components/InputFields";
import { useFlags, useModalsContext } from "../contexts";

export default function PermissionListView() {
  const modals = useModalsContext();
  const flags = useFlags();
  console.log(flags);
  const permissionTypes = [
    {
      name: "Biological Sample Extraction",
      description:
        "Covers removal of biological material from a living bird, including fluids, tissues, or feathers, for research or diagnostic purposes.",
    },
    {
      name: "Restricted Species Interaction",
      description:
        "Applies to species designated as protected, experimental, or ecologically critical, requiring heightened authorization.",
    },
    {
      name: "Environmental Condition Manipulation",
      description:
        "Authorizes deliberate deviation from established environmental baselines such as temperature, humidity, or atmospheric composition within a habitat.",
    },
  ];

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
                <div className="form-check">
                  <label className="form-check-label" key={p.name}>
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
      {flags.has("mock-permission-editing") ? (
        <>
          <div>
            <h2>Permission types</h2>
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {permissionTypes.map((item) => {
                  return (
                    <tr>
                      <td>
                        <button className="btn btn-outline-primary">
                          Edit
                        </button>
                      </td>
                      <td>{item.name}</td>
                      <td>{item.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button className="btn btn-primary" onClick={openTypeAddForm}>
              + Add
            </button>
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
                    <tr>
                      <td>
                        <button className="btn btn-outline-primary">
                          Edit
                        </button>
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
      ) : (
        <div>This feature is not yet implemented.</div>
      )}
    </>
  );
}
