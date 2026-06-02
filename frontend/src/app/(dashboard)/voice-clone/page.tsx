import { VoiceCloneWorkbench } from "@/components/voice-clone-workbench";

export default function VoiceClonePage() {
  return (
    <div className="space-y-6">
      <section className="hero-panel p-6 lg:p-8">
        <div className="section-kicker">Voice Clone</div>
        <h1 className="page-title mt-3 text-panel-strong">声音克隆工作台</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          上传一段人声样本并填写录音文本，系统会将其保存为可复用的克隆音色。克隆后的音色会进入音色库，在语音合成页面可以直接选中使用。
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Audio Upload", "上传干净的人声样本，建议 3-30 秒"],
            ["Transcribe", "填写与音频内容完全一致的录音文本"],
            ["Clone & Reuse", "创建后自动写入音色库，可直接用于合成"],
          ].map(([title, copy]) => (
            <div key={title} className="surface-panel rounded-[1.5rem] px-5 py-4">
              <div className="section-kicker">{title}</div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <VoiceCloneWorkbench />
    </div>
  );
}
