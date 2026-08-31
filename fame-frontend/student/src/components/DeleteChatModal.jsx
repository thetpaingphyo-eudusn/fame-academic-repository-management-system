import React from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

const DeleteChatModal = ({
  open,
  onClose,
  onConfirm,
  title = "Delete chat?",
  message = "This conversation will be permanently removed from your history.",
  confirmLabel = "Delete chat",
  loading = false,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={loading ? undefined : onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-emerald-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-chat-title"
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-5 py-4 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-100 text-rose-600">
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

        <div className="px-5 py-5">
          <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        </div>

        <div className="border-t border-gray-100 px-5 py-4 flex gap-3 bg-gray-50/90">
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
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-50"
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
