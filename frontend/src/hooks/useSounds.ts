import { useCallback, useEffect, useRef, useState } from 'react';

// Sound frequencies and durations for Web Audio API
const SOUNDS = {
  chipSelect: { frequency: 800, duration: 0.08, type: 'sine' as OscillatorType, volume: 0.3 },
  betPlace: { frequency: 400, duration: 0.1, type: 'triangle' as OscillatorType, volume: 0.4 },
  ballLand: { frequency: 600, duration: 0.15, type: 'sine' as OscillatorType, volume: 0.5 },
  win: { frequencies: [523, 659, 784, 1047], duration: 0.2, type: 'sine' as OscillatorType, volume: 0.5 },
  lose: { frequency: 200, duration: 0.4, type: 'triangle' as OscillatorType, volume: 0.3 },
};

export function useSounds() {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('roulette_sound_muted');
    return saved === 'true';
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const spinOscillatorRef = useRef<OscillatorNode | null>(null);
  const spinGainRef = useRef<GainNode | null>(null);

  // Initialize audio context on first user interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Save mute preference
  useEffect(() => {
    localStorage.setItem('roulette_sound_muted', String(isMuted));
  }, [isMuted]);

  // Play a simple tone
  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType, volume: number) => {
    if (isMuted) return;

    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [isMuted, getAudioContext]);

  // Chip select sound - soft click
  const playChipSelect = useCallback(() => {
    const { frequency, duration, type, volume } = SOUNDS.chipSelect;
    playTone(frequency, duration, type, volume);
  }, [playTone]);

  // Bet placement sound - chip on table
  const playBetPlace = useCallback(() => {
    const { frequency, duration, type, volume } = SOUNDS.betPlace;
    playTone(frequency, duration, type, volume);
    // Add a second softer tone for depth
    setTimeout(() => {
      playTone(frequency * 0.5, duration * 0.5, type, volume * 0.5);
    }, 50);
  }, [playTone]);

  // Ball landing sound
  const playBallLand = useCallback(() => {
    const { frequency, duration, type, volume } = SOUNDS.ballLand;
    playTone(frequency, duration, type, volume);
  }, [playTone]);

  // Win sound - ascending arpeggio
  const playWin = useCallback(() => {
    if (isMuted) return;

    const { frequencies, duration, type, volume } = SOUNDS.win;
    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, duration, type, volume);
      }, i * 150);
    });
  }, [isMuted, playTone]);

  // Lose sound - descending tone
  const playLose = useCallback(() => {
    if (isMuted) return;

    const { frequency, duration, type, volume } = SOUNDS.lose;
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [isMuted, getAudioContext]);

  // Start spinning sound - continuous whoosh
  const startSpinSound = useCallback(() => {
    if (isMuted) return;

    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Stop any existing spin sound
      if (spinOscillatorRef.current) {
        spinOscillatorRef.current.stop();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      // LFO for wobble effect
      lfo.frequency.setValueAtTime(8, ctx.currentTime);
      lfoGain.gain.setValueAtTime(50, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(oscillator.frequency);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);

      oscillator.start(ctx.currentTime);
      lfo.start(ctx.currentTime);

      spinOscillatorRef.current = oscillator;
      spinGainRef.current = gainNode;
    } catch (e) {
      console.warn('Spin sound failed:', e);
    }
  }, [isMuted, getAudioContext]);

  // Stop spinning sound with fadeout
  const stopSpinSound = useCallback(() => {
    if (spinOscillatorRef.current && spinGainRef.current) {
      try {
        const ctx = getAudioContext();
        spinGainRef.current.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        setTimeout(() => {
          if (spinOscillatorRef.current) {
            spinOscillatorRef.current.stop();
            spinOscillatorRef.current = null;
          }
        }, 500);
      } catch (e) {
        console.warn('Stop spin sound failed:', e);
      }
    }
  }, [getAudioContext]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return {
    isMuted,
    toggleMute,
    playChipSelect,
    playBetPlace,
    playBallLand,
    playWin,
    playLose,
    startSpinSound,
    stopSpinSound,
  };
}
