#!/usr/bin/env python3
"""トップ #topics 帯・各お知らせの og:image 用サムネ（1200×630）を作る。

サイトの既定 OGP（紙の地・方眼・朱のアクセント・漢字ロゴ）に揃えつつ、
カード用に「カテゴリ／日付／大見出し／意図的に配置した作品画」の専用レイアウトにする。
適当なトリミングではなく、枠に合わせて配置する（contain または等しい枠内の cover）。

使い方（リポジトリ根）:
  python3 web/assets/img/topics/generate.py
  python3 web/assets/img/topics/generate.py --id events
  python3 web/assets/img/topics/generate.py --keep-html

出力: web/assets/img/topics/<id>.png と .webp（1200×630）
"""
from __future__ import annotations

import argparse
import html
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

W, H = 1200, 630
HERE = Path(__file__).resolve().parent
WEB = HERE.parents[2]  # web/
REPO = WEB.parent
LOGO_KANJI = WEB / "assets/logo/kanji-logo-512.png"
LOGO_MARK = HERE / "_build/s-logo-mark.png"
FONT_DIR_DEFAULT = Path.home() / ".local/share/fonts/noto-jp"
CHROMES = (
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
    "chrome",
)

# 事実は topics / 記事に合わせる。文言は短く、カード幅でも読めるサイズで描く。
SPECS = [
    {
        "id": "events",
        "category": "イベント",
        "date": "2026-10-05",
        "date_label": "令和8年10月5日",
        "title": "今後のイベント出展",
        "title_lines": ["今後のイベント出展"],
        "url_label": "sanogumi.biz/events",
        "layout": "dual-art",
        "arts": [
            {
                "src": WEB / "assets/works/yumemiru-sakura.png",
                "label": "ゆめみるサクラの卒業式",
            },
            {
                "src": WEB / "assets/works/pazuholo.png",
                "label": "ぱずホロ（二次創作）",
            },
        ],
    },
    {
        "id": "youtube",
        "category": "お知らせ",
        "date": "2026-09-28",
        "date_label": "令和8年9月28日",
        "title": "公式YouTubeチャンネルを開設",
        "title_lines": ["公式YouTube", "チャンネルを開設"],
        "url_label": "sanogumi.biz/news",
        "layout": "channel",
        "channel": "@KK_SanoGumi",
        "channel_note": "公式チャンネル",
    },
    {
        "id": "hirakata",
        "category": "イベント",
        "date": "2026-09-25",
        "date_label": "令和8年9月25日",
        "title": "関西インディー試遊会inひらかた",
        "title_lines": ["関西インディー試遊会", "inひらかた"],
        "subtitle": "2026年11月29日（日）・枚方",
        "url_label": "sanogumi.biz/news",
        "layout": "logo-banner",
        "banner": HERE / "_build/hirakata-logo-rgb.png",
    },

    {
        "id": "the-indie-fukuoka-2026",
        "category": "イベント",
        "date": "2026-10-10",
        "date_label": "令和8年10月10日",
        "title": "THEインディー展",
        "title_lines": ["THEインディー展"],
        "subtitle": "福岡・10/10（土）11:00–17:00",
        "url_label": "sanogumi.biz/events",
        "layout": "dual-art",
        "arts": [
            {
                "src": WEB / "assets/works/yumemiru-sakura.png",
                "label": "ゆめみるサクラの卒業式",
            },
            {
                "src": WEB / "assets/works/pazuholo.png",
                "label": "ぱずホロ（二次創作）",
            },
        ],
    },
    {
        "id": "dreamscape-5",
        "category": "イベント",
        "date": "2026-10-24",
        "date_label": "令和8年10月24日",
        "title": "DREAMSCAPE#5",
        "title_lines": ["DREAMSCAPE#5"],
        "subtitle": "東京国際フォーラム E2ホール",
        "url_label": "sanogumi.biz/events",
        "layout": "single-art",
        "arts": [
            {
                "src": WEB / "assets/works/pazuholo.png",
                "label": "ぱずホロ（二次創作）",
            },
        ],
    },
    {
        "id": "tokyo-game-dungeon-14",
        "category": "イベント",
        "date": "2026-10-31",
        "date_label": "令和8年10月31日",
        "title": "東京ゲームダンジョン14",
        "title_lines": ["東京ゲームダンジョン14"],
        "subtitle": "浜松町・10/31（土）",
        "url_label": "sanogumi.biz/events",
        "layout": "single-art",
        "arts": [
            {
                "src": WEB / "assets/works/primary-bloom.png",
                "label": "プライマリ・ブルーム",
            },
        ],
    },
    {
        "id": "shibuya-game-cross-3",
        "category": "イベント",
        "date": "2026-11-03",
        "date_label": "令和8年11月3日",
        "title": "SHIBUYA GAME CROSS 3",
        "title_lines": ["SHIBUYA GAME", "CROSS 3"],
        "subtitle": "渋谷・11/3（火・祝）",
        "url_label": "sanogumi.biz/events",
        "layout": "single-art",
        "arts": [
            {
                "src": WEB / "assets/works/yumemiru-sakura.png",
                "label": "ゆめみるサクラの卒業式",
            },
        ],
    },
    {
        "id": "recruit",
        "category": "採用",
        "date": "2026-09-22",
        "date_label": "令和8年9月22日",
        "title": "開発アルバイト・インターン募集",
        "title_lines": ["開発アルバイト・", "インターン募集"],
        "subtitle": "正社員の募集ではありません",
        "url_label": "sanogumi.biz/careers",
        "layout": "mark-panel",
    },
]


def font_faces(font_dir: Path | None) -> str:
    if not font_dir:
        return ""
    out = []
    for fam, stem in (("Noto Serif JP", "NotoSerifJP"), ("Noto Sans JP", "NotoSansJP")):
        for wt, name in ((400, "Regular"), (700, "Bold")):
            p = font_dir / f"{stem}-{name}.ttf"
            if p.is_file():
                out.append(
                    f'@font-face{{font-family:"{fam}";font-weight:{wt};'
                    f'src:url("file://{p}")}}'
                )
    return "\n".join(out)


def file_url(path: Path) -> str:
    return "file://" + str(path.resolve())


def art_panel(arts: list[dict]) -> str:
    cells = []
    for a in arts:
        cells.append(
            f'''<figure class="art-cell">
  <div class="art-frame">
    <img src="{file_url(a["src"])}" alt="">
    <span class="art-label">{html.escape(a["label"])}</span>
  </div>
</figure>'''
        )
    cls = "art-grid" + (" single" if len(arts) == 1 else "")
    return f'<div class="{cls}">' + "\n".join(cells) + "</div>"


def channel_panel(spec: dict) -> str:
    return f'''<div class="channel-panel">
  <img class="mark" src="{file_url(LOGO_MARK)}" alt="">
  <p class="ch-note">{html.escape(spec["channel_note"])}</p>
  <p class="ch-id">{html.escape(spec["channel"])}</p>
</div>'''


def logo_banner_panel(spec: dict) -> str:
    return f'''<div class="banner-panel">
  <img src="{file_url(Path(spec["banner"]))}" alt="">
</div>'''


def mark_panel() -> str:
    return f'''<div class="mark-panel">
  <img class="mark" src="{file_url(LOGO_MARK)}" alt="">
  <p class="mark-label">CAREERS</p>
</div>'''


def build_html(spec: dict, font_dir: Path | None) -> str:
    layout = spec["layout"]
    if layout == "dual-art":
        side = art_panel(spec["arts"])
    elif layout == "channel":
        side = channel_panel(spec)
    elif layout == "logo-banner":
        side = logo_banner_panel(spec)
    elif layout == "single-art":
        side = art_panel(spec["arts"])  # 1件なら1枠
    elif layout == "mark-panel":
        side = mark_panel()
    else:
        raise SystemExit(f"unknown layout: {layout}")

    lines = spec.get("title_lines") or [spec["title"]]
    title_html = "<br>".join(html.escape(x) for x in lines)
    subtitle = ""
    if spec.get("subtitle"):
        subtitle = f'<p class="subtitle">{html.escape(spec["subtitle"])}</p>'

    return f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><style>
{font_faces(font_dir)}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden}}
body{{
  background:#f5f1e8;color:#1c1a19;
  font-family:"Noto Sans JP","Noto Sans CJK JP",sans-serif;
  position:relative;
}}
.paper{{
  position:absolute;inset:0;
  background-image:
    linear-gradient(rgba(28,26,25,.045) 1px,transparent 1px),
    linear-gradient(90deg,rgba(28,26,25,.045) 1px,transparent 1px);
  background-size:30px 30px;background-position:-1px -1px;
}}
.glow{{
  position:absolute;inset:0;
  background:
    radial-gradient(ellipse at 28% 18%,rgba(255,255,255,.72),transparent 55%),
    radial-gradient(ellipse at 92% 88%,rgba(212,0,0,.05),transparent 48%);
}}
.frame{{
  position:absolute;left:22px;top:22px;right:22px;bottom:22px;
  border:1.5px solid rgba(28,26,25,.48);
}}
.shell{{
  position:absolute;left:56px;right:56px;top:48px;bottom:48px;
  display:grid;
  grid-template-columns: minmax(0,1fr) minmax(0,1fr);
  gap:32px;
  align-items:stretch;
}}
.left{{
  display:flex;flex-direction:column;min-width:0;
  border-left:8px solid #d40000;
  padding-left:28px;
}}
.meta{{
  display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;
  margin-bottom:18px;
}}
.cat{{
  display:inline-flex;align-items:center;justify-content:center;
  min-height:36px;padding:0 14px;
  border:1.5px solid #1c1a19;
  font-size:18px;font-weight:700;letter-spacing:.18em;
  line-height:1;
}}
.date{{
  font-size:20px;letter-spacing:.06em;color:#5c5c5c;
}}
.title{{
  font-family:"Noto Serif JP","Noto Serif CJK JP",serif;
  font-weight:700;
  font-size:52px;
  line-height:1.28;
  letter-spacing:.03em;
  word-break:auto-phrase;
  overflow-wrap:anywhere;
  text-wrap:balance;
  max-width:100%;
}}
.subtitle{{
  margin-top:16px;
  font-size:24px;line-height:1.5;color:#5c5c5c;
  letter-spacing:.04em;
}}
.left-foot{{
  margin-top:auto;padding-top:24px;
  display:flex;align-items:flex-end;justify-content:space-between;gap:16px;
}}
.url{{
  font-size:18px;letter-spacing:.06em;color:#5c5c5c;
}}
.logo{{
  height:54px;width:auto;display:block;flex:none;
}}
.right{{
  min-width:0;min-height:0;
  display:flex;align-items:center;justify-content:center;
}}
.art-grid{{
  width:100%;height:100%;
  display:grid;grid-template-rows:1fr 1fr;gap:14px;
  align-content:center;
}}
.art-cell{{margin:0;min-width:0;min-height:0}}
.art-frame{{
  position:relative;width:100%;height:100%;
  border:1.5px solid rgba(28,26,25,.45);
  background:#fff;overflow:hidden;
  display:flex;flex-direction:column;
}}
.art-frame img{{
  display:block;width:100%;flex:1;min-height:0;
  aspect-ratio:16/9;
  object-fit:cover;object-position:50% 42%;
}}
.art-label{{
  flex:none;
  display:block;
  padding:7px 10px 8px;
  background:#1c1a19;color:#fff;
  font-size:16px;font-weight:700;letter-spacing:.04em;line-height:1.25;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}}
.channel-panel,.mark-panel{{
  width:100%;height:100%;
  border:1.5px solid rgba(28,26,25,.45);
  border-top:8px solid #d40000;
  background:rgba(255,255,255,.82);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:16px;padding:28px;
}}
.channel-panel .mark,.mark-panel .mark{{
  width:168px;height:168px;object-fit:contain;
}}
.ch-note,.mark-label{{
  font-size:22px;font-weight:700;letter-spacing:.2em;color:#5c5c5c;
}}
.ch-id{{
  font-family:"Noto Serif JP","Noto Serif CJK JP",serif;
  font-size:36px;font-weight:700;letter-spacing:.04em;
}}
.banner-panel{{
  width:100%;height:100%;
  border:1.5px solid rgba(28,26,25,.45);
  background:#fff;
  display:flex;align-items:center;justify-content:center;
  padding:48px 32px;
}}
.banner-panel img{{
  display:block;max-width:100%;max-height:100%;
  width:auto;height:auto;object-fit:contain;
}}
/* タイトルがはみ出すときだけ少し縮める */
</style></head><body>
<div class="paper"></div><div class="glow"></div><div class="frame"></div>
<div class="shell">
  <div class="left">
    <div class="meta">
      <span class="cat">{html.escape(spec["category"])}</span>
      <span class="date"><time datetime="{html.escape(spec["date"])}">{html.escape(spec["date_label"])}</time></span>
    </div>
    <h1 class="title" data-min="40">{title_html}</h1>
    {subtitle}
    <div class="left-foot">
      <span class="url">{html.escape(spec["url_label"])}</span>
      <img class="logo" src="{file_url(LOGO_KANJI)}" alt="">
    </div>
  </div>
  <div class="right">{side}</div>
</div>
<script>
(function () {{
  const el = document.querySelector('.title');
  if (!el) return;
  const min = +el.dataset.min || 40;
  let size = parseFloat(getComputedStyle(el).fontSize);
  const left = el.closest('.left');
  const fits = () => el.getBoundingClientRect().bottom <= left.querySelector('.left-foot').getBoundingClientRect().top - 8;
  while (!fits() && size > min) {{
    size -= 2;
    el.style.fontSize = size + 'px';
  }}
}})();
</script>
</body></html>'''


def shoot(html_path: Path, png_path: Path) -> None:
    chrome = next((c for c in CHROMES if shutil.which(c)), None)
    if not chrome:
        sys.exit("Chrome（Chromium）が見つかりません。")
    subprocess.run(
        [
            chrome,
            "--headless=new",
            "--no-sandbox",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            f"--window-size={W},{H}",
            "--virtual-time-budget=8000",
            "--allow-file-access-from-files",
            f"--screenshot={png_path}",
            "file://" + str(html_path),
        ],
        check=True,
        capture_output=True,
    )


def save_outputs(raw_png: Path, out_stem: Path) -> None:
    from PIL import Image

    im = Image.open(raw_png).convert("RGB")
    if im.size != (W, H):
        # Chrome が DPI で倍になることがある → 中央クロップではなくリサイズで正規化
        im = im.resize((W, H), Image.Resampling.LANCZOS)
    png = out_stem.with_suffix(".png")
    webp = out_stem.with_suffix(".webp")
    im.save(png, optimize=True)
    im.save(webp, "WEBP", quality=88, method=6)
    print(f"{png.relative_to(REPO)}  {W}×{H}  {png.stat().st_size // 1024}KB")
    print(f"{webp.relative_to(REPO)}  {W}×{H}  {webp.stat().st_size // 1024}KB")


def generate_one(spec: dict, font_dir: Path | None, keep_html: bool) -> None:
    out_stem = HERE / spec["id"]
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        page = build_html(spec, font_dir)
        hp = tmp_path / "card.html"
        hp.write_text(page, encoding="utf-8")
        raw = tmp_path / "raw.png"
        shoot(hp, raw)
        save_outputs(raw, out_stem)
        if keep_html:
            dest = HERE / f"{spec['id']}.source.html"
            shutil.copy(hp, dest)
            print(f"kept {dest.relative_to(REPO)}")


def main() -> int:
    ap = argparse.ArgumentParser(description="topics サムネ（1200×630）を生成")
    ap.add_argument("--id", help="1件だけ（events / youtube / hirakata / recruit）")
    ap.add_argument(
        "--font-dir",
        default=str(FONT_DIR_DEFAULT) if FONT_DIR_DEFAULT.is_dir() else "",
        help="Noto Sans JP / Noto Serif JP の ttf 置き場",
    )
    ap.add_argument("--keep-html", action="store_true")
    args = ap.parse_args()
    font_dir = Path(args.font_dir) if args.font_dir else None
    if font_dir and not font_dir.is_dir():
        sys.exit(f"font-dir がありません: {font_dir}")

    specs = [s for s in SPECS if not args.id or s["id"] == args.id]
    if not specs:
        sys.exit(f"unknown id: {args.id}")

    # hirakata banner prep
    banner = HERE / "_build/hirakata-logo-rgb.png"
    if any(s["id"] == "hirakata" for s in specs) and not banner.is_file():
        from PIL import Image

        src = WEB / "assets/expo/hirakata-logo.webp"
        im = Image.open(src).convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        Image.alpha_composite(bg, im).convert("RGB").save(banner, optimize=True)

    for spec in specs:
        generate_one(spec, font_dir, args.keep_html)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
