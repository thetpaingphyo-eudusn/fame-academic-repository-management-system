import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import FameThinking from "./FameThinking";
import { FAME, toDisplayText } from "../utils/fameBrand";
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

const RagChatPanel = ({ role = "teacher", title = "FAME Assistant" }) => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! Ask in English or Myanmar — ${FAME} with links to your courses and students.`,
      links: [],
    },
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
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
      const response = await api.post("/rag/chat", { message: trimmed, history: history.slice(-10), sessionId });
      const data = response.data.data || {};
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: toDisplayText(data.answer || "No response."), links: data.links || [] },
      ]);
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
    <div className="flex flex-col bg-white rounded-2xl border border-violet-100 shadow-sm h-[min(640px,75vh)]">
      <div className="px-4 py-3 border-b bg-gradient-to-r from-violet-50/80 to-white flex items-center gap-2">
        <img src="/fame-logo.png" alt="FAME" className="w-7 h-7 object-contain" />
        <div>
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          <p className="text-[10px] text-gray-400 capitalize">{role} · {FAME}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-white border border-violet-100 flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/fame-logo.png" alt="FAME" className="w-5 h-5 object-contain" />
              </div>
            )}
            <div className="max-w-[85%] flex flex-col gap-1.5">
              <div
                className={`px-3 py-2 rounded-xl text-sm ${
                  msg.role === "user" ? "bg-violet-500 text-white" : "bg-white border text-gray-700"
                }`}
              >
                {msg.role === "user" ? msg.content : <AssistantContent content={msg.content} />}
              </div>
              {msg.role === "assistant" && msg.links?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.links.map((link) => (
                    <Link
                      key={`${link.type}-${link.path}`}
                      to={normalizeChatRoute(link.path)}
                      className="text-[10px] px-2 py-1 rounded-full bg-violet-50 text-violet-700 hover:bg-violet-100"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && <FameThinking size="sm" className="px-1" />}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask in English or Myanmar..."
          className="flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()} className="px-4 py-2 bg-violet-500 text-white rounded-xl disabled:opacity-50">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default RagChatPanel;
