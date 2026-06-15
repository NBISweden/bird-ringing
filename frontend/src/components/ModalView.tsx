"use client";
import { useModalsContext } from "@/app/(system)/contexts";
import {
  DetailedHTMLProps,
  HTMLAttributes,
  useCallback,
  useId,
  useRef,
  useState,
  useEffect,
} from "react";

export function ModalView() {
  const modals = useModalsContext();
  const modal = modals.stack[0] || null;
  const [isOpen, setIsOpen] = useState(false);
  const modalId = useId();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(
    (action?: () => void) => {
      action = action ? action : modal && modal.closeAction;
      const currentRef = modalRef.current;
      const prefersReducedMotion = matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (currentRef) {
        const handleStack = () => {
          if (!prefersReducedMotion) {
            currentRef.removeEventListener("transitionend", handleStack);
          }
          if (modal) {
            if (action) {
              action();
            }
            modals.remove(modal);
          }
        };
        setIsOpen(false);
        if (prefersReducedMotion) {
          handleStack();
        } else {
          currentRef.addEventListener("transitionend", handleStack);
        }
      }
    },
    [modal, modals, setIsOpen, modalRef],
  );

  useEffect(() => {
    if (modal) {
      const setOpen = async () => {
        setIsOpen(true);
      };
      setOpen();
    }
  }, [modal, setIsOpen]);

  // Move focus into the dialog when it opens, and restore it to the element
  // that opened the modal (the trigger) when it closes.
  useEffect(() => {
    if (!modal) {
      return;
    }
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [modal]);

  // Close on Escape and keep Tab focus trapped within the dialog.
  useEffect(() => {
    if (!modal) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modal, handleClose]);

  const modalProps: DetailedHTMLProps<
    HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > = modal
    ? {
        "aria-modal": "true",
        role: "dialog",
      }
    : {
        "aria-hidden": "true",
      };
  const style = modal ? { display: "block" } : { display: "none" };

  return modal ? (
    <div
      ref={modalRef}
      className={`modal fade ${isOpen ? "show" : ""}`}
      tabIndex={-1}
      aria-labelledby={modalId}
      style={style}
      {...modalProps}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h1 className="modal-title fs-5" id={modalId}>
              {modal.title}
            </h1>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => handleClose()}
            ></button>
          </div>
          <div className="modal-body">{modal?.content}</div>
          <div className="modal-footer">
            {modal.actions.map((action, index) => (
              <button
                key={index}
                type="button"
                className={`btn btn-${action.type || "primary"} ms-2`}
                onClick={() => handleClose(action.action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <></>
  );
}
