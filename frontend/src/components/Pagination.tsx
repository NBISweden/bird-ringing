import { useTranslation } from "@/app/system/internationalization";
import Link from "next/link";
import { useMemo, useState } from "react";

export type Page = {
  href: string | null;
  onClick?: () => void;
  rel: string;
};

export function usePagination<T>(
  items: T[],
  pageSize: number = 10,
  config: {
    useEndPages?: boolean;
    disableForSinglePage?: boolean;
    useRelativePages?: boolean;
  } = {},
) {
  const { t } = useTranslation();
  const [pageNumber, setPageNumber] = useState<number>(0);
  const pageItems = useMemo(
    () => items.slice(pageNumber * pageSize, pageNumber * pageSize + pageSize),
    [pageNumber, pageSize, items],
  );
  const numPages = Math.ceil(items.length / pageSize);
  const pages = Array.from({ length: numPages }).map<Page>((_, index) => ({
    href: String(index + 1),
    onClick: () => setPageNumber(index),
    rel: String(index + 1),
  }));
  const noPages = config.disableForSinglePage && numPages <= 1;
  const useEndPages =
    config.useEndPages === undefined ? true : config.useEndPages;
  const useRelativePages =
    config.useRelativePages === undefined ? true : config.useRelativePages;

  return {
    items: pageItems,
    currentPage: String(pageNumber + 1),
    pages: noPages
      ? []
      : [
          ...(useEndPages
            ? [
                {
                  href: pages.length > 0 ? String(1) : null,
                  onClick:
                    pages.length > 0 ? () => setPageNumber(0) : undefined,
                  rel: t("paginationFirst"),
                },
              ]
            : []),
          ...(useRelativePages
            ? [
                {
                  href: pageNumber - 1 >= 0 ? String(pageNumber) : null,
                  onClick:
                    pageNumber - 1 >= 0
                      ? () => setPageNumber(pageNumber - 1)
                      : undefined,
                  rel: t("paginationPrevious"),
                },
              ]
            : []),
          ...pages,
          ...(useRelativePages
            ? [
                {
                  href:
                    pages.length > pageNumber + 1
                      ? String(pageNumber + 2)
                      : null,
                  onClick:
                    pages.length > pageNumber + 1
                      ? () => setPageNumber(pageNumber + 1)
                      : undefined,
                  rel: t("paginationNext"),
                },
              ]
            : []),
          ...(useEndPages
            ? [
                {
                  href: pages.length > 0 ? String(pages.length) : null,
                  onClick:
                    pages.length > 0
                      ? () => setPageNumber(pages.length - 1)
                      : undefined,
                  rel: t("paginationLast"),
                },
              ]
            : []),
        ],
  };
}

export const Pagination = ({
  pages,
  currentPage,
  label,
}: {
  pages: Page[];
  currentPage?: string;
  label?: string;
}) => {
  const hidden = pages.length === 0;
  return hidden ? (
    <></>
  ) : (
    <nav aria-label={label || "Pagination"}>
      <ul className="pagination overflow-auto">
        {pages.map((page, index) => (
          <li
            key={index}
            className={`page-item ${page.href === currentPage ? "active" : ""}`}
          >
            {page.onClick ? (
              <div className="page-link" onClick={page.onClick}>
                {page.rel}
              </div>
            ) : page.href ? (
              <Link className="page-link" href={page.href}>
                {page.rel}
              </Link>
            ) : (
              <a className="page-link disabled">{page.rel}</a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};
