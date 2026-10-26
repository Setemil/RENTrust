import styles from "./PlotMark.module.css";

// Each listing gets its own small parcel outline, derived from its reference so it never changes.
// It stands in for photography, which the brand doesn't use. The boundary closes green only when
// RENTrust has verified the property's documents.
function corners(seed: number): [number, number][] {
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return [
    [6 + rand() * 8, 8 + rand() * 10],
    [30 + rand() * 10, 5 + rand() * 8],
    [42 - rand() * 4, 28 + rand() * 10],
    [10 + rand() * 10, 40 - rand() * 4],
  ];
}

export default function PlotMark({ refCode, verified, size = 48 }: { refCode: string; verified: boolean; size?: number }) {
  const seed = Number(refCode.replace(/\D/g, "")) || 1;
  const pts = corners(seed);
  const d = `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")} Z`;
  return (
    <svg className={styles.plot} data-verified={verified || undefined} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d={d} className={styles.fill} />
      <path d={d} className={styles.line} />
      {pts.map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="2.6" className={styles.beacon} />
      ))}
    </svg>
  );
}
