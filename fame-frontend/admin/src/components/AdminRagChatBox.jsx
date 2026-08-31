import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import FameThinking from "./FameThinking";
import { FAME, sourceLabel, toDisplayText } from "../utils/fameBrand";
import { normalizeChatRoute } from "../utils/chatLinks";
import {
  Bot,
  Send,
  Loader2,
  User,
  ExternalLink,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  BarChart3,
} from "lucide-react";
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

const AssistantContent = ({ content }) => {
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
      <Link
        key={`l-${idx++}`}
        to={path}
        className="text-violet-600 hover:text-violet-800 underline font-medium inline-flex items-center gap-0.5"
      >
        {match[1]}
        <ExternalLink size={11} />
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    nodes.push(<span key={`t-${idx}`}>{renderInline(content.slice(lastIndex), `t-${idx}`)}</span>);
  }

  return <>{nodes.length ? nodes : renderInline(content, "full")}</>;
};

const formatTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const WELCOME = {
  role: "assistant",
  content: `Hi! Ask in English or Myanmar — ${FAME} with links and **charts** from your data. Toggle **Chart mode** (📊) or ask for a graph.`,
  links: [],
};

const CHART_CHIPS = [
  "Project status chart",
  "Grade distribution chart",
  "Students by department chart",
  "Top grades chart",
];

const AdminRagChatBox = () => {
  const [sessions, setSessions] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [messages, setMessages] = useState([WELCOME]);
  const [sessionId, setSessionId] = useState(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSource, setLastSource] = useState(null);
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
    } catch (error) {
      console.error("Failed to load sessions:", error);
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
    setMessages([WELCOME]);
    setLastSource(null);
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
      console.error("Failed to delete chat:", error);
    } finally {
      setDeleting(false);
    }
  };

  const openSession = async (summary) => {
    setSelectedId(summary._id);
    setSelectedTitle(summary.title || "Chat");
    setLoadingChat(true);
    try {
      const res = await api.get(`/rag/chat/sessions/${summary._id}`);
      const session = res.data.data;
      setSessionId(session._id);
      setSelectedTitle(session.title || "Chat");
      setMessages(
        session.messages?.length
          ? session.messages.map((m) => ({
              role: m.role,
              content: m.content,
              links: m.links || [],
              charts: m.charts || [],
              source: m.source,
            }))
          : [WELCOME]
      );
    } catch (error) {
      console.error("Failed to load session:", error);
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

    try {
      const response = await api.post("/rag/chat", {
        message: trimmed,
        history: history.slice(-10),
        sessionId,
        chartMode,
      });
      const data = response.data.data || {};
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setSelectedId(data.sessionId);
        if (!selectedTitle || selectedTitle === "New conversation") {
          setSelectedTitle(trimmed.slice(0, 60));
        }
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: toDisplayText(data.answer || "No response."),
          links: data.links || [],
          charts: data.charts || [],
          source: data.source,
        },
      ]);
      setLastSource(data.source);
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
    <div className="flex bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden h-[min(720px,80vh)]">
      <div className="w-64 lg:w-72 border-r border-gray-100 flex flex-col bg-gray-50/80 shrink-0">
        <div className="p-3 border-b border-gray-100 space-y-2">
          <button
            type="button"
            onClick={startNewChat}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              !selectedId ? "bg-violet-500 text-white" : "bg-white border border-violet-200 text-violet-700 hover:bg-violet-50"
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
              placeholder="Search your chats..."
              className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg text-xs bg-white"
            />
          </div>
        </div>

        <div className="px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Your chat history</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex justify-center py-10">
              <FameThinking size="sm" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-center text-gray-400 text-xs py-10 px-3">No past chats yet — start a new conversation</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s._id}
                className={`group flex items-stretch border-b border-gray-100/80 hover:bg-white transition-colors ${
                  selectedId === s._id ? "bg-white border-l-2 border-l-violet-500" : ""
                }`}
              >
                <button type="button" onClick={() => openSession(s)} className="flex-1 min-w-0 text-left px-3 py-2.5">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.title || "Chat"}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatTime(s.lastMessageAt)}</p>
                </button>
                <button
                  type="button"
                  onClick={(e) => requestDeleteSession(s, e)}
                  className="px-2.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
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

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50/60 to-white shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <MessageSquare size={16} className="text-violet-600 shrink-0" />
                {selectedId ? selectedTitle : "New conversation"}
              </p>
              <p className="text-[10px] text-gray-500">FAME Assistant · {FAME}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {lastSource && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    lastSource === "gemini-rag" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {sourceLabel(lastSource)}
                </span>
              )}
              <button
                type="button"
                onClick={() => setChartMode((v) => !v)}
                className={`p-2 rounded-lg transition-colors ${
                  chartMode ? "bg-violet-500 text-white" : "text-gray-400 hover:bg-violet-50 hover:text-violet-600"
                }`}
                title={chartMode ? "Chart mode on" : "Chart mode off"}
                aria-label="Toggle chart mode"
                aria-pressed={chartMode}
              >
                <BarChart3 size={16} />
              </button>
              {selectedId && (
                <button
                  type="button"
                  onClick={() => requestDeleteSession({ _id: selectedId, title: selectedTitle })}
                  className="p-2 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50"
                  aria-label="Delete current chat"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {CHART_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setChartMode(true);
                  setInput(chip);
                }}
                className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 inline-flex items-center gap-1"
              >
                <BarChart3 size={10} /> {chip}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/40">
          {loadingChat ? (
            <div className="flex justify-center py-16">
              <FameThinking />
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-white border border-violet-100 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src="/fame-logo.png" alt="FAME" className="w-6 h-6 object-contain" />
                  </div>
                )}
                <div className="max-w-[80%] flex flex-col gap-1">
                  <div
                    className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-violet-500 text-white rounded-br-md"
                        : "bg-white border border-gray-100 text-gray-700 rounded-bl-md shadow-sm"
                    }`}
                  >
                    {msg.role === "user" ? msg.content : <AssistantContent content={msg.content} />}
                  </div>
                  {msg.role === "assistant" && msg.links?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-1">
                      {msg.links.map((link) => (
                        <Link
                          key={`${link.path}-${link.label}`}
                          to={normalizeChatRoute(link.path)}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                  {msg.role === "assistant" && msg.charts?.map((chart) => (
                    <ChatChart key={chart.id} chart={chart} />
                  ))}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <User size={15} className="text-violet-600" />
                  </div>
                )}
              </div>
            ))
          )}
          {sending && <FameThinking size="sm" className="px-1" />}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="p-3 border-t border-gray-100 flex gap-2 bg-white">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={chartMode ? "Ask for a chart or graph from your data..." : "Ask about projects, students, teachers..."}
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-4 py-2.5 bg-violet-500 text-white rounded-xl hover:bg-violet-600 disabled:opacity-50"
          >
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

export default AdminRagChatBox;
