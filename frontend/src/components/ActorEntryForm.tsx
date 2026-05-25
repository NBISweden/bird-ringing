import { useState } from "react";
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

// The list of languages was provided by the Bird Ringing Central.
// It's all languages used within the European bird ringing network (EURING).
const languageOptions: { value: string; label: string }[] = [
  { value: "-", label: "-" },
  { value: "sv", label: "Swedish" },
  { value: "en", label: "English" },
  { value: "unknown", label: "Unknown" },
  { value: "sq", label: "Albanian" },
  { value: "ar", label: "Arabic" },
  { value: "az", label: "Azerbaijani" },
  { value: "eu", label: "Basque" },
  { value: "be", label: "Belarusian" },
  { value: "bs", label: "Bosnian" },
  { value: "bg", label: "Bulgarian" },
  { value: "ca", label: "Catalan" },
  { value: "hr", label: "Croatian" },
  { value: "cs", label: "Czech" },
  { value: "da", label: "Danish" },
  { value: "nl", label: "Dutch" },
  { value: "et", label: "Estonian" },
  { value: "fi", label: "Finnish" },
  { value: "fr", label: "French" },
  { value: "ka", label: "Georgian" },
  { value: "de", label: "German" },
  { value: "el", label: "Greek" },
  { value: "he", label: "Hebrew" },
  { value: "hu", label: "Hungarian" },
  { value: "is", label: "Icelandic" },
  { value: "it", label: "Italian" },
  { value: "kk", label: "Kazakh" },
  { value: "lv", label: "Latvian" },
  { value: "lt", label: "Lithuanian" },
  { value: "mk", label: "Macedonian" },
  { value: "mt", label: "Maltese" },
  { value: "cnr", label: "Montenegrin" },
  { value: "no", label: "Norwegian" },
  { value: "pl", label: "Polish" },
  { value: "pt", label: "Portuguese" },
  { value: "ro", label: "Romanian" },
  { value: "ru", label: "Russian" },
  { value: "sr", label: "Serbian" },
  { value: "sk", label: "Slovak" },
  { value: "sl", label: "Slovenian" },
  { value: "es", label: "Spanish" },
  { value: "tr", label: "Turkish" },
  { value: "uk", label: "Ukrainian" },
];

export function ActorEntryForm({
  initialActor,
  onSubmit,
  title,
}: {
  initialActor: Partial<ActorBase>;
  onSubmit: (actor: Partial<ActorBase>) => void | Promise<void>;
  title: string;
}) {
  const { t } = useTranslation();
  const [actor, updateValue] = useObjectState(initialActor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPerson = actor.type === "person";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        console.log("submitting");
        setIsSubmitting(true);
        try {
          await onSubmit(actor);
        } finally {
          setIsSubmitting(false);
          console.log("done submitting");
        }
      }}
    >
      <FieldErrorContext.Provider value={{}}>
        <div className="col-12 col-xl-6">
          <div className="card my-4">
            <div className="card-header py-3">
              <h3 className="m-0">{title}</h3>
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
                          sex:
                            value === "person"
                              ? "undisclosed"
                              : "not_applicable",
                          last_name: value === "station" ? "" : actor.last_name,
                          full_name:
                            value === "station"
                              ? actor.first_name
                              : [actor.first_name, actor.last_name].join(" "),
                        })
                      }
                      options={[
                        { value: "-", label: "-" },
                        { value: "person", label: t("actorTypePerson") },
                        { value: "station", label: t("actorTypeStation") },
                      ]}
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
                            { value: "-", label: "-" },
                            { value: "male", label: t("actorFormGenderMale") },
                            {
                              value: "female",
                              label: t("actorFormGenderFemale"),
                            },
                            {
                              value: "unspecified",
                              label: t("actorFormGenderUndisclosed"),
                            },
                            { value: "n/a", label: t("actorFormGenderNA") },
                          ]}
                        />
                      </VerticalField>
                    </>
                  ) : (
                    <></>
                  )}
                  {actor.type ? (
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
                      value={actor.language}
                      onChange={(value) => updateValue({ language: value })}
                      options={languageOptions}
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
            <button
              className="btn btn-secondary align-self-end me-3 mb-3"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("actorFormSaving") : t("actorFormSave")}
            </button>
          </div>
        </div>
      </FieldErrorContext.Provider>
    </form>
  );
}
