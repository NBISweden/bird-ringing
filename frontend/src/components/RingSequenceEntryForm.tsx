import {
  formatRingNumber,
  RingSeries,
  RingSpecification,
} from "@/app/(system)/common";
import { useTranslation } from "@/app/(system)/internationalization";
import {
  FieldErrorGroup,
  FieldErrors,
  SelectInput,
  TextInput,
  VerticalField,
} from "./InputFields";
import { useState } from "react";

export type RingSequenceCartLine = {
  key: number;
  series: RingSeries;
  specification: RingSpecification;
  startNumber: number;
  quantity: number;
};

export function formatRingSeries(series: RingSeries) {
  const properties = [
    series.is_euring ? "EURING" : null,
    series.has_web_address ? "Web" : null,
    series.color ? series.color.name : null,
  ].filter((p) => p !== null);
  const ringNumber = formatRingNumber(
    series.prefix,
    series.number_of_digits,
    0,
  );
  return properties.length > 0
    ? `${ringNumber} (${properties.join(", ")})`
    : ringNumber;
}

export function formatRingSequence(
  series: RingSeries,
  startNumber: number,
  endNumber: number,
) {
  const first = formatRingNumber(
    series.prefix,
    series.number_of_digits,
    startNumber,
  );
  const last = formatRingNumber(
    series.prefix,
    series.number_of_digits,
    endNumber,
  );
  return `${first} – ${last}`;
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }
  const number = parseInt(value, 10);
  return number >= 1 ? number : null;
}

const fieldIds = {
  series: "ring-sequence-series",
  specification: "ring-sequence-specification",
  startNumber: "ring-sequence-start-number",
  quantity: "ring-sequence-quantity",
};

export function RingSequenceEntryForm({
  series,
  specifications,
  cart,
  disabled,
  onAdd,
}: {
  series: RingSeries[];
  specifications: RingSpecification[];
  cart: RingSequenceCartLine[];
  disabled?: boolean;
  onAdd: (line: Omit<RingSequenceCartLine, "key">) => void;
}) {
  const { t } = useTranslation();
  const [seriesId, setSeriesId] = useState<number | "">("");
  const [specificationId, setSpecificationId] = useState<number | "">("");
  const [startNumber, setStartNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [errors, setErrors] = useState<FieldErrorGroup>({});

  const selectedSeries = series.find((s) => s.id === seriesId);
  const selectedSpecification = specifications.find(
    (s) => s.id === specificationId,
  );
  const parsedStartNumber = parsePositiveInteger(startNumber);
  const parsedQuantity = parsePositiveInteger(quantity);
  const endNumber =
    parsedStartNumber !== null && parsedQuantity !== null
      ? parsedStartNumber + parsedQuantity - 1
      : null;

  const validate = (): FieldErrorGroup => {
    const nextErrors: FieldErrorGroup = {};
    if (!selectedSeries) {
      nextErrors[fieldIds.series] = t("ringSequenceFormRequired");
    }
    if (!selectedSpecification) {
      nextErrors[fieldIds.specification] = t("ringSequenceFormRequired");
    }
    if (parsedStartNumber === null) {
      nextErrors[fieldIds.startNumber] = t("ringSequenceFormMinValue");
    }
    if (parsedQuantity === null) {
      nextErrors[fieldIds.quantity] = t("ringSequenceFormMinValue");
    }
    if (!selectedSeries || parsedStartNumber === null || endNumber === null) {
      return nextErrors;
    }

    if (String(endNumber).length > selectedSeries.number_of_digits) {
      nextErrors[fieldIds.quantity] = t("ringSequenceFormEndNumberTooLarge", {
        endNumber,
        digits: selectedSeries.number_of_digits,
      });
      return nextErrors;
    }

    const overlapping = cart.find(
      (line) =>
        line.series.prefix === selectedSeries.prefix &&
        line.series.number_of_digits === selectedSeries.number_of_digits &&
        line.startNumber <= endNumber &&
        parsedStartNumber <= line.startNumber + line.quantity - 1,
    );
    if (overlapping) {
      nextErrors[fieldIds.startNumber] = t("ringSequenceFormOverlap", {
        sequence: formatRingSequence(
          selectedSeries,
          parsedStartNumber,
          endNumber,
        ),
        other: formatRingSequence(
          overlapping.series,
          overlapping.startNumber,
          overlapping.startNumber + overlapping.quantity - 1,
        ),
      });
    }
    return nextErrors;
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const nextErrors = validate();
        setErrors(nextErrors);
        if (
          Object.keys(nextErrors).length > 0 ||
          !selectedSeries ||
          !selectedSpecification ||
          parsedStartNumber === null ||
          parsedQuantity === null
        ) {
          return;
        }
        onAdd({
          series: selectedSeries,
          specification: selectedSpecification,
          startNumber: parsedStartNumber,
          quantity: parsedQuantity,
        });
        setStartNumber("");
        setQuantity("");
      }}
      noValidate
    >
      <FieldErrors errors={errors}>
        <VerticalField
          label={t("ringSequenceFormSeries")}
          id={fieldIds.series}
          required
        >
          <SelectInput<number | "">
            options={[
              { value: "", label: t("ringSequenceFormSelect") },
              ...series.map((s) => ({
                value: s.id,
                label: formatRingSeries(s),
              })),
            ]}
            value={seriesId}
            onChange={(value) => setSeriesId(value)}
            disabled={disabled}
          />
        </VerticalField>
        <VerticalField
          label={t("ringSequenceFormSpecification")}
          id={fieldIds.specification}
          helpText={
            selectedSpecification
              ? t("ringSequenceFormSpecificationHelp", {
                  typeCode: selectedSpecification.type_code.name,
                  variant: selectedSpecification.variant.name,
                  material: selectedSpecification.material.name,
                  diameter: selectedSpecification.diameter,
                  thickness: selectedSpecification.thickness,
                  height: selectedSpecification.height,
                  weight: selectedSpecification.weight,
                })
              : undefined
          }
          required
        >
          <SelectInput<number | "">
            options={[
              { value: "", label: t("ringSequenceFormSelect") },
              ...specifications.map((s) => ({ value: s.id, label: s.name })),
            ]}
            value={specificationId}
            onChange={(value) => setSpecificationId(value)}
            disabled={disabled}
          />
        </VerticalField>
        <VerticalField
          label={t("ringSequenceFormStartNumber")}
          id={fieldIds.startNumber}
          required
        >
          <TextInput
            type="number"
            min={1}
            step={1}
            value={startNumber}
            onChange={(e) => setStartNumber(e.target.value)}
            disabled={disabled}
          />
        </VerticalField>
        <VerticalField
          label={t("ringSequenceFormQuantity")}
          id={fieldIds.quantity}
          helpText={
            selectedSeries && endNumber !== null
              ? t("ringSequenceFormLastNumber", {
                  number: formatRingNumber(
                    selectedSeries.prefix,
                    selectedSeries.number_of_digits,
                    endNumber,
                  ),
                })
              : undefined
          }
          required
        >
          <TextInput
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={disabled}
          />
        </VerticalField>
      </FieldErrors>
      <div className="d-flex justify-content-center">
        <button type="submit" className="btn btn-primary" disabled={disabled}>
          {t("ringSequenceFormAdd")}
        </button>
      </div>
    </form>
  );
}
