import React, { useState, useRef } from "react";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";
import { makePlan, mondayOf, dateKey, WORKOUT_SHORTS } from "../lib/schedule.js";
import { encodePlan, decodePlan } from "../lib/storage.js";
import { parseBackup, restoreBackup } from "../lib/backup.js";
import { GOALS } from "../lib/nutrition.js";

// ============================================================
//  First run — build the shared plan, or join the one your partner made
// ============================================================
//  There is no backend. The two phones stay in agreement because they hold the
//  same plan config, so one of you creates it and texts the other a plan code.
//  After that both apps derive the identical calendar forever, offline.

// ---- the baseline both people fill in before their first session ----
//  Height/age/sex feed the day-one calorie estimate on Insights; the current
//  weight becomes the first point on the bodyweight trend. Without this the
//  Insights screen sits empty for the first couple of weeks — so we ask once,
//  here, while everything else is being set up. Every field is optional.
function Baseline({ name, onDone, onBack }) {
  const [sex, setSex] = useState("");
  const [ft, setFt] = useState("");
  const [inch, setInch] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState("recomp");

  const finish = () => {
    const heightIn = (Number(ft) || 0) * 12 + (Number(inch) || 0);
    onDone({
      sex: sex || null,
      heightIn: heightIn > 0 ? heightIn : null,
      age: Number(age) || null,
      weightLb: parseFloat(weight) || null,
      goal,
    });
  };

  const unit = { fontSize: 12, color: "#8a8a9e" };

  return (
    <div style={S.setupWrap}>
      <div style={S.setupTitle}>Your baseline{name ? `, ${name}` : ""}</div>
      <div style={S.setupBody}>
        A first weigh-in and a few numbers, so the Insights screen can chart your
        progress and estimate your calories from day one instead of sitting empty
        for two weeks. All optional — change any of it later.
      </div>

      <div style={S.field}>
        <label style={S.label}>Sex</label>
        <div style={S.segRow}>
          {["male", "female"].map((s) => (
            <button key={s} style={{ ...S.seg, ...(sex === s ? S.segActive : {}) }} onClick={() => setSex(s)}>
              {s === "male" ? "Male" : "Female"}
            </button>
          ))}
        </div>
      </div>

      <div style={S.field}>
        <label style={S.label}>Height</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="number" inputMode="numeric" style={{ ...S.textInput, width: 72 }} placeholder="ft" value={ft} onChange={(e) => setFt(e.target.value)} />
          <span style={unit}>ft</span>
          <input type="number" inputMode="numeric" style={{ ...S.textInput, width: 72 }} placeholder="in" value={inch} onChange={(e) => setInch(e.target.value)} />
          <span style={unit}>in</span>
        </div>
      </div>

      <div style={S.field}>
        <label style={S.label}>Age</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="number" inputMode="numeric" style={{ ...S.textInput, width: 92 }} placeholder="years" value={age} onChange={(e) => setAge(e.target.value)} />
          <span style={unit}>years</span>
        </div>
      </div>

      <div style={S.field}>
        <label style={S.label}>Current weight</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="number" inputMode="decimal" step="0.1" style={{ ...S.textInput, width: 110 }} placeholder="lb" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <span style={unit}>lb · today's weigh-in</span>
        </div>
      </div>

      <div style={S.field}>
        <label style={S.label}>Your goal</label>
        <div style={S.segRow}>
          {Object.values(GOALS).map((g) => (
            <button
              key={g.id}
              style={{ ...S.seg, ...(goal === g.id ? S.segActive : {}), fontSize: 12, padding: "9px 4px" }}
              onClick={() => setGoal(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div style={S.note}>Sets your calorie and protein targets. You can change it later, but it recalibrates those targets.</div>
      </div>

      <button style={{ ...S.btnAccent, width: "100%", marginTop: 8 }} onClick={finish}>
        Start training
      </button>
      {onBack && (
        <button style={{ ...S.btnGhost, width: "100%", marginTop: 10 }} onClick={onBack}>
          Back
        </button>
      )}
    </div>
  );
}

export default function Setup({ onReady }) {
  const [mode, setMode] = useState("choose");
  const [restoring, setRestoring] = useState(false);
  const [restoreErr, setRestoreErr] = useState("");
  const fileRef = useRef(null);

  if (mode === "create") return <Create onReady={onReady} onBack={() => setMode("choose")} />;
  if (mode === "join") return <Join onReady={onReady} onBack={() => setMode("choose")} />;

  // Restore from a backup file: write everything back, then reload so the app
  // boots from storage exactly as it was on the phone the backup came from.
  const onRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setRestoring(true);
    setRestoreErr("");
    try {
      const text = await file.text();
      const backup = parseBackup(text);
      await restoreBackup(backup);
      window.location.reload();
    } catch (err) {
      setRestoreErr(err?.message || "Couldn't restore from that file.");
      setRestoring(false);
    }
  };

  return (
    <div style={S.setupWrap}>
      <div style={S.brand}>IRON<span style={{ color: ACCENT }}>CLAD</span></div>
      <div style={{ ...S.tagline, marginBottom: 22 }}>One gym · two people</div>

      <div style={S.setupTitle}>Set up your rotation</div>
      <div style={S.setupBody}>
        You train Mon/Wed/Fri while your partner trains Tue/Thu/Sat, and you swap
        every week. Each of you cycles the full six-workout program, so nobody
        loses a movement — and only one of you is ever on the treadmill.
      </div>

      <button style={{ ...S.btnAccent, width: "100%", marginBottom: 10 }} onClick={() => setMode("create")}>
        Create the plan
      </button>
      <button style={{ ...S.btnGhost, width: "100%" }} onClick={() => setMode("join")}>
        I have a plan code from my partner
      </button>

      <div style={S.note}>
        Whoever sets it up first creates the plan and sends the other a code. Nothing
        is uploaded anywhere — the code is how the two phones agree on the schedule.
      </div>

      {/* Coming back after a wipe or onto a new phone: restore a backup file. */}
      <div style={{ borderTop: "1px solid #1c1d28", marginTop: 20, paddingTop: 16 }}>
        <button
          style={{ ...S.btnGhost, width: "100%" }}
          onClick={() => fileRef.current?.click()}
          disabled={restoring}
        >
          {restoring ? "Restoring…" : "Restore from a backup file"}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onRestoreFile} style={{ display: "none" }} />
        {restoreErr && <div style={S.err}>{restoreErr}</div>}
        <div style={S.note}>
          Have an <b>ironclad-backup</b> file you exported before? Load it here to bring back your
          plan, logs, meals, weigh-ins and photos — no need to set up again.
        </div>
      </div>
    </div>
  );
}

function Create({ onReady, onBack }) {
  const [you, setYou] = useState("");
  const [partner, setPartner] = useState("");
  const [youStart, setYouStart] = useState("A");
  const [offDayRuns, setOffDayRuns] = useState(2);
  const [plan, setPlan] = useState(null);
  const [copied, setCopied] = useState(false);
  const [baseline, setBaseline] = useState(false);

  const build = () => {
    const p = makePlan({
      anchor: mondayOf(dateKey(new Date())),
      you: you.trim() || "You",
      partner: partner.trim() || "Partner",
      youStart,
      offDayRuns,
    });
    setPlan(p);
  };

  if (plan && baseline) {
    return (
      <Baseline
        name={plan.people[0].name}
        onDone={(b) => onReady(plan, "p1", b)}
        onBack={() => setBaseline(false)}
      />
    );
  }

  if (plan) {
    const code = encodePlan(plan);
    return (
      <div style={S.setupWrap}>
        <div style={S.setupTitle}>Send this to {plan.people[1].name}</div>
        <div style={S.setupBody}>
          They open IRONCLAD, tap “I have a plan code,” paste this in, and pick their
          name. Both phones then compute the same weeks — no accounts, no server.
        </div>

        <textarea readOnly value={code} style={S.codeBox} onFocus={(e) => e.target.select()} />

        <button
          style={{ ...S.btnGhost, width: "100%", marginTop: 10 }}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              // Clipboard is blocked outside a secure context — the textarea is
              // selectable, so fall back to letting them copy it by hand.
              setCopied(false);
            }
          }}
        >
          {copied ? "✓ Copied" : "Copy code"}
        </button>

        <button
          style={{ ...S.btnAccent, width: "100%", marginTop: 10 }}
          onClick={() => setBaseline(true)}
        >
          Start training as {plan.people[0].name}
        </button>

        <div style={S.note}>
          Rotation: {plan.rotation.map((id) => WORKOUT_SHORTS[id]).join(" → ")} — ordered so a
          hard leg day never lands the day after a hard run.
        </div>
      </div>
    );
  }

  return (
    <div style={S.setupWrap}>
      <div style={S.setupTitle}>Create the plan</div>
      <div style={S.setupBody}>Two names, and who takes Mon/Wed/Fri this first week.</div>

      <div style={S.field}>
        <label style={S.label}>Your name</label>
        <input style={S.textInput} value={you} onChange={(e) => setYou(e.target.value)} placeholder="Matt" />
      </div>

      <div style={S.field}>
        <label style={S.label}>Your partner's name</label>
        <input style={S.textInput} value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="Sarah" />
      </div>

      <div style={S.field}>
        <label style={S.label}>This week, you take</label>
        <div style={S.segRow}>
          <button
            style={{ ...S.seg, ...(youStart === "A" ? S.segActive : {}) }}
            onClick={() => setYouStart("A")}
          >
            Mon · Wed · Fri
          </button>
          <button
            style={{ ...S.seg, ...(youStart === "B" ? S.segActive : {}) }}
            onClick={() => setYouStart("B")}
          >
            Tue · Thu · Sat
          </button>
        </div>
        <div style={S.note}>You swap every week, so next week you'll have the other set.</div>
      </div>

      <div style={S.field}>
        <label style={S.label}>Cardio on your off days</label>
        <div style={S.segRow}>
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              style={{ ...S.seg, ...(offDayRuns === n ? S.segActive : {}) }}
              onClick={() => setOffDayRuns(n)}
            >
              {n === 0 ? "None" : `${n}×`}
            </button>
          ))}
        </div>
        <div style={S.note}>
          Sessions per week on the days you aren't lifting. They're placed only on days
          that don't sit right before a leg day, on whichever machine your partner isn't
          using.
        </div>
      </div>

      <button style={{ ...S.btnAccent, width: "100%", marginTop: 8 }} onClick={build}>
        Build the rotation
      </button>
      <button style={{ ...S.btnGhost, width: "100%", marginTop: 10 }} onClick={onBack}>
        Back
      </button>
    </div>
  );
}

function Join({ onReady, onBack }) {
  const [code, setCode] = useState("");
  const [plan, setPlan] = useState(null);
  const [err, setErr] = useState("");
  const [who, setWho] = useState(null); // { id, name } once they've picked

  const check = () => {
    const p = decodePlan(code);
    if (!p) {
      setErr("That code didn't decode. Check it was pasted whole — they're long.");
      return;
    }
    setErr("");
    setPlan(p);
  };

  if (plan && who) {
    return (
      <Baseline
        name={who.name}
        onDone={(b) => onReady(plan, who.id, b)}
        onBack={() => setWho(null)}
      />
    );
  }

  if (plan) {
    return (
      <div style={S.setupWrap}>
        <div style={S.setupTitle}>Which one are you?</div>
        <div style={S.setupBody}>
          This picks whose logs live on this phone. You'll still see what the other
          person is doing each week.
        </div>
        {plan.people.map((p) => (
          <button
            key={p.id}
            style={{ ...S.btnGhost, width: "100%", marginBottom: 10, padding: "14px 16px", fontSize: 16 }}
            onClick={() => setWho({ id: p.id, name: p.name })}
          >
            I'm {p.name}
            <span style={{ color: "#6a6a80", fontSize: 12, display: "block", marginTop: 2 }}>
              starts on {p.start === "A" ? "Mon · Wed · Fri" : "Tue · Thu · Sat"}
            </span>
          </button>
        ))}
        <button style={{ ...S.btnGhost, width: "100%", marginTop: 6 }} onClick={() => setPlan(null)}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div style={S.setupWrap}>
      <div style={S.setupTitle}>Paste the plan code</div>
      <div style={S.setupBody}>The one your partner's app gave them when they set it up.</div>

      <textarea
        style={S.codeBox}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Paste here…"
      />
      {err && <div style={S.err}>{err}</div>}

      <button style={{ ...S.btnAccent, width: "100%", marginTop: 10 }} onClick={check}>
        Continue
      </button>
      <button style={{ ...S.btnGhost, width: "100%", marginTop: 10 }} onClick={onBack}>
        Back
      </button>
    </div>
  );
}
