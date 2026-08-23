'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { LiveTelemetryPayload, Alert } from './types';
import { fetchRiskMap } from './api';

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export function useRealtimeStream() {
  const [telemetry, setTelemetry] = useState<LiveTelemetryPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestAlert, setLatestAlert] = useState<Alert | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(`${WS_BASE}/ws/live`);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('[FloodGuard WS] Connected to live early warning stream');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'pong') return;

          if (message.type === 'ALERT_NEW' && message.data) {
            setLatestAlert(message.data);
          } else if (message.locations) {
            setTelemetry(message);
            setLastUpdated(new Date());
            if (message.new_alerts && message.new_alerts.length > 0) {
              setLatestAlert(message.new_alerts[0]);
            }
          }
        } catch (err) {
          console.error('[FloodGuard WS] Error parsing message:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('[FloodGuard WS] Connection error:', err);
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('[FloodGuard WS] Connection closed. Retrying in 4s...');
        reconnectTimeoutRef.current = setTimeout(connect, 4000);
      };
    } catch (err) {
      console.warn('[FloodGuard WS] Failed to establish connection:', err);
      reconnectTimeoutRef.current = setTimeout(connect, 4000);
    }
  }, []);

  useEffect(() => {
    connect();

    // Ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 15000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connect]);

  return {
    telemetry,
    isConnected,
    latestAlert,
    lastUpdated,
    setTelemetry
  };
}
