import { describe, it, expect } from "vitest";
import {
  getTimelineIndexForNow,
  getCurrentFreeWindow,
  TimelineScheduleItem,
} from "./timeline-position";

describe("Timeline Now Marker Positioning", () => {
  const sampleItems: TimelineScheduleItem[] = [
    { id: "class-1", startMinutes: 540, endMinutes: 630 }, // 9:00 AM - 10:30 AM
    { id: "class-2", startMinutes: 780, endMinutes: 870 }, // 1:00 PM - 2:30 PM
    { id: "class-3", startMinutes: 960, endMinutes: 1080 }, // 4:00 PM - 6:00 PM
  ];

  it("places Now marker at index 0 when current time is before the first item", () => {
    // 8:00 AM (480 mins)
    const index = getTimelineIndexForNow(sampleItems, 480);
    expect(index).toBe(0);
  });

  it("places Now marker after class-1 when time is during a free window between class-1 and class-2", () => {
    // 11:15 AM (675 mins) — after class-1 (ended 10:30 AM), before class-2 (starts 1:00 PM)
    const index = getTimelineIndexForNow(sampleItems, 675);
    expect(index).toBe(1);
  });

  it("places Now marker after class-2 when time is between class-2 and class-3", () => {
    // 3:00 PM (900 mins) — after class-2 (ended 2:30 PM), before class-3 (starts 4:00 PM)
    const index = getTimelineIndexForNow(sampleItems, 900);
    expect(index).toBe(2);
  });

  it("places Now marker at the end after all items have finished", () => {
    // 7:00 PM (1140 mins) — all classes ended by 6:00 PM
    const index = getTimelineIndexForNow(sampleItems, 1140);
    expect(index).toBe(3);
  });

  it("calculates the correct free window between classes", () => {
    // At 11:15 AM (675 mins), free window is 10:30 AM (630m) to 1:00 PM (780m)
    const free = getCurrentFreeWindow(sampleItems, 675);
    expect(free).not.toBeNull();
    expect(free?.startMinutes).toBe(630);
    expect(free?.endMinutes).toBe(780);
    expect(free?.startTimeFormatted).toBe("10:30 AM");
    expect(free?.endTimeFormatted).toBe("1:00 PM");
  });

  it("returns null for free window when student is currently in class", () => {
    // At 9:30 AM (570 mins), student is inside class-1
    const free = getCurrentFreeWindow(sampleItems, 570);
    expect(free).toBeNull();
  });
});

