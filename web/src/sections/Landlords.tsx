import { WAITLIST_ID, landlords } from "../content";
import button from "../components/Button.module.css";
import Sheet, { type SheetInfo } from "../components/Sheet";
import styles from "./Landlords.module.css";

export default function Landlords({ sheet }: { sheet: SheetInfo }) {
  return (
    <Sheet id="landlords" sheet={sheet} title={landlords.title} intro={landlords.body}>
      <dl className={styles.schedule}>
        {landlords.items.map((item) => (
          <div key={item.title} className={styles.item}>
            <dt>{item.title}</dt>
            <dd>{item.body}</dd>
          </div>
        ))}
      </dl>
      <a href={`#${WAITLIST_ID}`} className={`${button.button} ${button.outline}`}>
        Join the waitlist as a landlord
      </a>
    </Sheet>
  );
}
