import argparse
import json
from http.cookiejar import CookieJar
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import HTTPCookieProcessor, Request, build_opener

import soundfile as sf

from examples.synthesize_from_subtitles import merge_audio_with_subtitle_timeline, parse_srt


def api_json_request(opener, method: str, url: str, payload: dict[str, Any] | None, timeout: int) -> dict[str, Any]:
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = Request(url=url, data=data, headers=headers, method=method)
    try:
        with opener.open(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"API request failed: {exc.code} {exc.reason} {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"API request failed: {exc.reason}") from exc


def download_binary(opener, url: str, output_path: Path, timeout: int) -> None:
    request = Request(url=url, headers={"Accept": "*/*"}, method="GET")
    try:
        with opener.open(request, timeout=timeout) as response:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(response.read())
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Download failed: {exc.code} {exc.reason} {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Download failed: {exc.reason}") from exc


def ensure_api_success(response_json: dict[str, Any]) -> dict[str, Any]:
    if response_json.get("code") != 0:
        raise RuntimeError(f"API returned error: {response_json.get('message', 'unknown error')}")
    data = response_json.get("data")
    if not isinstance(data, dict):
        raise RuntimeError("API returned unexpected response shape")
    return data


def container_path_to_public_url(base_url: str, container_path: str) -> str:
    normalized = container_path.strip()
    if normalized.startswith("/app/"):
        normalized = normalized[4:]
    if not normalized.startswith("/"):
        normalized = f"/{normalized}"
    return urljoin(base_url.rstrip("/") + "/", normalized.lstrip("/"))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Read an SRT file, submit a preset synthesis job to the running API, and rebuild a subtitle-timed final wav locally."
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:3090", help="Studio base URL exposed by Docker Compose.")
    parser.add_argument("--username", default="admin", help="Login username.")
    parser.add_argument("--password", default="admin123", help="Login password.")
    parser.add_argument("--preset", required=True, help="Preset id, for example brand_male_01.")
    parser.add_argument("--subtitle", required=True, help="Path to an .srt subtitle file.")
    parser.add_argument(
        "--language",
        default="",
        help="Optional override language. Leave empty to use the preset default in the backend.",
    )
    parser.add_argument(
        "--output-dir",
        default="outputs/subtitle_api_demo",
        help="Directory for downloaded wav files and rebuilt timeline audio.",
    )
    parser.add_argument(
        "--request-timeout-seconds",
        type=int,
        default=900,
        help="Timeout for the synchronous create-job API call.",
    )
    parser.add_argument(
        "--tail-silence-ms",
        type=int,
        default=500,
        help="Silence duration appended to the end of the rebuilt timeline wav.",
    )
    args = parser.parse_args()

    subtitle_path = Path(args.subtitle)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    cues = parse_srt(subtitle_path)
    texts = [cue.text for cue in cues]

    cookie_jar = CookieJar()
    opener = build_opener(HTTPCookieProcessor(cookie_jar))

    login_url = urljoin(args.base_url.rstrip("/") + "/", "api/v1/auth/login")
    login_response = api_json_request(
        opener,
        "POST",
        login_url,
        {"username": args.username, "password": args.password},
        timeout=60,
    )
    login_data = ensure_api_success(login_response)
    user = login_data.get("user", {})
    print(f"Logged in as {user.get('username', args.username)}")

    create_job_url = urljoin(args.base_url.rstrip("/") + "/", "api/v1/synthesis/jobs")
    payload = {
        "preset_code": args.preset,
        "texts": texts,
        "merge_output": True,
        "pause_ms": 300,
    }
    if args.language:
        payload["language"] = args.language

    print(f"Submitting synthesis job for {len(texts)} subtitle cues. This call may take several minutes.")
    create_job_response = api_json_request(
        opener,
        "POST",
        create_job_url,
        payload,
        timeout=args.request_timeout_seconds,
    )
    job = ensure_api_success(create_job_response)

    if job.get("status") != "completed":
        raise RuntimeError(f"Synthesis job did not complete successfully: {job.get('error_message') or job.get('status')}")

    input_payload = job.get("input_payload")
    if not isinstance(input_payload, dict):
        raise RuntimeError("Synthesis job payload is missing")

    output_files = input_payload.get("output_files")
    if not isinstance(output_files, list) or not output_files:
        raise RuntimeError("Synthesis job returned no output files")
    if len(output_files) != len(cues):
        raise RuntimeError("Subtitle cue count does not match output file count")

    downloaded_wavs = []
    sample_rate: int | None = None
    cue_manifest = []
    for cue, container_path in zip(cues, output_files):
        if not isinstance(container_path, str):
            raise RuntimeError("Synthesis job returned an invalid output file path")

        public_url = container_path_to_public_url(args.base_url, container_path)
        local_path = output_dir / f"cue_{cue.index:03d}.wav"
        download_binary(opener, public_url, local_path, timeout=120)

        wav, current_sample_rate = sf.read(local_path)
        if sample_rate is None:
            sample_rate = current_sample_rate
        elif sample_rate != current_sample_rate:
            raise RuntimeError("Downloaded cue audio uses inconsistent sample rates")

        downloaded_wavs.append(wav)
        cue_manifest.append(
            {
                "index": cue.index,
                "start_ms": cue.start_ms,
                "end_ms": cue.end_ms,
                "text": cue.text,
                "audio_path": str(local_path),
                "source_url": public_url,
                "generated_duration_ms": int(round(len(wav) * 1000 / current_sample_rate)),
            }
        )
        print(f"[cue {cue.index:03d}] Downloaded {local_path}")

    if sample_rate is None:
        raise RuntimeError("No audio was downloaded")

    merged_audio_path = job.get("merged_audio_path")
    downloaded_backend_merge = None
    if isinstance(merged_audio_path, str) and merged_audio_path:
        backend_merge_url = container_path_to_public_url(args.base_url, merged_audio_path)
        downloaded_backend_merge = output_dir / "final_backend_merge.wav"
        download_binary(opener, backend_merge_url, downloaded_backend_merge, timeout=120)
        print(f"Downloaded backend merged audio to {downloaded_backend_merge}")

    timeline_output = output_dir / "final_timeline.wav"
    merge_audio_with_subtitle_timeline(
        wavs=downloaded_wavs,
        sample_rate=sample_rate,
        cues=cues,
        merged_output=timeline_output,
        tail_silence_ms=args.tail_silence_ms,
    )
    print(f"Saved subtitle-timed audio to {timeline_output}")

    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "job_code": job.get("job_code"),
                "preset": args.preset,
                "subtitle": str(subtitle_path),
                "sample_rate": sample_rate,
                "timeline_output": str(timeline_output),
                "backend_merged_output": str(downloaded_backend_merge) if downloaded_backend_merge else None,
                "cues": cue_manifest,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Saved manifest to {manifest_path}")


if __name__ == "__main__":
    main()


    # python examples/synthesize_from_subtitles_via_api.py \
#   --base-url http://127.0.0.1:3090 \
#   --preset brand_male_01 \
#   --subtitle examples/sample_subtitles.srt \
#   --output-dir outputs/subtitle_api_demo