import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { getSocketUrl, socketOptions } from "../utils/socketConfig";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const ChatContext = createContext(null);
export const useChat = () => useContext(ChatContext);

const TOKEN_KEY = "teacherToken";

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get("/chat/unread-summary");
      setTotalUnread(res.data.data?.totalUnread ?? 0);
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTotalUnread(0);
      return undefined;
    }
    refreshUnread();
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return undefined;
    const socket = io(getSocketUrl(), socketOptions(token));
    socket.on("chat:unread", (s) => {
      if (typeof s?.totalUnread === "number") setTotalUnread(s.totalUnread);
    });
    socket.on("chat:message", () => refreshUnread());
    return () => socket.disconnect();
  }, [user, refreshUnread]);

  return <ChatContext.Provider value={{ totalUnread, refreshUnread }}>{children}</ChatContext.Provider>;
};
