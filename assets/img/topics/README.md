# topics サムネ（1200×630）

トップ `#topics` 帯と、対応するお知らせ／イベントページの `og:image` 用。
紙の地・方眼・朱のアクセント・漢字ロゴでサイトの既定 OGP と揃え、カード向けの専用レイアウトにする。

## 再生成

```bash
python3 web/assets/img/topics/generate.py
python3 web/assets/img/topics/generate.py --id events   # 1件だけ
python3 web/assets/img/topics/generate.py --keep-html  # 確認用 HTML を残す
```

要るもの: Google Chrome（または Chromium）、Pillow、Noto Serif JP / Noto Sans JP。

出力: `<id>.png` と `<id>.webp`。サイトのカードは `.webp`、og:image は `.png`。
中間物 `_build/` は生成の途中ファイル。
