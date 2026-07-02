'use client';

import { useEffect, useRef, useState } from 'react';
import Pusher, { type Channel } from 'pusher-js';
import { useAuthStore } from '../stores/auth.store';
import { API_BASE } from '../lib/config';

const REALTIME_CLUSTER = process.env.NEXT_PUBLIC_REALTIME_CLUSTER;
const REALTIME_KEY = process.env.NEXT_PUBLIC_REALTIME_KEY;

let sharedPusher: Pusher | null = null;
let sharedToken: string | null = null;

function getOrCreateRealtimeClient(token: string): Pusher | null {
  if (!REALTIME_CLUSTER || !REALTIME_KEY) return null;
  if (sharedPusher && sharedToken === token) {
    return sharedPusher;
  }

  if (sharedPusher) {
    sharedPusher.disconnect();
    sharedPusher = null;
  }

  sharedToken = token;
  sharedPusher = new Pusher(REALTIME_KEY, {
    cluster: REALTIME_CLUSTER,
    authEndpoint: `${API_BASE}/realtime/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return sharedPusher;
}

export function useSocket(): { socket: Pusher | null; connected: boolean } {
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const socketRef = useRef<Pusher | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!hasHydrated || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return;
    }

    const socket = getOrCreateRealtimeClient(accessToken);
    socketRef.current = socket;
    if (!socket) {
      setConnected(false);
      return;
    }
    const onStateChange = (states: { current: string }) => {
      setConnected(states.current === 'connected');
    };
    socket.connection.bind('state_change', onStateChange);
    setConnected(socket.connection.state === 'connected');

    return () => {
      socket.connection.unbind('state_change', onStateChange);
    };
  }, [accessToken, hasHydrated]);

  return {
    socket: socketRef.current,
    connected,
  };
}

export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void
) {
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    if (!socket || !user?.id) return;
    const channelName = `private-user-${user.id}`;
    const channel = socket.subscribe(channelName);
    channelRef.current = channel;
    channel.bind(event, handler as any);
    return () => {
      if (channelRef.current) {
        channelRef.current.unbind(event, handler as any);
        socket.unsubscribe(channelName);
        channelRef.current = null;
      }
    };
  }, [socket, user?.id, event, handler]);
}
