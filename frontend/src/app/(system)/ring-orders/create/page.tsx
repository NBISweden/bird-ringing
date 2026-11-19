"use client";

import { useTranslation } from "../../internationalization";

export default function RingOrderCreateView() {
  const { t } = useTranslation();

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
