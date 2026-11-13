import { getCurrentUser } from "@/lib/auth-helpers";
import { subscribe } from "@/lib/live-updates";

/**
 * SSE Live Updates Route Handler.
 * Authenticates user, subscribes them to their personal channel,
 * sends initial 'ready' event and periodic 25-second heartbeats.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let unsubscribe: (() => void) | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      const safeClose = () => {
        if (isClosed) return;
        isClosed = true;
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {
          // Stream already closed or aborted
        }
      };

      // Request aborted by client (tab closed, navigation, unmount)
      request.signal.addEventListener("abort", safeClose);

      // Subscribe to user channel with eviction close callback
      unsubscribe = subscribe(
        user.id,
        (topic: string) => {
          if (isClosed) return;
          try {
            // Deliver event containing ONLY the topic string
            controller.enqueue(
              encoder.encode(`event: message\ndata: ${topic}\n\n`)
            );
          } catch {
            safeClose();
          }
        },
        () => {
          // Closed by server when newer connections exceed the per-user limit
          safeClose();
        }
      );

      // Send initial ready event on connect
      try {
        controller.enqueue(encoder.encode("event: ready\ndata: ready\n\n"));
      } catch {
        safeClose();
        return;
      }

      // Heartbeat comment every 25 seconds to keep connection alive
      heartbeatTimer = setInterval(() => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          safeClose();
        }
      }, 25000);
    },
    cancel() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      isClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
