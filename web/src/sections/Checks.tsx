import { checks } from "../content";
import OverlapPlan from "../components/plan/OverlapPlan";
import Sheet, { type SheetInfo } from "../components/Sheet";
import styles from "./Checks.module.css";

export default function Checks({ sheet }: { sheet: SheetInfo }) {
  return (
    <Sheet id="checks" sheet={sheet} title={checks.title} intro={checks.body}>
      <div className={styles.layout}>
        <OverlapPlan />
        <ul className={styles.notes}>
          {checks.items.map((item) => (
            <li key={item.key}>
              <span className={styles.key} aria-hidden="true">
                {item.key}
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
