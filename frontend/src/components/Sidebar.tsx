"use client";

import Link from "next/link";
import { useState } from "react";

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <nav
            className={`bg-primary bg-opacity-25 border-end sidebar d-md-flex flex-column ${
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
            <ul className="nav flex-column p-3 flex-grow-1">
                <li className="nav-item">
                    <Link href="/" className="nav-link d-flex align-items-center">
                        <i className="bi bi-speedometer fs-5 text-secondary me-2"></i>
                        {!collapsed && "Dashboard"}
                    </Link>
                </li>
                <li className="nav-item">
                    <Link href="/" className="nav-link d-flex align-items-center">
                        <i className="bi bi-journal-check fs-5 text-secondary me-2"></i>
                        {!collapsed && "Licenses"}
                    </Link>
                </li>
                <li className="nav-item">
                    <Link href="/" className="nav-link d-flex align-items-center">
                        <i className="bi bi-person-lines-fill fs-5 text-secondary me-2"></i>
                        {!collapsed && "Ringers"}
                    </Link>
                </li>
            </ul>
        </nav>
    );
}
