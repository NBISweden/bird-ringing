"use client";

import { AuthContext } from "@/app/system/contexts";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useState } from "react";

export type NavItem = (
    {type: "item", label: string, href: string, id: string, icon: string, permissions?: string[]} |
    {type: "separator"} |
    {type: "heading", label: string}
)

export default function Sidebar({items}: {items: NavItem[]}) {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();
    const auth = useContext(AuthContext);
    const permissionsSet = new Set(auth === null ? [] : auth.permissions);

    return (
        <nav
            className={`bg-primary bg-opacity-25 border-end sidebar d-md-flex flex-column h-100 overflow-auto ${
                collapsed ? "sidebar-collapsed" : ""
            }`}
        >
            <button
                className="btn btn-link text-secondary align-self-end me-2 mt-2"
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? "Expand menu" : "Collapse menu"}
            >
                <i className={`bi ${collapsed ? "bi-chevron-right" : "bi-chevron-left"} fs-4`}></i>
            </button>
            <ul className="nav nav-pills flex-column p-3 flex-grow-1">
                {items.map((ni, index) => {
                    if (ni.type === "item") {
                        const isActive = pathname === ni.href;
                        const isEnabled = permissionsSet.isSupersetOf(new Set(ni.permissions || []));
                        return (
                            <li key={index} className="nav-item">
                                <Link href={ni.href} className={`nav-link ${isActive ? "active" : ""} ${isEnabled ? "" : "disabled"} d-flex align-items-center`}>
                                    <i className={`bi ${ni.icon} fs-5 me-2`}></i>
                                    <span className="nav-label"><span className="nav-label-content">{ni.label}</span></span>
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
