import { WAITLIST_ID, nav } from "../content";
import button from "./Button.module.css";
import Logo from "./Logo";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="#top" className={styles.home} aria-label="RENTrust home">
          <Logo />
        </a>
        <nav aria-label="Main" className={styles.nav}>
          {nav.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <a href={`#${WAITLIST_ID}`} className={`${button.button} ${button.small}`}>
          Join the waitlist
        </a>
      </div>
    </header>
  );
}
