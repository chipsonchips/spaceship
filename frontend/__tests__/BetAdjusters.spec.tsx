import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import React from "react";
import BetAdjusters from "@/components/game/bet/BetAdjusters";

function setup(props: Partial<React.ComponentProps<typeof BetAdjusters>> = {}) {
  const onBetAmountChange = vi.fn();
  const utils = render(
    <BetAdjusters
      betAmount="5"
      onBetAmountChange={onBetAmountChange}
      maxBetAmount={100}
      gameBalance={100}
      minBetAmount={0.1}
      {...props}
    />,
  );
  return { onBetAmountChange, ...utils };
}

describe("BetAdjusters", () => {
  it("doubles the bet on 2×", () => {
    const { onBetAmountChange, getByTitle } = setup({ betAmount: "5" });
    fireEvent.click(getByTitle("Double bet"));
    expect(onBetAmountChange).toHaveBeenCalledWith("10.00");
  });

  it("halves the bet on ½", () => {
    const { onBetAmountChange, getByTitle } = setup({ betAmount: "5" });
    fireEvent.click(getByTitle("Halve bet"));
    expect(onBetAmountChange).toHaveBeenCalledWith("2.50");
  });

  it("MAX uses the lower of balance and per-user max", () => {
    const { onBetAmountChange, getByTitle } = setup({
      maxBetAmount: 100,
      gameBalance: 7.5,
    });
    fireEvent.click(getByTitle("Bet maximum"));
    expect(onBetAmountChange).toHaveBeenCalledWith("7.50");
  });

  it("clamps 2× to the ceiling instead of overshooting", () => {
    const { onBetAmountChange, getByTitle } = setup({
      betAmount: "8",
      maxBetAmount: 10,
      gameBalance: 10,
    });
    fireEvent.click(getByTitle("Double bet"));
    expect(onBetAmountChange).toHaveBeenCalledWith("10.00");
  });

  it("clamps ½ to the minimum bet", () => {
    const { onBetAmountChange, getByTitle } = setup({
      betAmount: "0.1",
      minBetAmount: 0.1,
    });
    fireEvent.click(getByTitle("Halve bet"));
    expect(onBetAmountChange).toHaveBeenCalledWith("0.10");
  });

  it("caps everything at the free-bet max in free-bet mode", () => {
    const { onBetAmountChange, getByTitle } = setup({
      betAmount: "0.1",
      useFreeBet: true,
      freeBetMaxAmount: 0.2,
    });
    fireEvent.click(getByTitle("Bet maximum"));
    expect(onBetAmountChange).toHaveBeenCalledWith("0.20");
  });

  it("does nothing when disabled", () => {
    const { onBetAmountChange, getByTitle } = setup({ disabled: true });
    fireEvent.click(getByTitle("Double bet"));
    expect(onBetAmountChange).not.toHaveBeenCalled();
  });
});
