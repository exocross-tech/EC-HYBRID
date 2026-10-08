"use client";

import { useEffect, useState, useCallback } from "react";
import { RealtimeEvent, RealtimeEventType } from "@/lib/realtime";

/**
 * Dispatches a client-side mutation event to revalidate sibling components instantly.
 */
export function triggerLocalMutation(type: RealtimeEventType, payload?: any) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("ec:realtime", {
        detail: {
          type,
          payload,
          timestamp: new Date().toISOString(),
        },
      })
    );
  }
}

/**
 * React hook to listen for real-time events over free Server-Sent Events (SSE).
 * Also hooks into browser window focus to ensure fresh data.
 */
export function useRealtimeSync(onEvent?: (event: RealtimeEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  const handleEvent = useCallback(
    (event: RealtimeEvent) => {
      setLastEvent(event);
      if (onEvent) {
        onEvent(event);
      }
    },
    [onEvent]
  );

  useEffect(() => {
    // Listen for locally-triggered mutations
    const localListener = (e: Event) => {
      const customEvent = e as CustomEvent<RealtimeEvent>;
      if (customEvent.detail) {
        handleEvent(customEvent.detail);
      }
    };
    window.addEventListener("ec:realtime", localListener);

    // Revalidate on tab focus
    const focusListener = () => {
      handleEvent({
        type: "DATA_MUTATED",
        timestamp: new Date().toISOString(),
      });
    };
    window.addEventListener("focus", focusListener);

    // Native SSE Connection
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      try {
        eventSource = new EventSource("/api/realtime/stream");

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const data: RealtimeEvent = JSON.parse(e.data);
            if (data.type === "PING") {
              setIsConnected(true);
              return;
            }
            handleEvent(data);
          } catch (err) {
            console.error("Failed to parse SSE realtime data:", err);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect with 5s backoff
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch {
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      window.removeEventListener("ec:realtime", localListener);
      window.removeEventListener("focus", focusListener);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
    };
  }, [handleEvent]);

  return { isConnected, lastEvent };
}
