import React, { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { getSocketUrl, socketOptions } from "../utils/socketConfig";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { authUserId, cid, isMessageSeenByOther, markOwnMessagesReadBy } from "../utils/chatRead";
import ChatMediaViewer, { formatFileSize } from "./ChatMediaViewer";
import { useConfirmDialog } from "./ConfirmDialog";
import {
  MessageCircle, Send, Loader2, Search, Paperclip, Pin, PinOff, Pencil, Trash2,
  X, Check, CheckCheck, MoreVertical, FileText, Reply, Forward, BellOff, Bell,
  VolumeX, Trash, ArrowLeft, Film,
} from "lucide-react";

const TOKEN_KEY = "studentToken";
const T = {
  btn: "bg-emerald-500 hover:bg-emerald-600",
  ring: "focus:ring-emerald-200 focus:border-emerald-300",
  bubble: "bg-emerald-500 text-white",
  bubbleOther: "bg-gray-100 text-gray-800",
  selected: "bg-emerald-50",
  pin: "bg-emerald-50 text-emerald-800",
  accent: "text-emerald-600",
};

const formatTime = (v) =>
  v ? new Date(v).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

const formatTimeShort = (v) => {
  if (!v) return "";
  const d = new Date(v);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const patchUnreadFromSummary = (conversations, summary) => {
  if (!summary?.conversations?.length) return conversations;
  return conversations.map((c) => {
    const row = summary.conversations.find((s) => String(s.conversationId) === String(c._id));
    return row ? { ...c, unreadCount: row.unreadCount } : c;
  });
};

const ChatMessenger = () => {
  const { user } = useAuth();
  const { refreshUnread } = useChat();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const selectedRef = useRef(null);
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [menuMsgId, setMenuMsgId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [previewCaption, setPreviewCaption] = useState("");
  const [mediaViewer, setMediaViewer] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimer = useRef(null);

  const meId = authUserId(user);
  const otherUserId = selected?.participants?.find((p) => cid(p.userId) !== meId)?.userId;

  const loadLists = useCallback(async () => {
    setLoadingList(true);
    try {
      const [cRes, convRes] = await Promise.all([api.get("/chat/contacts"), api.get("/chat/conversations")]);
      setContacts(cRes.data.data || []);
      setConversations(convRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    selectedRef.current = selected?._id || null;
  }, [selected]);

  const applyReadToOpenChat = useCallback(
    (conversationId, readerId, readAt) => {
      if (cid(readerId) === meId) return;
      if (cid(selectedRef.current) !== cid(conversationId)) return;
      setMessages((prev) => markOwnMessagesReadBy(prev, readerId, readAt, meId));
    },
    [meId]
  );

  useEffect(() => {
    loadLists();
    const token = localStorage.getItem(TOKEN_KEY);
    const socket = io(getSocketUrl(), socketOptions(token));
    socketRef.current = socket;

    socket.on("chat:message", ({ message, conversation }) => {
      const convId = cid(message.conversationId);
      const isOpen = cid(selectedRef.current) === convId;

      if (isOpen) {
        setMessages((prev) => [...prev.filter((m) => cid(m._id) !== cid(message._id)), message]);
        if (cid(message.senderId) !== meId) {
          socket.emit("chat:read", { conversationId: convId });
        }
      }

      const merged = {
        ...conversation,
        lastMessageSeen: cid(message.senderId) === meId ? false : conversation.lastMessageSeen,
      };
      setConversations((prev) => [merged, ...prev.filter((c) => cid(c._id) !== cid(conversation._id))]);
      refreshUnread();
    });

    socket.on("chat:message-updated", ({ message, conversation }) => {
      if (cid(selectedRef.current) === cid(message.conversationId)) {
        setMessages((prev) => prev.map((m) => (cid(m._id) === cid(message._id) ? message : m)));
        if (message.isPinned) setPinnedMessage(message);
        else setPinnedMessage((p) => (cid(p?._id) === cid(message._id) ? null : p));
      }
      if (conversation) {
        setConversations((prev) => prev.map((c) => (cid(c._id) === cid(conversation._id) ? { ...c, ...conversation } : c)));
        setSelected((s) => (cid(s?._id) === cid(conversation._id) ? { ...s, ...conversation } : s));
      }
    });

    socket.on("chat:message-deleted", ({ messageId, conversationId }) => {
      if (cid(selectedRef.current) === cid(conversationId)) {
        setMessages((prev) =>
          prev.map((m) => (cid(m._id) === cid(messageId) ? { ...m, isDeleted: true, content: "", attachments: [] } : m))
        );
        setPinnedMessage((p) => (cid(p?._id) === cid(messageId) ? null : p));
      }
    });

    socket.on("chat:read", ({ conversationId, userId, readAt }) => {
      const convId = cid(conversationId);
      applyReadToOpenChat(convId, userId, readAt);

      if (cid(userId) !== meId) {
        setConversations((prev) =>
          prev.map((c) => (cid(c._id) === convId ? { ...c, lastMessageSeen: true } : c))
        );
        setSelected((s) => (cid(s?._id) === convId ? { ...s, lastMessageSeen: true } : s));
      }
    });

    socket.on("chat:typing", ({ conversationId, userName, isTyping }) => {
      if (cid(selectedRef.current) === cid(conversationId) && isTyping) {
        setTypingUser(userName);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingUser(""), 2000);
      }
    });

    socket.on("chat:conversation-deleted", ({ conversationId }) => {
      setConversations((prev) => prev.filter((c) => cid(c._id) !== cid(conversationId)));
      if (cid(selectedRef.current) === cid(conversationId)) {
        setSelected(null);
        setMessages([]);
      }
      refreshUnread();
    });

    socket.on("chat:conversation-updated", ({ conversation }) => {
      setConversations((prev) => prev.map((c) => (cid(c._id) === cid(conversation._id) ? { ...c, ...conversation } : c)));
      setSelected((s) => (cid(s?._id) === cid(conversation._id) ? { ...s, ...conversation } : s));
      if (conversation.lastMessageSeen) {
        const other = conversation.participants?.find((p) => cid(p.userId) !== meId);
        if (other) applyReadToOpenChat(conversation._id, other.userId, new Date().toISOString());
      }
    });

    socket.on("chat:unread", (summary) => {
      refreshUnread();
      setConversations((prev) => patchUnreadFromSummary(prev, summary));
    });

    return () => socket.disconnect();
  }, [loadLists, refreshUnread, meId, applyReadToOpenChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser, replyTo]);

  const openConversation = async (conv) => {
    setSelected(conv);
    setReplyTo(null);
    setLoadingChat(true);
    setMenuMsgId(null);
    socketRef.current?.emit("chat:join", { conversationId: conv._id });
    socketRef.current?.emit("chat:read", { conversationId: conv._id });
    try {
      const res = await api.get(`/chat/conversations/${conv._id}/messages`);
      const items = res.data.data?.items || [];
      const loadedConv = res.data.data?.conversation || conv;
      let nextMessages = items;

      if (loadedConv.lastMessageSeen) {
        const other = loadedConv.participants?.find((p) => cid(p.userId) !== meId);
        if (other) {
          nextMessages = markOwnMessagesReadBy(items, other.userId, new Date().toISOString(), meId);
        }
      }

      setMessages(nextMessages);
      setPinnedMessage(nextMessages.find((m) => m.isPinned && !m.isDeleted) || null);
      if (loadedConv) setSelected(loadedConv);
      setConversations((prev) =>
        prev.map((c) => (c._id === conv._id ? { ...c, ...loadedConv, unreadCount: 0 } : c))
      );
      refreshUnread();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChat(false);
    }
  };

  const startChatWith = async (contact) => {
    try {
      const res = await api.post("/chat/conversations", { userId: contact._id });
      const conv = res.data.data;
      setConversations((prev) => [conv, ...prev.filter((c) => c._id !== conv._id)]);
      openConversation(conv);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async ({ content, type, attachments, replyTo: reply } = {}) => {
    if (!selected || sending) return;
    const trimmed = (content ?? input).trim();
    const atts = attachments || [];
    if (!trimmed && !atts.length) return;

    setSending(true);
    setInput("");
    setReplyTo(null);
    try {
      await new Promise((resolve) => {
        socketRef.current?.emit(
          "chat:send",
          { conversationId: selected._id, content: trimmed, type, attachments: atts, replyTo: reply || null },
          () => resolve()
        );
      });
    } finally {
      setSending(false);
    }
  };

  const onFilePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const previewUrl = file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : null;
    setPendingFile({ file, previewUrl, name: file.name, mimeType: file.type });
    setPreviewCaption("");
  };

  const cancelPreview = () => {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
    setPreviewCaption("");
  };

  const confirmSendFile = async () => {
    if (!pendingFile || !selected) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append("file", pendingFile.file);
      const res = await api.post("/chat/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      const data = res.data.data;
      await sendMessage({
        content: previewCaption.trim() || pendingFile.name,
        type: data.type,
        attachments: [{ url: data.url, fileName: data.fileName, mimeType: data.mimeType, size: data.size }],
      });
      cancelPreview();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const muteConv = async () => {
    if (!selected) return;
    const res = await api.patch(`/chat/conversations/${selected._id}/mute`, { mute: !selected.isMuted });
    setSelected(res.data.data);
    setConversations((prev) => prev.map((c) => (c._id === selected._id ? res.data.data : c)));
  };

  const deleteConv = async (conv) => {
    const target = conv || selected;
    if (!target) return;
    const title = convTitle(target);
    if (!(await confirm({
      title: "Delete conversation?",
      message: `Remove "${title}" from your chat list? This conversation will be deleted for you.`,
      confirmLabel: "Delete conversation",
    }))) return;
    await api.delete(`/chat/conversations/${target._id}`);
    setConversations((prev) => prev.filter((c) => cid(c._id) !== cid(target._id)));
    if (cid(selected?._id) === cid(target._id)) {
      setSelected(null);
      setMessages([]);
    }
    refreshUnread();
  };

  const doForward = async (targetId) => {
    if (!forwardMsg) return;
    await api.post(`/chat/messages/${forwardMsg._id}/forward`, { targetConversationId: targetId });
    setForwardMsg(null);
  };

  const isSeen = (msg) => isMessageSeenByOther(msg, messages, otherUserId, meId);

  const openMedia = (msg, att) => {
    setMediaViewer({
      type: msg.type,
      url: att.url,
      fileName: att.fileName || msg.content,
      mimeType: att.mimeType,
      size: att.size,
      senderName: msg.senderName,
      createdAt: msg.createdAt,
    });
  };

  const closeMobileChat = () => {
    setSelected(null);
    setMessages([]);
    setReplyTo(null);
    setMenuMsgId(null);
  };

  const renderAttachment = (msg) => {
    const att = msg.attachments?.[0];
    if (!att) return null;

    if (msg.type === "image") {
      return (
        <button
          type="button"
          onClick={() => openMedia(msg, att)}
          className="block mt-1 rounded-lg overflow-hidden max-w-full sm:max-w-[240px] focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          <img
            src={att.url}
            alt={att.fileName || "Image"}
            className="w-full max-h-40 sm:max-h-52 object-cover cursor-pointer hover:opacity-95 transition-opacity"
          />
        </button>
      );
    }

    if (msg.type === "video") {
      return (
        <button
          type="button"
          onClick={() => openMedia(msg, att)}
          className="block mt-1 rounded-lg overflow-hidden max-w-full sm:max-w-[240px] relative focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          <video src={att.url} className="w-full max-h-40 sm:max-h-52 object-cover pointer-events-none" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Film size={28} className="text-white" />
          </span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => openMedia(msg, att)}
        className={`flex items-center gap-2 mt-1 p-2.5 rounded-lg text-left w-full max-w-full sm:max-w-xs ${
          cid(msg.senderId) === meId ? "bg-white/15 hover:bg-white/25" : "bg-gray-200/80 hover:bg-gray-200"
        }`}
      >
        <FileText size={18} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="text-xs font-medium block truncate">{att.fileName || "File"}</span>
          {att.size && <span className="text-[10px] opacity-70">{formatFileSize(att.size)}</span>}
        </span>
      </button>
    );
  };

  const convTitle = (conv) =>
    conv.participants?.filter((p) => cid(p.userId) !== meId).map((p) => p.userName).join(", ") || "Chat";

  return (
    <>
      <div className="flex flex-col md:flex-row bg-white rounded-xl sm:rounded-2xl shadow-md overflow-hidden flex-1 min-h-[420px] h-full max-h-full">
        <div className={`${selected ? "hidden md:flex" : "flex"} w-full md:w-72 lg:w-80 flex-col bg-gray-50 shrink-0 min-h-0`}>
          <div className="p-2.5 sm:p-3 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className={`w-full pl-8 py-2.5 sm:py-2 bg-white rounded-xl text-xs sm:text-sm outline-none ring-1 ring-gray-200 ${T.ring}`} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-1.5 sm:px-2 pb-2 space-y-0.5 min-h-0">
            {loadingList ? (
              <div className="flex justify-center py-10"><Loader2 className={`animate-spin ${T.accent}`} size={22} /></div>
            ) : (
              <>
                {conversations.map((conv) => {
                  const isActive = cid(selected?._id) === cid(conv._id);
                  const iSentLast = cid(conv.lastMessage?.senderId) === meId;
                  const hasUnread = (conv.unreadCount ?? 0) > 0;
                  return (
                  <div key={conv._id} className={`group flex items-stretch rounded-xl transition-colors ${isActive ? T.selected : "hover:bg-white"}`}>
                    <button type="button" onClick={() => openConversation(conv)} className="flex-1 min-w-0 text-left px-3 py-3">
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-sm truncate ${hasUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>{convTitle(conv)}</p>
                        <div className="flex flex-col items-end shrink-0 gap-1">
                          {conv.lastMessage?.createdAt && (
                            <span className="text-[10px] text-gray-400">{formatTimeShort(conv.lastMessage.createdAt)}</span>
                          )}
                          <div className="flex items-center gap-1">
                            {conv.isMuted && <VolumeX size={12} className="text-gray-400" />}
                            {hasUnread && (
                              <span className="min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                        {iSentLast && (
                          conv.lastMessageSeen
                            ? <CheckCheck size={12} className={`${T.accent} shrink-0`} />
                            : <Check size={12} className="text-gray-300 shrink-0" />
                        )}
                        <span className="truncate">{conv.lastMessage?.text || "No messages"}</span>
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteConv(conv); }}
                      className="px-2.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0 self-center rounded-lg"
                      aria-label={`Delete ${convTitle(conv)}`}
                      title="Delete conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );})}
                {contacts
                  .filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()) && !conversations.some((cv) => cv.participantIds?.some((id) => String(id) === String(c._id))))
                  .map((c) => (
                    <button key={c._id} type="button" onClick={() => startChatWith(c)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white">
                      <p className="text-sm text-gray-700">{c.name}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{c.role} · Start chat</p>
                    </button>
                  ))}
              </>
            )}
          </div>
        </div>

        <div className={`${selected ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0 bg-white min-h-0`}>
          {selected ? (
            <>
              <div className="px-2 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 shrink-0 border-b border-gray-100 md:border-0">
                <button type="button" onClick={closeMobileChat} className="md:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 shrink-0" aria-label="Back to chats">
                  <ArrowLeft size={18} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{convTitle(selected)}</p>
                  {typingUser && <p className={`text-[10px] ${T.accent}`}>{typingUser} is typing...</p>}
                  {selected.isMuted && <p className="text-[10px] text-gray-400">Muted</p>}
                </div>
                <div className="flex gap-0.5 sm:gap-1 shrink-0">
                  <button type="button" onClick={muteConv} className="p-2 rounded-lg hover:bg-gray-100" title={selected.isMuted ? "Unmute" : "Mute"}>
                    {selected.isMuted ? <BellOff size={16} /> : <Bell size={16} />}
                  </button>
                  <button type="button" onClick={deleteConv} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete chat">
                    <Trash size={16} />
                  </button>
                </div>
              </div>

              {pinnedMessage && !pinnedMessage.isDeleted && (
                <div className={`px-3 sm:px-4 py-2 text-xs flex gap-2 shrink-0 ${T.pin}`}>
                  <Pin size={12} className="shrink-0" /><span className="truncate">{pinnedMessage.content || pinnedMessage.attachments?.[0]?.fileName}</span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3 bg-gray-50/50 min-h-0">
                {loadingChat ? (
                  <div className="flex justify-center py-16"><Loader2 className={`animate-spin ${T.accent}`} size={28} /></div>
                ) : (
                  messages.map((msg) => (
                    <MsgBubble
                      key={msg._id}
                      msg={msg}
                      isOwn={cid(msg.senderId) === meId}
                      seen={isSeen(msg)}
                      menuOpen={menuMsgId === msg._id}
                      onMenu={() => setMenuMsgId(menuMsgId === msg._id ? null : msg._id)}
                      onReply={() => { setReplyTo({ messageId: msg._id, senderName: msg.senderName, content: msg.content || msg.attachments?.[0]?.fileName, type: msg.type }); setMenuMsgId(null); }}
                      onForward={() => { setForwardMsg(msg); setMenuMsgId(null); }}
                      onEdit={() => { setEditingId(msg._id); setEditText(msg.content); setMenuMsgId(null); }}
                      onDelete={async () => { setMenuMsgId(null); await api.delete(`/chat/messages/${msg._id}`); }}
                      onPin={async () => { setMenuMsgId(null); await api.patch(`/chat/messages/${msg._id}/pin`, { pin: !msg.isPinned }); }}
                      editing={editingId === msg._id}
                      editText={editText}
                      setEditText={setEditText}
                      onSaveEdit={async () => { await api.patch(`/chat/messages/${editingId}`, { content: editText }); setEditingId(null); }}
                      onCancelEdit={() => setEditingId(null)}
                      renderAttachment={renderAttachment}
                      T={T}
                    />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {replyTo && (
                <div className="px-2 sm:px-3 py-2 bg-emerald-50 flex items-center gap-2 text-xs shrink-0">
                  <Reply size={14} className={`${T.accent} shrink-0`} />
                  <div className="flex-1 truncate"><span className="font-medium">{replyTo.senderName}:</span> {replyTo.content}</div>
                  <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 p-1"><X size={14} /></button>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); sendMessage({ replyTo }); }} className="p-2 sm:p-3 flex gap-1.5 sm:gap-2 bg-white shrink-0 border-t border-gray-100">
                <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,*/*" onChange={onFilePick} />
                <button type="button" onClick={() => fileRef.current?.click()} className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-100 shrink-0"><Paperclip size={18} /></button>
                <input value={input} onChange={(e) => { setInput(e.target.value); socketRef.current?.emit("chat:typing", { conversationId: selected._id, isTyping: true }); }} placeholder="Type a message..." className={`flex-1 min-w-0 px-3 py-2.5 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-gray-200 ${T.ring}`} disabled={sending} />
                <button type="submit" disabled={sending || !input.trim()} className={`px-3 sm:px-4 py-2.5 text-white rounded-xl disabled:opacity-50 shrink-0 ${T.btn}`}>
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6">
              <MessageCircle size={40} className="mb-3 opacity-40" />
              <p className="text-sm text-center">Select or start a conversation</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog />
      <ChatMediaViewer item={mediaViewer} onClose={() => setMediaViewer(null)} accentClass={T.accent} />

      {pendingFile && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 space-y-3">
            <p className="font-semibold text-sm">Preview before sending</p>
            {pendingFile.mimeType.startsWith("image/") && <img src={pendingFile.previewUrl} alt="" className="max-h-64 mx-auto rounded-lg" />}
            {pendingFile.mimeType.startsWith("video/") && <video src={pendingFile.previewUrl} controls className="max-h-64 mx-auto rounded-lg w-full" />}
            {!pendingFile.mimeType.startsWith("image/") && !pendingFile.mimeType.startsWith("video/") && (
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg"><FileText size={24} /><span className="text-sm truncate">{pendingFile.name}</span></div>
            )}
            <input value={previewCaption} onChange={(e) => setPreviewCaption(e.target.value)} placeholder="Add a caption (optional)" className="w-full px-3 py-2 border rounded-lg text-sm" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={cancelPreview} className="px-4 py-2 text-sm rounded-lg border">Cancel</button>
              <button type="button" onClick={confirmSendFile} disabled={sending} className={`px-4 py-2 text-sm text-white rounded-lg ${T.btn}`}>{sending ? "Sending..." : "Send"}</button>
            </div>
          </div>
        </div>
      )}

      {forwardMsg && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4">
            <p className="font-semibold text-sm mb-3">Forward to</p>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {conversations.filter((c) => c._id !== selected?._id).map((c) => (
                <button key={c._id} type="button" onClick={() => doForward(c._id)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm">{convTitle(c)}</button>
              ))}
            </div>
            <button type="button" onClick={() => setForwardMsg(null)} className="mt-3 w-full py-2 text-sm border rounded-lg">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
};

const MsgBubble = ({ msg, isOwn, seen, menuOpen, onMenu, onReply, onForward, onEdit, onDelete, onPin, editing, editText, setEditText, onSaveEdit, onCancelEdit, renderAttachment, T }) => {
  if (msg.isDeleted) {
    return (
      <div className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}>
        <p className="text-xs italic text-gray-400 px-1">Message deleted</p>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-end gap-1 max-w-[88%] sm:max-w-[75%] ${isOwn ? "flex-row-reverse" : "flex-row"} group`}>
        <div className="min-w-0">
          {!isOwn && <p className="text-[10px] text-gray-400 mb-0.5 px-1">{msg.senderName}</p>}
          {msg.forwardedFrom && (
            <p className={`text-[10px] text-gray-400 mb-0.5 px-1 ${isOwn ? "text-right" : "text-left"}`}>
              Forwarded from {msg.forwardedFrom.senderName}
            </p>
          )}
          {msg.replyTo && (
            <div className={`text-[10px] bg-black/5 rounded px-2 py-1 mb-1 border-l-2 border-emerald-400 ${isOwn ? "mr-1" : "ml-1"}`}>
              <span className="font-medium">{msg.replyTo.senderName}</span>: {msg.replyTo.content}
            </div>
          )}
          <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn ? `${T.bubble} rounded-br-sm` : `${T.bubbleOther} rounded-bl-sm`}`}>
            {editing ? (
              <div className="flex gap-1">
                <input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-1 text-gray-800 text-sm rounded border px-1" />
                <button type="button" onClick={onSaveEdit}><Check size={14} /></button>
                <button type="button" onClick={onCancelEdit}><X size={14} /></button>
              </div>
            ) : (
              <>
                {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                {renderAttachment(msg)}
              </>
            )}
            <div className={`flex items-center gap-1 mt-1 text-[9px] ${isOwn ? "text-white/70 justify-end" : "text-gray-400"}`}>
              <span>{formatTime(msg.createdAt)}{msg.isEdited && " · edited"}</span>
              {isOwn && (seen ? <CheckCheck size={12} className="text-white/80" title="Seen" /> : <Check size={12} title="Sent" />)}
            </div>
          </div>
        </div>
        {!editing && (
          <div className="relative self-center shrink-0">
            <button type="button" onClick={onMenu} className="p-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-gray-100 rounded touch-manipulation"><MoreVertical size={14} /></button>
            {menuOpen && (
              <div className={`absolute top-full z-10 w-36 bg-white border rounded-lg shadow-lg text-xs py-1 ${isOwn ? "right-0" : "left-0"}`}>
                <button type="button" onClick={onReply} className="w-full px-3 py-2 text-left hover:bg-gray-50 flex gap-2"><Reply size={12} /> Reply</button>
                <button type="button" onClick={onForward} className="w-full px-3 py-2 text-left hover:bg-gray-50 flex gap-2"><Forward size={12} /> Forward</button>
                <button type="button" onClick={onPin} className="w-full px-3 py-2 text-left hover:bg-gray-50 flex gap-2">{msg.isPinned ? <PinOff size={12} /> : <Pin size={12} />} {msg.isPinned ? "Unpin" : "Pin"}</button>
                {isOwn && msg.type === "text" && <button type="button" onClick={onEdit} className="w-full px-3 py-2 text-left hover:bg-gray-50 flex gap-2"><Pencil size={12} /> Edit</button>}
                {isOwn && <button type="button" onClick={onDelete} className="w-full px-3 py-2 text-left hover:bg-red-50 text-red-600 flex gap-2"><Trash2 size={12} /> Delete</button>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessenger;

