import { SettingsPanel } from "@/components/settings-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-panel p-6 shadow-[0_24px_60px_rgba(24,34,48,0.08)] lg:p-8">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Settings</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-panel-strong">系统设置</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          这里先接入系统健康状态、当前运行摘要和登录态维护动作，方便排查部署环境与会话问题。
        </p>
      </section>

      <SettingsPanel />
    </div>
  );
}