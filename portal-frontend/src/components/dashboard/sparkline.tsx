"use client";

import { motion } from "framer-motion";

interface SparkLineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

// Smoothing algorithm for SVG Bezier Curves
const smoothing = 0.2;
const controlPoint = (current: number[], previous: number[], next: number[], reverse?: boolean) => {
  const p = previous || current;
  const n = next || current;
  const angle = Math.atan2(n[1] - p[1], n[0] - p[0]) + (reverse ? Math.PI : 0);
  const length = Math.sqrt(Math.pow(n[0] - p[0], 2) + Math.pow(n[1] - p[1], 2)) * smoothing;
  return [current[0] + Math.cos(angle) * length, current[1] + Math.sin(angle) * length];
};

const bezierCommand = (point: number[], i: number, a: number[][]) => {
  const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point);
  const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
  return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`;
};

/**
 * Premium Edge-to-Edge Sparkline
 * Uses bezier curves for smoothness and allows the gradient to fill to the very bottom.
 */
export function SparkLine({ data, color, width = 200, height = 48 }: SparkLineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const paddingY = 8; // Top padding only

  // Map data to x,y coordinates
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = paddingY + (1 - (val - min) / range) * (height - paddingY);
    return [x, y];
  });

  // Generate smooth path
  const pathD = points.reduce(
    (acc, point, i, a) => (i === 0 ? `M ${point[0]},${point[1]}` : `${acc} ${bezierCommand(point, i, a)}`),
    ""
  );

  // Fill area path (close the path to the bottom edges)
  const fillD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <motion.svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
      className="absolute bottom-0 left-0 right-0 w-full"
      style={{ height: `${height}px` }}
    >
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#spark-${color.replace("#", "")})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
      />
      {/* End dot with glow */}
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={3}
        fill="#ffffff"
        stroke={color}
        strokeWidth={2}
        className="drop-shadow-[0_0_6px_currentColor]"
        style={{ color: color }}
      />
    </motion.svg>
  );
}
