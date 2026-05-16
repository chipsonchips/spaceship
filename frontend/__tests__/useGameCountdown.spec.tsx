import { renderHook, act } from '@testing-library/react';
import { useRoundCountdown } from '../hooks/useGame';

describe('useRoundCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should calculate countdown correctly considering serverTime offset', () => {
    const now = 1000000;
    vi.setSystemTime(now);

    const roundData = {
      roundId: 1,
      phase: 'BETTING' as const,
      startTime: 0,
      currentMultiplier: 1,
      totalBets: 0,
      totalPayouts: 0,
      settled: false,
      players: [],
      planePosition: { x: 50, y: 0 },
      // Server is 5000ms ahead of client
      serverTime: now + 5000,
      // Fly start is 15 seconds after server time
      flyStartTime: now + 5000 + 15000,
    };

    const { result } = renderHook(() => useRoundCountdown(roundData));

    // Initially, it should calculate remaining time based on serverTime offset
    // Server time = 1005000, flyStart = 1020000. 15 seconds remaining.
    expect(result.current).toBe(15);

    // Advance 5 seconds on client
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // 10 seconds remaining
    expect(result.current).toBe(10);
  });
});
