import { useEffect } from "react";
import { Link, NavLink } from "react-router";
import button from "../../components/Button.module.css";
import Logo from "../../components/Logo";
import { type LegalDocument, type LegalSection, legalDocuments } from "../../legal/documents";
import { useAuth } from "../auth";
import shell from "../AppShell.module.css";
import styles from "./Legal.module.css";

// The Terms of Use and the Privacy Policy, readable by anyone, signed in or not. The text lives
// in legal/documents.ts; the PDF is the same document for download.

function Clause({ section }: { section: LegalSection }) {
  return (
    <section id={`section-${section.number}`} className={styles.clause} aria-labelledby={`section-${section.number}-title`}>
      <h2 id={`section-${section.number}-title`}>
        <span className={styles.number}>{section.number}</span>
        {section.heading}
      </h2>
      {section.intro && <p>{section.intro}</p>}
      {section.items && (
        <ul className={styles.items}>
          {section.items.map((item) => (
            <li key={item.label ?? item.text}>
              {item.label && <strong>{item.label}: </strong>}
              {item.text}
              {item.steps && (
                <ol className={styles.steps}>
                  {item.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      )}
      {section.outro && <p>{section.outro}</p>}
    </section>
  );
}

function Contents({ doc }: { doc: LegalDocument }) {
  const list = (
    <ol className={styles.contents}>
      {doc.sections.map((s) => (
        <li key={s.number}>
          <a href={`#section-${s.number}`}>
            <span className={styles.number}>{s.number}</span>
            {s.heading}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <nav aria-label="Contents" className={styles.toc}>
      <details className={styles.tocMobile}>
        <summary>Contents</summary>
        {list}
      </details>
      <div className={styles.tocDesktop}>
        <p className={styles.tocTitle}>Contents</p>
        {list}
      </div>
    </nav>
  );
}

export default function Legal({ doc }: { doc: LegalDocument }) {
  const { user } = useAuth();
  const other = legalDocuments.find((d) => d.slug !== doc.slug)!;

  useEffect(() => {
    const before = document.title;
    document.title = `${doc.title} · RENTrust`;
    return () => {
      document.title = before;
    };
  }, [doc.title]);

  const facts = [
    { label: "Company", value: doc.company },
    { label: "Version", value: doc.version },
    { label: "Effective", value: doc.effective },
    ...doc.facts,
  ];

  return (
    <div className={shell.app}>
      <header className={shell.header}>
        <div className={shell.inner}>
          <Link to="/" className={shell.home} aria-label="RENTrust home">
            <Logo />
          </Link>
          <nav aria-label="Legal documents" className={styles.docNav}>
            {legalDocuments.map((d) => (
              <NavLink key={d.slug} to={d.path}>
                {d.title}
              </NavLink>
            ))}
          </nav>
          <Link to={user ? "/app" : "/"} className={styles.back}>
            {user ? "Back to your account" : "RENTrust home"}
          </Link>
        </div>
      </header>

      <main className={styles.page}>
        <article className={styles.sheet}>
          <header className={styles.head}>
            <h1>{doc.title}</h1>
            <p className={styles.lead}>{doc.fullTitle}</p>
          </header>

          <div className={styles.layout}>
            <aside className={styles.side}>
              <dl className={styles.facts}>
                {facts.map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
              <a className={`${button.button} ${button.outline} ${button.small} ${styles.pdf}`} href={doc.pdf} download>
                Download PDF
              </a>
              <Contents doc={doc} />
            </aside>

            <div className={styles.body}>
              <p className={styles.notice}>
                <strong>{doc.notice.label}: </strong>
                {doc.notice.text}
              </p>
              {doc.sections.map((s) => (
                <Clause key={s.number} section={s} />
              ))}
              <section className={styles.closing} aria-labelledby="closing-title">
                <h2 id="closing-title">{doc.closing.title}</h2>
                <div className={styles.closingBody}>
                  {doc.closing.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </section>
              <footer className={styles.foot}>
                <p>
                  {doc.company}, {doc.title}, version {doc.version}
                </p>
                <Link to={other.path}>Read the {other.title}</Link>
              </footer>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
