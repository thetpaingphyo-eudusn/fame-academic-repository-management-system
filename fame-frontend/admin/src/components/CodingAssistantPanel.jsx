import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import { toDisplayText } from "../utils/fameBrand";
import { compressDesignImage } from "../utils/compressDesignImage";
import {
  AlertCircle,
  Bug,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  History,
  ImagePlus,
  Lightbulb,
  Loader2,
  Paperclip,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

const FRONTEND_LANGUAGES = [
  { id: "html", label: "HTML + CSS + JS" },
  { id: "react", label: "React" },
  { id: "vue", label: "Vue 3" },
  { id: "tailwind", label: "Tailwind CSS" },
  { id: "angular", label: "Angular" },
];

const MODES = [
  { id: "generate", label: "Build UI", icon: Sparkles, placeholder: "Describe the UI or page you want to build..." },
  { id: "debug", label: "Debug Error", icon: Bug, placeholder: "Paste error message, console log, or describe what fails..." },
  { id: "fix", label: "Fix Bug", icon: AlertCircle, placeholder: "What is broken? Steps to reproduce, expected vs actual..." },
  { id: "explain", label: "Explain", icon: Lightbulb, placeholder: "What should I explain about this code or error?" },
];

const buildPreviewDocument = ({ html = "", css = "", javascript = "" }) =>
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="referrer" content="no-referrer" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <style>${css}</style>
</head>
<body>
${html}
<script>${javascript}<\/script>
</body>
</html>`;

const extractPreviewFromFiles = (files) => {
  const find = (patterns) => files.find((f) => patterns.some((p) => f.name.toLowerCase().includes(p)))?.content || "";
  let html = find([".html", "index.html", "template"]);
  let css = find([".css", "styles", "style"]);
  const javascript = find([".js", ".jsx", ".ts", ".tsx", "script"]);

  if (/<html[\s>]/i.test(html)) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) html = bodyMatch[1].trim();
    if (!css) {
      const styleFromDoc = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
        || (find([".html"]) || "").match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      if (styleFromDoc) css = styleFromDoc[1];
    }
  }
  const fullHtml = find([".html", "index.html"]);
  if (!css && fullHtml) {
    const styleFromHead = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (styleFromHead) css = styleFromHead[1];
  }

  html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, "");

  return { html, css, javascript };
};

const formatWhen = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const BTN = {
  base: "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed",
  sm: "h-9 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  icon: "h-9 w-9 p-0",
  iconMd: "h-9 w-9 p-0",
};

const CodingAssistantPanel = ({ role = "admin", accent = "violet" }) => {
  const fileInputRef = useRef(null);
  const previewWindowRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [showHistory, setShowHistory] = useState(true);
  const [mode, setMode] = useState("generate");
  const [designFile, setDesignFile] = useState(null);
  const [designPreview, setDesignPreview] = useState("");
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("html");
  const [generatedLanguage, setGeneratedLanguage] = useState("");
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [issues, setIssues] = useState([]);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [copied, setCopied] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState("code");

  const theme = useMemo(() => {
    const map = {
      blue: { soft: "bg-blue-50", border: "border-blue-100", text: "text-blue-700", btn: "bg-blue-600 hover:bg-blue-700", ring: "focus:ring-blue-200", active: "bg-blue-600 text-white", hist: "bg-blue-50 text-blue-800" },
      emerald: { soft: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700", ring: "focus:ring-emerald-200", active: "bg-emerald-600 text-white", hist: "bg-emerald-50 text-emerald-800" },
      violet: { soft: "bg-violet-50", border: "border-violet-100", text: "text-violet-700", btn: "bg-violet-600 hover:bg-violet-700", ring: "focus:ring-violet-200", active: "bg-violet-600 text-white", hist: "bg-violet-50 text-violet-800" },
    };
    return map[accent] || map.blue;
  }, [accent]);

  const selectedLanguage = FRONTEND_LANGUAGES.find((l) => l.id === language) || FRONTEND_LANGUAGES[0];
  const selectedMode = MODES.find((m) => m.id === mode) || MODES[0];
  const languageChanged = generatedLanguage && generatedLanguage !== language;

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/ai/coding-sessions");
      setHistory(res.data?.data || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const buildCurrentPreview = (fileList = files) => {
    const meta = extractPreviewFromFiles(fileList);
    if (meta.html && String(meta.css || "").trim().length > 50) {
      return buildPreviewDocument(meta);
    }
    return previewHtml || buildPreviewDocument(meta);
  };

  const applyGenerated = (data, apiWarning = "", sessionId = null) => {
    const nextFiles = Array.isArray(data.files) ? data.files : [];
    setFiles(nextFiles);
    setActiveFile(nextFiles[0]?.name || "");
    setIssues(
      (Array.isArray(data.issues) ? data.issues : []).map((issue) => ({
        ...issue,
        title: toDisplayText(issue.title),
        detail: toDisplayText(issue.detail),
      }))
    );
    setExplanation(toDisplayText(data.explanation || ""));
    setWarning(apiWarning || "");
    const doc =
      data.previewDocument ||
      buildPreviewDocument({
        html: data.html || extractPreviewFromFiles(nextFiles).html,
        css: data.css || extractPreviewFromFiles(nextFiles).css,
        javascript: data.javascript || extractPreviewFromFiles(nextFiles).javascript,
      });
    setPreviewHtml(doc);
    const lang = data.language || language;
    setLanguage(lang);
    setGeneratedLanguage(lang);
    if (sessionId) setActiveSessionId(sessionId);
    if (data.issues?.length) setWorkspaceTab("issues");
    else if (doc) setWorkspaceTab("preview");
    else setWorkspaceTab("code");
    loadHistory();
  };

  const loadSession = async (id) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/ai/coding-sessions/${id}`);
      const s = res.data?.data;
      if (!s) return;
      setActiveSessionId(s._id);
      setMode(s.mode || "generate");
      setPrompt(s.prompt || "");
      setLanguage(s.language || "html");
      setGeneratedLanguage(s.language || "html");
      setFiles(s.files || []);
      setActiveFile(s.files?.[0]?.name || "");
      setIssues(
        (s.issues || []).map((issue) => ({
          ...issue,
          title: toDisplayText(issue.title),
          detail: toDisplayText(issue.detail),
        }))
      );
      setExplanation(toDisplayText(s.explanation || ""));
      setPreviewHtml(s.previewHtml || buildPreviewDocument(s.previewMeta || {}));
      setWarning("");
      setWorkspaceTab(s.issues?.length ? "issues" : s.previewHtml ? "preview" : "code");
    } catch {
      setError("Could not load session.");
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.delete(`/ai/coding-sessions/${id}`);
      if (activeSessionId === id) setActiveSessionId(null);
      loadHistory();
    } catch {
      setError("Could not delete session.");
    }
  };

  const newSession = () => {
    setActiveSessionId(null);
    setPrompt("");
    setFiles([]);
    setActiveFile("");
    setIssues([]);
    setExplanation("");
    setPreviewHtml("");
    setWarning("");
    setError("");
    setDesignFile(null);
    setDesignPreview("");
    setWorkspaceTab("code");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImagePick = async (file) => {
    if (!file?.type?.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setError("");
    try {
      const compressed = await compressDesignImage(file);
      setDesignFile(compressed);
      const reader = new FileReader();
      reader.onload = (e) => setDesignPreview(e.target?.result || "");
      reader.readAsDataURL(compressed);
    } catch {
      setError("Could not process image.");
    }
  };

  const runAssistant = async () => {
    if (!prompt.trim() && !designFile && mode === "generate") {
      setError("Type a prompt or attach a design image.");
      return;
    }
    if (!prompt.trim() && ["debug", "fix", "explain"].includes(mode)) {
      setError("Describe the error, bug, or what to explain.");
      return;
    }
    setLoading(true);
    setError("");
    setWarning("");
    try {
      let res;
      const payload = { prompt, language, mode, existingFiles: files };
      if (designFile) {
        const formData = new FormData();
        formData.append("designImage", designFile);
        formData.append("prompt", prompt || "Recreate this design exactly.");
        formData.append("language", language);
        formData.append("mode", mode);
        formData.append("existingFiles", JSON.stringify(files));
        res = await api.post("/ai/design-to-code", formData, { headers: { "Content-Type": "multipart/form-data" }, timeout: 180000 });
      } else {
        res = await api.post("/ai/prompt-to-code", payload, { timeout: 180000 });
      }
      applyGenerated(res.data?.data || {}, toDisplayText(res.data?.warning || ""), res.data?.sessionId || null);
    } catch (err) {
      setError(err.response?.data?.message || "Request failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateActiveFileContent = (content) => {
    setFiles((prev) => prev.map((f) => (f.name === activeFile ? { ...f, content } : f)));
  };

  const openInBrowser = () => {
    const doc = buildCurrentPreview(files) || previewHtml;
    if (!doc) return;
    const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.location.href = url;
    } else {
      previewWindowRef.current = window.open(url, "_blank", "noopener,noreferrer");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const copyAllCode = async () => {
    await navigator.clipboard.writeText(files.map((f) => `// ${f.name}\n${f.content}`).join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadCode = () => {
    const doc = buildCurrentPreview(files) || previewHtml;
    const blob = new Blob([doc || files.map((f) => f.content).join("\n\n")], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc ? "generated-ui.html" : `code-${language}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeContent = files.find((f) => f.name === activeFile)?.content || "";
  const hasPreview = !!buildCurrentPreview(files);

  const issueIcon = (type) => {
    if (type === "error") return <AlertCircle size={14} className="text-rose-500 shrink-0" />;
    if (type === "warning") return <AlertCircle size={14} className="text-amber-500 shrink-0" />;
    return <Lightbulb size={14} className="text-blue-500 shrink-0" />;
  };

  return (
    <div className="flex gap-3 h-[min(860px,90vh)] min-h-0">
      {/* History sidebar */}
      <aside className={`${showHistory ? "flex" : "hidden"} lg:flex flex-col w-56 shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`}>
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <History size={14} /> History
          </span>
          <button
            type="button"
            onClick={newSession}
            className={`${BTN.base} ${BTN.icon} rounded-lg ${theme.soft} ${theme.text} ${theme.ring}`}
            title="New session"
            aria-label="New session"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {historyLoading ? (
            <p className="text-xs text-gray-400 text-center py-4">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4 px-2">No saved sessions yet</p>
          ) : (
            history.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => loadSession(item._id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors group ${
                  activeSessionId === item._id ? `${theme.hist} border-current` : "border-transparent hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-gray-800 line-clamp-2">{item.title || "Untitled"}</p>
                  <button
                    type="button"
                    onClick={(e) => deleteSession(item._id, e)}
                    className={`${BTN.base} h-7 w-7 shrink-0 rounded-md opacity-70 group-hover:opacity-100 text-gray-400 hover:text-rose-500 hover:bg-rose-50`}
                    aria-label="Delete session"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1 capitalize">{item.mode} · {item.language}</p>
                <p className="text-xs text-gray-400">{formatWhen(item.updatedAt)}</p>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main workspace */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`${BTN.base} ${BTN.sm} border ${
                    mode === m.id ? `${theme.active} border-transparent shadow-sm` : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  } ${theme.ring}`}
                >
                  <Icon size={14} /> {m.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className={`lg:hidden ml-auto ${BTN.base} ${BTN.icon} border border-gray-200 text-gray-600 hover:bg-gray-50 ${theme.ring}`}
              aria-label="Toggle history"
            >
              <History size={14} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`text-xs border border-gray-200 rounded-lg px-2.5 h-9 bg-gray-50 sm:w-40 shrink-0 focus:outline-none focus:ring-2 ${theme.ring}`}
            >
              {FRONTEND_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>{lang.label}</option>
              ))}
            </select>
            <div className="flex-1 flex gap-2 min-w-0">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                placeholder={selectedMode.placeholder}
                className={`flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 ${theme.ring}`}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) runAssistant(); }}
              />
              {mode === "generate" && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`${BTN.base} ${BTN.iconMd} shrink-0 border ${theme.border} ${theme.soft} ${theme.text} ${theme.ring}`}
                  aria-label="Attach design image"
                  title="Attach design image"
                >
                  <Paperclip size={16} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={runAssistant}
              disabled={loading}
              className={`${BTN.base} ${BTN.md} shrink-0 self-start text-white font-medium ${theme.btn} ${theme.ring}`}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              Run
            </button>
          </div>

          {languageChanged && files.length > 0 && (
            <p className={`text-xs rounded-lg px-3 py-2 ${theme.soft} ${theme.text}`}>
              Language changed — click Run to regenerate in {selectedLanguage.label}.
            </p>
          )}
          {designPreview && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
              <img src={designPreview} alt="Design preview" className="h-10 w-14 object-cover rounded border" />
              <span className="text-xs text-gray-600 flex-1 truncate">{designFile?.name}</span>
              <button
                type="button"
                onClick={() => { setDesignFile(null); setDesignPreview(""); }}
                className={`${BTN.base} h-7 w-7 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100`}
                aria-label="Remove design image"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e.target.files?.[0])} />
          {warning && <p className="text-sm rounded-lg px-3 py-2 bg-amber-50 text-amber-800 border border-amber-100">{toDisplayText(warning)}</p>}
          {error && <p className="text-sm text-rose-600">{toDisplayText(error)}</p>}
          {explanation && !error && !warning && <p className={`text-xs rounded-lg px-3 py-2 ${theme.soft} ${theme.text}`}>{toDisplayText(explanation)}</p>}
        </div>

        {/* Canvas */}
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/80 flex-wrap">
            <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-lg">
              {[
                { id: "code", label: "Code", icon: Code2 },
                { id: "preview", label: "Preview", icon: Eye },
                { id: "issues", label: `Issues${issues.length ? ` (${issues.length})` : ""}`, icon: Bug },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === "preview") setPreviewHtml(buildCurrentPreview(files));
                    setWorkspaceTab(tab.id);
                  }}
                  className={`${BTN.base} h-8 px-3 text-xs rounded-md ${
                    workspaceTab === tab.id ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
                  } ${theme.ring}`}
                >
                  <tab.icon size={14} /> {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {workspaceTab === "preview" && hasPreview && (
                <button
                  type="button"
                  onClick={openInBrowser}
                  className={`${BTN.base} ${BTN.sm} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 ${theme.ring}`}
                >
                  <ExternalLink size={14} /> Open
                </button>
              )}
              {files.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={copyAllCode}
                    className={`${BTN.base} ${BTN.sm} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 ${theme.ring}`}
                  >
                    <Copy size={14} /> {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={downloadCode}
                    className={`${BTN.base} ${BTN.sm} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 ${theme.ring}`}
                  >
                    <Download size={14} /> Save
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {workspaceTab === "code" && (
              <div className="flex flex-col h-full min-h-[320px]">
                {files.length > 0 && (
                  <div className="flex gap-1 px-3 py-1.5 border-b border-gray-100 overflow-x-auto">
                    {files.map((file) => (
                      <button
                        key={file.name}
                        type="button"
                        onClick={() => setActiveFile(file.name)}
                        className={`${BTN.base} h-7 px-2.5 text-xs rounded-md whitespace-nowrap ${
                          activeFile === file.name ? `${theme.soft} ${theme.text} font-medium` : "text-gray-500 hover:bg-gray-50"
                        } ${theme.ring}`}
                      >
                        {file.name}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  value={activeContent}
                  onChange={(e) => updateActiveFileContent(e.target.value)}
                  spellCheck={false}
                  className="flex-1 w-full font-mono text-[13px] p-4 bg-[#1e1e1e] text-[#d4d4d4] focus:outline-none resize-none"
                  placeholder={files.length ? "" : `${selectedMode.label}: ${selectedLanguage.label} code appears here...`}
                  readOnly={!files.length}
                />
              </div>
            )}

            {workspaceTab === "preview" && (
              <div className="h-full min-h-[320px]">
                {hasPreview ? (
                  <iframe title="Preview" srcDoc={buildCurrentPreview(files)} className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                    <ImagePlus size={28} className="mb-2" />
                    <p className="text-sm">Run assistant to see preview canvas</p>
                  </div>
                )}
              </div>
            )}

            {workspaceTab === "issues" && (
              <div className="h-full min-h-[320px] overflow-y-auto p-4 space-y-2">
                {issues.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Bug size={28} className="mb-2" />
                    <p className="text-sm">No issues yet</p>
                    <p className="text-xs mt-1">Use Debug Error or Fix Bug mode to analyze problems</p>
                  </div>
                ) : (
                  issues.map((issue, idx) => (
                    <div key={idx} className="flex gap-2 p-3 rounded-lg border border-gray-100 bg-gray-50/80">
                      {issueIcon(issue.type)}
                      <div>
                        <p className="text-sm font-medium text-gray-800">{toDisplayText(issue.title || "Issue")}</p>
                        <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{toDisplayText(issue.detail)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingAssistantPanel;
