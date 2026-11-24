"use client";

import { useRef, useState } from "react";
import { useTranslation } from "../../internationalization";
import { AlertModal, useClient, useModalsContext } from "../../contexts";
import {
  useFormSubmission,
  useRingColors,
  useRingSeries,
  useRingSpecifications,
} from "../../hooks";
import { FormErrors, RingOrderInput } from "../../common";
import { Alert } from "@/components/Alert";
import { FieldErrors, TextArea, VerticalField } from "@/components/InputFields";
import { RingNumber } from "@/components/RingNumber";
import {
  formatRingSequence,
  RingSequenceCartLine,
  RingSequenceEntryForm,
} from "@/components/RingSequenceEntryForm";

function getLineErrors(errors: FormErrors | undefined, index: number) {
  return Object.entries(errors?.fields || {})
    .filter(([field]) => field.startsWith(`sequences.${index}.`))
    .flatMap(([, messages]) => messages);
}

// Errors that are not tied to a cart line or to the note.
function getGeneralErrors(errors: FormErrors | undefined) {
  return [
    ...(errors?.nonField || []),
    ...Object.entries(errors?.fields || {})
      .filter(([field]) => field !== "note" && !/^sequences\.\d+\./.test(field))
      .flatMap(([, messages]) => messages),
  ];
}

export default function RingOrderCreateView() {
  const { t } = useTranslation();
  const client = useClient();
  const series = useRingSeries();
  const specifications = useRingSpecifications();
  const colors = useRingColors();
  const modals = useModalsContext();
  const [cart, setCart] = useState<RingSequenceCartLine[]>([]);
  const [note, setNote] = useState("");
  const nextKey = useRef(0);

  const { submit, isSubmitting, errors, reset } = useFormSubmission(
    (order: RingOrderInput) => client.createRingOrder(order),
    async (response) => {
      const order = await response;
      modals.add(
        AlertModal(
          t("ringOrderCreateSuccessTitle"),
          <>
            <p>{t("ringOrderCreateSuccessMessage", { id: order.id })}</p>
            <ul className="mb-0">
              {order.sequences.map((sequence) => (
                <li key={sequence.id}>
                  <RingNumber
                    value={formatRingSequence(
                      sequence.series,
                      sequence.start_number,
                      sequence.end_number,
                    )}
                  />{" "}
                  ({sequence.specification.name}, {sequence.quantity})
                </li>
              ))}
            </ul>
          </>,
          t("closeModal"),
        ),
      );
      setCart([]);
      setNote("");
    },
    (errors) => {
      const lines = getGeneralErrors(errors);
      if (lines.length > 0) {
        modals.add(
          AlertModal(
            t("ringOrderCreateErrorTitle"),
            lines.length > 1 ? (
              <ul className="mb-0">
                {lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="mb-0">{lines[0]}</p>
            ),
            t("closeModal"),
          ),
        );
      }
    },
  );
  const generalErrors = getGeneralErrors(errors);

  const isLoading = series.isLoading || specifications.isLoading;
  const loadError = series.error || specifications.error;

  return (
    <div className="container">
      <div className="row ">
        <div className="col-12 col-xl-10 col-xxl-9">
          <div className="card">
            <div className="card-header">
              <h3 className="m-0">{t("ringOrderFormAddTitle")}</h3>
            </div>
            <div className="card-body">
              <p>{t("ringOrderFormIntro")}</p>
              {generalErrors.length > 0 ? (
                <Alert type="danger">
                  {generalErrors.length === 1 ? (
                    <p className="mb-0">{generalErrors[0]}</p>
                  ) : (
                    <ul className="mb-0">
                      {generalErrors.map((message, i) => (
                        <li key={i}>{message}</li>
                      ))}
                    </ul>
                  )}
                </Alert>
              ) : null}
              {loadError ? (
                <Alert type="danger">{t("ringOrderLoadError")}</Alert>
              ) : null}
              <RingSequenceEntryForm
                series={series.data}
                specifications={specifications.data}
                colors={colors.data}
                cart={cart}
                disabled={isLoading || isSubmitting}
                onAdd={(line) => {
                  const key = nextKey.current++;
                  setCart((prev) => [...prev, { ...line, key }]);
                  reset();
                }}
                onCreateSeries={async (values) => {
                  const created = await client.createRingSeries(values);
                  await series.mutate();
                  return created;
                }}
              />
              {cart.length > 0 ? (
                <div className="table-responsive mt-4">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t("ringOrderCartSequence")}</th>
                        <th>{t("ringSequenceFormSpecification")}</th>
                        <th>{t("ringSequenceFormQuantity")}</th>
                        <th>{t("ringOrderCartActions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((line, index) => {
                        const sequence = formatRingSequence(
                          line.series,
                          line.startNumber,
                          line.startNumber + line.quantity - 1,
                        );
                        const lineErrors = getLineErrors(errors, index);
                        return (
                          <tr
                            key={line.key}
                            className={
                              lineErrors.length > 0 ? "table-danger" : undefined
                            }
                          >
                            <td>
                              <RingNumber value={sequence} />
                              {lineErrors.map((message, i) => (
                                <div key={i} className="small text-danger">
                                  {message}
                                </div>
                              ))}
                            </td>
                            <td>{line.specification.name}</td>
                            <td>{line.quantity}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-link p-0"
                                aria-label={t("ringOrderCartRemove", {
                                  sequence,
                                })}
                                disabled={isSubmitting}
                                onClick={() => {
                                  setCart((prev) =>
                                    prev.filter((l) => l.key !== line.key),
                                  );
                                  reset();
                                }}
                              >
                                <i className="bi bi-trash" aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted mt-4">
                  {t("ringOrderCartEmpty")}
                </p>
              )}
              <FieldErrors errors={{ "ring-order-note": errors?.fields.note }}>
                <VerticalField
                  label={t("ringOrderFormNote")}
                  id="ring-order-note"
                >
                  <TextArea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={isSubmitting}
                  />
                </VerticalField>
              </FieldErrors>
              <div className="d-flex justify-content-center">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={() =>
                    submit({
                      note,
                      sequences: cart.map((line) => ({
                        series_id: line.series.id,
                        specification_id: line.specification.id,
                        start_number: line.startNumber,
                        quantity: line.quantity,
                      })),
                    })
                  }
                >
                  {t("ringOrderFormSubmit")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
