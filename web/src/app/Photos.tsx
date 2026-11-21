import { useRef, useState, type ChangeEvent } from "react";
import { ApiError, api } from "./api";
import { useAuth } from "./auth";
import { Section, uiStyles } from "./ui";
import { useAction } from "./useApi";
import { useToast } from "./toast";
import type { OwnProperty, Photo } from "./types";
import styles from "./Photos.module.css";

// Listing photos. The lister manages them on the property page (PhotoManager); renters see them
// on the listing page (Gallery) and as the cover on each marketplace row. Uploads go straight
// from the browser to Cloudinary with a signature from our server, then the server records them.

const MAX_PHOTOS = 12;
const MAX_BYTES = 10 * 1024 * 1024; // Cloudinary's free-plan limit per image
const ACCEPT = "image/jpeg,image/png,image/webp";

type Signature = { uploadUrl: string; fields: Record<string, string | number> };

async function uploadPhoto(propertyId: string, file: File, token: string | null) {
  const { uploadUrl, fields } = await api<Signature>(`/properties/${propertyId}/photos/upload`, { method: "POST", token });
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
  form.append("file", file);
  const res = await fetch(uploadUrl, { method: "POST", body: form });
  const reply = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(reply.error?.message ? `Cloudinary: ${reply.error.message}` : "The photo didn't upload. Try again.");
  await api(`/properties/${propertyId}/photos`, {
    method: "POST",
    token,
    body: { publicId: reply.public_id, version: reply.version, signature: reply.signature, width: reply.width, height: reply.height },
  });
}

export function PhotoManager({ property, onChange }: { property: OwnProperty; onChange: () => void }) {
  const { token } = useAuth();
  const toast = useToast();
  const action = useAction();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const photos = property.listing.photos;
  const editable = property.photosEnabled && property.listing.status === "DRAFT";
  const room = MAX_PHOTOS - photos.length;

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = ""; // so choosing the same file again still fires
    const tooBig = chosen.filter((f) => f.size > MAX_BYTES);
    if (tooBig.length) toast({ kind: "error", message: `${tooBig.map((f) => f.name).join(", ")} ${tooBig.length > 1 ? "are" : "is"} over 10 MB.` });
    const files = chosen.filter((f) => f.size <= MAX_BYTES).slice(0, room);
    if (!files.length) return;

    setUploading({ done: 0, total: files.length });
    for (const [i, file] of files.entries()) {
      try {
        await uploadPhoto(property.id, file, token);
      } catch (err) {
        toast(err instanceof ApiError && err.toast ? err.toast : { kind: "error", message: `${file.name}: ${(err as Error).message}` });
      }
      setUploading({ done: i + 1, total: files.length });
    }
    setUploading(null);
    onChange();
  }

  async function act(path: string, method: string) {
    if (await action.run(path, method)) onChange();
  }

  return (
    <Section title="Photos" meta={`${photos.length} of ${MAX_PHOTOS}`} id="photos-title">
      {!property.photosEnabled && <p className={uiStyles.muted}>Photo uploads aren't switched on here yet.</p>}
      {property.photosEnabled && !editable && (
        <p className={`${uiStyles.small} ${uiStyles.muted} ${styles.note}`}>Photos can be changed while the listing is a draft.</p>
      )}
      {action.error && <p className={styles.error} role="alert">{action.error}</p>}
      <ul className={styles.grid}>
        {photos.map((photo, i) => (
          <li key={photo.id} className={styles.tile}>
            <figure className={styles.frame}>
              <img src={photo.thumb} alt={`Photo ${i + 1} of ${property.title}`} loading="lazy" width={640} height={480} />
              {i === 0 && <figcaption className={styles.cover}>Cover</figcaption>}
            </figure>
            {editable && (
              <div className={styles.tools}>
                {i > 0 && (
                  <button type="button" className={uiStyles.linkButton} disabled={action.pending} onClick={() => act(`/properties/${property.id}/photos/${photo.id}/cover`, "POST")}>
                    Make cover
                  </button>
                )}
                <button type="button" className={uiStyles.linkButton} disabled={action.pending} onClick={() => act(`/properties/${property.id}/photos/${photo.id}`, "DELETE")}>
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
        {editable && room > 0 && (
          <li className={styles.tile}>
            <button type="button" className={styles.add} onClick={() => input.current?.click()} disabled={Boolean(uploading)}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M14 6v16M6 14h16" strokeLinecap="square" />
              </svg>
              <span>{uploading ? `Uploading ${uploading.done + 1} of ${uploading.total}…` : photos.length ? "Add more photos" : "Add photos"}</span>
              <span className={styles.addHint}>JPG, PNG or WebP, up to 10 MB each</span>
            </button>
            <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={handleFiles} />
          </li>
        )}
      </ul>
      {editable && !photos.length && !uploading && (
        <p className={`${uiStyles.small} ${uiStyles.muted} ${styles.note}`}>The first photo is the cover renters see in search. Daylight shots of each room work best.</p>
      )}
    </Section>
  );
}

// The listing page: one large photo and a strip of the rest to switch between.
export function Gallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [current, setCurrent] = useState(0);
  if (!photos.length) return null;
  const shown = photos[Math.min(current, photos.length - 1)];
  return (
    <div className={styles.gallery}>
      <figure className={styles.stage}>
        <img src={shown.url} alt={`${title}, photo ${current + 1} of ${photos.length}`} />
      </figure>
      {photos.length > 1 && (
        <ul className={styles.strip} aria-label="Photos">
          {photos.map((photo, i) => (
            <li key={photo.id}>
              <button type="button" className={styles.pick} aria-pressed={i === current} aria-label={`Show photo ${i + 1}`} onClick={() => setCurrent(i)}>
                <img src={photo.thumb} alt="" loading="lazy" width={640} height={480} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The small cover on a marketplace row.
export function Cover({ photo }: { photo: Photo }) {
  return (
    <span className={styles.thumb}>
      <img src={photo.thumb} alt="" loading="lazy" width={640} height={480} />
    </span>
  );
}
