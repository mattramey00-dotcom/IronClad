// ============================================================
//  IRONCLAD — the Claude calls
// ============================================================
//  Three of them, and only three:
//
//    estimateMealFromPhoto()  — a photo becomes a draft meal
//    estimateMealFromText()   — "two eggs, toast, black coffee" becomes the same
//    coachNote()              — narrates numbers that lib/nutrition.js computed
//
//  Note what is NOT here: any arithmetic. The model never computes your TDEE,
//  never averages your protein, never decides whether you're recomping. It is
//  used for the one thing it's genuinely better at than code — looking at a
//  plate of food and saying what's on it — and for putting the numbers into
//  English. Everything quantitative is measured in lib/nutrition.js.
//
//  ── On the API key ──────────────────────────────────────────────────
//  IRONCLAD is a static PWA. There is no server, so there is nowhere to hide a
//  secret. The key is *yours*, pasted into Settings, and it lives in this
//  phone's localStorage — it is never bundled into the build, never committed,
//  and never sent anywhere except api.anthropic.com.
//
//  That is a real, if small, exposure: anyone with your unlocked phone and a
//  devtools window can read it. The blast radius is your own API spend. If that
//  bothers you, the honest fix is a ~30-line serverless proxy holding the key,
//  and the app talking to that instead — which is a change to this one file.
//
//  dangerouslyAllowBrowser is named that way on purpose. It's correct here only
//  because the key belongs to the person typing it in.
// ============================================================

import { planWeightChange } from "./nutrition.js";

export const MODELS = {
  "claude-opus-4-8": { label: "Opus 4.8 — most accurate", cost: "~2¢ / photo" },
  "claude-haiku-4-5": { label: "Haiku 4.5 — cheapest", cost: "~0.4¢ / photo" },
};
export const DEFAULT_MODEL = "claude-opus-4-8";

// The SDK is ~350 KB, and most of the app never touches it — you can train, log
// every set, weigh in, enter meals by hand and read every number on the Insights
// screen without ever making an API call. So it loads on first use rather than
// on first paint, and someone who never adds a key never downloads it at all.
// That matters more than usual here: this is a PWA that has to come up fast on a
// phone in a garage.
let Anthropic = null;

async function sdk() {
  if (!Anthropic) Anthropic = (await import("@anthropic-ai/sdk")).default;
  return Anthropic;
}

const client = async (apiKey) => {
  const SDK = await sdk();
  return new SDK({
    apiKey,
    // The key is the user's own, held on the user's own device. See the note above.
    dangerouslyAllowBrowser: true,
  });
};

// ---- the shape a meal estimate comes back in --------------------------
//  `caveat` is load-bearing. A photo cannot show you the oil in the pan, the
//  butter under the eggs, or whether that's four ounces of chicken or seven —
//  and a number that arrives without saying so invites a trust it hasn't
//  earned. Making the model name its own biggest blind spot, every time, is the
//  difference between a tool and a slot machine.

const MEAL_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Short label for the whole meal, e.g. 'Chicken, rice and broccoli'.",
    },
    items: {
      type: "array",
      description: "Each distinct food you can identify.",
      items: {
        type: "object",
        properties: {
          food: { type: "string" },
          portion: { type: "string", description: "Your best read of the amount, e.g. '~5 oz' or '1 cup cooked'." },
          kcal: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
        },
        required: ["food", "portion", "kcal", "protein_g", "carbs_g", "fat_g"],
        additionalProperties: false,
      },
    },
    kcal: { type: "number", description: "Total for the meal." },
    protein_g: { type: "number" },
    carbs_g: { type: "number" },
    fat_g: { type: "number" },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
      description:
        "high = plain, separable, easily-sized foods. low = mixed dish, sauce, or a portion you genuinely cannot size.",
    },
    caveat: {
      type: "string",
      description:
        "The single biggest thing that could make this estimate wrong, in one plain sentence. Always name something real — there is always something.",
    },
  },
  required: ["name", "items", "kcal", "protein_g", "carbs_g", "fat_g", "confidence", "caveat"],
  additionalProperties: false,
};

// We get structured JSON back by giving the model exactly one tool and forcing
// it to call that tool — its arguments ARE the meal estimate. This is the
// oldest, most portable way to constrain Claude's output: no beta headers, no
// `output_config`, works on every model and every key. (An earlier version used
// output_config.format and the API rejected it outright — "Extra inputs are not
// permitted" — so tool-forcing is both the safer and the more compatible path.)
const MEAL_TOOL = {
  name: "log_meal",
  description: "Record the estimated nutrition for the meal shown or described.",
  input_schema: MEAL_SCHEMA,
};

const SYSTEM = `You estimate the nutrition content of meals for a strength-training app.

Be a good estimator, not a confident one. Specifically:

- Size portions against whatever is visible for scale — a fork, a standard dinner plate (~10-11 in), a hand, a can. Say what you used.
- Count the invisible calories. Cooking oil, butter, dressing and sauce are the single largest source of error in photo estimation and they are usually not visible. If a food was plausibly cooked in fat, include it and say so.
- Protein is the number this app cares about most, and it is also the one you can estimate best — a chicken breast is ~30 g per 4 oz whatever else is going on. Get it right.
- Prefer round numbers. Returning 487 kcal implies a precision you do not have; 490 is honest.
- Set confidence honestly. A mixed curry or a casserole is 'low' and you should say so. Grilled chicken, plain rice and steamed broccoli on a white plate is 'high'.
- The caveat field must name a real, specific source of error in *this* meal. Never write "estimates may vary".

The user will correct anything you get wrong before it is saved. An honest wide estimate is far more useful to them than a precise-looking wrong one.`;

// Pull the meal out of a response. We forced `log_meal`, so the estimate rides
// in as the input of a tool_use block. Content is a union that may also carry
// text/thinking blocks, so find the tool call rather than trusting content[0].
function parseMeal(response) {
  const call = response.content.find((b) => b.type === "tool_use" && b.name === "log_meal");
  if (!call || !call.input) throw new Error("The model returned no meal estimate.");
  return call.input;
}

// The wire format wants raw base64 and a media type; a canvas gives us a data
// URL. Split it rather than regexing the whole (potentially large) string.
function splitDataURL(dataURL) {
  const comma = dataURL.indexOf(",");
  const header = dataURL.slice(0, comma);
  return {
    mediaType: header.slice(header.indexOf(":") + 1, header.indexOf(";")),
    data: dataURL.slice(comma + 1),
  };
}

// Phone cameras produce 3–12 MP images. Claude downsamples anything over
// ~1568px on the long edge anyway, so shipping the original just costs upload
// time on a phone connection and buys nothing. JPEG at 0.8 is plenty — food is
// not a document scan.
export function compressImage(file, maxDim = 1200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(splitDataURL(canvas.toDataURL("image/jpeg", 0.8)));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be read as an image."));
    };
    img.src = url;
  });
}

// ---- 1. photo → meal --------------------------------------------------

export async function estimateMealFromPhoto({ apiKey, model = DEFAULT_MODEL, image, note }) {
  const anthropic = await client(apiKey);
  const response = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
          {
            type: "text",
            text: note?.trim()
              ? `Estimate this meal. The person adds: "${note.trim()}" — trust that over what you think you see.`
              : "Estimate this meal.",
          },
        ],
      },
    ],
    tools: [MEAL_TOOL],
    tool_choice: { type: "tool", name: "log_meal" },
  });

  return parseMeal(response);
}

// ---- 2. text → meal ---------------------------------------------------
//  Cheaper than the photo path (no image tokens) and often *more* accurate,
//  because you know what you ate and the camera doesn't. Worth reaching for.

export async function estimateMealFromText({ apiKey, model = DEFAULT_MODEL, text }) {
  const anthropic = await client(apiKey);
  const response = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Estimate this meal from the description: "${text}"

If a portion isn't given, assume an ordinary serving for an adult who lifts, and say what you assumed in the caveat.`,
      },
    ],
    tools: [MEAL_TOOL],
    tool_choice: { type: "tool", name: "log_meal" },
  });

  return parseMeal(response);
}

// ---- 3. the coach -----------------------------------------------------
//  Handed numbers that are already computed. The prompt says so in as many
//  words, because a model given a pile of figures will cheerfully "check" them
//  and hand back arithmetic that quietly disagrees with the app's own display.

export async function coachNote({ apiKey, model = DEFAULT_MODEL, snapshot }) {
  const anthropic = await client(apiKey);
  const response = await anthropic.messages.create({
    model,
    max_tokens: 1200,
    thinking: { type: "adaptive" },
    system: `You are reading a strength trainee's measured data and telling them what it means.

The numbers below were computed from their own logs — measured, not predicted. Do not recompute them, do not second-guess the arithmetic, and do not restate figures they can already see on the screen. Your job is the interpretation, not the calculation.

Write 3-5 sentences, plain and direct, the way a good coach talks. Lead with the single most important thing. If something is going well, say so once and move on; if something is going wrong, be specific about what to change. If the data is too thin to support a conclusion, say that instead of inventing one — that is a genuinely useful thing to hear.

Never give medical advice. No supplements. No hedging boilerplate, no "consult a professional", no bullet points, no headings.`,
    messages: [
      {
        role: "user",
        content: `Here is my data. Tell me how I'm actually developing.

${JSON.stringify(snapshot, null, 2)}`,
      },
    ],
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

// ---- 4. the interactive coach ----------------------------------------
//  Same principle as coachNote — the model interprets, it does not compute — but
//  now it's a conversation. The one thing it's allowed to reach for is a single
//  tool, `weight_plan`, which runs entirely in lib/nutrition.js on the user's
//  measured data. So "how long to lose 10 lb?" is answered by our arithmetic and
//  narrated by the model, never estimated by it. The tool is the seam that keeps
//  a chat coach from quietly inventing a timeline.

const WEIGHT_PLAN_TOOL = {
  name: "weight_plan",
  description:
    "Compute an honest weight-change timeline from the trainee's MEASURED data — do NOT do this arithmetic yourself. " +
    "Call it whenever they ask how long a change will take, what calorie deficit to run, or whether a deadline is realistic. " +
    "Give either `lose_lb` (pounds to lose; use a negative number to gain) or `to_weight_lb` (a target scale weight). " +
    "Optionally add `in_weeks` if they named a deadline, and/or `daily_kcal_change` to evaluate one specific deficit/surplus size. " +
    "It returns the timeline at their current trend, at 250/500/750 kcal deficits (or the one you asked for), and for any deadline — " +
    "each flagged `aggressive` when it exceeds ~1% of bodyweight per week.",
  input_schema: {
    type: "object",
    properties: {
      lose_lb: { type: "number", description: "Pounds to lose. Use a negative value to gain." },
      to_weight_lb: { type: "number", description: "A target bodyweight in lb (use instead of lose_lb)." },
      in_weeks: { type: "number", description: "A deadline in weeks, if the user named one." },
      daily_kcal_change: { type: "number", description: "A specific daily deficit/surplus to evaluate, e.g. 500." },
    },
  },
};

const COACH_SYSTEM = `You are the strength-and-nutrition coach inside a training app, talking with a lifter about their own logged data.

Ground rules:
- The data block below was MEASURED from their logs and computed by the app. Read it; never recompute it, never restate figures they can already see, and never contradict it.
- For anything about timelines, calorie targets, or "how long / how fast / what deficit", CALL the weight_plan tool and speak from what it returns. Do not estimate weeks or deficits in your head — the tool exists so you don't have to, and so the numbers match the rest of the app.
- When the tool flags an option as aggressive (more than ~1% of bodyweight a week), say so plainly and steer toward the sustainable rate.
- If their TDEE is a formula estimate rather than measured yet, say the timeline is a starting guess that will sharpen as they log.
- Talk like a good coach: direct, specific, a few sentences, no bullet-point dumps, no hedging boilerplate, no "consult a professional". Lead with the answer. If the data is too thin to answer honestly, say that instead of inventing a number.
- No medical advice, no supplement protocols beyond ordinary protein/creatine common sense.`;

export async function coachChat({ apiKey, model = DEFAULT_MODEL, snapshot, planCtx, messages }) {
  const anthropic = await client(apiKey);
  const convo = messages.map((m) => ({ role: m.role, content: m.content }));
  const system = `${COACH_SYSTEM}

The trainee's current measured data (computed by the app — interpret it, don't recompute it):
${JSON.stringify(snapshot, null, 2)}`;

  // A short tool loop: the model may call weight_plan, we run it locally on the
  // measured data, hand back the result, and let it answer. Capped so a model
  // that keeps calling tools can't spin forever.
  for (let hop = 0; hop < 4; hop++) {
    const res = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      system,
      tools: [WEIGHT_PLAN_TOOL],
      messages: convo,
    });

    const toolUses = res.content.filter((b) => b.type === "tool_use");
    if (res.stop_reason === "tool_use" && toolUses.length) {
      convo.push({ role: "assistant", content: res.content });
      convo.push({
        role: "user",
        content: toolUses.map((t) => ({
          type: "tool_result",
          tool_use_id: t.id,
          content: JSON.stringify(
            t.name === "weight_plan" ? planWeightChange(t.input, planCtx) : { error: "unknown_tool" },
          ),
        })),
      });
      continue;
    }

    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text || "I don't have enough logged yet to say anything useful there.";
  }

  throw new Error("The coach kept reaching for the calculator without answering — try rephrasing.");
}

// ---- errors -----------------------------------------------------------
//  Typed SDK classes, not string matching. The messages are written for someone
//  standing in a kitchen holding a plate, not for a stack trace.

export function explainError(err) {
  // Anthropic is non-null whenever an API error exists — you cannot get one
  // without having loaded the SDK to make the call. The guard is for the paths
  // that fail before that: a corrupt image, an offline device.
  if (Anthropic) {
    if (err instanceof Anthropic.AuthenticationError)
      return "That API key was rejected. Check it in Settings — it should start with 'sk-ant-'.";
    if (err instanceof Anthropic.PermissionDeniedError)
      return "That key doesn't have access to this model. Check your Anthropic console.";
    if (err instanceof Anthropic.RateLimitError)
      return "Rate limited by the API. Give it a minute.";
    if (err instanceof Anthropic.BadRequestError)
      return `The API rejected the request: ${err.message}`;
    if (err instanceof Anthropic.APIConnectionError)
      return "Couldn't reach the API. Check your connection — you can still enter the meal by hand.";
    if (err instanceof Anthropic.APIError) return `API error ${err.status}: ${err.message}`;
  }
  if (err instanceof SyntaxError)
    return "The model's reply wasn't valid JSON. Try again, or enter it by hand.";
  return err?.message || "Something went wrong. You can still enter the meal by hand.";
}
