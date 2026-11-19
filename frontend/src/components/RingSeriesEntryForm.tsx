import { useModalsContext } from "@/app/(system)/contexts";
import { FieldValidationError } from "@/app/(system)/client";
import {
  formatRingNumber,
  FormErrors,
  getRingNumberLength,
  RingColor,
  RingSeriesInput,
} from "@/app/(system)/common";
import { useTranslation } from "@/app/(system)/internationalization";
import { Alert } from "./Alert";
import { RingNumber } from "./RingNumber";
import {
  FieldErrors,
  SelectInput,
  TextInput,
  VerticalField,
} from "./InputFields";
import { useState } from "react";

const fieldIdPrefix = "ring-series-";

type ParsedPrefix =
  | { prefix: string; numberOfDigits: number }
  | { error: "blanks" | "length" };

// The prefix is entered with its blanks (or periods for EURING) and the
// digits fill the rest of the ring number.
function parsePrefix(value: string, isEuring: boolean): ParsedPrefix {
  const prefix = value.replace(/^[ .]+|[ .]+$/g, "");
  const leading = value.length - value.replace(/^[ .]+/, "").length;
  const trailing = value.length - value.replace(/[ .]+$/, "").length;
  if (
    prefix &&
    (/[ .]/.test(prefix) ||
      (/^\p{L}/u.test(prefix) ? leading > 0 : trailing > 0))
  ) {
    return { error: "blanks" };
  }
  const numberOfDigits =
    getRingNumberLength({ is_euring: isEuring }) - value.length;
  if (numberOfDigits < 1) {
    return { error: "length" };
  }
  return { prefix, numberOfDigits };
}

export function RingSeriesEntryForm({
  colors,
  onSubmit,
}: {
  colors: RingColor[];
  onSubmit: (values: RingSeriesInput) => Promise<void>;
}) {
  const { t, format } = useTranslation();
  const modals = useModalsContext();
  const [prefix, setPrefix] = useState("");
  const [isEuring, setIsEuring] = useState(false);
  const [hasWebAddress, setHasWebAddress] = useState(false);
  const [colorId, setColorId] = useState<number | "">("");
  const [errors, setErrors] = useState<FormErrors | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsed = parsePrefix(prefix, isEuring);

  const close = () => {
    const current = modals.stack[0];
    if (current) {
      modals.remove(current);
    }
  };

  const fieldErrors = Object.fromEntries(
    Object.entries(errors?.fields || {}).map(([field, messages]) => [
      `${fieldIdPrefix}${field === "number_of_digits" ? "prefix" : field}`,
      messages,
    ]),
  );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if ("error" in parsed) {
          setErrors({
            fields: {
              prefix: [
                parsed.error === "blanks"
                  ? t("ringSeriesFormPrefixBlanks")
                  : t("ringSeriesFormPrefixTooLong", {
                      length: getRingNumberLength({ is_euring: isEuring }) - 1,
                    }),
              ],
            },
            nonField: [],
          });
          return;
        }
        setErrors(undefined);
        setIsSubmitting(true);
        try {
          await onSubmit({
            prefix: parsed.prefix,
            number_of_digits: parsed.numberOfDigits,
            is_euring: isEuring,
            has_web_address: hasWebAddress,
            color_id: colorId === "" ? null : colorId,
          });
          close();
        } catch (error) {
          if (error instanceof FieldValidationError) {
            setErrors({
              fields: error.fieldErrors,
              nonField: error.nonFieldErrors,
            });
          } else {
            const message =
              error instanceof Error ? error.message : String(error);
            setErrors({ fields: {}, nonField: [message] });
          }
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <FieldErrors errors={fieldErrors}>
        {errors && errors.nonField.length > 0 ? (
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
        ) : null}
        <VerticalField
          label={t("ringSeriesFormPrefix")}
          id={`${fieldIdPrefix}prefix`}
          helpText={t("ringSeriesFormPrefixHelp")}
          required
        >
          <TextInput
            type="text"
            className="font-monospace"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
        </VerticalField>
        <div className="form-check mb-2">
          <input
            className="form-check-input border border-dark"
            type="checkbox"
            checked={isEuring}
            onChange={(e) => setIsEuring(e.target.checked)}
            id={`${fieldIdPrefix}is_euring`}
          />
          <label
            className="form-check-label"
            htmlFor={`${fieldIdPrefix}is_euring`}
          >
            {t("ringSeriesFormIsEuring")}
          </label>
        </div>
        <div className="form-check mb-3">
          <input
            className="form-check-input border border-dark"
            type="checkbox"
            checked={hasWebAddress}
            onChange={(e) => setHasWebAddress(e.target.checked)}
            id={`${fieldIdPrefix}has_web_address`}
          />
          <label
            className="form-check-label"
            htmlFor={`${fieldIdPrefix}has_web_address`}
          >
            {t("ringSeriesFormHasWebAddress")}
          </label>
        </div>
        {"error" in parsed ? null : (
          <p className="mb-3">
            {format("ringSeriesFormPreview", {
              ringNumber: (
                <RingNumber
                  value={formatRingNumber(
                    {
                      prefix: parsed.prefix,
                      number_of_digits: parsed.numberOfDigits,
                      is_euring: isEuring,
                    },
                    0,
                  )}
                />
              ),
              digits: parsed.numberOfDigits,
            })}
          </p>
        )}
        <VerticalField
          label={t("ringSeriesFormColor")}
          id={`${fieldIdPrefix}color_id`}
        >
          <SelectInput<number | "">
            options={[
              { value: "", label: t("ringSeriesFormNoColor") },
              ...colors.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={colorId}
            onChange={(value) => setColorId(value)}
          />
        </VerticalField>
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={close}
            disabled={isSubmitting}
          >
            {t("abortModal")}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {t("ringSeriesFormAdd")}
          </button>
        </div>
      </FieldErrors>
    </form>
  );
}
