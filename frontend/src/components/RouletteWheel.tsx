import { useEffect, useState, useRef, useCallback } from 'react';

interface RouletteWheelProps {
  isSpinning: boolean;
  lastNumber: number | null;
  onAnimationComplete?: () => void;
}

// European Roulette numbers in wheel order
const wheelNumbers = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const isRed = (num: number) =>
  [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(num);

const getColor = (num: number): string => {
  if (num === 0) return '#15803d'; // green-700
  return isRed(num) ? '#dc2626' : '#1f2937'; // red-600 : gray-800
};

const getColorClass = (num: number) => {
  if (num === 0) return 'bg-green-700';
  return isRed(num) ? 'bg-red-600' : 'bg-gray-800';
};

export function RouletteWheel({ isSpinning, lastNumber, onAnimationComplete }: RouletteWheelProps) {
  const [displayRotation, setDisplayRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startRotationRef = useRef<number>(0);
  const targetRotationRef = useRef<number>(0);
  const displayRotationRef = useRef(0); // Track rotation in ref to avoid dependency issues
  const hasStartedAnimationRef = useRef(false); // Track if animation has started for current spin

  const degreesPerNumber = 360 / wheelNumbers.length;

  // Calculate exact rotation for a number so pointer points at center of segment
  // Pointer is at TOP of visible half-wheel pointing DOWN into the wheel
  const getExactRotationForNumber = useCallback((num: number): number => {
    const numberIndex = wheelNumbers.indexOf(num);
    // The pointer is at the TOP, pointing DOWN
    // The visible part shows the TOP half of the wheel (0-180 degrees)
    // For the number to align with the top pointer (0 degrees position),
    // we need to calculate where the segment center should be
    const segmentCenterAngle = (numberIndex + 0.5) * degreesPerNumber;
    // Rotate so segment center aligns with 0 degrees (top of visible half, where pointer is)
    return 90 - segmentCenterAngle;
  }, [degreesPerNumber]);

  // Store callback in ref to avoid dependency issues
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;

  // Animate with natural slowdown - like a real roulette wheel
  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const duration = 5000; // 5 seconds total spin for natural feel
    const progress = Math.min(elapsed / duration, 1);

    // Custom easing: exponential ease-out for very natural slowdown
    // Fast at start, gradual deceleration, very slow at the end
    // Using sextic ease-out (power of 6) for even smoother deceleration at the end
    const eased = 1 - Math.pow(1 - progress, 6);

    const totalRotation = targetRotationRef.current - startRotationRef.current;
    const currentRotation = startRotationRef.current + totalRotation * eased;

    setDisplayRotation(currentRotation);
    displayRotationRef.current = currentRotation; // Keep ref in sync

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Animation complete - snap to exact position
      console.log('[RouletteWheel] Animation complete! Calling onAnimationComplete');
      const finalRotation = targetRotationRef.current;
      setDisplayRotation(finalRotation);
      displayRotationRef.current = finalRotation;
      setIsAnimating(false);
      setShowResult(true);
      hasStartedAnimationRef.current = false; // Reset for next spin
      // Notify parent that animation is complete
      if (onAnimationCompleteRef.current) {
        console.log('[RouletteWheel] Calling onAnimationComplete callback');
        onAnimationCompleteRef.current();
      } else {
        console.log('[RouletteWheel] WARNING: onAnimationComplete is not defined!');
      }
    }
  }, []);

  useEffect(() => {
    // Only start animation if spinning, have a number, and haven't started yet
    console.log('[RouletteWheel] useEffect - isSpinning:', isSpinning, 'lastNumber:', lastNumber, 'hasStarted:', hasStartedAnimationRef.current);
    if (isSpinning && lastNumber !== null && !hasStartedAnimationRef.current) {
      console.log('[RouletteWheel] Starting animation for number:', lastNumber);
      hasStartedAnimationRef.current = true; // Mark as started to prevent re-triggering
      setShowResult(false);
      setIsAnimating(true);

      // Use ref for current rotation to avoid dependency issues
      const currentRotation = displayRotationRef.current;

      // Calculate target rotation
      const exactFinalRotation = getExactRotationForNumber(lastNumber);
      // Add multiple full rotations for visual effect (at least 5-6 full spins)
      const fullRotations = 6 * 360;
      // Calculate the shortest path to the target angle, then add full rotations
      const currentNormalized = ((currentRotation % 360) + 360) % 360;
      const targetNormalized = ((exactFinalRotation % 360) + 360) % 360;
      let delta = targetNormalized - currentNormalized;
      // Always spin in positive direction (clockwise)
      if (delta <= 0) delta += 360;
      const targetRotation = currentRotation + fullRotations + delta;

      startTimeRef.current = 0;
      startRotationRef.current = currentRotation;
      targetRotationRef.current = targetRotation;

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }

    // Reset the flag when not spinning (ready for next spin)
    if (!isSpinning) {
      hasStartedAnimationRef.current = false;
    }
  }, [isSpinning, lastNumber, animate, getExactRotationForNumber]);

  return (
    <div className="flex flex-col items-center wheel-container">
      {/* Wheel Container with padding for border visibility */}
      <div className="relative wheel-rim-glow" style={{ paddingTop: '40px', paddingBottom: '8px' }}>
        {/* Pointer - at TOP of half-wheel, pointing DOWN into the wheel */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-30"
          style={{ top: '0px' }}
        >
          <div
            className="w-0 h-0 border-l-[18px] border-r-[18px] border-t-[32px] border-l-transparent border-r-transparent border-t-yellow-400"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6))',
            }}
          />
        </div>
        {/* Half Wheel Container */}
        <div
          className="relative overflow-visible"
          style={{
            width: '384px',
            height: '210px',
            overflow: 'hidden',
          }}
        >
          {/* Rotating wheel - full circle but only top half visible */}
          <div
            className="absolute"
            style={{
              width: '384px',
              height: '384px',
              top: '0',
              left: '0',
              transform: `rotate(${displayRotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {/* SVG Wheel for smooth segments */}
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full"
              style={{
                filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.8)) drop-shadow(0 8px 16px rgba(0,0,0,0.6)) drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
              }}
            >
              {/* Outer gold ring with 3D effect */}
              <defs>
                {/* Enhanced gold gradient with more depth and shine */}
                <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fffacd" />
                  <stop offset="10%" stopColor="#fef08a" />
                  <stop offset="25%" stopColor="#fcd34d" />
                  <stop offset="40%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#fef9c3" />
                  <stop offset="60%" stopColor="#fbbf24" />
                  <stop offset="75%" stopColor="#d97706" />
                  <stop offset="90%" stopColor="#b45309" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
                {/* Secondary gold gradient for inner rim */}
                <linearGradient id="goldRimInner" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
                {/* Radial gradient for 3D wheel depth effect */}
                <radialGradient id="wheelDepth" cx="50%" cy="30%" r="70%" fx="50%" fy="30%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                </radialGradient>
                {/* Inner shadow for depth */}
                <radialGradient id="innerDepth" cx="50%" cy="50%" r="50%">
                  <stop offset="70%" stopColor="rgba(0,0,0,0)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
                </radialGradient>
                <filter id="wheelShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.8"/>
                </filter>
                <filter id="innerShadow">
                  <feOffset dx="0" dy="3"/>
                  <feGaussianBlur stdDeviation="4" result="offset-blur"/>
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                  <feFlood floodColor="black" floodOpacity="0.6" result="color"/>
                  <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                  <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                </filter>
                {/* Segment bevel for 3D look */}
                <filter id="segmentBevel">
                  <feMorphology operator="dilate" radius="0.5" in="SourceAlpha" result="expanded"/>
                  <feOffset dx="1" dy="1" in="expanded" result="offsetblur"/>
                  <feFlood floodColor="rgba(255,255,255,0.2)"/>
                  <feComposite in2="offsetblur" operator="in"/>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Outer beveled gold border - outer ring */}
              <circle
                cx="200"
                cy="200"
                r="198"
                fill="#78350f"
              />
              {/* Main gold ring */}
              <circle
                cx="200"
                cy="200"
                r="195"
                fill="url(#goldRing)"
                filter="url(#wheelShadow)"
              />
              {/* Inner gold bevel for 3D depth */}
              <circle
                cx="200"
                cy="200"
                r="183"
                fill="url(#goldRimInner)"
              />

              {/* Main wheel background */}
              <circle
                cx="200"
                cy="200"
                r="180"
                fill="#1a1a2e"
              />

              {/* Wheel segments */}
              {wheelNumbers.map((num, index) => {
                const startAngle = (index * degreesPerNumber - 90) * (Math.PI / 180);
                const endAngle = ((index + 1) * degreesPerNumber - 90) * (Math.PI / 180);
                const innerRadius = 60;
                const outerRadius = 175;

                const x1 = 200 + outerRadius * Math.cos(startAngle);
                const y1 = 200 + outerRadius * Math.sin(startAngle);
                const x2 = 200 + outerRadius * Math.cos(endAngle);
                const y2 = 200 + outerRadius * Math.sin(endAngle);
                const x3 = 200 + innerRadius * Math.cos(endAngle);
                const y3 = 200 + innerRadius * Math.sin(endAngle);
                const x4 = 200 + innerRadius * Math.cos(startAngle);
                const y4 = 200 + innerRadius * Math.sin(startAngle);

                const largeArcFlag = degreesPerNumber > 180 ? 1 : 0;

                const pathD = `
                  M ${x1} ${y1}
                  A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
                  L ${x3} ${y3}
                  A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
                  Z
                `;

                // Calculate text position
                const midAngle = ((index + 0.5) * degreesPerNumber - 90) * (Math.PI / 180);
                const textRadius = 125;
                const textX = 200 + textRadius * Math.cos(midAngle);
                const textY = 200 + textRadius * Math.sin(midAngle);
                const textRotation = (index + 0.5) * degreesPerNumber;

                return (
                  <g key={num}>
                    <path
                      d={pathD}
                      fill={getColor(num)}
                      stroke="#d4a017"
                      strokeWidth="1"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                      style={{
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                      }}
                    >
                      {num}
                    </text>
                  </g>
                );
              })}

              {/* 3D depth overlay on wheel surface */}
              <circle
                cx="200"
                cy="200"
                r="175"
                fill="url(#wheelDepth)"
                style={{ pointerEvents: 'none' }}
              />
              {/* Inner edge shadow for 3D depth */}
              <circle
                cx="200"
                cy="200"
                r="175"
                fill="url(#innerDepth)"
                style={{ pointerEvents: 'none' }}
              />

              {/* Center hub with 3D effect */}
              <circle
                cx="200"
                cy="200"
                r="55"
                fill="url(#goldRing)"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
              />
              <circle
                cx="200"
                cy="200"
                r="48"
                fill="#1a1a2e"
                filter="url(#innerShadow)"
              />
              {/* Inner hub highlight ring */}
              <circle
                cx="200"
                cy="200"
                r="46"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
              <text
                x="200"
                y="200"
                fill="#fbbf24"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
              >
                ROULETTE
              </text>

              {/* Shine overlay for 3D effect - positioned at top for realistic lighting */}
              <ellipse
                cx="200"
                cy="100"
                rx="150"
                ry="70"
                fill="url(#shineGradient)"
                opacity="0.2"
              />
              <defs>
                <linearGradient id="shineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.5"/>
                  <stop offset="100%" stopColor="white" stopOpacity="0"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* Result display - BELOW the wheel in dark area */}
      <div className="mt-6 min-h-[120px] flex flex-col items-center justify-center">
        {isAnimating && (
          <div className="text-yellow-400 text-xl font-bold animate-pulse" style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.5)' }}>
            SPINNING...
          </div>
        )}

        {showResult && lastNumber !== null && !isSpinning && (
          <div className="text-center">
            <div className="text-yellow-400 text-sm mb-2 font-semibold tracking-wider" style={{ textShadow: '0 0 8px rgba(251, 191, 36, 0.4)' }}>
              ROUND COMPLETE
            </div>
            <div className="text-white text-lg mb-2">
              Winner <span className={`font-bold text-2xl ${lastNumber === 0 ? 'text-green-500' : isRed(lastNumber) ? 'text-red-500' : 'text-gray-300'}`} style={{ textShadow: lastNumber === 0 ? '0 0 10px rgba(34, 197, 94, 0.5)' : isRed(lastNumber) ? '0 0 10px rgba(239, 68, 68, 0.5)' : '0 0 10px rgba(156, 163, 175, 0.5)' }}>{lastNumber}</span>
            </div>
            <div
              className={`${getColorClass(lastNumber)} winner-number winner-number-idle w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg border-4 border-yellow-500 mx-auto`}
            >
              {lastNumber}
            </div>
            <div className="text-gray-400 text-xs mt-2 uppercase">
              {lastNumber === 0 ? 'Green' : isRed(lastNumber) ? 'Red' : 'Black'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
