import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import FameThinking from "./FameThinking";
import { FAME, toDisplayText } from "../utils/fameBrand";
import { normalizeChatRoute } from "../utils/chatLinks";
import { Send, User, ExternalLink, Plus, Search, MessageSquare, ArrowLeft, Shield, Trash2, BarChart3 } from "lucide-react";
import DeleteChatModal from "./DeleteChatModal";
import ChatChart from "./ChatChart";

const renderInline = (text, keyPrefix) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-b-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return part.split("\n").map((line, j, arr) => (
      <React.Fragment key={`${keyPrefix}-l-${i}-${j}`}>
        {line}
        {j < arr.length - 1 ? <br /> : null}
      </React.Fragment>
    ));
  });
};

const AssistantContent = ({ content, linkClass }) => {
  if (!content) return null;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const nodes = [];
  let lastIndex = 0;
  let match;
  let idx = 0;

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={`t-${idx++}`}>{renderInline(content.slice(lastIndex, match.index), `t-${idx}`)}</span>
      );
    }
    const path = normalizeChatRoute(match[2]);
    nodes.push(
      <Link key={`l-${idx++}`} to={path} className={linkClass}>
        {match[1]}
        <ExternalLink size={11} />
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    nodes.push(<span key={`t-${idx}`}>{renderInline(content.slice(lastIndex), "full")}</span>);
  }

  return <>{nodes.length ? nodes : renderInline(content, "full")}</>;
};

const formatTime = (v) =>
  v ? new Date(v).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";


export const STUDENT_ASSISTANT_THEME = {
  accent: "text-emerald-600",
  btn: "bg-emerald-500 hover:bg-emerald-600",
  btnOutline: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
  selected: "bg-emerald-50 border-l-emerald-500",
  newChatActive: "bg-emerald-500 text-white",
  bubbleUser: "bg-emerald-500 text-white rounded-br-md",
  bubbleBot: "bg-white border border-gray-100 text-gray-700 rounded-bl-md shadow-sm",
  iconBg: "bg-emerald-100 text-emerald-600",
  chip: "bg-emerald-50 text-emerald-700 border-emerald-100",
  link: "text-emerald-600 hover:text-emerald-800 underline font-medium inline-flex items-center gap-0.5",
  linkPill: "bg-emerald-50 text-emerald-700 border-emerald-100",
  ring: "focus:ring-emerald-300",
  headerGrad: "from-emerald-50/60",
  border: "border-emerald-100",
  spinner: "text-emerald-500",
};

const buildWelcome = (role) => ({
  role: "assistant",
  content:
    role === "teacher"
      ? `Hi! I'm **${FAME}**. Ask about **your courses**, **assignments**, **students**, and **projects** — English or Myanmar.\n\n**Database facts** come from your data; **advice & explanations** use general knowledge when retrieval has no match. Turn on **Chart mode** (📊) for graphs.`
      : `Hi! I'm **${FAME}**. Ask about **your courses**, **assignments**, **projects**, and **grades** — English or Myanmar.\n\n**Database facts** from your records; **tips & advice** from general knowledge when needed. Chart mode (📊) for graphs.`,
  links: [],
});

const SCOPE_CHIPS = {
  teacher: ["My courses", "My assignments", "My students", "Their projects"],
  student: ["My courses", "My assignments", "My projects", "My grades"],
};

const PLACEHOLDERS = {
  teacher: "Ask about your courses, assignments, students, or projects...",
  student: "Ask about your courses, assignments, projects, or grades...",
};

const CHART_CHIPS = {
  teacher: ["Project status chart", "Grade distribution chart", "Students by year chart"],
  student: ["My grades chart", "Project status chart", "My courses chart"],
};

const FameDevAssistant = ({ role = "student", theme = STUDENT_ASSISTANT_THEME }) => {
  const welcome = buildWelcome(role);
  const [sessions, setSessions] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [messages, setMessages] = useState([welcome]);
  const [sessionId, setSessionId] = useState(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [chartMode, setChartMode] = useState(false);
  const bottomRef = useRef(null);

  const loadSessions = async () => {
    setLoadingList(true);
    try {
      const res = await api.get("/rag/chat/sessions", {
        params: { page: 1, limit: 50, search: search.trim() || undefined },
      });
      setSessions(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, loadingChat]);

  const startNewChat = () => {
    setSelectedId(null);
    setSelectedTitle("");
    setSessionId(null);
    setMessages([welcome]);
    setMobileShowChat(true);
  };

  const requestDeleteSession = (session, e) => {
    e?.stopPropagation?.();
    setDeleteModal({
      mode: "single",
      session,
      title: "Delete this chat?",
      message: `Remove "${session.title || "Chat"}" from your history? This cannot be undone.`,
    });
  };

  const requestDeleteAll = () => {
    setDeleteModal({
      mode: "all",
      title: "Delete all chats?",
      message: `Remove all ${sessions.length} conversation(s) from your history? This cannot be undone.`,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      if (deleteModal.mode === "all") {
        await api.delete("/rag/chat/sessions");
        startNewChat();
      } else {
        const id = deleteModal.session?._id;
        await api.delete(`/rag/chat/sessions/${id}`);
        if (selectedId === id) startNewChat();
      }
      setDeleteModal(null);
      await loadSessions();
    } catch (error) {
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  const openSession = async (summary) => {
    setSelectedId(summary._id);
    setSelectedTitle(summary.title || "Chat");
    setLoadingChat(true);
    setMobileShowChat(true);
    try {
      const res = await api.get(`/rag/chat/sessions/${summary._id}`);
      const session = res.data.data;
      setSessionId(session._id);
      setSelectedTitle(session.title || "Chat");
      setMessages(
        session.messages?.length
          ? session.messages.map((m) => ({
              role: m.role,
              content: toDisplayText(m.content),
              links: m.links || [],
              charts: m.charts || [],
            }))
          : [welcome]
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChat(false);
    }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
    setMessages((prev) => [...prev, { role: "user", content: trimmed, links: [] }]);
    setInput("");
    setSending(true);
    setMobileShowChat(true);

    try {
      const res = await api.post("/rag/chat", {
        message: trimmed,
        history: history.slice(-10),
        sessionId,
        chartMode,
      });
      const data = res.data.data || {};
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setSelectedId(data.sessionId);
        if (!selectedTitle) setSelectedTitle(trimmed.slice(0, 60));
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: toDisplayText(data.answer || "No response."),
          links: data.links || [],
          charts: data.charts || [],
        },
      ]);
      loadSessions();
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: toDisplayText(error.response?.data?.message || "Failed to respond."), links: [] },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`flex flex-col md:flex-row bg-white rounded-xl sm:rounded-2xl border ${theme.border} shadow-sm overflow-hidden h-[calc(100dvh-10rem)] sm:h-[min(720px,78vh)] min-h-[480px]`}>
      <div className={`${mobileShowChat ? "hidden md:flex" : "flex"} w-full md:w-64 lg:w-72 flex-col bg-gray-50 shrink-0 min-h-0`}>
        <div className="p-2.5 sm:p-3 border-b border-gray-100 space-y-2 shrink-0">
          <button
            type="button"
            onClick={startNewChat}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              !selectedId && mobileShowChat ? theme.newChatActive : `bg-white border ${theme.btnOutline}`
            }`}
          >
            <Plus size={16} /> New chat
          </button>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadSessions()}
              placeholder="Search chats..."
              className="w-full pl-8 py-2 border border-gray-200 rounded-lg text-xs bg-white"
            />
          </div>
        </div>
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 shrink-0">Your history</p>
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingList ? (
            <div className="flex justify-center py-10"><FameThinking size="sm" /></div>
          ) : sessions.length === 0 ? (
            <p className="text-center text-gray-400 text-xs py-10 px-3">No past chats yet</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s._id}
                className={`group flex items-stretch border-b border-gray-100/80 hover:bg-white ${
                  selectedId === s._id ? `bg-white border-l-2 ${theme.selected}` : ""
                }`}
              >
                <button type="button" onClick={() => openSession(s)} className="flex-1 min-w-0 text-left px-3 py-2.5">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.title || "Chat"}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatTime(s.lastMessageAt)}</p>
                </button>
                <button
                  type="button"
                  onClick={(e) => requestDeleteSession(s, e)}
                  className="px-2.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0"
                  aria-label={`Delete ${s.title || "chat"}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
        {sessions.length > 0 && (
          <div className="p-2 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={requestDeleteAll}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={13} /> Clear all history
            </button>
          </div>
        )}
      </div>

      <div className={`${mobileShowChat ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0 min-h-0`}>
        <div className={`px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 bg-gradient-to-r ${theme.headerGrad} to-white shrink-0`}>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMobileShowChat(false)} className="md:hidden p-2 -ml-1 rounded-lg hover:bg-white/80" aria-label="Back">
              <ArrowLeft size={18} />
            </button>
            <MessageSquare size={16} className={`${theme.accent} shrink-0`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 truncate">{selectedId ? selectedTitle : "New conversation"}</p>
              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                <Shield size={10} /> {FAME} · role-based access
              </p>
            </div>
            {selectedId && (
              <button
                type="button"
                onClick={() => requestDeleteSession({ _id: selectedId, title: selectedTitle })}
                className="p-2 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 shrink-0"
                aria-label="Delete current chat"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setChartMode((v) => !v)}
              className={`p-2 rounded-lg shrink-0 transition-colors ${
                chartMode ? `${theme.btn} text-white` : "text-gray-400 hover:bg-white/80"
              }`}
              title={chartMode ? "Chart mode on" : "Chart mode off"}
              aria-label="Toggle chart mode"
              aria-pressed={chartMode}
            >
              <BarChart3 size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2 pl-0 md:pl-6">
            {(SCOPE_CHIPS[role] || []).map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setInput(chip)}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${theme.chip} hover:opacity-80`}
              >
                {chip}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5 pl-0 md:pl-6">
            {(CHART_CHIPS[role] || []).map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setChartMode(true);
                  setInput(chip);
                }}
                className={`text-[10px] px-2 py-0.5 rounded-full border border-dashed ${theme.chip} hover:opacity-80 inline-flex items-center gap-1`}
              >
                <BarChart3 size={10} /> {chip}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-gray-50/40 min-h-0">
          {loadingChat ? (
            <div className="flex justify-center py-16"><FameThinking /></div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src="/fame-logo.png" alt="FAME" className="w-6 h-6 object-contain" />
                  </div>
                )}
                <div className="max-w-[88%] sm:max-w-[80%] flex flex-col gap-1">
                  <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? theme.bubbleUser : theme.bubbleBot}`}>
                    {msg.role === "user" ? msg.content : <AssistantContent content={msg.content} linkClass={theme.link} />}
                  </div>
                  {msg.role === "assistant" && msg.links?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-1">
                      {msg.links.map((link) => (
                        <Link key={`${link.path}-${link.label}`} to={normalizeChatRoute(link.path)} className={`text-[10px] px-2 py-0.5 rounded-full border ${theme.linkPill}`}>
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                  {msg.role === "assistant" && msg.charts?.map((chart) => (
                    <ChatChart key={chart.id} chart={chart} theme="emerald" />
                  ))}
                </div>
                {msg.role === "user" && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                    <User size={15} />
                  </div>
                )}
              </div>
            ))
          )}
          {sending && <FameThinking size="sm" className="px-1" />}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="p-2 sm:p-3 border-t border-gray-100 flex gap-1.5 sm:gap-2 bg-white shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              chartMode
                ? "Ask for a chart or graph from your data..."
                : PLACEHOLDERS[role] || "Ask a question..."
            }
            className={`flex-1 min-w-0 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 ${theme.ring}`}
            disabled={sending}
          />
          <button type="submit" disabled={sending || !input.trim()} className={`px-3 sm:px-4 py-2.5 text-white rounded-xl disabled:opacity-50 shrink-0 ${theme.btn}`}>
            {sending ? (
              <img src="/fame-logo.png?v=2" alt="" className="w-5 h-5 object-contain animate-pulse" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </form>
      </div>

      <DeleteChatModal
        open={!!deleteModal}
        onClose={() => !deleting && setDeleteModal(null)}
        onConfirm={handleConfirmDelete}
        title={deleteModal?.title}
        message={deleteModal?.message}
        confirmLabel={deleteModal?.mode === "all" ? "Delete all" : "Delete chat"}
        loading={deleting}
      />
    </div>
  );
};

export default FameDevAssistant;
