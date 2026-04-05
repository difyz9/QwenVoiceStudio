import { SettingsPanel } from "@/components/settings-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section className="hero-panel p-6 lg:p-8">
        <div className="section-kicker">Settings</div>
        <h1 className="page-title mt-3 text-panel-strong">系统设置</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          这里先接入系统健康状态、当前运行摘要和登录态维护动作，方便排查部署环境与会话问题。
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {[
            "Runtime Snapshot",
            "Session Safety",
            "Operational Visibility",
          ].map((item) => (
            <span key={item} className="eyebrow-chip">
              {item}
            </span>
          ))}
        </div>
      </section>

      <SettingsPanel />
    </div>
  );
}