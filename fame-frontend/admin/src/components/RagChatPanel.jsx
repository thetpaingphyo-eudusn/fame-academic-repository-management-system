import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import FameThinking from "./FameThinking";
import { FAME, sourceLabel, toDisplayText } from "../utils/fameBrand";
import { normalizeChatRoute } from "../utils/chatLinks";
import { Send, User, ExternalLink } from "lucide-react";

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
        <ExternalLink size={11} className="inline shrink-0" />
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    nodes.push(<span key={`t-${idx}`}>{renderInline(content.slice(lastIndex), `t-${idx}`)}</span>);
  }

  return <>{nodes.length ? nodes : renderInline(content, "full")}</>;
};

const RagChatPanel = ({ role = "admin", title = "FAME Assistant", compact = false }) => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! Ask in English or Myanmar — ${FAME} on your data with links to projects, students, and more.`,
      links: [],
    },
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSource, setLastSource] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
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
      });
      const data = response.data.data || {};
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: toDisplayText(data.answer || "No response generated."),
          links: data.links || [],
        },
      ]);
      setLastSource(data.source);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: toDisplayText(error.response?.data?.message || "Failed to get a response. Please try again."),
          links: [],
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`flex flex-col bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden ${
        compact ? "h-[520px]" : "h-[min(640px,70vh)]"
      }`}
    >
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50/80 to-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/fame-logo.png" alt="FAME" className="w-7 h-7 object-contain" />
          <div>
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <p className="text-[10px] text-gray-400 capitalize">{role} · {FAME}</p>
          </div>
        </div>
        {lastSource && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              lastSource === "gemini-rag"
                ? "bg-green-100 text-green-700"
                : lastSource === "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
            }`}
          >
            {sourceLabel(lastSource)}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-white border border-violet-100 flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/fame-logo.png" alt="FAME" className="w-5 h-5 object-contain" />
              </div>
            )}
            <div className="max-w-[85%] flex flex-col gap-1.5">
              <div
                className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-violet-500 text-white rounded-br-sm"
                    : "bg-white border border-gray-100 text-gray-700 rounded-bl-sm shadow-sm"
                }`}
              >
                {msg.role === "user" ? msg.content : <AssistantContent content={msg.content} />}
              </div>
              {msg.role === "assistant" && msg.links?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {msg.links.map((link) => (
                    <Link
                      key={`${link.type}-${link.path}-${link.label}`}
                      to={normalizeChatRoute(link.path)}
                      className="text-[10px] px-2 py-1 rounded-full bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100 inline-flex items-center gap-1"
                    >
                      <ExternalLink size={10} />
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                <User size={14} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}
        {sending && <FameThinking size="sm" className="px-1" />}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="p-3 border-t border-gray-100 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask in English or Myanmar..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-4 py-2 bg-violet-500 text-white rounded-xl hover:bg-violet-600 disabled:opacity-50 flex items-center gap-1"
        >
          {sending ? (
            <img src="/fame-logo.png?v=2" alt="" className="w-4 h-4 object-contain animate-pulse" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </div>
  );
};

export default RagChatPanel;
