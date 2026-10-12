import { CONTACT_EMAIL } from "../content";
import Logo from "./Logo";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Logo tagline />
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <p className={styles.legal}>© {new Date().getFullYear()} RENTrust Nigeria Limited</p>
      </div>
    </footer>
  );
}
