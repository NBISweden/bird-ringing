"use client";

import { PropsWithChildren, useState } from "react";

export type AccordionEntry = {
  header: React.ReactNode;
  content: React.ReactNode;
};

function AccordionItem({
  expanded,
  defaultExpanded,
  onExpandedChange,
  children,
  header,
}: PropsWithChildren<{
  header: React.ReactNode;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (e: boolean) => void;
}>) {
  const [isExpanded, setIsExpanded] = useState<boolean>(!!defaultExpanded);
  const actualIsExpanded = expanded === undefined ? isExpanded : expanded;
  return (
    <div className="accordion-item">
      <h3 className="accordion-header">
        <button
          type="button"
          className={`accordion-button ${actualIsExpanded ? "" : "collapsed"} px-lg-5`}
          onClick={
            onExpandedChange
              ? () => onExpandedChange(!actualIsExpanded)
              : () => setIsExpanded(!actualIsExpanded)
          }
          aria-expanded={actualIsExpanded}
        >
          {header}
        </button>
      </h3>
      <div
        className={`accordion-collapse collapse ${actualIsExpanded ? "show" : ""}`}
      >
        <div className="accordion-body px-5">{children}</div>
      </div>
    </div>
  );
}

export function Accordion({
  defaultItem,
  items,
}: {
  defaultItem?: string;
  items: Record<string, AccordionEntry>;
}) {
  const [currentItem, setCurrentItem] = useState<string | null>(
    defaultItem || null,
  );

  return (
    <div className="accordion mb-3">
      {Object.entries(items).map(([id, item]) => (
        <AccordionItem
          header={item.header}
          expanded={currentItem === id}
          onExpandedChange={(e) =>
            e ? setCurrentItem(id) : setCurrentItem(null)
          }
          key={id}
        >
          {item.content}
        </AccordionItem>
      ))}
    </div>
  );
}
