import { ReadonlyURLSearchParams } from 'next/navigation';
import React from "react";

export type ActorBase = {
  id: number,
  full_name: string,
  first_name: string,
  last_name: string,
  type: string,
  sex: string,
  birth_date: string,
  language: string,
  phone_number1: string,
  phone_number2: string,
  email: string,
  alternative_email: string,
  address: string,
  co_address: string,
  postal_code: string,
  city: string,
  country: string,
  updated_at: string,
}

export type ActorListItem = ActorBase & {
  current_license_relations: ActorLicenseRelation[],
}

export type ActorLicenseRelation = {
  license_id: number;
  mnr: string;
  role: string;
  mednr: string;
}

export type Role = string;

export type PagedResponse<T> = {
  count: number;
  num_pages: number,
  next: string | null;
  previous: string | null;
  results: T[]
}

export type Page = {
  href: string | null;
  rel: string;
}

export type TableItem<P extends string = string> = {
  id: string,
  properties: Record<P, {component: React.ReactNode}>
}

export function hrefWithParams(pathname: string, params?: ReadonlyURLSearchParams, page?: number | string, search?: string, ordering?: string) {
  const updatedParams = new URLSearchParams(params)
  if (page) {
    updatedParams.set("page", String(page))
  }
  if (search) {
    updatedParams.set("search", search)
  }
  if (ordering) {
    updatedParams.set("ordering", ordering)
  }
  return `${pathname}?${updatedParams.toString()}`
}

export function getPageNumber(href: string): number {
  const url = new URL(href);
  const page = url.searchParams.get("page");
  return page ? parseInt(page) : 1
}

export function getPages<T>(pathname: string, params: ReadonlyURLSearchParams, pageData: PagedResponse<T>): Page[] {
  const pages: Page[] = [
    {
      rel: "Första",
      href: hrefWithParams(pathname, params, 1),
    },
    {
      rel: "Föregående",
      href: pageData.previous ? hrefWithParams(pathname, params, getPageNumber(pageData.previous)) : null,
    },
    ...Array.from({length: pageData.num_pages}).map<Page>((_, index) => {
      return {
        rel: String(index + 1),
        href: hrefWithParams(pathname, params, index + 1)
      }
    }),
    {
      rel: "Nästa",
      href: pageData.next ? hrefWithParams(pathname, params, getPageNumber(pageData.next)) : null,
    },
    {
      rel: "Sista",
      href: hrefWithParams(pathname, params, pageData.num_pages),
    }
  ];
  return pages;
}

export type LicenseListItem = {
    mnr: string;
    current: LicenseCurrent;
    status: string;
    license_holder: string;
    methods: string;
    last_email_sent_at: string;
}

export type LicenseCurrent = {
    actors: LicenseActorRelation[];
    version: number;
    location: string;
    description: string;
    report_status: number;
}

export type LicenseActorRelation = {
    actor: ActorBase;
    role: string;
    mednr?: string;
}

export type ButtonType = (
  "primary" |
  "secondary" |
  "success" |
  "warning" |
  "danger" |
  "info" |
  "light" |
  "dark"
)

export function convertDateToLocale(dateStr: string){
    if(dateStr){
        return new Date(dateStr).toLocaleString('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23'
        });
    } else {
        return "-";
    }
}
