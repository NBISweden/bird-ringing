import {
  idToReference,
  LicenseActorRelation,
  ObjectReference,
  Options,
  referenceToId,
  toSelectOptions,
} from "@/app/(system)/common";
import Icon from "./Icon";
import { SelectInput, TextInput, VerticalField } from "./InputFields";
import { useTranslation } from "@/app/(system)/internationalization";
import { useFilter, useOptions } from "@/app/(system)/hooks";
import { Alert } from "./Alert";
import { useState } from "react";

export type ActorOptions = {
  actors: Options["actor"][];
  licenseRoles: Options["license_role"][];
};

function isLicenseActorRelation(
  relation: Partial<LicenseActorRelation>,
): relation is LicenseActorRelation {
  return (
    relation.actor !== undefined &&
    relation.associate_number !== undefined &&
    relation.role !== undefined
  );
}

function requireLicenseActorRelation(
  relation: Partial<LicenseActorRelation>,
): LicenseActorRelation {
  if (isLicenseActorRelation(relation)) {
    return relation;
  }
  throw new Error(
    `Object ${JSON.stringify(relation)} is not a complete relation.`,
  );
}

export function LicenseRelationsForm({
  initialRelations,
  onSubmit,
  isSubmitting,
  minAssociateNumber,
}: {
  initialRelations: LicenseActorRelation[];
  onSubmit: (license: LicenseActorRelation[]) => void | Promise<void>;
  isSubmitting?: boolean;
  minAssociateNumber?: number;
}) {
  const { t } = useTranslation();
  const { data: actors } = useOptions("actor");
  const { data: licenseRoles } = useOptions("license_role");
  const options: ActorOptions = {
    actors,
    licenseRoles,
  };
  const [relations, setRelations] =
    useState<Partial<LicenseActorRelation>[]>(initialRelations);
  const [submittedEntries, setSubmittedEntries] = useState<
    Map<Partial<LicenseActorRelation>, number>
  >(new Map());
  const actorIds = relations.map((r) => String(r.actor?.id));

  const addRelation = (actor: ObjectReference) => {
    setRelations((previousRelations) => {
      const nextAssociateNumber =
        Math.max(
          minAssociateNumber === undefined ? 0 : minAssociateNumber,
          ...previousRelations
            .map((r) => r.associate_number)
            .map((an) => (an && an.match(/^\d+$/) ? parseInt(an) : 0)),
        ) + 1;
      return [
        ...previousRelations,
        {
          actor: actor,
          associate_number: String(nextAssociateNumber).padStart(4, "0"),
        },
      ];
    });
  };
  const availableActorOptions = options.actors
    .filter((actor) => !actorIds.includes(actor.id))
    .map((o) => ({ ...o, term: o.label }));
  const { filteredItems, setFilter, filter } = useFilter(availableActorOptions);
  const submitRelations = () => {
    setSubmittedEntries(new Map(relations.map((r, index) => [r, index])));
    onSubmit(relations.map(requireLicenseActorRelation));
  };
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        submitRelations();
      }}
    >
      <VerticalField label={t("licenseFormAddActor")} icon="plus">
        <div className="input-group mb-3">
          <TextInput
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("licenseFormFilterActors")}
          />
          <button
            className="btn btn-outline-secondary"
            onClick={(e) => {
              e.preventDefault();
              setFilter("");
            }}
          >
            <Icon icon="x-circle" />
          </button>
        </div>
      </VerticalField>
      {filter ? (
        filteredItems.length > 0 ? (
          <ul
            className="list-group list-group-flush overflow-auto"
            style={{ maxHeight: "30vh", minHeight: "38px" }}
          >
            {filteredItems.map((option, key) => (
              <li className="list-group-item" key={key}>
                <div className="d-flex align-items-center">
                  <label className="flex-fill">{option.label}</label>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      const actor = idToReference(option.id);
                      if (actor) {
                        addRelation(actor);
                      }
                    }}
                  >
                    {t("licenseFormAddActor")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Alert type="info">{t("licenseFormNoMatchingActors")}</Alert>
        )
      ) : (
        <></>
      )}
      <ul className="list-group list-group-flush mt-3">
        {relations.map((relation, key) => {
          const submittedIndex = submittedEntries.get(relation);
          const errorKey =
            submittedIndex === undefined
              ? submittedEntries.size + key
              : submittedIndex;
          return (
            <li className="list-group-item mb-3" key={key}>
              <span className="d-flex gap-3 align-items-start">
                <button
                  className="btn btn-danger ms-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rs = relations.filter((_, i) => i !== key);
                    setSubmittedEntries((prev) => {
                      const next = new Map(prev);
                      next.delete(relation);
                      return next;
                    });
                    setRelations(rs);
                  }}
                >
                  <Icon icon="trash" />
                </button>
                <ActorEntrySubform
                  id={`latest.actors.${errorKey}`}
                  relation={{
                    ...relation,
                    actor: idToReference(
                      options.actors.filter(
                        (a) => referenceToId(relation.actor) === a.id,
                      )[0]?.id,
                    ),
                  }}
                  options={options}
                  updateValue={(v) => {
                    const rs = relations.map<Partial<LicenseActorRelation>>(
                      (relation, i) =>
                        i !== key ? relation : { ...relation, ...v },
                    );
                    setRelations(rs);
                  }}
                />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="d-flex justify-content-end">
        <button
          type="submit"
          className="btn btn-secondary flex-grow-0"
          disabled={isSubmitting ? true : undefined}
        >
          {t("licenseFormSaveRelations")}
        </button>
      </div>
    </form>
  );
}

function ActorEntrySubform({
  id,
  relation,
  updateValue,
  options,
}: {
  id?: string;
  relation: Partial<LicenseActorRelation>;
  updateValue: (r: Partial<LicenseActorRelation>) => void;
  options: ActorOptions;
}) {
  const { t } = useTranslation();
  const currentActor = options.actors.filter(
    (r) => r.id === referenceToId(relation.actor),
  )[0];

  return (
    <div className="row align-items-start g-2">
      <div className="col-12 col-md-4">
        <VerticalField
          label={t("licenseRole")}
          icon="journal"
          id={id ? `${id}.role` : "role"}
        >
          <SelectInput
            options={[
              { value: "", label: t("selectOption"), disabled: true },
              ...options.licenseRoles.map(toSelectOptions),
            ]}
            value={
              options.licenseRoles.filter((r) => r.id === relation.role)[0]
                ?.id || ""
            }
            onChange={(v) =>
              v &&
              updateValue({
                role: v,
              })
            }
            required
          />
        </VerticalField>
      </div>
      <div className="col-12 col-md-4">
        <VerticalField
          label={t("licenseActor")}
          icon="person"
          id={id ? `${id}.actor` : "actor"}
        >
          <SelectInput
            options={options.actors.map(toSelectOptions)}
            value={currentActor?.id}
            required
            onChange={(v) => v && updateValue({ actor: idToReference(v) })}
            disabled
          />
        </VerticalField>
      </div>
      <div className="col-12 col-md-4">
        <VerticalField
          label={t("licenseRelationId")}
          icon="hash"
          id={id ? `${id}.associate_number` : "associate_number"}
        >
          <TextInput
            type="string"
            value={relation.associate_number || ""}
            required
            maxLength={4}
            onChange={(e) =>
              updateValue({ associate_number: e.target.value.toUpperCase() })
            }
          />
        </VerticalField>
      </div>
    </div>
  );
}
