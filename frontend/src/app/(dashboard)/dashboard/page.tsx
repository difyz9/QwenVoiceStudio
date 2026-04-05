import { DashboardSummary } from "@/components/dashboard-summary";
import { PresetOverview } from "@/components/preset-overview";

const quickCards = [
  {
    title: "音色设计",
    description: "设计新音色并沉淀到预置音色库，用于后续批量复用。",
  },
  {
    title: "语音合成",
    description: "选择已有音色，批量生成多条语音并自动合并输出。",
  },
  {
    title: "任务执行",
    description: "通过 JSON 数组任务配置，驱动业务音频生产流程。",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-panel p-6 shadow-[0_24px_60px_rgba(24,34,48,0.08)] lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Overview</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-panel-strong">统一管理音色资产与语音生产任务</h1>
            <p className="mt-4 text-base leading-8 text-slate-600">
              这一版先提供登录、预置音色展示、系统摘要与基础后台结构，后续会继续接入音色设计、批量任务执行与音频管理能力。
            </p>
          </div>
          <div className="rounded-3xl bg-accent px-5 py-4 text-sm font-medium text-white shadow-lg shadow-amber-300/30">
            默认管理员：admin / admin123
          </div>
        </div>
      </section>

      <DashboardSummary />

      <section className="grid gap-5 lg:grid-cols-3">
        {quickCards.map((card) => (
          <article key={card.title} className="rounded-[28px] border border-border bg-panel p-6 shadow-[0_18px_46px_rgba(24,34,48,0.06)]">
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Module</div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-panel-strong">{card.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{card.description}</p>
          </article>
        ))}
      </section>

      <PresetOverview />
    </div>
  );
}