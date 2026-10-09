"use client";

import { useEffect, useState, useRef } from "react";
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
 * Stable, flicker-free hook to listen for real-time events over Server-Sent Events (SSE).
 * Uses useRef for callback stabilization to avoid infinite re-render / connection loops.
 */
export function useRealtimeSync(onEvent?: (event: RealtimeEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);

  // Keep callback reference updated without triggering re-subscriptions
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    let lastFocusTime = Date.now();

    const dispatchEventSafely = (event: RealtimeEvent) => {
      try {
        onEventRef.current?.(event);
      } catch (err) {
        console.error("Error in realtime event handler:", err);
      }
    };

    // Listen for locally-triggered mutations
    const localListener = (e: Event) => {
      const customEvent = e as CustomEvent<RealtimeEvent>;
      if (customEvent.detail) {
        dispatchEventSafely(customEvent.detail);
      }
    };
    window.addEventListener("ec:realtime", localListener);

    // Revalidate on tab focus (debounced to at most once every 10 seconds)
    const focusListener = () => {
      const now = Date.now();
      if (now - lastFocusTime > 10000) {
        lastFocusTime = now;
        dispatchEventSafely({
          type: "DATA_MUTATED",
          timestamp: new Date().toISOString(),
        });
      }
    };
    window.addEventListener("focus", focusListener);

    // Connect to SSE stream
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
            dispatchEventSafely(data);
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
          // Exponential / delayed reconnect backoff
          reconnectTimeout = setTimeout(connect, 6000);
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
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, []); // Run ONLY once on mount!

  return { isConnected };
}
