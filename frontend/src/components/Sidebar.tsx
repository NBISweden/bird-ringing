"use client";

import { AuthContext } from "@/app/(system)/contexts";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useContext, useState } from "react";
import nrmLogo from "../resources/nrm-logo-liggande-svensk-fullfarg.png";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { useIntl } from "react-intl";

export type NavItem =
  | {
      type: "item";
      label: string;
      href: string;
      id: string;
      icon: string;
      permissions?: string[];
    }
  | { type: "separator" }
  | { type: "heading"; label: string };

export type Acknowledgement = {
  text?: string;
  localeVariants?: Record<
    string,
    {
      text?: string;
      alt: string;
    }
  >;
  image: {
    alt: string;
    width: number;
    height: number;
    src: string | StaticImport;
  };
};

const defaultAcknowledgements: Acknowledgement[] = [
  {
    text: "This system has been built on behalf of the Bird Ringing Centre at the Swedish Museum of Natural History (NRM).",
    localeVariants: {
      sv: {
        text: "Detta system har byggts på uppdrag av Ringmärkningscentralen vid Naturhistoriska riksmuseet (NRM).",
        alt: "Naturhistoriska riksmuseets logotyp",
      },
    },
    image: {
      src: nrmLogo,
      alt: "Logo of Swedish Museum of Natural History (NRM)",
      width: 951,
      height: 215,
    },
  },
];

function localizeAcknowledgement(
  acknowledgement: Acknowledgement,
  locale: string,
): Omit<Acknowledgement, "localeVariants"> {
  const localeVariant = acknowledgement.localeVariants
    ? acknowledgement.localeVariants[locale]
    : undefined;

  return localeVariant
    ? {
        image: {
          ...acknowledgement.image,
          alt: localeVariant.alt,
        },
        text: localeVariant.text,
      }
    : acknowledgement;
}

export default function Sidebar({
  items,
  acknownledgements,
}: {
  items: NavItem[];
  acknownledgements?: Acknowledgement[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const auth = useContext(AuthContext);
  const permissionsSet = new Set(auth === null ? [] : auth.permissions);
  const intl = useIntl();
  acknownledgements =
    acknownledgements === undefined
      ? defaultAcknowledgements
      : acknownledgements;

  return (
    <div
      className={`bg-primary bg-opacity-25 border-end sidebar h-100 overflow-auto d-flex flex-column ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      <nav className={`d-flex flex-column flex-grow-1`}>
        <button
          className="btn btn-link text-secondary align-self-end me-2 mt-2"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand menu" : "Collapse menu"}
        >
          <i
            className={`bi ${collapsed ? "bi-chevron-right" : "bi-chevron-left"} fs-4`}
          ></i>
        </button>
        <ul className="nav nav-pills flex-column p-3 flex-grow-1">
          {items.map((ni, index) => {
            if (ni.type === "item") {
              const isActive = pathname === ni.href;
              const isEnabled = permissionsSet.isSupersetOf(
                new Set(ni.permissions || []),
              );
              return (
                <li key={index} className="nav-item">
                  <Link
                    href={ni.href}
                    className={`nav-link ${isActive ? "active" : ""} ${isEnabled ? "" : "disabled"} d-flex align-items-center`}
                  >
                    <i className={`bi ${ni.icon} fs-5 me-2`}></i>
                    <span className="nav-label">
                      <span className="nav-label-content">
                        {ni.label}
                        {!isEnabled ? (
                          <i className={`bi bi-lock fs-5 ms-2`}></i>
                        ) : (
                          <></>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            } else if (ni.type === "separator") {
              return (
                <li key={index}>
                  <hr />
                </li>
              );
            } else if (ni.type === "heading") {
              return (
                <li key={index} className="nav-item">
                  <h3 className="fs-5">{ni.label}</h3>
                </li>
              );
            }
          })}
        </ul>
      </nav>
      {!collapsed && acknownledgements ? (
        <div className="flex-shrink-0 d-flex flex-column gap-3 m-3 mb-5 delayed-show">
          {acknownledgements
            .map((ack) => localizeAcknowledgement(ack, intl.locale))
            .map((ack, index) => (
              <React.Fragment key={index}>
                <hr className="my-0" />
                <Image
                  src={ack.image.src}
                  width={ack.image.width}
                  height={ack.image.height}
                  alt={ack.image.alt}
                  className="w-100 h-auto"
                />
                {ack.text ? <div>{ack.text}</div> : <></>}
              </React.Fragment>
            ))}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}
