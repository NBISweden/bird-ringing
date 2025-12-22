"use client";

import { LanguageDict, useCurrentLanguage } from "@/app/language";
import Link from "next/link";
import { useState } from "react";

export type NavItem = (
    {type: "item", label?: string, href: string, id: string, icon: string} |
    {type: "separator"} |
    {type: "heading", label: string}
)

export default function Sidebar({items}: {items: NavItem[]}) {
    const [collapsed, setCollapsed] = useState(false);
    const {dict} = useCurrentLanguage()

    return (
        <nav
            className={`bg-primary bg-opacity-25 border-end sidebar d-md-flex flex-column h-100 overflow-auto ${
                collapsed ? "sidebar-collapsed" : ""
            }`}
        >
            <button
                className="btn btn-link text-secondary align-self-end me-2 mt-2"
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? dict.actions.expandMenu : dict.actions.collapseMenu}
            >
                <i className={`bi ${collapsed ? "bi-chevron-right" : "bi-chevron-left"} fs-4`}></i>
            </button>
            <ul className="nav flex-column p-3 flex-grow-1">
                {items.map((ni, index) => {
                    if (ni.type === "item") {
                        const isActive = false;
                        const id = ni.id in dict.terms ? ni.id as keyof LanguageDict["terms"] : undefined;
                        return (
                            <li key={index} className="nav-item">
                                <Link href={ni.href} className="nav-link d-flex align-items-center">
                                    <i className={`bi ${ni.icon} fs-5 text-secondary me-2`}></i>
                                    <span className="nav-label"><span className="nav-label-content">{ni.label || (id !== undefined ? dict.terms[id] : id)}</span></span>
                                </Link>
                            </li>
                        )
                    } else if (ni.type === "separator") {
                        return <li key={index}><hr /></li>
                    } else if (ni.type === "heading") {
                        return <li key={index} className="nav-item"><h3 className="fs-5">{ni.label}</h3></li>
                    }
                })}
            </ul>
        </nav>
    );
}
