import { prisma } from "./prisma";

export type LiveUpdateSubscriber = (topic: string) => void;

export interface LiveSubscription {
  id: string;
  send: LiveUpdateSubscriber;
  onClose?: () => void;
  createdAt: number;
}

export const MAX_CONNECTIONS_PER_USER = 3;

interface LiveBusStore {
  subscribers: Map<string, LiveSubscription[]>;
}

declare global {
  // eslint-disable-next-line no-var
  var __vaWiseLiveBus: LiveBusStore | undefined;
}

const busStore: LiveBusStore =
  globalThis.__vaWiseLiveBus ??
  (globalThis.__vaWiseLiveBus = {
    subscribers: new Map<string, LiveSubscription[]>(),
  });

/**
 * Subscribes a user to their live updates channel.
 * Limits connections per user to MAX_CONNECTIONS_PER_USER (closes the oldest).
 * Returns an unsubscribe cleanup function.
 */
export function subscribe(
  userId: string,
  send: LiveUpdateSubscriber,
  onClose?: () => void
): () => void {
  if (!userId) {
    return () => {};
  }

  let list = busStore.subscribers.get(userId);
  if (!list) {
    list = [];
    busStore.subscribers.set(userId, list);
  }

  // If user has reached the maximum connection limit, close the oldest
  while (list.length >= MAX_CONNECTIONS_PER_USER) {
    const oldest = list.shift();
    if (oldest) {
      try {
        oldest.onClose?.();
      } catch (err) {
        console.error("Error closing oldest live subscriber:", err);
      }
    }
  }

  const subId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const subscription: LiveSubscription = {
    id: subId,
    send,
    onClose,
    createdAt: Date.now(),
  };

  list.push(subscription);

  return () => {
    const currentList = busStore.subscribers.get(userId);
    if (!currentList) return;
    const idx = currentList.findIndex((s) => s.id === subId);
    if (idx !== -1) {
      currentList.splice(idx, 1);
    }
    if (currentList.length === 0) {
      busStore.subscribers.delete(userId);
    }
  };
}

/**
 * Publishes a live update topic to specified user IDs.
 * Events carry ONLY a topic string, never any data.
 */
export function publishLiveUpdate(userIds: string[], topic: string): void {
  if (!userIds || userIds.length === 0 || !topic) return;

  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

  for (const userId of uniqueUserIds) {
    const list = busStore.subscribers.get(userId);
    if (!list || list.length === 0) continue;

    // Snapshot list to avoid mutation issues during iteration
    const subscribers = [...list];
    for (const sub of subscribers) {
      try {
        sub.send(topic);
      } catch (err) {
        console.error(`Error sending live update to user ${userId}:`, err);
      }
    }
  }
}

/**
 * Looks up the active ClientStudentLink for a given user and publishes the topic
 * to BOTH the actor and the linked counterpart.
 */
export async function publishToUserAndCounterpart(
  userId: string,
  topic: string
): Promise<void> {
  if (!userId || !topic) return;

  try {
    const link = await prisma.clientStudentLink.findFirst({
      where: {
        status: "ACTIVE",
        OR: [{ clientId: userId }, { studentId: userId }],
      },
      select: { clientId: true, studentId: true },
    });

    const targetUserIds = [userId];
    if (link) {
      const counterpartId = link.clientId === userId ? link.studentId : link.clientId;
      if (counterpartId && !targetUserIds.includes(counterpartId)) {
        targetUserIds.push(counterpartId);
      }
    }

    publishLiveUpdate(targetUserIds, topic);
  } catch (err) {
    console.error("Error looking up counterpart for live update:", err);
    // Safe fallback: at least publish to the actor
    publishLiveUpdate([userId], topic);
  }
}

/**
 * Returns the current active subscriber count for a user (useful for testing/observability).
 */
export function getSubscriberCount(userId: string): number {
  return busStore.subscribers.get(userId)?.length ?? 0;
}

/**
 * Resets the in-memory live updates bus (for testing).
 */
export function resetLiveBus(): void {
  busStore.subscribers.clear();
}

