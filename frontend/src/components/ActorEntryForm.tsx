import { ActorBase } from "@/app/(system)/common";
import { useObjectState } from "@/app/(system)/hooks";
import { useTranslation } from "@/app/(system)/internationalization";
import {
  FieldErrorContext,
  SelectInput,
  TextInput,
  VerticalField,
} from "./InputFields";

export function ActorEntryForm({
  initialActor,
  onSubmit,
}: {
  initialActor: ActorBase;
  onSubmit: (actor: ActorBase) => void;
}) {
  const { t } = useTranslation();
  const [actor, updateValue] = useObjectState(initialActor);
  return (
    <form>
      <FieldErrorContext.Provider value={{}}>
        <div className="col-12 col-xl-6">
          <div className="card my-4">
            <div className="card-header d-flex justify-content-between">
              {t("actorFormTitle")}
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex">
                  <i className="bi bi-info-circle me-4" />
                  <div>
                    <VerticalField label={t("actorType")} id="type">
                      <SelectInput
                        value={actor.type}
                        onChange={(event) =>
                          updateValue({
                            type: event.target.value,
                            sex:
                              event.target.value === "person"
                                ? "unspecified"
                                : "n/a",
                          })
                        }
                        options={["person", "station"].map((o) => ({
                          value: o,
                          label: o,
                        }))}
                      />
                    </VerticalField>
                    <VerticalField label={t("actorGender")} id="sex">
                      <SelectInput
                        value={actor.sex}
                        onChange={(event) =>
                          updateValue({ sex: event.target.value })
                        }
                        disabled={actor.type === "station"}
                        options={["male", "female", "unspecified", "n/a"].map(
                          (o) => ({ value: o, label: o }),
                        )}
                      />
                    </VerticalField>
                    <VerticalField label={t("actorBirthDate")} id="birth_date">
                      <TextInput
                        type="date"
                        placeholder={t("actorFormBirthDatePlaceholder")}
                        defaultValue={actor.birth_date || ""}
                      />
                    </VerticalField>
                  </div>
                </li>
                <li className="list-group-item d-flex">
                  <i className="bi bi-envelope-at-fill me-4" />
                  <div>
                    <VerticalField label={t("actorEmail")} id="email">
                      <TextInput
                        type="email"
                        placeholder={t("actorFormEmailPlaceholder")}
                        defaultValue={actor.email || ""}
                      />
                    </VerticalField>
                    <VerticalField
                      label={t("actorAlternativeEmail")}
                      id="alternative_email"
                    >
                      <TextInput
                        type="email"
                        placeholder={t("actorFormEmailPlaceholder")}
                        defaultValue={actor.alternative_email || ""}
                      />
                    </VerticalField>
                  </div>
                </li>
                <li className="list-group-item d-flex">
                  <i className="bi bi-telephone-fill me-4" />
                  <div>
                    <VerticalField
                      label={t("actorPhoneNumber1")}
                      id="phone_number1"
                    >
                      <TextInput
                        type="phonenumber"
                        placeholder={t("actorFormPhoneNumberPlaceholder")}
                        defaultValue={actor.phone_number1 || ""}
                      />
                    </VerticalField>
                    <VerticalField
                      label={t("actorPhoneNumber2")}
                      id="phone_number2"
                    >
                      <TextInput
                        type="phonenumber"
                        placeholder={t("actorFormPhoneNumberPlaceholder")}
                        defaultValue={actor.phone_number2 || ""}
                      />
                    </VerticalField>
                  </div>
                </li>
                <li className="list-group-item d-flex">
                  <i className="bi bi-house-fill me-4" />
                  <div>
                    <VerticalField label={t("actorCity")} id="city">
                      <TextInput
                        type="text"
                        placeholder={t("actorFormCityPlaceholder")}
                        defaultValue={actor.city || ""}
                      />
                    </VerticalField>
                    <VerticalField label={t("actorAddress")} id="address">
                      <TextInput
                        type="text"
                        placeholder={t("actorFormAddressPlaceholder")}
                        defaultValue={actor.address || ""}
                      />
                    </VerticalField>
                    <VerticalField label={t("actorCOAddress")} id="co_address">
                      <TextInput
                        type="text"
                        placeholder={t("actorFormAddressPlaceholder")}
                        defaultValue={actor.co_address || ""}
                      />
                    </VerticalField>
                  </div>
                </li>
              </ul>
              <button
                className="btn btn-secondary"
                onClick={(e) => {
                  e.preventDefault();
                  onSubmit(actor);
                }}
              >
                {t("actorFormSave")}
              </button>
            </div>
          </div>
        </div>
      </FieldErrorContext.Provider>
    </form>
  );
}
