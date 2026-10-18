import type { ReactNode } from "react";
import Sheet from "../components/Sheet";
import TitleBlock from "../components/TitleBlock";
import styles from "./AuthLayout.module.css";

type AuthLayoutProps = {
  id: string;
  heading: string;
  intro: string;
  aside?: ReactNode;
  blockTitle: string;
  blockMeta: string;
  children: ReactNode;
};

export default function AuthLayout({ id, heading, intro, aside, blockTitle, blockMeta, children }: AuthLayoutProps) {
  return (
    <Sheet id={id} sheet={{ number: 1, total: 1, scale: 50 }}>
      <div className={styles.layout}>
        <div className={styles.copy}>
          <h1>{heading}</h1>
          <p className={styles.intro}>{intro}</p>
          {aside}
        </div>
        <TitleBlock title={blockTitle} meta={blockMeta}>
          {children}
        </TitleBlock>
      </div>
    </Sheet>
  );
}
