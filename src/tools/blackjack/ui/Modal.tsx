import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

/** A thin wrapper over the native <dialog>, which gives us Esc-to-close and focus trapping for free. */
export default function Modal({ open, title, onClose, children, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={wide ? "modal modal--wide" : "modal"}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()} // click the backdrop to close
      aria-label={title}
    >
      <div className="modal__head">
        <h2 className="modal__title">{title}</h2>
        <button className="modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="modal__body">{children}</div>
    </dialog>
  );
}
