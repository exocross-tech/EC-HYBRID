import { NextRequest } from "next/server";
import { realtimeEmitter, RealtimeEvent } from "@/lib/realtime";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Native Server-Sent Events (SSE) Route Handler
 * Broadcasts real-time events to connected clients with 0 external service costs.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connected payload
  const initialPayload: RealtimeEvent = {
    type: "CONNECTED",
    payload: { userId: session.userId, role: session.role },
    timestamp: new Date().toISOString(),
  };

  writer.write(encoder.encode(`data: ${JSON.stringify(initialPayload)}\n\n`)).catch(() => {});

  const listener = (event: RealtimeEvent) => {
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)).catch(() => {});
    } catch {
      // Stream closed
    }
  };

  realtimeEmitter.on("ec-event", listener);

  // Send keep-alive ping every 25 seconds
  const heartbeat = setInterval(() => {
    try {
      writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: "PING", timestamp: new Date().toISOString() })}\n\n`)
      ).catch(() => {});
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    realtimeEmitter.off("ec-event", listener);
    try {
      writer.close().catch(() => {});
    } catch {}
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
