import type { CSSProperties } from "react";
import { bearing, centroid, directionFrom, distance, edgeLabelPosition, edges, toPath, traverseFractions, type Point } from "./geometry";
import { Beacon, HatchPattern, NorthArrow, ScaleBar } from "./marks";
import styles from "./plan.module.css";

const WIDTH = 1200;
const HEIGHT = 680;
const GRID = 80;
const TRAVERSE_SECONDS = 2.6;
const START_SECONDS = 0.4;

const boundary: Point[] = [
  { x: 150, y: 112 },
  { x: 930, y: 62 },
  { x: 1080, y: 262 },
  { x: 1036, y: 584 },
  { x: 470, y: 632 },
  { x: 128, y: 486 },
];

const outline = toPath(boundary);
const center = centroid(boundary);
const arrivals = traverseFractions(boundary).map((f) => START_SECONDS + f * TRAVERSE_SECONDS);
const beaconId = (i: number) => `RT ${String(i + 1).padStart(2, "0")}`;

export default function ParcelPlan() {
  return (
    <svg
      className={`${styles.plan} ${styles.parcel}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Survey-style drawing of a sample plot whose six boundary beacons are checked one by one until the plot is marked verified."
      style={{ "--traverse": `${TRAVERSE_SECONDS}s`, "--start": `${START_SECONDS}s` } as CSSProperties}
    >
      <defs>
        <HatchPattern id="parcel-hatch" />
      </defs>

      <g className={styles.grid}>
        {Array.from({ length: WIDTH / GRID + 1 }, (_, i) => (
          <line key={`v${i}`} x1={i * GRID} y1={0} x2={i * GRID} y2={HEIGHT} />
        ))}
        {Array.from({ length: Math.floor(HEIGHT / GRID) + 1 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * GRID} x2={WIDTH} y2={i * GRID} />
        ))}
      </g>

      <path d={outline} className={styles.plotFill} fill="url(#parcel-hatch)" />
      <path d={outline} className={styles.boundary} pathLength={1} />

      {edges(boundary).map(({ from, to }, i) => {
        const label = edgeLabelPosition(from, to, center, 16);
        return (
          <text
            key={i}
            className={styles.edgeLabel}
            transform={`translate(${label.x} ${label.y}) rotate(${label.angle})`}
            style={{ "--dx": label.normal.x, "--dy": label.normal.y } as CSSProperties}
          >
            {bearing(from, to)}
            <tspan dx={14} className={styles.distance}>
              {distance(from, to)}
            </tspan>
          </text>
        );
      })}

      {boundary.map((point, i) => (
        <Beacon
          key={i}
          at={point}
          label={beaconId(i)}
          direction={directionFrom(center, point)}
          delay={arrivals[i]}
          className={i === 0 ? styles.closingBeacon : ""}
        />
      ))}

      <g className={styles.legend}>
        <rect x={1000} y={52} width={28} height={18} fill="url(#parcel-hatch)" className={styles.plotFill} />
        <text x={1040} y={62} className={styles.verifiedLabel}>
          Verified plot
        </text>
      </g>

      <NorthArrow at={{ x: 84, y: 60 }} />
      <ScaleBar at={{ x: 150, y: 28 }} units={2} />
    </svg>
  );
}
