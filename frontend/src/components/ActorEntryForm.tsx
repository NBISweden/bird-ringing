import { ActorBase } from "@/app/(system)/common";
import { useObjectState } from "@/app/(system)/hooks";
import { useTranslation } from "@/app/(system)/internationalization";
import {
  FieldErrorContext,
  SelectInput,
  TextInput,
  VerticalField,
  FormSection,
  TextArea,
} from "./InputFields";

export function ActorEntryForm({
  initialActor,
  onSubmit,
}: {
  initialActor: Partial<ActorBase>;
  onSubmit: (actor: Partial<ActorBase>) => void;
}) {
  const { t } = useTranslation();
  const [actor, updateValue] = useObjectState(initialActor);
  const isPerson = actor.type === "person";

  // The list of languages was provided by the Bird Ringing Central.
  // It's all languages used within the European bird ringing network (EURING).
  const languageOptions = [
    "Swedish",
    "English",
    "Unknown",
    "Albanian",
    "Arabic",
    "Azerbaijani",
    "Basque",
    "Belarusian",
    "Bosnian",
    "Bulgarian",
    "Catalan",
    "Croatian",
    "Czech",
    "Danish",
    "Dutch",
    "Estonian",
    "Finnish",
    "French",
    "Georgian",
    "German",
    "Greek",
    "Hebrew",
    "Hungarian",
    "Icelandic",
    "Italian",
    "Kazakh",
    "Latvian",
    "Lithuanian",
    "Macedonian",
    "Maltese",
    "Montenegrin",
    "Norwegian",
    "Polish",
    "Portuguese",
    "Romanian",
    "Russian",
    "Serbian",
    "Slovak",
    "Slovenian",
    "Spanish",
    "Turkish",
    "Ukrainian",
  ];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(actor);
      }}
    >
      <FieldErrorContext.Provider value={{}}>
        <div className="col-12 col-xl-6">
          <div className="card my-4">
            <div className="card-header py-3">
              <h3 className="m-0">{t("actorFormTitle")}</h3>
            </div>
            <div className="card-body">
              <FormSection
                icon="info-circle"
                title={t("actorFormInfoSubtitle")}
              >
                <div>
                  <VerticalField label={t("actorType")} id="type" required>
                    <SelectInput
                      value={actor.type || "-"}
                      onChange={(value) =>
                        updateValue({
                          type: value,
                          sex: value === "person" ? "unspecified" : "n/a",
                          last_name: value === "station" ? "" : actor.last_name,
                          full_name:
                            value === "station"
                              ? actor.first_name
                              : [actor.first_name, actor.last_name].join(" "),
                        })
                      }
                      options={["-", "person", "station"].map((o) => ({
                        value: o,
                        label: o,
                      }))}
                    />
                  </VerticalField>
                  <VerticalField
                    label={isPerson ? t("actorFirstName") : t("actorName")}
                    id="first_name"
                    required
                  >
                    <TextInput
                      type="text"
                      placeholder={
                        isPerson
                          ? t("actorFormFirstNamePlaceholder")
                          : t("actorFormNamePlaceholder")
                      }
                      value={actor.first_name || ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateValue({
                          full_name: [value, actor.last_name]
                            .filter((v) => !!v)
                            .join(" "),
                          first_name: value,
                        });
                      }}
                    />
                  </VerticalField>
                  {isPerson ? (
                    <>
                      <VerticalField
                        label={t("actorLastName")}
                        id="last_name"
                        required
                      >
                        <TextInput
                          type="text"
                          placeholder={t("actorFormLastNamePlaceholder")}
                          value={actor.last_name || ""}
                          disabled={!isPerson}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateValue({
                              full_name: [actor.first_name, value]
                                .filter((v) => !!v)
                                .join(" "),
                              last_name: value,
                            });
                          }}
                        />
                      </VerticalField>
                      <VerticalField label={t("actorGender")} id="sex">
                        <SelectInput
                          value={actor.sex || "-"}
                          required
                          onChange={(value) => updateValue({ sex: value })}
                          disabled={!isPerson}
                          options={[
                            "-",
                            t("actorFormGenderMale"),
                            t("actorFormGenderFemale"),
                            t("actorFormGenderUnspecified"),
                            t("actorFormGenderNA"),
                          ].map((o) => ({ value: o, label: o }))}
                        />
                      </VerticalField>
                    </>
                  ) : (
                    <></>
                  )}
                  {!!actor.type ? (
                    <>
                      <VerticalField
                        label={
                          isPerson
                            ? t("actorBirthDate")
                            : t("actorCreationDate")
                        }
                        id="birth_date"
                      >
                        <TextInput
                          type="date"
                          placeholder={
                            isPerson
                              ? t("actorFormBirthDatePlaceholder")
                              : t("actorFormCreationDatePlaceholder")
                          }
                          value={actor.birth_date || ""}
                          onChange={(event) =>
                            updateValue({
                              birth_date: event.target.value,
                              birth_year: new Date(
                                event.target.value,
                              ).getFullYear(),
                            })
                          }
                        />
                      </VerticalField>
                      <VerticalField
                        label={
                          isPerson
                            ? t("actorBirthYear")
                            : t("actorCreationYear")
                        }
                        id="birth_year"
                      >
                        <TextInput
                          type="number"
                          disabled={!!actor.birth_date}
                          placeholder={
                            isPerson
                              ? t("actorFormBirthYearPlaceholder")
                              : t("actorFormCreationYearPlaceholder")
                          }
                          value={
                            actor.birth_year ||
                            (actor.birth_date &&
                              new Date(actor.birth_date).getFullYear()) ||
                            undefined
                          }
                          onChange={(event) =>
                            updateValue({ birth_year: +event.target.value })
                          }
                        />
                      </VerticalField>
                    </>
                  ) : (
                    <></>
                  )}
                </div>
              </FormSection>
              <FormSection
                icon="envelope-at-fill"
                title={t("actorFormContactSubtitle")}
              >
                <div>
                  <VerticalField label={t("actorEmail")} id="email" required>
                    <TextInput
                      type="email"
                      placeholder={t("actorFormEmailPlaceholder")}
                      value={actor.email || ""}
                      onChange={(event) =>
                        updateValue({ email: event.target.value })
                      }
                    />
                  </VerticalField>
                  <VerticalField
                    label={t("actorAlternativeEmail")}
                    id="alternative_email"
                  >
                    <TextInput
                      type="email"
                      placeholder={t("actorFormEmailPlaceholder")}
                      value={actor.alternative_email || ""}
                      onChange={(event) =>
                        updateValue({ alternative_email: event.target.value })
                      }
                    />
                  </VerticalField>
                </div>
                <div>
                  <VerticalField
                    label={t("actorPhoneNumber1")}
                    id="phone_number1"
                    required
                  >
                    <TextInput
                      type="phonenumber"
                      placeholder={t("actorFormPhoneNumberPlaceholder")}
                      value={actor.phone_number1 || ""}
                      onChange={(event) =>
                        updateValue({ phone_number1: event.target.value })
                      }
                    />
                  </VerticalField>
                  <VerticalField
                    label={t("actorPhoneNumber2")}
                    id="phone_number2"
                  >
                    <TextInput
                      type="phonenumber"
                      placeholder={t("actorFormPhoneNumberPlaceholder")}
                      value={actor.phone_number2 || ""}
                      onChange={(event) =>
                        updateValue({ phone_number2: event.target.value })
                      }
                    />
                  </VerticalField>
                </div>
              </FormSection>
              <FormSection
                icon="house-fill"
                title={t("actorFormLocationSubtitle")}
              >
                <div>
                  <VerticalField label={t("actorCity")} id="city" required>
                    <TextInput
                      type="text"
                      placeholder={t("actorFormCityPlaceholder")}
                      value={actor.city || ""}
                      onChange={(event) =>
                        updateValue({ city: event.target.value })
                      }
                    />
                  </VerticalField>
                  <VerticalField
                    label={t("actorPostalCode")}
                    id="postal_code"
                    required
                  >
                    <TextInput
                      type="text"
                      placeholder={t("actorFormPostalCodePlaceholder")}
                      value={actor.postal_code || ""}
                      onChange={(event) =>
                        updateValue({ postal_code: event.target.value })
                      }
                    />
                  </VerticalField>
                  <VerticalField
                    label={t("actorAddress")}
                    id="address"
                    required
                  >
                    <TextInput
                      type="text"
                      placeholder={t("actorFormAddressPlaceholder")}
                      value={actor.address || ""}
                      onChange={(event) =>
                        updateValue({ address: event.target.value })
                      }
                    />
                  </VerticalField>
                  <VerticalField label={t("actorCOAddress")} id="co_address">
                    <TextInput
                      type="text"
                      placeholder={t("actorFormAddressPlaceholder")}
                      value={actor.co_address || ""}
                      onChange={(event) =>
                        updateValue({ co_address: event.target.value })
                      }
                    />
                  </VerticalField>
                  <VerticalField label={t("actorCountry")} id="country">
                    <TextInput
                      type="text"
                      placeholder={t("actorFormCountryPlaceholder")}
                      value={actor.country || ""}
                      onChange={(event) =>
                        updateValue({ country: event.target.value })
                      }
                    />
                  </VerticalField>
                </div>
              </FormSection>
              <FormSection icon="twitter" title={t("actorFormDetailsSubtitle")}>
                <div>
                  <VerticalField label={t("actorLanguage")} id="language">
                    <SelectInput
                      value={actor.language || "unknown"}
                      onChange={(value) => updateValue({ language: value })}
                      options={languageOptions.map((o) => ({
                        value: o.toLowerCase(),
                        label: o,
                      }))}
                    />
                  </VerticalField>
                  <VerticalField label={t("actorDescription")} id="description">
                    <TextArea
                      placeholder={t("actorFormDescriptionPlaceholder")}
                      value={actor.description}
                      onChange={(event) =>
                        updateValue({ description: event.target.value })
                      }
                    ></TextArea>
                  </VerticalField>
                </div>
              </FormSection>
            </div>
            <button className="btn btn-secondary align-self-end me-3 mb-3">
              {t("actorFormSave")}
            </button>
          </div>
        </div>
      </FieldErrorContext.Provider>
    </form>
  );
}
