import { useRef, type RefObject } from "react";
import { WAITLIST_ID, hero } from "../content";
import button from "../components/Button.module.css";
import ParcelPlan from "../components/plan/ParcelPlan";
import Sheet, { type SheetInfo } from "../components/Sheet";
import { gsap, useMotion } from "../lib/motion";
import styles from "./Hero.module.css";

function useShrinkToSheet(root: RefObject<HTMLDivElement | null>) {
  useMotion(root, ({ desktop }) => {
    const [hero, next] = gsap.utils.toArray<HTMLElement>(document.querySelectorAll("[data-sheet-frame]"));
    if (!desktop || !hero || !next || next.offsetWidth / hero.offsetWidth > 0.97) return;

    gsap.to(hero, {
      scale: () => next.offsetWidth / hero.offsetWidth,
      transformOrigin: "50% 100%",
      ease: "none",
      scrollTrigger: {
        trigger: root.current,
        start: () => `top ${document.querySelector("header")?.offsetHeight ?? 0}px`,
        end: "+=60%",
        pin: true,
        scrub: 0.4,
        invalidateOnRefresh: true,
      },
    });
  });
}

export default function Hero({ sheet }: { sheet: SheetInfo }) {
  const root = useRef<HTMLDivElement>(null);
  useShrinkToSheet(root);

  return (
    <div ref={root}>
      <Sheet id="top" sheet={sheet} grid={false} fillViewport className={styles.sheet}>
        <div className={styles.stage}>
          <div className={styles.plan}>
            <ParcelPlan />
          </div>
          <div className={styles.copy}>
            <h1>{hero.title}</h1>
            <p className={styles.slogan}>{hero.slogan}</p>
            <p>{hero.body}</p>
            <div className={styles.actions}>
              <a href={`#${WAITLIST_ID}`} className={button.button}>
                Join the waitlist
              </a>
              <a href="#steps" className={`${button.button} ${button.outline}`}>
                See how it works
              </a>
            </div>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
