import { EventEmitter } from "events";

// Global singleton event emitter for Next.js environments
declare global {
  // eslint-disable-next-line no-var
  var ecRealtimeEmitter: EventEmitter | undefined;
}

export const realtimeEmitter = global.ecRealtimeEmitter || new EventEmitter();
realtimeEmitter.setMaxListeners(200);

if (process.env.NODE_ENV !== "production") {
  global.ecRealtimeEmitter = realtimeEmitter;
}

export type RealtimeEventType =
  | "CONNECTED"
  | "PING"
  | "TASK_UPDATED"
  | "TASK_CREATED"
  | "INVOICE_PAID"
  | "INVOICE_CREATED"
  | "AUDIT_LOG"
  | "LEAVE_STATUS"
  | "CLIENT_UPDATED"
  | "DATA_MUTATED";

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload?: any;
  timestamp: string;
}

/**
 * Broadcasts an event to all connected clients in real-time.
 * 100% free, native Node.js EventEmitter stream.
 */
export function broadcastRealtimeEvent(type: RealtimeEventType, payload?: any) {
  const event: RealtimeEvent = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
  try {
    realtimeEmitter.emit("ec-event", event);
  } catch (err) {
    console.error("Failed to broadcast realtime event:", err);
  }
}
