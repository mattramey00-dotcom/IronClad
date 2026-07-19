// ============================================================
//  IRONCLAD — the animated exercise demo
// ============================================================
//  Shows the real animated demonstration for a movement, fetched from the
//  WorkoutX API with this device's own key.
//
//  The budget is the whole design here. The free plan is 500 requests for the
//  LIFETIME of the key — it never resets, and re-fetching a gif you already
//  pulled costs another one. So every gif is fetched at most once, ever:
//    1. an in-memory map, so re-opening a modal in one session costs nothing
//    2. the Cache API, so it survives reloads, restarts and going offline
//  Only a cold miss hits the network, and only for an exercise you actually
//  opened — which is why the row thumbnails deliberately do NOT use this.
//
//  Everything degrades quietly: no key, no id, offline, a 401, a spent quota —
//  all just leave the photo/SVG demo on screen. The app never breaks over this.
// ============================================================

import React, { useState, useEffect } from "react";
import { EX_GIF, exGifUrl } from "../data/program.js";

const CACHE_NAME = "ironclad-exgif-v1";

// id -> object URL, for the life of the page.
const memo = new Map();
// id -> Promise, so two mounts of the same exercise can't double-spend a request.
const inflight = new Map();

async function fromCache(url) {
  if (!("caches" in window)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    return hit ? await hit.blob() : null;
  } catch {
    return null; // no secure context / storage blocked
  }
}

async function toCache(url, blob) {
  if (!("caches" in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, new Response(blob, { headers: { "Content-Type": "image/gif" } }));
  } catch {
    /* cache is a bonus, not a requirement */
  }
}

async function loadGif(id, key, cacheOnly) {
  if (memo.has(id)) return memo.get(id);
  if (inflight.has(id)) return inflight.get(id);

  const url = exGifUrl(id);
  const work = (async () => {
    let blob = await fromCache(url);
    if (!blob) {
      // cacheOnly is how the workout rows get to show real animations without
      // ever spending quota: they display what the modal has already paid for.
      if (cacheOnly || !key) return null;
      const res = await fetch(url, { headers: { "X-WorkoutX-Key": key } });
      if (!res.ok) return null; // 401 / quota spent / offline -> fall back
      blob = await res.blob();
      await toCache(url, blob.slice(0, blob.size, blob.type));
    }
    const obj = URL.createObjectURL(blob);
    memo.set(id, obj);
    return obj;
  })();

  inflight.set(id, work);
  try {
    return await work;
  } finally {
    inflight.delete(id);
  }
}

// Every distinct gif our program can show — the set the pre-loader walks.
export const allGifIds = () => [...new Set(Object.values(EX_GIF))];

// Warm the whole program into the cache in one go, so the list stops being
// patchy. Sequential with a gap to stay under the 30-req/min ceiling; already
// cached ids are free. Returns how many are now available. Stops early if the
// server starts refusing (quota spent / throttled) rather than hammering it.
export async function preloadGifs(key, onProgress) {
  const ids = allGifIds();
  let ok = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const already = memo.has(id) || (await fromCache(exGifUrl(id)));
    if (already) {
      ok++;
    } else if (key) {
      try {
        const res = await fetch(exGifUrl(id), { headers: { "X-WorkoutX-Key": key } });
        if (res.status === 429) { onProgress?.(i + 1, ids.length, ok, "rate"); break; }
        if (res.ok) {
          const blob = await res.blob();
          await toCache(exGifUrl(id), blob);
          memo.set(id, URL.createObjectURL(blob));
          ok++;
        }
      } catch {
        /* offline — stop trying */
        onProgress?.(i + 1, ids.length, ok, "offline");
        break;
      }
      await new Promise((r) => setTimeout(r, 2100)); // < 30/min
    }
    onProgress?.(i + 1, ids.length, ok);
  }
  return ok;
}

export default function ExerciseGif({ name, size = 108, apiKey, cacheOnly = false, fallback = null }) {
  const id = EX_GIF[name];
  const [src, setSrc] = useState(() => (id ? memo.get(id) || null : null));

  useEffect(() => {
    if (!id || memo.has(id)) {
      if (id && memo.has(id)) setSrc(memo.get(id));
      return undefined;
    }
    let alive = true;
    loadGif(id, apiKey, cacheOnly)
      .then((u) => alive && u && setSrc(u))
      .catch(() => {
        /* fallback stays on screen */
      });
    return () => {
      alive = false;
    };
  }, [id, apiKey, cacheOnly]);

  // Until (or unless) the gif is in hand, the photo/SVG demo holds the slot.
  if (!src) return fallback;

  return (
    <div
      style={{
        position: "relative", width: size, height: size, borderRadius: 10,
        overflow: "hidden", background: "#0a0d0a",
      }}
    >
      <img
        src={src}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
    </div>
  );
}
