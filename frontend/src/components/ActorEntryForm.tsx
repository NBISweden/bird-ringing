import { useEffect, useMemo, useRef, useState } from "react";
import useSWRImmutable from "swr/immutable";
import { ActorBase, Option, Options } from "@/app/(system)/common";
import { Client } from "@/app/(system)/client";
import { useClient } from "@/app/(system)/contexts";
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
import { Alert } from "./Alert";

export type ActorEntryFormErrors = {
  fields: Record<string, string[]>;
  nonField: string[];
};

function toSelectOptions(v: Option): { value: string; label: string } {
  return { value: v.id, label: v.label };
}

async function fetchOptions<T extends keyof Options>([client, option]: [
  Client,
  T,
]): Promise<Options[T][]> {
  return client.fetchOptions<T>(option);
}

function useOptions<T extends keyof Options>(option: T): Options[T][] {
  const client = useClient();
  const { data } = useSWRImmutable([client, option], fetchOptions<T>, {
    fallback: [],
  });
  return data || [];
}

export function ActorEntryForm({
  initialActor,
  onSubmit,
  title,
  errors,
}: {
  initialActor: Partial<ActorBase>;
  onSubmit: (actor: Partial<ActorBase>) => void | Promise<void>;
  title: string;
  errors?: ActorEntryFormErrors;
}) {
  const { t } = useTranslation();
  const [actor, updateValue] = useObjectState(initialActor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPerson = actor.type === "person";
  const formRef = useRef<HTMLFormElement | null>(null);
  const alertRef = useRef<HTMLDivElement | null>(null);

  const languageOptions = useOptions("language").map(toSelectOptions);
  const sexOptions = useOptions("sex").map(toSelectOptions);
  const actorTypeOptions = [
    { value: "", label: t("selectOption") },
    ...useOptions("actor_type").map(toSelectOptions),
  ];

  const fieldErrors = useMemo<Record<string, string | undefined>>(() => {
    if (!errors) return {};
    const flat: Record<string, string | undefined> = {};
    for (const [field, messages] of Object.entries(errors.fields)) {
      flat[field] = messages.join(", ");
    }
    return flat;
  }, [errors]);

  useEffect(() => {
    if (!errors) return;
    const target =
      errors.nonField.length > 0
        ? alertRef.current
        : formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  }, [errors]);

  return (
    <form
      ref={formRef}
      tabIndex={-1}
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
          await onSubmit(actor);
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <FieldErrorContext.Provider value={fieldErrors}>
        <div className="col-12 col-xl-6">
          <div className="card my-4">
            <div className="card-header py-3">
              <h3 className="m-0">{title}</h3>
            </div>
            <div className="card-body">
              {errors && errors.nonField.length > 0 ? (
                <div ref={alertRef} tabIndex={-1}>
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
                </div>
              ) : null}
              <FormSection
                icon="info-circle"
                title={t("actorFormInfoSubtitle")}
              >
                <div>
                  <VerticalField label={t("actorType")} id="type" required>
                    <SelectInput
                      value={actor.type || ""}
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
                      options={actorTypeOptions}
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
                          value={actor.sex || "undisclosed"}
                          onChange={(value) => updateValue({ sex: value })}
                          options={sexOptions}
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
                          onChange={(event) => {
                            const value = event.target.value;
                            updateValue({
                              birth_date: value || null,
                              birth_year: value
                                ? new Date(value).getFullYear()
                                : null,
                            });
                          }}
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
                            ""
                          }
                          onChange={(event) => {
                            const value = event.target.value;
                            updateValue({ birth_year: value ? +value : null });
                          }}
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
                      type="tel"
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
                      type="tel"
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
                      options={languageOptions}
                    />
                  </VerticalField>
                  <VerticalField label={t("actorDescription")} id="description">
                    <TextArea
                      placeholder={t("actorFormDescriptionPlaceholder")}
                      value={actor.description || ""}
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
