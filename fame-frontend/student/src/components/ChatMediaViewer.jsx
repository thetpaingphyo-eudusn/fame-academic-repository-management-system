import React, { useEffect } from "react";
import { X, Download, ExternalLink, FileText, Image as ImageIcon, Film } from "lucide-react";

export const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const typeIcon = (type) => {
  if (type === "image") return ImageIcon;
  if (type === "video") return Film;
  return FileText;
};

const ChatMediaViewer = ({ item, onClose, accentClass = "text-emerald-600" }) => {
  useEffect(() => {
    if (!item) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [item, onClose]);

  if (!item) return null;

  const Icon = typeIcon(item.type);
  const isImage = item.type === "image";
  const isVideo = item.type === "video";

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Media preview"
    >
      <div className="flex items-center gap-2 p-3 sm:p-4 text-white shrink-0 border-b border-white/10">
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-medium truncate">{item.fileName || "Attachment"}</p>
          <p className="text-[11px] sm:text-xs text-white/60 truncate">
            {[item.senderName, item.size ? formatFileSize(item.size) : null, item.mimeType]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={item.url}
            download={item.fileName}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg hover:bg-white/10"
            title="Download"
          >
            <Download size={18} />
          </a>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg hover:bg-white/10 hidden sm:block"
            title="Open in new tab"
          >
            <ExternalLink size={18} />
          </a>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" title="Close">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 p-3 sm:p-6 overflow-auto">
        {isImage && (
          <img
            src={item.url}
            alt={item.fileName || "Image"}
            className="max-w-full max-h-full object-contain rounded-lg select-none"
          />
        )}
        {isVideo && (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-lg w-full sm:w-auto"
            playsInline
          />
        )}
        {!isImage && !isVideo && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-xl">
            <div className={`inline-flex p-4 rounded-2xl bg-gray-100 mb-4 ${accentClass}`}>
              <Icon size={40} />
            </div>
            <p className="font-semibold text-gray-900 break-all">{item.fileName || "File"}</p>
            {item.size && <p className="text-sm text-gray-500 mt-1">{formatFileSize(item.size)}</p>}
            {item.mimeType && <p className="text-xs text-gray-400 mt-0.5">{item.mimeType}</p>}
            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <a
                href={item.url}
                download={item.fileName}
                className="flex-1 px-4 py-2.5 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-800"
              >
                Download
              </a>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 px-4 py-2.5 border text-sm rounded-xl hover:bg-gray-50"
              >
                Open file
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMediaViewer;
