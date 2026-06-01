import { LicenseInstance, Option, Options } from "@/app/(system)/common";
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

type LicenseRelation = Omit<LicenseInstance["actors"][number], "actor"> & {
  actor: string;
};

function toSelectOptions(v: Option): { value: string; label: string } {
  return {
    value: v.id,
    label: v.label,
  };
}

export function LicensRelationsForm({
  initialRelations,
  onSubmit,
}: {
  initialRelations: Partial<LicenseRelation>[];
  onSubmit: (license: Partial<LicenseRelation>[]) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const { data: actors } = useOptions("actor");
  const { data: licenseRoles } = useOptions("license_role");
  const options: ActorOptions = {
    actors,
    licenseRoles
  }
  const [relations, setRelations] = useState(initialRelations);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const actorIds = relations.map((r) => String(r.actor));
  const availableActorOptions = options.actors
    .filter((actor) => !actorIds.includes(actor.id))
    .map((o) => ({ ...o, term: o.label }));
  const { filteredItems, setFilter, filter } = useFilter(availableActorOptions);
  return (
    <div className="card-body">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSubmitting(true);
          await onSubmit(relations);
          setIsSubmitting(false);
        }}
      >
        <VerticalField label={t("licenseFormActor")} icon="person">
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
            <ul className="list-group list-group-flush overflow-auto" style={{maxHeight: "30vh", minHeight: "38px"}}>
              {filteredItems.map((option, key) => (
                <li className="list-group-item" key={key}>
                  <div className="d-flex align-items-center">
                    <label className="flex-fill">{option.label}</label>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        setRelations([
                            ...relations,
                            {actor: option.id},
                          ],
                        );
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
          {relations.map((relation, key) => (
            <li className="list-group-item mb-3" key={key}>
              <span className="d-flex gap-3 align-items-start">
                <button
                  className="btn btn-danger ms-2"
                  onClick={(e) => {
                    e.preventDefault();
                    const rs = relations.filter(
                      (_, i) => i !== key,
                    );
                    setRelations(rs);
                  }}
                >
                  <Icon icon="trash" />
                </button>
                <ActorEntrySubform
                  relation={{
                    ...relation,
                    actor: options.actors.filter(
                      (a) => relation.actor === a.id,
                    )[0]?.id,
                  }}
                  options={options}
                  updateValue={(v) => {
                    const rs = relations.map<Partial<LicenseRelation>>(
                      (relation, i) => i !== key ? relation : {...relation, ...v},
                    );
                    setRelations(rs);
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
        <div className="d-flex justify-content-end">
          <button
            type="submit"
            className="btn btn-secondary flex-grow-0"
            disabled={isSubmitting ? true : undefined}
          >
            {t("licenseRelationFormSave")}
          </button>
        </div>
      </form>
    </div>
  )
}

function ActorEntrySubform({
  relation,
  updateValue,
  options,
}: {
  relation: Partial<LicenseRelation>;
  updateValue: (r: Partial<LicenseRelation>) => void;
  options: ActorOptions;
}) {
  const { t } = useTranslation();
  const currentActor = options.actors.filter((r) => r.id === relation.actor)[0];

  return (
    <div className="row align-items-center g-2">
      <div className="col-12 col-md-4">
        <VerticalField label={t("licenseFormRole")} icon="journal">
          <SelectInput
            options={[
              { value: "", label: t("selectOption"), disabled: true },
              ...options.licenseRoles.map(toSelectOptions),
            ]}
            value={
              options.licenseRoles.filter((r) => r.label === relation.role)[0]
                ?.id || ""
            }
            onChange={(v) =>
              v &&
              updateValue({
                role: options.licenseRoles.filter((r) => r.id === v)[0].label,
              })
            }
            required
          />
        </VerticalField>
      </div>
      <div className="col-12 col-md-4">
        <VerticalField label={t("licenseFormActor")} icon="person">
          <SelectInput
            options={options.actors.map(toSelectOptions)}
            value={currentActor?.id}
            required
            onChange={(v) => v && updateValue({ actor: v })}
            disabled
          />
        </VerticalField>
      </div>
      <div className="col-12 col-md-4">
        <VerticalField label={t("licenseFormRelationId")} icon="hash">
          <TextInput
            type="string"
            value={relation.mednr || ""}
            required
            maxLength={4}
            onChange={(e) =>
              updateValue({ mednr: e.target.value.toUpperCase() })
            }
          />
        </VerticalField>
      </div>
    </div>
  );
}