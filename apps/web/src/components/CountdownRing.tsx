import React, { useEffect, useState } from 'react';

interface CountdownRingProps {
  deadline: number | undefined;
  size?: number;
  strokeWidth?: number;
  isMyTurn?: boolean;
}

const TOTAL_SECONDS = 30;

export const CountdownRing: React.FC<CountdownRingProps> = ({
  deadline,
  size = 54,
  strokeWidth = 5,
  isMyTurn = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(TOTAL_SECONDS);

  useEffect(() => {
    if (!deadline) {
      setTimeLeft(TOTAL_SECONDS);
      return;
    }

    const updateTimer = () => {
      const remainingMs = Math.max(0, deadline - Date.now());
      setTimeLeft(Math.ceil(remainingMs / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [deadline]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, timeLeft / TOTAL_SECONDS));
  const strokeDashoffset = circumference * (1 - progress);

  const ringColor = timeLeft <= 5
    ? '#ef4444' // red
    : timeLeft <= 10
    ? '#f59e0b' // amber
    : isMyTurn
    ? '#10b981' // green
    : '#3b82f6'; // blue

  return (
    <div
      className="countdown-ring"
      style={{ width: size, height: size, position: 'relative' }}
      title={`${timeLeft}s remaining`}
    >
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="rgba(0, 0, 0, 0.4)"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s ease',
          }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: size * 0.35,
          color: ringColor,
        }}
      >
        {timeLeft}
      </div>
    </div>
  );
};
