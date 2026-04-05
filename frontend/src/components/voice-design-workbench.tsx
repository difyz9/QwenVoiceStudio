"use client";

import { startTransition, useState } from "react";

import { fetchBackendJson } from "@/lib/backend-client";

type DesignedPreset = {
  id: number;
  preset_code: string;
  name: string;
  language: string;
  instruct: string;
  ref_text: string;
  reference_audio_path: string | null;
  source_type: string;
};

const defaultInstruct = "年轻女性，声音清晰自然，亲和专业，语速适中，适合产品引导和品牌播报。";
const defaultRefText = "你好，欢迎使用我们的智能语音服务，接下来我会为你介绍主要功能。";

export function VoiceDesignWorkbench() {
  const [presetCode, setPresetCode] = useState("brand_female_web_01");
  const [name, setName] = useState("品牌女声-Web 版");
  const [language, setLanguage] = useState("Chinese");
  const [refText, setRefText] = useState(defaultRefText);
  const [instruct, setInstruct] = useState(defaultInstruct);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdPreset, setCreatedPreset] = useState<DesignedPreset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    setIsSubmitting(true);
    try {
      const preset = await fetchBackendJson<DesignedPreset>("/api/backend/v1/presets/design", {
        method: "POST",
        body: JSON.stringify({
          preset_code: presetCode,
          name,
          language,
          ref_text: refText,
          instruct,
        }),
      });
      startTransition(() => {
        setCreatedPreset(preset);
        setNotice(`音色 ${preset.name} 已生成，可直接到音色库或语音合成页复用。`);
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "音色设计失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
      <section className="surface-panel rounded-[2rem] p-6 lg:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="section-kicker">VoiceDesign Form</div>
            <h2 className="section-title mt-2 text-panel-strong">生成并保存音色</h2>
          </div>
          <div className="text-sm text-slate-500">生成结果会写入 assets/voice_presets/&lt;preset_code&gt;/。</div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">Preset Code</div>
              <input
                className="control-field"
                value={presetCode}
                onChange={(event) => setPresetCode(event.target.value)}
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">显示名称</div>
              <input
                className="control-field"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">语言标签</div>
            <input
              className="control-field"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">参考文本</div>
            <textarea
              className="control-field min-h-32 rounded-[1.7rem] px-4 py-4 text-sm leading-7"
              value={refText}
              onChange={(event) => setRefText(event.target.value)}
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">音色描述</div>
            <textarea
              className="control-field min-h-40 rounded-[1.7rem] px-4 py-4 text-sm leading-7"
              value={instruct}
              onChange={(event) => setInstruct(event.target.value)}
            />
          </label>

          <div className="surface-muted rounded-[1.6rem] px-5 py-4 text-sm leading-7 text-slate-600">
            <div className="section-kicker">Writing Direction</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <p>建议从年龄感、音色明暗、语速、专业度、情绪稳定性和适用场景来描述。</p>
              <p>参考文本尽量自然、短句为主，避免极端标点和过长表达，这样更利于沉淀成长期可复用的 preset。</p>
            </div>
          </div>

          {error ? <div className="rounded-[1.35rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {notice ? <div className="rounded-[1.35rem] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

          <button
            type="submit"
            disabled={isSubmitting || !presetCode.trim() || !name.trim() || !refText.trim() || !instruct.trim()}
            className="action-button action-button-primary flex w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "生成中..." : "生成音色并保存"}
          </button>
        </form>
      </section>

      <section className="surface-panel rounded-[2rem] p-6 lg:p-8">
        <div className="section-kicker">Result</div>
        <h2 className="section-title mt-2 text-panel-strong">最近生成结果</h2>

        {createdPreset ? (
          <article className="mt-6 rounded-[1.8rem] border border-white/45 bg-[rgba(255,252,247,0.88)] p-5 shadow-[0_16px_40px_rgba(77,52,25,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{createdPreset.preset_code}</div>
                <h3 className="display-font mt-2 text-3xl font-semibold tracking-tight text-panel-strong">{createdPreset.name}</h3>
              </div>
              <span className="status-pill status-waiting">{createdPreset.source_type}</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{createdPreset.instruct}</p>
            <div className="surface-muted mt-5 rounded-[1.35rem] px-4 py-4 text-sm leading-7 text-slate-600">
              <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-400">参考文本</div>
              {createdPreset.ref_text}
            </div>
            {createdPreset.reference_audio_path ? (
              <div className="surface-muted mt-4 rounded-[1.35rem] px-4 py-4 text-xs leading-6 text-slate-600 break-all">
                参考音频：{createdPreset.reference_audio_path}
              </div>
            ) : null}
          </article>
        ) : (
          <div className="mt-6 rounded-[1.7rem] border border-dashed border-border bg-[rgba(255,255,255,0.66)] px-5 py-6 text-sm leading-7 text-slate-500">
            提交一次 VoiceDesign 后，这里会显示已保存的 preset 信息。下一步可以直接到“语音合成”页面复用它。
          </div>
        )}

        <div className="mt-6 rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(239,210,177,0.34),rgba(255,247,236,0.74))] px-5 py-5 text-sm leading-7 text-slate-600">
          建议：参考文本尽量自然、稳定、长度适中。音色描述优先写年龄感、性别特征、情绪、节奏和适用场景，这样更容易沉淀成可复用 preset。
        </div>
      </section>
    </div>
  );
}