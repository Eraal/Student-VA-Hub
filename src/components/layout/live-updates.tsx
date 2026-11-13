"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { debounce } from "@/lib/debounce";
import { getLatestNotificationAction } from "@/lib/actions/notification";
import { toast } from "@/components/ui/toast";

/**
 * Checks if a dialog or modal with unsaved user input is currently open in the DOM.
 */
export function isDialogWithUnsavedInputOpen(): boolean {
  if (typeof document === "undefined") return false;

  const dialogs = document.querySelectorAll<HTMLElement>(
    '[role="dialog"], [data-slot="dialog-content"], dialog[open]'
  );

  for (const dialog of dialogs) {
    if (dialog.getAttribute("aria-hidden") === "true") continue;
    const style = window.getComputedStyle(dialog);
    if (style.display === "none" || style.visibility === "hidden") continue;

    const inputs = dialog.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea'
    );

    for (const input of inputs) {
      const val = input.value?.trim() ?? "";
      const def = input.defaultValue?.trim() ?? "";
      if (val !== def && val.length > 0) return true;
      if (document.activeElement === input && val.length > 0) return true;
    }
  }

  return false;
}

export function LiveUpdates() {
  const router = useRouter();
  const esRef = React.useRef<EventSource | null>(null);
  const isConnectedRef = React.useRef(false);
  const retryCountRef = React.useRef(0);
  const reconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedRefreshRef = React.useRef(false);
  const seenNotificationIdsRef = React.useRef<Set<string>>(new Set());

  // Debounced refresh handler (300 ms).
  // If a dialog with unsaved input is open, queues one refresh for when it closes.
  const debouncedRefresh = React.useMemo(() => {
    return debounce(() => {
      if (isDialogWithUnsavedInputOpen()) {
        queuedRefreshRef.current = true;
        return;
      }
      queuedRefreshRef.current = false;
      router.refresh();
    }, 300);
  }, [router]);

  // When a new notification arrives, fetch latest and show a toast once
  const handleNotificationArrival = React.useCallback(async () => {
    try {
      const latest = await getLatestNotificationAction();
      if (latest && !seenNotificationIdsRef.current.has(latest.id)) {
        seenNotificationIdsRef.current.add(latest.id);
        toast.info(latest.message);
      }
    } catch (err) {
      console.error("Error fetching latest notification for live toast:", err);
    }
  }, []);

  React.useEffect(() => {
    let isUnmounted = false;

    // Seed existing notification ID so historical notifications are not toasted
    getLatestNotificationAction()
      .then((existing) => {
        if (!isUnmounted && existing) {
          seenNotificationIdsRef.current.add(existing.id);
        }
      })
      .catch(() => {});

    // Observer to dispatch queued refresh as soon as dialog closes
    const observer = new MutationObserver(() => {
      if (queuedRefreshRef.current && !isDialogWithUnsavedInputOpen()) {
        queuedRefreshRef.current = false;
        debouncedRefresh();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open", "aria-hidden", "data-state", "class"],
    });

    // Connect to SSE endpoint
    const connect = () => {
      if (isUnmounted) return;

      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      try {
        const es = new EventSource("/api/live");
        esRef.current = es;

        es.onopen = () => {
          if (isUnmounted) return;
          isConnectedRef.current = true;
          retryCountRef.current = 0;
        };

        es.addEventListener("ready", () => {
          if (isUnmounted) return;
          isConnectedRef.current = true;
          retryCountRef.current = 0;
        });

        es.onmessage = (event) => {
          if (isUnmounted) return;
          const topic = event.data;

          if (topic === "notifications") {
            void handleNotificationArrival();
          }

          debouncedRefresh();
        };

        es.onerror = () => {
          if (isUnmounted) return;
          isConnectedRef.current = false;
          es.close();
          esRef.current = null;

          // Exponential backoff reconnect (up to 10s)
          const delay = Math.min(
            1000 * Math.pow(1.5, retryCountRef.current),
            10000
          );
          retryCountRef.current += 1;
          reconnectTimerRef.current = setTimeout(connect, delay);
        };
      } catch (err) {
        isConnectedRef.current = false;
        const delay = Math.min(
          1000 * Math.pow(1.5, retryCountRef.current),
          10000
        );
        retryCountRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    };

    connect();

    // Refresh on window focus and document visibilitychange
    const onFocus = () => {
      debouncedRefresh();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        debouncedRefresh();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Fallback refresh every 15 seconds while connection is closed or tab is visible
    const fallbackInterval = setInterval(() => {
      if (document.visibilityState !== "visible") return;

      // When live connection is closed or failed, fallback refresh keeps view current
      if (!isConnectedRef.current) {
        debouncedRefresh();
      }
    }, 15000);

    return () => {
      isUnmounted = true;
      debouncedRefresh.cancel();
      observer.disconnect();

      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      clearInterval(fallbackInterval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [debouncedRefresh, handleNotificationArrival]);

  return null;
}

