import { describe, it, expect, vi } from "vitest";
import { emitWin, onWin, WIN_EVENT } from "@/lib/celebrate";

describe("celebrate event bus", () => {
  it("delivers emitted win detail to a listener", () => {
    const handler = vi.fn();
    const off = onWin(handler);

    emitWin({ payout: 14.1, amount: 5, multiplier: 2.82 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      payout: 14.1,
      amount: 5,
      multiplier: 2.82,
    });
    off();
  });

  it("stops delivering after unsubscribe", () => {
    const handler = vi.fn();
    const off = onWin(handler);
    off();

    emitWin({ payout: 1, amount: 1, multiplier: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it("uses a stable, namespaced event name", () => {
    expect(WIN_EVENT).toBe("spaceship:win");
  });
});
