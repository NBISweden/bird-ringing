"use client";

import { useRef, useState } from "react";
import { useTranslation } from "../../internationalization";
import { useRingSeries, useRingSpecifications } from "../../hooks";
import { Accordion } from "@/components/Accordion";
import { Alert } from "@/components/Alert";
import { TextArea, VerticalField } from "@/components/InputFields";
import {
  formatRingSequence,
  RingSequenceCartLine,
  RingSequenceEntryForm,
} from "@/components/RingSequenceEntryForm";

export default function RingOrderCreateView() {
  const { t } = useTranslation();
  const series = useRingSeries();
  const specifications = useRingSpecifications();
  const [cart, setCart] = useState<RingSequenceCartLine[]>([]);
  const [note, setNote] = useState("");
  const nextKey = useRef(0);

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
              {loadError ? (
                <Alert type="danger">{t("ringOrderLoadError")}</Alert>
              ) : null}
              <Accordion
                items={{
                  definitions: {
                    header: t("ringSpecificationDefinitionsTitle"),
                    content: (
                      <div className="table-responsive">
                        <table className="table mb-0">
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
                            {specifications.data.map((s) => (
                              <tr key={s.id}>
                                <td>{s.name}</td>
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
                    ),
                  },
                }}
              />
              <RingSequenceEntryForm
                series={series.data}
                specifications={specifications.data}
                cart={cart}
                disabled={isLoading}
                onAdd={(line) => {
                  const key = nextKey.current++;
                  setCart((prev) => [...prev, { ...line, key }]);
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
                      {cart.map((line) => {
                        const sequence = formatRingSequence(
                          line.series,
                          line.startNumber,
                          line.startNumber + line.quantity - 1,
                        );
                        return (
                          <tr key={line.key}>
                            <td>{sequence}</td>
                            <td>{line.specification.name}</td>
                            <td>{line.quantity}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-link p-0"
                                aria-label={t("ringOrderCartRemove", {
                                  sequence,
                                })}
                                onClick={() =>
                                  setCart((prev) =>
                                    prev.filter((l) => l.key !== line.key),
                                  )
                                }
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
              <VerticalField
                label={t("ringOrderFormNote")}
                id="ring-order-note"
              >
                <TextArea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </VerticalField>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
