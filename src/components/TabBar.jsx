// ============================================================
//  IRONCLAD — bottom navigation
// ============================================================
//  Three peers: Train, Fuel, Insights. Meal logging used to be buried at the
//  bottom of the workout day — backwards, since you eat all day and only train
//  once. Now each is a first-class screen you switch between, the standard
//  mobile pattern where your thumb already expects it.
// ============================================================

import React from "react";
import { S } from "../styles.js";

const TABS = [
  { id: "train", icon: "🏋", label: "Train" },
  { id: "fuel", icon: "🍽", label: "Fuel" },
  { id: "insights", icon: "📊", label: "Insights" },
];

export default function TabBar({ tab, setTab }) {
  return (
    <nav style={S.tabBar}>
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            style={{ ...S.tabItem, ...(active ? S.tabItemActive : {}) }}
            onClick={() => setTab(t.id)}
            aria-current={active ? "page" : undefined}
          >
            <span style={{ ...S.tabIcon, ...(active ? S.tabIconActive : {}) }}>{t.icon}</span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
