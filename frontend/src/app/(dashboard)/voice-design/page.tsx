import { VoiceDesignWorkbench } from "@/components/voice-design-workbench";

export default function VoiceDesignPage() {
  return (
    <div className="space-y-6">
      <section className="hero-panel p-6 lg:p-8">
        <div className="section-kicker">Voice Design</div>
        <h1 className="page-title mt-3 text-panel-strong">音色设计工作台</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          现在可以直接输入音色说明和参考文本，调用 VoiceDesign 生成参考音频，并自动落盘到 preset 资产目录，随后立刻进入音色库复用。
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Design Brief", "通过角色、情绪、语速、场景描述建立音色轮廓"],
            ["Reference Script", "用稳定自然的文本为模型提供可复用的参考说法"],
            ["Asset Output", "生成后自动写入 preset 目录，直接进入音色库与合成流程"],
          ].map(([title, copy]) => (
            <div key={title} className="surface-panel rounded-[1.5rem] px-5 py-4">
              <div className="section-kicker">{title}</div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <VoiceDesignWorkbench />
    </div>
  );
}