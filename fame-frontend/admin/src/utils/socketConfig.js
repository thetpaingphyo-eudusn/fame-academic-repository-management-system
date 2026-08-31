/** Socket.IO server URL — direct to backend in dev to avoid Vite ws proxy errors */
export const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.DEV) {
    return "http://127.0.0.1:5000";
  }
  return window.location.origin;
};

export const socketOptions = (token) => ({
  path: "/socket.io",
  auth: { token },
  transports: ["websocket", "polling"],
});
