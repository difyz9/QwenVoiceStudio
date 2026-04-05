import Link from "next/link";

import { DashboardSummary } from "@/components/dashboard-summary";
import { PresetOverview } from "@/components/preset-overview";

const quickCards = [
  {
    title: "音色设计",
    description: "设计新音色并沉淀到预置音色库，用于后续批量复用。",
    href: "/voice-design",
    action: "进入音色设计",
  },
  {
    title: "语音合成",
    description: "选择已有音色，批量生成多条语音并自动合并输出。",
    href: "/synthesis",
    action: "进入语音合成",
  },
  {
    title: "任务执行",
    description: "进入统一任务中心，查看参考音频生成与语音合成记录。",
    href: "/tasks",
    action: "打开任务中心",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-7">
      <section className="hero-panel p-6 lg:p-8">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="section-kicker">Overview</div>
            <h1 className="page-title mt-3 text-panel-strong">统一管理音色资产与语音生产任务</h1>
            <p className="mt-4 text-base leading-8 text-slate-600">
              这一版先提供登录、预置音色展示、系统摘要与基础后台结构，后续会继续接入音色设计、批量任务执行与音频管理能力。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[25rem]">
            <div className="surface-panel rounded-[1.5rem] px-5 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Current Stack</div>
              <div className="display-font mt-3 text-2xl font-semibold text-panel-strong">Next.js · FastAPI</div>
            </div>
            <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] px-5 py-4 text-sm font-medium text-white shadow-[0_18px_40px_rgba(169,92,44,0.28)]">
              <div className="text-xs uppercase tracking-[0.18em] text-white/70">Default Admin</div>
              <div className="mt-3 text-base font-semibold">admin / admin123</div>
            </div>
          </div>
        </div>
      </section>

      <DashboardSummary />

      <section className="grid gap-5 lg:grid-cols-3">
        {quickCards.map((card) => (
          <article key={card.title} className="surface-panel rounded-[1.8rem] p-6">
            <div className="section-kicker">Module</div>
            <h2 className="section-title mt-4 text-panel-strong">{card.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{card.description}</p>
            <div className="mt-6">
              <Link
                href={card.href}
                className="action-button action-button-primary"
              >
                {card.action}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <PresetOverview />
    </div>
  );
}