// @ts-ignore
import anime from 'animejs/lib/anime.es.js';
import { useEffect, useRef, useCallback } from 'react';

interface RealisticWheelProps {
  isSpinning: boolean;
  targetNumber: number | null;
  onAnimationComplete?: () => void;
}

// Animation duration in milliseconds
const SPIN_DURATION = 5000;

const rouletteWheelNumbers = [
  0, 32, 15, 19, 4, 21, 2, 25,
  17, 34, 6, 27, 13, 36, 11,
  30, 8, 23, 10, 5, 24, 16, 33,
  1, 20, 14, 31, 9, 22, 18, 29,
  7, 28, 12, 35, 3, 26
];

export function RealisticWheel({ isSpinning, targetNumber, onAnimationComplete }: RealisticWheelProps) {
  const totalNumbers = 37;
  const singleSpinDuration = SPIN_DURATION;
  const singleRotationDegree = 360 / totalNumbers;
  const lastNumberRef = useRef(0);
  const hasSpunRef = useRef(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Track when spin started and if animation was completed
  const spinStartTimeRef = useRef<number | null>(null);
  const animationCompletedRef = useRef(false);
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  // Store the target number at spin start (to avoid issues if prop changes during animation)
  const spinTargetNumberRef = useRef<number | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  const getRouletteIndexFromNumber = useCallback((number: number) => {
    return rouletteWheelNumbers.indexOf(number);
  }, []);

  const getRotationFromNumber = useCallback((number: number) => {
    const index = getRouletteIndexFromNumber(number);
    return singleRotationDegree * index;
  }, [getRouletteIndexFromNumber, singleRotationDegree]);

  const getRandomEndRotation = useCallback((minNumberOfSpins: number, maxNumberOfSpins: number) => {
    const rotateTo = anime.random(
      minNumberOfSpins * totalNumbers,
      maxNumberOfSpins * totalNumbers
    );
    return singleRotationDegree * rotateTo;
  }, [singleRotationDegree, totalNumbers]);

  const getZeroEndRotation = useCallback((totalRotation: number) => {
    return 360 - Math.abs(totalRotation % 360);
  }, []);

  const getBallEndRotation = useCallback((zeroEndRotation: number, currentNumber: number) => {
    return Math.abs(zeroEndRotation) + getRotationFromNumber(currentNumber);
  }, [getRotationFromNumber]);

  const getBallNumberOfRotations = useCallback((minNumberOfSpins: number, maxNumberOfSpins: number) => {
    const numberOfSpins = anime.random(minNumberOfSpins, maxNumberOfSpins);
    return 360 * numberOfSpins;
  }, []);

  const spinWheel = useCallback((number: number) => {
    if (!wheelRef.current) return;

    // Track when this spin started (for background tab handling)
    spinStartTimeRef.current = Date.now();
    animationCompletedRef.current = false;
    // Store the target number for this spin (in case prop changes during animation)
    spinTargetNumberRef.current = number;

    const bezier = [0.165, 0.84, 0.44, 1.005];
    const fullSpins = 5; // Fixed number of full rotations for visual effect

    const currentNumber = number;

    // DETERMINISTIC rotation: Calculate exact position to land on target number
    // The wheel image has numbers arranged with 0 at the top
    // Each number's position = index * (360/37) degrees clockwise from 0
    const targetIndex = getRouletteIndexFromNumber(currentNumber);
    const targetAngle = targetIndex * singleRotationDegree;

    // Add a DETERMINISTIC offset based on the number itself to make it look varied
    // This way different numbers land at different visual positions (not always at top)
    // But same number = same position on ALL tabs (deterministic)
    const visualOffset = ((currentNumber * 47) % 360); // Pseudo-random but deterministic

    // Wheel rotation: spins + target angle + offset
    // The winning number won't be at the top, but at (visualOffset) degrees from top
    const wheelEndRotation = -(fullSpins * 360 + targetAngle + visualOffset);

    // Ball rotates CLOCKWISE (opposite direction from wheel) for realistic effect
    // Ball ends at the same offset position where the winning number now is
    const ballFullSpins = fullSpins + 2;
    const ballEndRotation = ballFullSpins * 360 - visualOffset; // Ends at the offset position

    // Debug logging to verify all tabs get same values
    console.log('[RealisticWheel] SPIN:', {
      targetNumber: currentNumber,
      targetIndex,
      targetAngle,
      wheelEndRotation,
      ballEndRotation
    });

    // Get elements within our wheel ref
    const layer2 = wheelRef.current.querySelector('.layer-2');
    const layer4 = wheelRef.current.querySelector('.layer-4');
    const ballContainer = wheelRef.current.querySelector('.ball-container');

    if (!layer2 || !layer4 || !ballContainer) return;

    // Reset wheel to starting position (0 degrees)
    anime.set([layer2, layer4], {
      rotate: 0
    });

    // Reset ball container
    anime.set(ballContainer, {
      rotate: 0
    });

    // Animate wheel (counterclockwise)
    anime({
      targets: [layer2, layer4],
      rotate: wheelEndRotation,
      duration: singleSpinDuration,
      easing: `cubicBezier(${bezier.join(',')})`,
      complete: function() {
        lastNumberRef.current = currentNumber;
        // Mark animation as completed to prevent duplicate callbacks
        if (!animationCompletedRef.current) {
          animationCompletedRef.current = true;
          spinStartTimeRef.current = null;
          if (onAnimationCompleteRef.current) {
            onAnimationCompleteRef.current();
          }
        }
      }
    });

    // Animate ball - rotates with the wheel so it "lands" on the target number
    anime({
      targets: ballContainer,
      translateY: [
        { value: 0, duration: 2000 },
        { value: 20, duration: 1000 },
        { value: 25, duration: 900 },
        { value: 50, duration: 1000 }
      ],
      rotate: [{ value: ballEndRotation, duration: singleSpinDuration }],
      loop: 1,
      easing: `cubicBezier(${bezier.join(',')})`
    });
  }, [getRouletteIndexFromNumber, singleRotationDegree, singleSpinDuration]);

  useEffect(() => {
    console.log('[RealisticWheel] useEffect - isSpinning:', isSpinning, 'targetNumber:', targetNumber, 'hasSpun:', hasSpunRef.current);
    if (isSpinning && targetNumber !== null && !hasSpunRef.current) {
      hasSpunRef.current = true;
      console.log('[RealisticWheel] >>> STARTING SPIN with targetNumber:', targetNumber);
      spinWheel(targetNumber);
    }

    if (!isSpinning) {
      hasSpunRef.current = false;
    }
  }, [isSpinning, targetNumber, spinWheel]);

  // Force complete animation - shared helper for visibility change and fallback timer
  const forceCompleteAnimation = useCallback(() => {
    if (animationCompletedRef.current) return; // Already completed

    const targetNum = spinTargetNumberRef.current;
    console.log('[RealisticWheel] Force completing animation for number:', targetNum);

    // Stop any running anime.js animations AND set final position
    if (wheelRef.current && targetNum !== null) {
      const layer2 = wheelRef.current.querySelector('.layer-2') as HTMLElement;
      const layer4 = wheelRef.current.querySelector('.layer-4') as HTMLElement;
      const ballContainer = wheelRef.current.querySelector('.ball-container') as HTMLElement;

      // Remove animations
      if (layer2) anime.remove(layer2);
      if (layer4) anime.remove(layer4);
      if (ballContainer) anime.remove(ballContainer);

      // Calculate and SET the final rotation (same math as spinWheel)
      const targetIndex = rouletteWheelNumbers.indexOf(targetNum);
      const targetAngle = targetIndex * singleRotationDegree;
      const visualOffset = ((targetNum * 47) % 360); // Same offset as spinWheel
      const fullSpins = 5;
      const wheelEndRotation = -(fullSpins * 360 + targetAngle + visualOffset);
      const ballFullSpins = fullSpins + 2;
      const ballEndRotation = ballFullSpins * 360 - visualOffset;

      console.log('[RealisticWheel] Setting final rotation - wheelEnd:', wheelEndRotation, 'ballEnd:', ballEndRotation);

      // Apply final rotation directly (include translateY for ball's final "landed" position)
      if (layer2) layer2.style.transform = `rotate(${wheelEndRotation}deg)`;
      if (layer4) layer4.style.transform = `rotate(${wheelEndRotation}deg)`;
      if (ballContainer) ballContainer.style.transform = `rotate(${ballEndRotation}deg) translateY(50px)`;
    }

    // Mark as completed and trigger callback
    animationCompletedRef.current = true;
    spinStartTimeRef.current = null;

    // Update last number ref using the ORIGINAL target number from when spin started
    if (targetNum !== null) {
      lastNumberRef.current = targetNum;
    }
    spinTargetNumberRef.current = null;

    // Trigger the completion callback
    if (onAnimationCompleteRef.current) {
      onAnimationCompleteRef.current();
    }
  }, [singleRotationDegree]); // Only depends on constant

  // Handle visibility change - complete animation if tab was in background and time has passed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if we have an active spin that should have completed
        if (spinStartTimeRef.current && !animationCompletedRef.current) {
          const elapsed = Date.now() - spinStartTimeRef.current;

          // If enough time has passed (spin duration + small buffer), complete immediately
          if (elapsed >= SPIN_DURATION) {
            console.log('[RealisticWheel] Tab visible - completing animation (elapsed:', elapsed, 'ms)');
            forceCompleteAnimation();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [forceCompleteAnimation]);

  // Fallback: Periodic check to ensure animation completes even if visibility event doesn't fire
  // This handles edge cases like switching between browser windows
  useEffect(() => {
    if (!isSpinning || targetNumber === null) return;

    const checkInterval = setInterval(() => {
      if (spinStartTimeRef.current && !animationCompletedRef.current) {
        const elapsed = Date.now() - spinStartTimeRef.current;

        // Add 500ms buffer beyond spin duration for safety
        if (elapsed >= SPIN_DURATION + 500) {
          console.log('[RealisticWheel] Fallback timer - completing animation (elapsed:', elapsed, 'ms)');
          forceCompleteAnimation();
        }
      }
    }, 1000); // Check every second

    return () => clearInterval(checkInterval);
  }, [isSpinning, targetNumber, forceCompleteAnimation]);

  return (
    <div className="roulette-wheel" ref={wheelRef}>
      <div className="layer-2 wheel" style={{ transform: 'rotate(0deg)' }}></div>
      <div className="layer-3"></div>
      <div className="layer-4 wheel" style={{ transform: 'rotate(0deg)' }}></div>
      <div className="layer-5"></div>
      <div className="ball-container" style={{ transform: 'rotate(0deg)' }}>
        <div className="ball" style={{ transform: 'translate(0, -163.221px)' }}></div>
      </div>
    </div>
  );
}
