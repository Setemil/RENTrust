import { useRef, type RefObject } from "react";
import { steps } from "../content";
import Sheet, { type SheetInfo } from "../components/Sheet";
import { gsap, useMotion } from "../lib/motion";
import styles from "./Steps.module.css";

function useRoute(list: RefObject<HTMLOListElement | null>) {
  useMotion(list, ({ desktop }) => {
    const legs = gsap.utils.toArray<HTMLElement>("[data-route-leg]");
    const beacons = gsap.utils.toArray<HTMLElement>("[data-route-beacon]");
    const draw = desktop ? { scaleX: 0, transformOrigin: "left center" } : { scaleY: 0, transformOrigin: "center top" };

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: list.current, start: "top 75%", end: "bottom 65%", scrub: 0.5 },
    });
    legs.forEach((leg, i) => {
      tl.from(beacons[i], { scale: 1.6, duration: 0.3, ease: "power2.out" });
      tl.from(leg, { ...draw, duration: 1 });
    });
  });
}

export default function Steps({ sheet }: { sheet: SheetInfo }) {
  const list = useRef<HTMLOListElement>(null);
  useRoute(list);

  return (
    <Sheet id="steps" sheet={sheet} title={steps.title}>
      <ol ref={list} className={styles.traverse}>
        {steps.items.map((step, i) => (
          <li key={step.title} className={styles.station}>
            <span className={styles.route} aria-hidden="true" data-route-leg />
            <span className={styles.beacon} aria-hidden="true" data-route-beacon />
            <span className={styles.number}>{String(i + 1).padStart(2, "0")}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            <p className={styles.unlocks}>{step.unlocks}</p>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}
