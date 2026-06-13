import { io } from 'socket.io-client';

/**
 * Socket.io-client singleton. Connected with the JWT after login and reused
 * across the app. useRealtime() subscribes to events on this instance.
 */
let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  if (import.meta.env.DEV) {
    socket.on('connect', () => console.log('🔌 socket connected', socket.id));
    socket.on('connect_error', (e) => console.warn('socket error:', e.message));
  }
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
