import { SynthesisWorkbench } from "@/components/synthesis-workbench";

export default function SynthesisPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-panel p-6 shadow-[0_24px_60px_rgba(24,34,48,0.08)] lg:p-8">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Synthesis</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-panel-strong">语音合成任务台</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          现在可以直接选择预置音色，按多行文本批量生成语音。当前版本采用同步执行模式，适合先验证音色复用和输出目录管理，后续再扩展为异步队列。
        </p>
      </section>

      <SynthesisWorkbench />
    </div>
  );
}