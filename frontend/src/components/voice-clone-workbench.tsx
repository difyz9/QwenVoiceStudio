"use client";

import { startTransition, useRef, useState } from "react";

import { endSession } from "@/lib/backend-client";

type ClonedPreset = {
  id: number;
  preset_code: string;
  name: string;
  language: string;
  instruct: string;
  ref_text: string;
  reference_audio_path: string | null;
  source_type: string;
};

async function uploadClonePreset(formData: FormData): Promise<ClonedPreset> {
  const response = await fetch("/api/backend/v1/presets/clone", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (response.status === 401) {
    await endSession();
    window.location.replace("/login?reason=session-expired");
    throw new Error("登录状态已失效，请重新登录。");
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string; message?: string } | null;
    throw new Error(payload?.message ?? payload?.detail ?? "请求失败，请稍后重试。");
  }

  const payload = (await response.json()) as { code: number; data: ClonedPreset };
  return payload.data ?? payload;
}

export function VoiceCloneWorkbench() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [presetCode, setPresetCode] = useState("");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("Chinese");
  const [refText, setRefText] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdPreset, setCreatedPreset] = useState<ClonedPreset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileSelect(file: File | null) {
    setError(null);
    setSelectedFile(file);

    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }

    if (file) {
      setAudioPreviewUrl(URL.createObjectURL(file));
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0] ?? null;
    if (file && file.type.startsWith("audio/")) {
      handleFileSelect(file);
    } else {
      setError("请拖拽音频文件（WAV/MP3/FLAC/OGG）。");
    }
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      handleFileSelect(file);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!selectedFile) {
      setError("请先选择或拖拽一个音频文件。");
      return;
    }

    if (!presetCode.trim()) {
      setError("请输入 Preset Code。");
      return;
    }

    if (!name.trim()) {
      setError("请输入显示名称。");
      return;
    }

    if (!refText.trim()) {
      setError("请输入录音文本内容。");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("preset_code", presetCode.trim());
      formData.append("name", name.trim());
      formData.append("language", language.trim() || "Chinese");
      formData.append("ref_text", refText.trim());

      const preset = await uploadClonePreset(formData);
      startTransition(() => {
        setCreatedPreset(preset);
        setNotice(`克隆音色「${preset.name}」已创建成功，可直接到音色库或语音合成页使用。`);
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "声音克隆失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
      <section className="surface-panel rounded-[2rem] p-6 lg:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="section-kicker">Voice Clone</div>
            <h2 className="section-title mt-2 text-panel-strong">上传音频创建克隆音色</h2>
          </div>
          <div className="text-sm text-slate-500">生成结果会写入 assets/voice_presets/&lt;preset_code&gt;/。</div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {/* File Upload Area */}
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">参考音频</div>
            <div
              role="button"
              tabIndex={0}
              className={`rounded-[2rem] border-2 border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? "border-accent bg-accent-ghost"
                  : "border-border hover:border-accent-soft hover:bg-[rgba(255,255,255,0.55)]"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  fileInputRef.current?.click();
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileInputChange}
              />

              {selectedFile && audioPreviewUrl ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-slate-700">
                    {selectedFile.name}（{formatFileSize(selectedFile.size)}）
                  </div>
                  <audio controls preload="none" className="mx-auto w-full max-w-sm">
                    <source src={audioPreviewUrl} type={selectedFile.type} />
                    您的浏览器不支持音频播放。
                  </audio>
                  <button
                    type="button"
                    className="text-sm text-accent hover:text-accent-strong"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleFileSelect(null);
                    }}
                  >
                    重新选择
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-3xl text-slate-400">🎤</div>
                  <div className="text-sm text-slate-600">
                    拖拽音频文件到此处，或<span className="text-accent font-medium">点击选择文件</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    支持 WAV、MP3、FLAC、OGG 格式，建议 3-30 秒人声样本
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">Preset Code</div>
              <input
                className="control-field"
                value={presetCode}
                onChange={(event) => setPresetCode(event.target.value)}
                placeholder="例如：my_cloned_voice_01"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">显示名称</div>
              <input
                className="control-field"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：我的声音-克隆版"
              />
            </label>
          </div>

          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">语言标签</div>
            <input
              className="control-field"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              placeholder="Chinese"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">录音文本</div>
            <textarea
              className="control-field min-h-32 rounded-[1.7rem] px-4 py-4 text-sm leading-7"
              value={refText}
              onChange={(event) => setRefText(event.target.value)}
              placeholder="请准确填写上传音频的录音文本内容，文本越准确声音克隆效果越好。"
            />
          </label>

          <div className="surface-muted rounded-[1.6rem] px-5 py-4 text-sm leading-7 text-slate-600">
            <div className="section-kicker">Clone Tips</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <p>建议使用 3-30 秒的干净人声样本，背景噪音越少克隆效果越好。说话语速自然、情绪平稳的样本更容易获得稳定结果。</p>
              <p>录音文本必须与上传音频内容完全一致。文本越准确，后续语音合成时声音还原度越高。</p>
            </div>
          </div>

          {error ? <div className="rounded-[1.35rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {notice ? <div className="rounded-[1.35rem] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

          <button
            type="submit"
            disabled={isSubmitting || !selectedFile || !presetCode.trim() || !name.trim() || !refText.trim()}
            className="action-button action-button-primary flex w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "创建中..." : "创建克隆音色"}
          </button>
        </form>
      </section>

      <section className="surface-panel rounded-[2rem] p-6 lg:p-8">
        <div className="section-kicker">Result</div>
        <h2 className="section-title mt-2 text-panel-strong">最新克隆结果</h2>

        {createdPreset ? (
          <article className="mt-6 rounded-[1.8rem] border border-white/45 bg-[rgba(255,252,247,0.88)] p-5 shadow-[0_16px_40px_rgba(77,52,25,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{createdPreset.preset_code}</div>
                <h3 className="display-font mt-2 text-3xl font-semibold tracking-tight text-panel-strong">{createdPreset.name}</h3>
              </div>
              <span className="status-pill bg-purple-100 text-purple-800">clone</span>
            </div>
            <div className="surface-muted mt-5 rounded-[1.35rem] px-4 py-4 text-sm leading-7 text-slate-600">
              <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-400">参考文本</div>
              {createdPreset.ref_text}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={`/synthesis?preset=${encodeURIComponent(createdPreset.preset_code)}`}
                className="action-button action-button-accent"
              >
                去合成
              </a>
              <a
                href="/presets"
                className="action-button action-button-secondary"
              >
                查看音色库
              </a>
            </div>
          </article>
        ) : (
          <div className="mt-6 rounded-[1.7rem] border border-dashed border-border bg-[rgba(255,255,255,0.66)] px-5 py-6 text-sm leading-7 text-slate-500">
            上传一段音频并填写录音文本后，这里会显示已保存的克隆音色信息。下一步可以直接到"语音合成"页面复用它。
          </div>
        )}

        <div className="mt-6 rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(239,210,177,0.34),rgba(255,247,236,0.74))] px-5 py-5 text-sm leading-7 text-slate-600">
          提示：克隆音色创建后会自动出现在音色库和合成页面的音色选择列表中。上传的音频将作为参考音频保存，后续合成时系统会自动提取声音特征进行克隆。
        </div>
      </section>
    </div>
  );
}
