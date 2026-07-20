// ============================================================
//  IRONCLAD — backup & restore
// ============================================================
//  The app has no server, so a phone that gets its browser storage cleared has
//  lost everything on it. This is the insurance: one file that holds the whole
//  device — the shared plan, this profile's logs / meals / weigh-ins / saved
//  meals / targets, the saved keys, and the progress-photo blobs — that the user
//  saves to their own phone, and can import on a fresh install to get it all back.
//
//  A note on what's inside: the file also carries your API keys, because a
//  restore should be complete. Keep it on your own device; it isn't meant to be
//  shared the way the plan code is.
// ============================================================

import { dumpLocal, restoreLocal } from "./storage.js";
import { allPhotos, putPhoto } from "./photos.js";

const blobToDataURL = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error || new Error("read failed"));
    r.readAsDataURL(blob);
  });

const dataURLToBlob = async (dataURL) => (await fetch(dataURL)).blob();

// Assemble the whole device into one plain object.
export async function buildBackup() {
  const ls = dumpLocal();
  let photos = [];
  try {
    const all = await allPhotos();
    photos = await Promise.all(
      all.map(async ({ id, blob }) => ({ id, data: await blobToDataURL(blob) })),
    );
  } catch {
    photos = []; // no photos, or IndexedDB unavailable — the rest still backs up
  }
  return {
    app: "ironclad",
    schema: 1,
    exportedAt: new Date().toISOString(),
    ls,
    photos,
  };
}

// Build it and hand the browser a download. Returns the backup so the caller can
// record when it happened.
export async function downloadBackup() {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ironclad-backup-${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return backup;
}

// Validate a file's text as one of our backups (throws with a plain message).
export function parseBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error("That file couldn't be read — is it the .json backup IRONCLAD saved?");
  }
  if (!obj || obj.app !== "ironclad" || typeof obj.ls !== "object" || !obj.ls) {
    throw new Error("That doesn't look like an IRONCLAD backup file.");
  }
  return obj;
}

// Write a parsed backup back into this device. Overwrites what's there.
export async function restoreBackup(obj) {
  restoreLocal(obj.ls);
  if (Array.isArray(obj.photos)) {
    for (const p of obj.photos) {
      try {
        if (p?.id && p?.data) await putPhoto(p.id, await dataURLToBlob(p.data));
      } catch {
        /* one unreadable photo shouldn't sink the whole restore */
      }
    }
  }
}

// A rough size, for showing the user what they're about to save.
export function backupSummary(backup) {
  const bytes = new Blob([JSON.stringify(backup)]).size;
  return {
    photos: backup.photos?.length || 0,
    kb: Math.round(bytes / 1024),
  };
}

// Should the end-of-month "back up your data" reminder show right now? Fires
// only in the last three days of the month, at most once per month, and never
// for an empty account or one already backed up this month.
export function backupReminderDue({ now, lastBackupISO, nudgedMonth, hasData }) {
  if (!hasData) return false;
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
  if (nudgedMonth === monthKey) return false;

  if (lastBackupISO) {
    const d = new Date(lastBackupISO);
    if (!Number.isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m) return false;
  }

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  return now.getDate() >= daysInMonth - 2; // last 3 calendar days
}

export function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
