"use client";

import { startTransition, useEffect, useState } from "react";

import { fetchBackendJson } from "@/lib/backend-client";

type SummaryPayload = {
  appName: string;
  currentUser: string;
  presetCount: number;
  runtime: string;
  defaultAdmin: string;
};

const fallbackCards = [
  { label: "系统状态", value: "初始化中" },
  { label: "内置音色", value: "--" },
  { label: "运行环境", value: "--" },
  { label: "当前账号", value: "--" },
];

export function DashboardSummary() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        const payload = await fetchBackendJson<SummaryPayload>("/api/backend/v1/system/summary");
        if (!cancelled) {
          startTransition(() => {
            setSummary(payload);
            setError(null);
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "系统摘要加载失败。");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = summary
    ? [
        { label: "系统状态", value: "在线" },
        { label: "内置音色", value: String(summary.presetCount) },
        { label: "运行环境", value: summary.runtime },
        { label: "当前账号", value: summary.currentUser },
      ]
    : fallbackCards;

  return (
    <section className="space-y-4">
      {error ? <div className="rounded-[1.35rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="stat-card px-6 py-5">
            <div className="section-kicker">{card.label}</div>
            <div className="display-font mt-4 text-4xl font-semibold tracking-tight text-panel-strong">{card.value}</div>
            {isLoading ? <div className="mt-3 text-xs text-slate-400">正在同步系统摘要...</div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}