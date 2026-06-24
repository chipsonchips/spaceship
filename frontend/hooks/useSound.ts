import { useCallback, useRef, useEffect } from 'react';

export interface SoundOptions {
    volume?: number;
    enabled?: boolean;
}

export function useSound(options: SoundOptions = {}) {
    const { volume = 0.5, enabled = true } = options;
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && enabled) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Browsers refuse to start an AudioContext until the user has
            // interacted with the page. Resume it on the first gesture so the
            // context is ready (and silent until then) instead of logging an
            // autoplay warning on every sound we attempt to play.
            const resume = () => {
                audioContextRef.current?.resume().catch(() => {});
            };
            window.addEventListener('pointerdown', resume);
            window.addEventListener('keydown', resume);

            return () => {
                window.removeEventListener('pointerdown', resume);
                window.removeEventListener('keydown', resume);
                audioContextRef.current?.close();
            };
        }

        return undefined;
    }, [enabled]);

    const playBeep = useCallback((frequency: number, duration: number) => {
        if (!enabled || !audioContextRef.current) return;

        const ctx = audioContextRef.current;
        // Skip silently if the context hasn't been unlocked by a user gesture
        // yet; playing into a suspended context only produces console warnings.
        if (ctx.state !== 'running') {
            ctx.resume().catch(() => {});
            return;
        }
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    }, [enabled, volume]);

    const playBetPlaced = useCallback(() => {
        playBeep(440, 0.1); // A4 note
    }, [playBeep]);

    const playCashOut = useCallback(() => {
        playBeep(880, 0.15); // A5 note
        setTimeout(() => playBeep(1320, 0.15), 100); // E6 note
    }, [playBeep]);

    const playCrash = useCallback(() => {
        playBeep(220, 0.3); // A3 note (lower pitch)
    }, [playBeep]);

    const playTakeoff = useCallback(() => {
        // Rising pitch
        playBeep(330, 0.1);
        setTimeout(() => playBeep(440, 0.1), 50);
        setTimeout(() => playBeep(550, 0.1), 100);
    }, [playBeep]);

    return {
        playBetPlaced,
        playCashOut,
        playCrash,
        playTakeoff,
    };
}