import { createHash } from "node:crypto";
import { env } from "./env";
import { log } from "./log";

// Listing photos on Cloudinary, without the SDK. The browser uploads straight to Cloudinary using
// a short-lived signature from us, so photos never pass through this server:
//
//   1. uploadSignature(folder)   we sign what the browser may upload, and where
//   2. browser → Cloudinary      Cloudinary stores it and replies with public_id, version, signature
//   3. isGenuineUpload(reply)    we check that reply came from Cloudinary before saving it
//
// Signing rule (Cloudinary's): sort the params, join as a=1&b=2, append the API secret, SHA-1.

const FORMATS = "jpg,jpeg,png,webp";

function sign(params: Record<string, string | number>) {
  const joined = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(joined + env.cloudinary.apiSecret).digest("hex");
}

// What the browser posts to Cloudinary along with the file. Valid for about an hour.
export function uploadSignature(folder: string) {
  const params = { allowed_formats: FORMATS, folder, timestamp: Math.floor(Date.now() / 1000) };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
    fields: { ...params, api_key: env.cloudinary.apiKey, signature: sign(params) },
  };
}

// Cloudinary signs its upload reply with our secret, so a matching signature proves the upload is real.
export function isGenuineUpload({ publicId, version, signature }: { publicId: string; version: number; signature: string }) {
  return sign({ public_id: publicId, version }) === signature;
}

// Removes a photo from Cloudinary. Best effort: a leftover file costs little, a stuck page costs more.
export async function destroyPhoto(publicId: string) {
  const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000) };
  const body = new URLSearchParams({ ...params, timestamp: String(params.timestamp), api_key: env.cloudinary.apiKey, signature: sign(params) });
  await fetch(`https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/destroy`, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(10_000),
  })
    .then((res) => res.ok || log.warn("photo not removed from Cloudinary", { publicId, status: res.status }))
    .catch((err) => log.warn("photo not removed from Cloudinary", { publicId, err }));
}

// Delivery URLs. f_auto/q_auto let Cloudinary pick the lightest format and quality per browser.
export function photoUrls(photo: { publicId: string; version: number }) {
  const base = `https://res.cloudinary.com/${env.cloudinary.cloudName}/image/upload`;
  const path = `v${photo.version}/${photo.publicId}`;
  return {
    url: `${base}/c_limit,w_1600,f_auto,q_auto/${path}`,
    thumb: `${base}/c_fill,g_auto,w_640,h_480,f_auto,q_auto/${path}`,
  };
}
