import { PresetOverview } from "@/components/preset-overview";

export default function PresetsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-panel p-6 shadow-[0_24px_60px_rgba(24,34,48,0.08)] lg:p-8">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Voice Presets</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-panel-strong">内置音色库</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          音色库来自系统预置与后续业务侧沉淀的角色音色。当前页面展示数据库中的已初始化音色元数据，后续可以继续扩展试听、编辑和版本管理功能。
        </p>
      </section>

      <PresetOverview />
    </div>
  );
}