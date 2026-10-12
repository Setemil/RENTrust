import { useRef, type RefObject } from "react";
import { gsap, useMotion } from "../../lib/motion";
import { toPath, type Point } from "./geometry";
import { HatchPattern } from "./marks";
import styles from "./plan.module.css";

type Parcel = {
  key: string;
  label: string;
  points: Point[];
  labelAt: Point;
  leaderFrom: Point;
  keyAt: Point;
  driftFrom: Point;
};

const parcels: Parcel[] = [
  {
    key: "A",
    label: "You",
    points: [{ x: 60, y: 90 }, { x: 330, y: 60 }, { x: 360, y: 300 }, { x: 80, y: 330 }],
    labelAt: { x: 112, y: 200 },
    leaderFrom: { x: 140, y: 130 },
    keyAt: { x: 575, y: 75 },
    driftFrom: { x: -70, y: -20 },
  },
  {
    key: "B",
    label: "Landlord",
    points: [{ x: 220, y: 40 }, { x: 500, y: 80 }, { x: 480, y: 320 }, { x: 200, y: 300 }],
    labelAt: { x: 420, y: 140 },
    leaderFrom: { x: 465, y: 225 },
    keyAt: { x: 575, y: 225 },
    driftFrom: { x: 70, y: -40 },
  },
  {
    key: "C",
    label: "Property",
    points: [{ x: 150, y: 190 }, { x: 430, y: 170 }, { x: 450, y: 390 }, { x: 130, y: 400 }],
    labelAt: { x: 300, y: 362 },
    leaderFrom: { x: 425, y: 375 },
    keyAt: { x: 575, y: 375 },
    driftFrom: { x: 0, y: 60 },
  },
];

const [first, ...rest] = parcels;

function useConverge(svg: RefObject<SVGSVGElement | null>) {
  useMotion(svg, () => {
    gsap
      .timeline({ scrollTrigger: { trigger: svg.current, start: "top 85%", end: "center 55%", scrub: 0.6 } })
      .from("[data-parcel]", {
        x: (i: number) => parcels[i].driftFrom.x,
        y: (i: number) => parcels[i].driftFrom.y,
        ease: "power2.out",
      })
      .from("[data-verified]", { opacity: 0, duration: 0.35 });
  });
}

export default function OverlapPlan() {
  const svg = useRef<SVGSVGElement>(null);
  useConverge(svg);

  return (
    <svg
      ref={svg}
      className={`${styles.plan} ${styles.overlap}`}
      viewBox="0 0 600 450"
      role="img"
      aria-label="Three overlapping plot boundaries labelled You, Landlord and Property. Only the area where all three overlap is marked verified."
    >
      <defs>
        <HatchPattern id="overlap-hatch" />
        {rest.map((parcel) => (
          <clipPath key={parcel.key} id={`clip-${parcel.key}`}>
            <path d={toPath(parcel.points)} />
          </clipPath>
        ))}
      </defs>

      <g data-verified>
        {rest.reduceRight(
          (inner, parcel) => <g clipPath={`url(#clip-${parcel.key})`}>{inner}</g>,
          <path d={toPath(first.points)} fill="url(#overlap-hatch)" />,
        )}
      </g>

      {parcels.map((parcel) => (
        <g key={parcel.key}>
          <g data-parcel>
            <path d={toPath(parcel.points)} className={styles.parcelOutline} />
            <text x={parcel.labelAt.x} y={parcel.labelAt.y} className={styles.parcelLabel}>
              {parcel.label}
            </text>
          </g>
          <line
            x1={parcel.leaderFrom.x}
            y1={parcel.leaderFrom.y}
            x2={parcel.keyAt.x - 15}
            y2={parcel.keyAt.y}
            className={styles.leader}
          />
          <circle cx={parcel.leaderFrom.x} cy={parcel.leaderFrom.y} r={3.5} className={styles.leaderDot} />
          <g className={styles.key}>
            <circle cx={parcel.keyAt.x} cy={parcel.keyAt.y} r={15} />
            <text x={parcel.keyAt.x} y={parcel.keyAt.y + 1}>
              {parcel.key}
            </text>
          </g>
        </g>
      ))}

      <text x={288} y={250} className={styles.verifiedLabel} data-verified>
        Verified
      </text>
    </svg>
  );
}
