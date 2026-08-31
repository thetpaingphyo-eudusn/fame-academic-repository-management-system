/** Normalize any id shape (string, ObjectId, populated ref, auth user) to a comparable string. */
export const cid = (id) => {
  if (id == null) return "";
  if (typeof id === "object") {
    if (id._id != null) return String(id._id);
    if (id.id != null) return String(id.id);
    if (typeof id.toString === "function") {
      const s = id.toString();
      if (s && s !== "[object Object]") return s;
    }
    return "";
  }
  return String(id);
};

/** Login returns `id`; getMe returns `_id` — chat must accept both. */
export const authUserId = (user) => cid(user?._id ?? user?.id);

export const messageReadBy = (msg, readerId) =>
  msg?.readBy?.some((r) => cid(r.userId) === cid(readerId));

export const markOwnMessagesReadBy = (messages, readerId, readAt, currentUserId) =>
  messages.map((m) => {
    if (m.isDeleted || cid(m.senderId) !== cid(currentUserId)) return m;
    if (messageReadBy(m, readerId)) return m;
    return { ...m, readBy: [...(m.readBy || []), { userId: readerId, readAt }] };
  });

/** If the other person read a later own message, all earlier own messages count as seen too. */
export const isMessageSeenByOther = (msg, messages, otherUserId, currentUserId) => {
  if (!otherUserId || msg.isDeleted || cid(msg.senderId) !== cid(currentUserId)) return false;
  if (messageReadBy(msg, otherUserId)) return true;

  const ownMessages = messages.filter((m) => !m.isDeleted && cid(m.senderId) === cid(currentUserId));
  let lastReadOwn = null;
  for (let i = ownMessages.length - 1; i >= 0; i -= 1) {
    if (messageReadBy(ownMessages[i], otherUserId)) {
      lastReadOwn = ownMessages[i];
      break;
    }
  }
  if (!lastReadOwn) return false;
  return new Date(msg.createdAt) <= new Date(lastReadOwn.createdAt);
};
