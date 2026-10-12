import type { CSSProperties } from "react";
import type { Point } from "./geometry";
import styles from "./plan.module.css";

type BeaconProps = {
  at: Point;
  label: string;
  direction: Point;
  delay?: number;
  className?: string;
};

const LABEL_OFFSET = 30;

export function Beacon({ at, label, direction, delay = 0, className = "" }: BeaconProps) {
  const style = { "--delay": `${delay}s`, "--dx": direction.x, "--dy": direction.y } as CSSProperties;
  return (
    <g className={`${styles.beacon} ${className}`} style={style}>
      <circle cx={at.x} cy={at.y} r={7} />
      <text x={at.x + direction.x * LABEL_OFFSET} y={at.y + direction.y * LABEL_OFFSET} className={styles.beaconLabel}>
        {label}
      </text>
    </g>
  );
}

export function HatchPattern({ id }: { id: string }) {
  return (
    <pattern id={id} width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1={0} y1={0} x2={0} y2={10} className={styles.hatchLine} />
    </pattern>
  );
}

export function NorthArrow({ at }: { at: Point }) {
  const { x, y } = at;
  return (
    <g className={styles.mark}>
      <path d={`M${x} ${y - 34} L${x + 11} ${y + 10} L${x} ${y + 2} L${x - 11} ${y + 10} Z`} />
      <text x={x} y={y - 44} className={styles.markLabel}>
        N
      </text>
    </g>
  );
}

export function ScaleBar({ at, units = 4, unitWidth = 50, metresPerUnit = 2 }: { at: Point; units?: number; unitWidth?: number; metresPerUnit?: number }) {
  return (
    <g className={styles.mark}>
      {Array.from({ length: units }, (_, i) => (
        <rect
          key={i}
          x={at.x + i * unitWidth}
          y={at.y}
          width={unitWidth}
          height={6}
          className={i % 2 ? styles.scaleOpen : styles.scaleFilled}
        />
      ))}
      {Array.from({ length: units + 1 }, (_, i) => (
        <text
          key={i}
          x={at.x + i * unitWidth}
          y={at.y + 24}
          className={`${styles.markLabel} ${i > 0 && i < units ? styles.minorLabel : ""}`}
        >
          {i * metresPerUnit}
        </text>
      ))}
      <text x={at.x + units * unitWidth + 14} y={at.y + 7} className={styles.markUnit}>
        m
      </text>
    </g>
  );
}
