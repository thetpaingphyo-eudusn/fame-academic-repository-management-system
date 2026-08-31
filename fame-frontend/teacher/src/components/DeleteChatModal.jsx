import React from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

const VARIANTS = {
  emerald: {
    iconBg: "bg-rose-100 text-rose-600",
    confirmBtn: "bg-rose-500 hover:bg-rose-600 focus:ring-rose-300",
    accentBorder: "border-emerald-100",
  },
  violet: {
    iconBg: "bg-rose-100 text-rose-600",
    confirmBtn: "bg-rose-500 hover:bg-rose-600 focus:ring-rose-300",
    accentBorder: "border-violet-100",
  },
};

const DeleteChatModal = ({
  open,
  onClose,
  onConfirm,
  title = "Delete chat?",
  message = "This conversation will be permanently removed from your history.",
  confirmLabel = "Delete chat",
  loading = false,
  variant = "emerald",
}) => {
  if (!open) return null;

  const styles = VARIANTS[variant] || VARIANTS.emerald;

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onClose} role="presentation">
      <div
        className={`modal-panel max-w-md border ${styles.accentBorder}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-chat-title"
      >
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg}`}>
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0">
              <h3 id="delete-chat-title" className="text-base font-semibold text-gray-900 truncate">
                {title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${styles.confirmBtn}`}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteChatModal;
