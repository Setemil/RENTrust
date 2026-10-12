import type { CSSProperties, ReactNode } from "react";
import styles from "./Sheet.module.css";

export type SheetInfo = { number: number; total: number; scale: number };

const scaleUnit = (scale: number) => Math.round(6 * Math.sqrt(200 / scale));

type SheetProps = {
  id: string;
  sheet: SheetInfo;
  title?: string;
  intro?: string;
  tone?: "film" | "navy";
  grid?: boolean;
  fillViewport?: boolean;
  className?: string;
  children: ReactNode;
};

export default function Sheet({ id, sheet, title, intro, tone = "film", grid = true, fillViewport = false, className = "", children }: SheetProps) {
  const titleId = title ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={`${styles.sheet} ${styles[tone]} ${fillViewport ? styles.fillViewport : ""} ${className}`}
      style={{ "--unit": `${scaleUnit(sheet.scale)}px` } as CSSProperties}
    >
      <div className={styles.frame} data-sheet-frame>
        <div className={`${styles.inner} ${grid ? styles.grid : ""}`}>
          {title && (
            <header className={styles.header}>
              <h2 id={titleId}>{title}</h2>
              {intro && <p>{intro}</p>}
            </header>
          )}
          {children}
          <dl className={styles.cell} aria-hidden="true">
            <div>
              <dt>Sheet</dt>
              <dd>
                {sheet.number} of {sheet.total}
              </dd>
            </div>
            <div>
              <dt>Scale</dt>
              <dd>
                1:{sheet.scale}
                <span className={styles.scaleBar}>
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
