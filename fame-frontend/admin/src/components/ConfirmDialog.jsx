import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const ConfirmDialogView = ({ dialog, onClose }) => {
  useEffect(() => {
    if (!dialog) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialog, onClose]);

  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => onClose(false)}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start gap-3 p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="text-lg font-semibold text-gray-900">{dialog.title}</h2>
            <p id="confirm-message" className="mt-1 text-sm leading-6 text-gray-600">{dialog.message}</p>
          </div>
          <button type="button" onClick={() => onClose(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close confirmation">
            <X size={18} />
          </button>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button type="button" onClick={() => onClose(false)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {dialog.cancelLabel}
          </button>
          <button type="button" autoFocus onClick={() => onClose(true)} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const useConfirmDialog = () => {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const close = useCallback((confirmed) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options = {}) => new Promise((resolve) => {
    resolverRef.current?.(false);
    resolverRef.current = resolve;
    setDialog({
      title: options.title || "Please confirm",
      message: options.message || "Are you sure you want to continue?",
      confirmLabel: options.confirmLabel || "Confirm",
      cancelLabel: options.cancelLabel || "Cancel",
    });
  }), []);

  useEffect(() => () => resolverRef.current?.(false), []);

  const ConfirmDialog = useCallback(
    () => <ConfirmDialogView dialog={dialog} onClose={close} />,
    [dialog, close]
  );

  return { confirm, ConfirmDialog };
};

