type DropDownMenuProps = {
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
  actions: (
    | {
        label: string;
        action: () => void;
      }
    | {
        label: string;
        disabled: true;
      }
    | {
        type: "divider";
      }
  )[];
};

export function DropDownMenu({
  isOpen,
  setIsOpen,
  actions,
}: DropDownMenuProps) {
  return (
    <ul
      className={`dropdown-menu action-menu ${isOpen ? "show" : ""}`}
      data-open={isOpen}
      onClick={() => setIsOpen(false)}
    >
      {actions.map((action, index) =>
        "type" in action ? (
          <li key={index}>
            <hr className="dropdown-divider" />
          </li>
        ) : (
          <li key={index}>
            <span
              className={`dropdown-item ${"disabled" in action ? "disabled" : ""}`}
              onClick={() => !("disabled" in action) && action.action()}
            >
              {action.label}
            </span>
          </li>
        ),
      )}
    </ul>
  );
}
