import type { ReactNode } from "react";
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
    <section id={id} className={styles.page}>
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
    </section>
  );
}
