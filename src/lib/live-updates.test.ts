import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  subscribe,
  publishLiveUpdate,
  getSubscriberCount,
  resetLiveBus,
  MAX_CONNECTIONS_PER_USER,
} from "./live-updates";
import { debounce } from "./debounce";

describe("Live Updates Event Bus", () => {
  beforeEach(() => {
    resetLiveBus();
    vi.clearAllMocks();
  });

  it("subscribes and receives published topic string", () => {
    const received: string[] = [];
    const unsubscribe = subscribe("user-1", (topic) => {
      received.push(topic);
    });

    expect(getSubscriberCount("user-1")).toBe(1);

    publishLiveUpdate(["user-1"], "tasks");
    expect(received).toEqual(["tasks"]);

    publishLiveUpdate(["user-1"], "time");
    expect(received).toEqual(["tasks", "time"]);

    unsubscribe();
    expect(getSubscriberCount("user-1")).toBe(0);
  });

  it("publishes only to the targeted users and never to others", () => {
    const user1Events: string[] = [];
    const user2Events: string[] = [];
    const user3Events: string[] = [];

    const unsub1 = subscribe("user-1", (t) => user1Events.push(t));
    const unsub2 = subscribe("user-2", (t) => user2Events.push(t));
    const unsub3 = subscribe("user-3", (t) => user3Events.push(t));

    // Publish to user-1 and user-2
    publishLiveUpdate(["user-1", "user-2"], "timesheets");

    expect(user1Events).toEqual(["timesheets"]);
    expect(user2Events).toEqual(["timesheets"]);
    expect(user3Events).toEqual([]);

    // Publish to user-3 only
    publishLiveUpdate(["user-3"], "notifications");

    expect(user1Events).toEqual(["timesheets"]);
    expect(user2Events).toEqual(["timesheets"]);
    expect(user3Events).toEqual(["notifications"]);

    unsub1();
    unsub2();
    unsub3();
  });

  it("unsubscribing removes the subscriber and stops event delivery", () => {
    const events: string[] = [];
    const unsubscribe = subscribe("user-1", (t) => events.push(t));

    publishLiveUpdate(["user-1"], "schedule");
    expect(events).toEqual(["schedule"]);

    unsubscribe();
    publishLiveUpdate(["user-1"], "schedule");
    expect(events).toEqual(["schedule"]); // No new event
  });

  it("limits connections per user by closing the oldest when limit exceeded", () => {
    const closed: number[] = [];

    const unsub1 = subscribe("user-1", vi.fn(), () => closed.push(1));
    const unsub2 = subscribe("user-1", vi.fn(), () => closed.push(2));
    const unsub3 = subscribe("user-1", vi.fn(), () => closed.push(3));

    expect(getSubscriberCount("user-1")).toBe(3);
    expect(closed).toEqual([]);

    // Adding a 4th subscription should evict the 1st
    const unsub4 = subscribe("user-1", vi.fn(), () => closed.push(4));

    expect(closed).toEqual([1]);
    expect(getSubscriberCount("user-1")).toBe(MAX_CONNECTIONS_PER_USER);

    // Adding a 5th subscription should evict the 2nd
    const unsub5 = subscribe("user-1", vi.fn(), () => closed.push(5));
    expect(closed).toEqual([1, 2]);
    expect(getSubscriberCount("user-1")).toBe(MAX_CONNECTIONS_PER_USER);

    unsub3();
    unsub4();
    unsub5();
    expect(getSubscriberCount("user-1")).toBe(0);
  });

  it("events carry only the topic string and no object or data payload", () => {
    const receivedTypes: string[] = [];
    const receivedTopics: string[] = [];

    const unsub = subscribe("user-audit", (topic) => {
      receivedTypes.push(typeof topic);
      receivedTopics.push(topic);
    });

    publishLiveUpdate(["user-audit"], "tasks");
    publishLiveUpdate(["user-audit"], "earnings");

    expect(receivedTypes).toEqual(["string", "string"]);
    expect(receivedTopics).toEqual(["tasks", "earnings"]);

    unsub();
  });
});

describe("Debounce Utility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("executes the callback only after the delay period", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced("call-1");
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("call-1");
  });

  it("coalesces multiple rapid calls into a single invocation with latest arguments", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced("a");
    vi.advanceTimersByTime(100);
    debounced("b");
    vi.advanceTimersByTime(100);
    debounced("c");

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("c");
  });

  it("cancels pending invocation when cancel() is called", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced("cancelled");
    vi.advanceTimersByTime(150);
    debounced.cancel();

    vi.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();
  });

  it("immediately executes pending invocation when flush() is called", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced("flushed");
    expect(fn).not.toHaveBeenCalled();

    debounced.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("flushed");

    // Advancing timers should not cause a second execution
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

