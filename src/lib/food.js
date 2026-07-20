// ============================================================
//  IRONCLAD — barcode → nutrition lookup
// ============================================================
//  Turns a scanned barcode into a meal draft using Open Food Facts, a free,
//  open, no-key food database (openfoodfacts.org). No Anthropic key needed —
//  this is a plain HTTPS call to a public API, so scanning works even with no
//  key set. Whatever comes back lands in the same editable, confirm-before-save
//  draft as a photo or a description, because a database entry can be per-serving
//  or per-100 g and you still ate whatever you ate.
// ============================================================

export async function lookupBarcode(code) {
  const clean = String(code || "").trim();
  if (!clean) throw new Error("No barcode read.");

  const url =
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json` +
    `?fields=product_name,brands,nutriments,serving_size`;

  let data;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    data = await res.json();
  } catch {
    throw new Error("Couldn't reach the food database — check your connection.");
  }

  if (!data || data.status !== 1 || !data.product) {
    throw new Error(`No product found for barcode ${clean}. Add it by hand or describe it instead.`);
  }

  const p = data.product;
  const n = p.nutriments || {};

  // Prefer the per-serving figures when the product carries them; otherwise fall
  // back to per-100 g and say so in the caveat.
  const hasServing = ["energy-kcal_serving", "proteins_serving", "fat_serving", "carbohydrates_serving"]
    .some((k) => Number.isFinite(Number(n[k])));
  const suf = hasServing ? "_serving" : "_100g";
  const val = (k) => {
    const v = Number(n[`${k}${suf}`]);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  };

  const protein = val("proteins");
  const carbs = val("carbohydrates");
  const fat = val("fat");
  let kcal = val("energy-kcal");
  if (!kcal) {
    // Some entries only list kilojoules, or nothing — derive a sensible number.
    const kj = Number(n[`energy-kj${suf}`]) || Number(n[`energy${suf}`]);
    kcal = Number.isFinite(kj) && kj > 0 ? kj / 4.184 : 4 * protein + 4 * carbs + 9 * fat;
  }

  const brand = p.brands ? p.brands.split(",")[0].trim() : "";
  const name = [brand, (p.product_name || "").trim()].filter(Boolean).join(" — ") || `Item ${clean}`;

  const caveat = hasServing
    ? `Per serving (${p.serving_size || "1 serving"}), from Open Food Facts — adjust the numbers for how much you actually ate.`
    : `Per 100 g, from Open Food Facts (no serving size listed) — scale this to your real portion before saving.`;

  return {
    name,
    kcal: Math.round(kcal),
    protein_g: Math.round(protein),
    carbs_g: Math.round(carbs),
    fat_g: Math.round(fat),
    confidence: "medium",
    caveat,
  };
}
