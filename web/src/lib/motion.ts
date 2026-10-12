import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const conditions = {
  motion: "(prefers-reduced-motion: no-preference)",
  desktop: "(min-width: 861px)",
};

type Conditions = Record<keyof typeof conditions, boolean>;

export function useMotion(scope: RefObject<Element | null>, setup: (is: Conditions) => void) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        conditions,
        (context) => {
          const is = context.conditions as Conditions;
          if (is.motion) setup(is);
        },
        scope,
      );
      return () => mm.revert();
    },
    { scope },
  );
}

export { gsap };
