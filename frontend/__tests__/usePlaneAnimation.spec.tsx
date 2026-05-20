import { describe, it, expect } from "vitest";
import { calculatePlanePosition } from "@/lib/game/timing";

describe("calculatePlanePosition", () => {
  it("produces consistent positions with vertical movement", () => {
    const p0 = calculatePlanePosition(0);
    const pMid = calculatePlanePosition(5000);
    const pEnd = calculatePlanePosition(10000);

    // X position should be fixed at center (50)
    expect(p0.x).toBe(50);
    expect(pMid.x).toBe(50);
    expect(pEnd.x).toBe(50);

    // Y position should increase monotonically (plane moves up)
    expect(p0.y).toBe(0);
    expect(pMid.y).toBeGreaterThan(p0.y);
    expect(pEnd.y).toBeGreaterThanOrEqual(pMid.y);
    expect(pEnd.y).toBeLessThanOrEqual(100);
  });

  it("reaches max height at 10000ms", () => {
    const pEnd = calculatePlanePosition(10000);
    expect(pEnd.y).toBe(100);
  });

  it("clamps progress to 1 for times beyond 10000ms", () => {
    const pEnd = calculatePlanePosition(10000);
    const pBeyond = calculatePlanePosition(20000);
    expect(pBeyond.y).toBe(pEnd.y);
  });
});
