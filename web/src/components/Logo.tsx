import { useId } from "react";
import styles from "./Logo.module.css";

const CHECK = "M18 35 L28 46 L57 8";

export function LogoMark({ size = 36 }: { size?: number }) {
  const maskId = useId();
  return (
    <svg
      className={styles.mark}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d={CHECK} fill="none" stroke="#000" strokeWidth="10.5" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <g fill="none" stroke="var(--navy)" strokeWidth="4.5">
          <path d="M3 26 L30 7 L45 17" />
          <path d="M13 27 V37 C13 48 21 55 32 60 C43 55 51 48 51 37 V30" />
        </g>
        <g fill="var(--navy)">
          <rect x="10" y="7" width="5.5" height="12" />
          <rect x="26.5" y="18" width="3.6" height="3.6" />
          <rect x="31.2" y="18" width="3.6" height="3.6" />
          <rect x="26.5" y="22.7" width="3.6" height="3.6" />
          <rect x="31.2" y="22.7" width="3.6" height="3.6" />
        </g>
      </g>
      <path d={CHECK} fill="none" stroke="var(--green)" strokeWidth="5.5" />
    </svg>
  );
}

export default function Logo({ tagline = false }: { tagline?: boolean }) {
  return (
    <span className={styles.logo}>
      <LogoMark />
      <span className={styles.text}>
        <span className={styles.word}>
          <span className={styles.ren}>REN</span>
          <span className={styles.trust}>Trust</span>
        </span>
        {tagline && <span className={styles.tagline}>Marketplace for Verified Property Listings</span>}
      </span>
    </span>
  );
}
