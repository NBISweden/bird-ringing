import Link from "next/link";

export type Page = {
  href: string | null;
  rel: string;
}

export const Pagination = (
  {pages, currentPage, label, pageCount}: {
    pages: Page[],
    currentPage?: string,
    label?: string,
    pageCount?: number
  }
) => {
  const first: Page = pages.filter(p => p.rel === "first")[0]
  const last: Page = pages.filter(p => p.rel === "last")[0]
  const otherPages = pages.filter(p => !["first", "last"].includes(p.rel))
  const pageList = [
    ...(first === undefined ? [] : [{...first, rel: "First"}]),
    ...otherPages,
    ...(last === undefined ? [] : [{...last, rel: pageCount ? `Last (${pageCount})` : "Last"}])
  ]
  return (
    <nav aria-label={label || "Pagination"}>
      <ul className="pagination">
        {pageList.map((page, index) => (
          <li key={index} className={`page-item ${ page.href === currentPage ? "active" : "" }`}>
            {page.href ? <Link className="page-link" href={page.href}>{page.rel}</Link> : <a className="page-link disabled">{page.rel}</a>}
          </li>
        ))}
      </ul>
    </nav>
  )
}
