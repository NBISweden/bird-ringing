"use client";

import { LicensePermission } from "@/app/system/common";
import { useTranslation } from "@/app/system/internationalization";
type LicensePermissionItemProps = {
  permission: LicensePermission;
};

export function LicensePermissionItem({
  permission,
}: LicensePermissionItemProps) {
  const { format } = useTranslation();
  return (
    <>
      <div className="pb-2">
        <strong>{permission.type.name}</strong>
        {permission.type.description ? (
          <p>{permission.type.description}</p>
        ) : (
          " "
        )}
      </div>
      <div className="row mb-3">
        <div className="col-12 col-lg-6">
          {permission.location && (
            <div className="py-1">
              <i className="bi bi-geo-alt text-primary me-1" />{" "}
              {permission.location}
            </div>
          )}
          {(permission.starts_at || permission.ends_at) && (
            <div className="py-1 d-flex">
              <i className="bi bi-calendar2-week text-primary me-2" />
              {permission.starts_at && permission.ends_at ? (
                <p className="m-0">
                  {format("licensePermissionPeriodClosed", {
                    startsAt: permission.starts_at,
                    endsAt: permission.ends_at,
                    from: (chunks) => (
                      <span className="fst-italic">{chunks}</span>
                    ),
                    to: (chunks) => (
                      <span className="fst-italic mx-1">{chunks}</span>
                    ),
                  })}
                </p>
              ) : !permission.starts_at ? (
                <p className="m-0">
                  {format("licensePermissionPeriodOpenBackward", {
                    endsAt: permission.ends_at,
                    to: (chunks) => (
                      <span className="fst-italic">{chunks}</span>
                    ),
                  })}
                </p>
              ) : !permission.ends_at ? (
                <p className="m-0">
                  {format("licensePermissionPeriodOpenForward", {
                    startsAt: permission.starts_at,
                    from: (chunks) => (
                      <span className="fst-italic">{chunks}</span>
                    ),
                  })}
                </p>
              ) : (
                <></>
              )}
            </div>
          )}
          {permission.species.length > 0 && (
            <div className="py-1">
              <i className="bi bi-twitter text-primary me-1" />{" "}
              {permission.species.join(", ")}
            </div>
          )}
          {permission.description && (
            <div className="pt-3">{permission.description}</div>
          )}
        </div>
        <div className="col-12 col-lg-6 py-3 py-lg-0">
          {permission.properties.length > 0 && (
            <div>
              {permission.properties.map((p, i) => (
                <div key={i}>
                  <p className="my-1 fst-italic">&bull; {p.name}</p>

                  {p.description && <p className="my-1">{p.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
