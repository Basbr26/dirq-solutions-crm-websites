interface DirqLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

export function DirqLogo({ size = 'md', className = '', animated = false }: DirqLogoProps) {
  const sizeConfig = {
    sm: { height: 40, viewBox: '0 0 600 160' },
    md: { height: 80, viewBox: '0 0 600 160' },
    lg: { height: 120, viewBox: '0 0 600 160' }
  };

  const config = sizeConfig[size];

  return (
    <svg
      width="100%"
      height={config.height}
      viewBox={config.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Magnifying glass circle */}
      <circle
        cx="95"
        cy="80"
        r="58"
        stroke="hsl(var(--primary))"
        strokeWidth="5"
        fill="none"
      />

      {/* Magnifying glass handle */}
      <line
        x1="135"
        y1="121"
        x2="175"
        y2="160"
        stroke="hsl(var(--primary))"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Dirq text inside magnifying glass */}
      <text
        x="95"
        y="80"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="42"
        fontWeight="700"
        textAnchor="middle"
        fill="hsl(var(--primary))"
        dominantBaseline="middle"
      >
        Dirq
      </text>

      {/* Solutions text */}
      <text
        x="230"
        y="80"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="42"
        fontWeight="700"
        fill="hsl(var(--foreground))"
        dominantBaseline="middle"
      >
        Solutions
      </text>
    </svg>
  );
}
