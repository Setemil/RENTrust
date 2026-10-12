import type { ReactNode } from "react";
import styles from "./TitleBlock.module.css";

type Field = { label: string; value: string };

type TitleBlockProps = {
  title: string;
  meta?: string;
  id?: string;
  fields?: Field[];
  children: ReactNode;
};

export default function TitleBlock({ title, meta, id, fields, children }: TitleBlockProps) {
  return (
    <div id={id} className={styles.block}>
      <div className={styles.head}>
        <p className={styles.title}>{title}</p>
        {meta && <p className={styles.meta}>{meta}</p>}
      </div>
      <div className={fields ? styles.split : undefined}>
        {fields && (
          <dl className={styles.fields}>
            {fields.map((field) => (
              <div key={field.label}>
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
