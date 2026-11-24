import {
  formatRingNumber,
  RingColor,
  RingSeries,
  RingSeriesInput,
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
import { RingNumber, withVisibleBlanks } from "./RingNumber";
import { RingSeriesEntryForm } from "./RingSeriesEntryForm";
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
  const ringNumber = formatRingNumber(series, 0);
  return properties.length > 0
    ? `${ringNumber} (${properties.join(", ")})`
    : ringNumber;
}

export function formatRingSequence(
  series: RingSeries,
  startNumber: number,
  endNumber: number,
) {
  const first = formatRingNumber(series, startNumber);
  const last = formatRingNumber(series, endNumber);
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
  colors,
  cart,
  disabled,
  onAdd,
  onCreateSeries,
}: {
  series: RingSeries[];
  specifications: RingSpecification[];
  colors: RingColor[];
  cart: RingSequenceCartLine[];
  disabled?: boolean;
  onAdd: (line: Omit<RingSequenceCartLine, "key">) => void;
  onCreateSeries: (values: RingSeriesInput) => Promise<RingSeries>;
}) {
  const { t, format } = useTranslation();
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [showDefinitions, setShowDefinitions] = useState(false);
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
        sequence: withVisibleBlanks(
          formatRingSequence(selectedSeries, parsedStartNumber, endNumber),
        ),
        other: withVisibleBlanks(
          formatRingSequence(
            overlapping.series,
            overlapping.startNumber,
            overlapping.startNumber + overlapping.quantity - 1,
          ),
        ),
      });
    }
    return nextErrors;
  };

  return (
    <>
      {showSeriesForm ? (
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">{t("ringSeriesFormTitle")}</h5>
            <RingSeriesEntryForm
              colors={colors}
              onSubmit={async (values) => {
                const created = await onCreateSeries(values);
                setSeriesId(created.id);
              }}
              onClose={() => setShowSeriesForm(false)}
            />
          </div>
        </div>
      ) : (
        <div className="d-flex justify-content-end mb-2">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => setShowSeriesForm(true)}
            disabled={disabled}
          >
            <i className="bi bi-plus-lg me-2" aria-hidden="true" />
            {t("ringSequenceFormNewSeries")}
          </button>
        </div>
      )}
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
                  label: withVisibleBlanks(formatRingSeries(s)),
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
          <div className="mb-3">
            <button
              type="button"
              className="btn btn-link p-0"
              aria-expanded={showDefinitions}
              aria-controls="ring-specification-definitions"
              onClick={() => setShowDefinitions((prev) => !prev)}
            >
              {showDefinitions
                ? t("ringSpecificationDefinitionsHide")
                : t("ringSpecificationDefinitionsShow")}
            </button>
            {showDefinitions ? (
              <div
                id="ring-specification-definitions"
                className="table-responsive mt-2"
              >
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>{t("ringSpecificationName")}</th>
                      <th>{t("ringSpecificationTypeCode")}</th>
                      <th>{t("ringSpecificationVariant")}</th>
                      <th>{t("ringSpecificationMaterial")}</th>
                      <th>{t("ringSpecificationDiameter")}</th>
                      <th>{t("ringSpecificationThickness")}</th>
                      <th>{t("ringSpecificationHeight")}</th>
                      <th>{t("ringSpecificationWeight")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specifications.map((s) => (
                      <tr
                        key={s.id}
                        className={
                          s.id === specificationId ? "table-active" : undefined
                        }
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setSpecificationId(s.id);
                          setShowDefinitions(false);
                        }}
                      >
                        <td>
                          <button
                            type="button"
                            className="btn btn-link p-0"
                            aria-label={t("ringSpecificationSelect", {
                              name: s.name,
                            })}
                          >
                            {s.name}
                          </button>
                        </td>
                        <td>{s.type_code.name}</td>
                        <td>{s.variant.name}</td>
                        <td>{s.material.name}</td>
                        <td>{s.diameter}</td>
                        <td>{s.thickness}</td>
                        <td>{s.height}</td>
                        <td>{s.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
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
              selectedSeries && endNumber !== null ? (
                <>
                  {format("ringSequenceFormLastNumber", {
                    number: (
                      <RingNumber
                        value={formatRingNumber(selectedSeries, endNumber)}
                      />
                    ),
                  })}
                </>
              ) : undefined
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
    </>
  );
}
