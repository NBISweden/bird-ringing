"use client"
import { useState, CSSProperties, useMemo } from "react";
import Link from "next/link";
import { useItemSelections, useFilter, SearchableItem } from "@/app/system/hooks";

import useSWR from 'swr';
import { License, PagedResponse } from '../common'

const fetcher = async (url: string): Promise<PagedResponse> => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error('Error response status');
  }

  return res.json();
}

const getPagedLicenses = (page: number) => {
  const { data, error } = useSWR(`http://localhost:3210/api/license_sequence/?page=${page}`, fetcher);

  return {
    data: data?.results,
    count: data?.count,
    numPages: data?.num_pages,
    nextPage: data?.next,
    previousPage: data?.previous,
    isLoading: !error && !data,
    isError: error,
  }
}

const dropdownOpenStyle: CSSProperties = {
  position: "absolute",
  inset: "0px 0px auto auto",
  margin: "0px",
  transform: "translate(0px, 40px)",
}

export default function ListView() {
  const [actionIsOpen, setActionIsOpen] = useState(false);

  const { data: licenses, isLoading, isError } = getPagedLicenses(1)
  const loadingElement = <div>Loading...</div>
  const errorElement = <div>Error loading licenses</div>

  const items = (licenses || []).map<SearchableItem>(item => {
    const licenseHolderInfo = item.current.actors.find(r => r.role === "ringer");
    const licenseHolder = licenseHolderInfo ? licenseHolderInfo.actor : undefined;
    return {
      id: item.mnr,
      properties: {
        "Mnr": {
          term: item.mnr,
          component: <Link href={`/bird-ringing/license-view/?entryId=${item.mnr}`}>{item.mnr}</Link>
        },
        "Type": {
          term: licenseHolder?.type,
          component: licenseHolder?.type,
        },
        "License holder": {
          term: licenseHolder?.full_name,
          component: licenseHolder?.full_name,
        },
        "Number of helpers": {
          term: String(item.current.actors?.length),
          component: String(item.current.actors?.length)
        },
        "License version": {
          term: String(item.current?.version),
          component: String(item.current?.version),
        },
        "Final Report Status": {
          term: String(item.current?.report_status),
          component: String(item.current?.report_status),
        },
      }
    }
  })
  const {filter, setFilter, filteredItems} = useFilter(items)
  const {
    selectedItems,
    toggleItems,
    handleItemSelection,
    allSelected
  } = useItemSelections(new Set(filteredItems.map(r => r.id)));
  const columns = [
    "Mnr",
    "Type",
    "License holder",
    "Number of helpers",
    "License version",
    "Final Report Status",
  ]

  // moved these two lines here so that hooks are rendered first
  if(isLoading) return loadingElement;
  if(isError) return errorElement;

  return (
    <div className="container">
      <h2>License List View</h2>
      <div className="input-group mb-3">
        <span className="input-group-text">Filter</span>
        <input
          type="text"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="form-control"
          placeholder={columns.join(", ")}
          aria-label="Filter for license table"
          aria-describedby="basic-addon1"
        />
      </div>
      <div className="input-group mb-3">
        <button className="btn btn-outline-secondary" type="button" onClick={toggleItems}>{allSelected ? "Select None" : "Select All"}</button>
        <span className="input-group-text flex-grow-1" >{selectedItems.size} of {items.length} selected</span>
        <button className="btn btn-outline-secondary dropdown-toggle" onClick={() => setActionIsOpen(!actionIsOpen)} type="button" aria-expanded={actionIsOpen}>Batch action</button>
        <ul className={`dropdown-menu ${actionIsOpen ? "show" : ""}`} style={actionIsOpen ? dropdownOpenStyle : {}} onClick={() => setActionIsOpen(false)}>
          <li><a className="dropdown-item" href="#">Send license</a></li>
          <li><a className="dropdown-item" href="#">Generate new license</a></li>
          <li><a className="dropdown-item" href="#">Download licenses</a></li>
          <li><hr className="dropdown-divider" /></li>
          <li><a className="dropdown-item" href="#">Disable</a></li>
          <li><a className="dropdown-item" href="#">Enable</a></li>
        </ul>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th scope="col"></th>
            {columns.map(c => <th key={c} scope="col">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {filteredItems.map(item => {
            console.log(item.id)
            return (
              <tr key={item.id}>
                <th><input type="checkbox" onChange={handleItemSelection} checked={selectedItems.has(item.id)} data-actor-id={item.id}/></th>
                {columns.map(c => <td key={c}>{item.properties[c].component}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
