import React, { useEffect, useState } from 'react';

interface CountdownRingProps {
  deadline: number | undefined;
  size?: number;
  strokeWidth?: number;
  isMyTurn?: boolean;
}

export const CountdownRing: React.FC<CountdownRingProps> = ({
  deadline,
  size = 54,
  strokeWidth = 5,
  isMyTurn = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [initialSeconds, setInitialSeconds] = useState<number>(60);

  useEffect(() => {
    if (!deadline) {
      setTimeLeft(null);
      return;
    }

    const remainingMs = Math.max(0, deadline - Date.now());
    const seconds = Math.ceil(remainingMs / 1000);
    setTimeLeft(seconds);
    // If remaining is greater than 30, adapt initialSeconds
    setInitialSeconds(Math.max(seconds, 30));

    const interval = setInterval(() => {
      const ms = Math.max(0, deadline - Date.now());
      setTimeLeft(Math.ceil(ms / 1000));
    }, 250);

    return () => clearInterval(interval);
  }, [deadline]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // If no deadline, display infinity with a calm gold/green ring
  if (timeLeft === null) {
    return (
      <div
        className="countdown-ring"
        style={{ width: size, height: size, position: 'relative' }}
        title="No time limit"
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
            stroke={isMyTurn ? '#d4af37' : '#3b82f6'}
            strokeWidth={strokeWidth}
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
            fontWeight: 800,
            fontSize: size * 0.45,
            color: isMyTurn ? '#d4af37' : '#94a3b8',
          }}
        >
          ∞
        </div>
      </div>
    );
  }

  const progress = Math.min(1, Math.max(0, timeLeft / Math.max(initialSeconds, 1)));
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
          fontWeight: 800,
          fontSize: size * 0.35,
          color: ringColor,
        }}
      >
        {timeLeft}
      </div>
    </div>
  );
};
