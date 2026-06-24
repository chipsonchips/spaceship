import { describe, it, expect, vi, afterEach } from "vitest";
import { haptics } from "@/lib/haptics";

afterEach(() => {
  // @ts-expect-error cleanup test stub
  delete navigator.vibrate;
  vi.restoreAllMocks();
});

describe("haptics", () => {
  it("calls navigator.vibrate when available", () => {
    const vibrate = vi.fn();
    // @ts-expect-error test stub
    navigator.vibrate = vibrate;

    haptics.tap();
    haptics.place();
    haptics.win();
    haptics.crash();

    expect(vibrate).toHaveBeenCalledTimes(4);
    expect(vibrate).toHaveBeenCalledWith(8); // tap
    expect(vibrate).toHaveBeenCalledWith([0, 25, 40, 45]); // win
  });

  it("is a safe no-op when the Vibration API is unavailable", () => {
    // navigator.vibrate is absent here.
    expect(() => {
      haptics.tap();
      haptics.win();
    }).not.toThrow();
  });
});
