import { VoiceDesignWorkbench } from "@/components/voice-design-workbench";

export default function VoiceDesignPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-panel p-6 shadow-[0_24px_60px_rgba(24,34,48,0.08)] lg:p-8">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Voice Design</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-panel-strong">音色设计工作台</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          现在可以直接输入音色说明和参考文本，调用 VoiceDesign 生成参考音频，并自动落盘到 preset 资产目录，随后立刻进入音色库复用。
        </p>
      </section>

      <VoiceDesignWorkbench />
    </div>
  );
}