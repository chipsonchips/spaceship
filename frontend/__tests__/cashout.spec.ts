import { describe, it, expect } from "vitest";
import { getCashoutUrgency } from "@/lib/cashout";

describe("getCashoutUrgency", () => {
  it("returns calm tier near 1x", () => {
    const u = getCashoutUrgency(1.0);
    expect(u.tier).toBe("calm");
    expect(u.gradient).toContain("emerald");
  });

  it("escalates to warm past 1.8x", () => {
    expect(getCashoutUrgency(1.8).tier).toBe("warm");
    expect(getCashoutUrgency(2.5).tier).toBe("warm");
  });

  it("escalates to hot past 3x", () => {
    expect(getCashoutUrgency(3).tier).toBe("hot");
    expect(getCashoutUrgency(4.99).tier).toBe("hot");
  });

  it("escalates to critical past 5x", () => {
    const u = getCashoutUrgency(7);
    expect(u.tier).toBe("critical");
    expect(u.gradient).toContain("red");
  });

  it("pulses faster as the multiplier climbs", () => {
    const calm = getCashoutUrgency(1).pulse;
    const warm = getCashoutUrgency(2).pulse;
    const hot = getCashoutUrgency(3.5).pulse;
    const critical = getCashoutUrgency(6).pulse;
    expect(calm).toBeGreaterThan(warm);
    expect(warm).toBeGreaterThan(hot);
    expect(hot).toBeGreaterThan(critical);
  });

  it("always provides a glow colour", () => {
    [1, 2, 3, 5, 10].forEach((m) => {
      expect(getCashoutUrgency(m).glow).toMatch(/^rgba\(/);
    });
  });
});
