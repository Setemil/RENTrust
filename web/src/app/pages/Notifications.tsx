import { useNavigate } from "react-router";
import button from "../../components/Button.module.css";
import { api } from "../api";
import { useAuth } from "../auth";
import { ago } from "../format";
import type { AppNotification } from "../types";
import { Empty, ErrorNote, Loading, Page, uiStyles } from "../ui";
import { useAction, useApi } from "../useApi";
import styles from "./Notifications.module.css";

const channelName = { EMAIL: "email", SMS: "SMS" };

export default function Notifications() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading, reload, setData } = useApi<{ unread: number; notifications: AppNotification[] }>("/notifications");
  const readAll = useAction();

  async function open(n: AppNotification) {
    if (!n.readAt) {
      setData((d) => d && { unread: Math.max(0, d.unread - 1), notifications: d.notifications.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) });
      api(`/notifications/${n.id}/read`, { method: "POST", token }).catch(() => {});
    }
    if (n.link) navigate(n.link);
  }

  const list = data?.notifications ?? [];
  return (
    <Page
      title="Notifications"
      intro="Updates about your checks, listings and interests. Character report details are never sent by email or SMS, only a prompt to sign in."
      actions={
        data?.unread ? (
          <button
            type="button"
            className={`${button.button} ${button.outline} ${button.small}`}
            disabled={readAll.pending}
            onClick={async () => (await readAll.run("/notifications/read-all", "POST")) && reload()}
          >
            Mark all as read
          </button>
        ) : undefined
      }
    >
      {error && <ErrorNote message={error.message} retry={reload} />}
      {loading && !data && <Loading rows={5} />}
      {data && !list.length && <Empty title="Nothing yet">You'll see updates here when a check is reviewed, a listing changes or someone responds to an interest.</Empty>}
      {list.length > 0 && (
        <ul className={styles.list}>
          {list.map((n) => (
            <li key={n.id} data-unread={!n.readAt || undefined}>
              <button type="button" className={styles.item} onClick={() => open(n)}>
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.text}>
                  <span className={styles.title}>
                    {!n.readAt && <span className="visually-hidden">Unread: </span>}
                    {n.title}
                  </span>
                  <span className={styles.body}>{n.body}</span>
                  {n.alsoSent.length > 0 && (
                    <span className={styles.channels}>
                      Also sent by {n.alsoSent.map((c) => channelName[c.channel]).join(" and ")}
                      {n.alsoSent.some((c) => c.status === "SIMULATED") && " (simulated, not delivered)"}
                    </span>
                  )}
                </span>
                <span className={`${styles.time} ${uiStyles.muted}`}>{ago(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
