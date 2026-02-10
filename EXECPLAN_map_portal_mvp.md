# Map Portal MVP (S-01) 実装

この ExecPlan は living document であり、`Progress`、`Surprises & Discoveries`、`Decision Log`、`Outcomes & Retrospective` を実装中に更新し続ける。リポジトリルートの `PLANS.md` に従って保守する。

## Purpose / Big Picture

この変更により、仕様書ドラフトにある地図閲覧画面（S-01）の主要体験をすぐ確認できるようになる。利用者はブラウザで全画面地図を開き、世界/日本の切替、タグの表示切替、タグ色変更、検索、詳細閲覧を行える。スマホ幅でも操作できるレイアウトを持ち、色設定など一部状態は再読み込み後も保持される。動作確認はローカルHTTPサーバでページを開いて手動確認する。

## Progress

- [x] (2026-02-10 11:03Z) 仕様書 `map_portal_spec_draft.docx` を抽出し、対象機能を S-01 中心に決定。
- [x] (2026-02-10 11:08Z) フロントエンド骨格（`index.html`/`styles.css`/`app.js`/`data/sample-data.js`）を新規作成。
- [x] (2026-02-10 11:09Z) タグフィルタ、色変更、検索、詳細表示、世界/日本切替、2D/3D切替を実装。
- [x] (2026-02-10 11:09Z) `README.md` に起動手順と仕様対応範囲を記載。
- [x] (2026-02-10 11:10Z) 検証結果を反映（完了: JS 構文チェック / 変更確認。残り: ブラウザ手動受入確認は sandbox 制約で未実施）。
- [x] (2026-02-10 11:28Z) 追加要望に対応（3D初期表示 + ズームボタン + GUIからのタグ/拠点追加 + 追加データのローカル保存/復元）。
- [x] (2026-02-10 11:36Z) 地球儀表示要望に対応（globe投影を有効化、世界表示の初期ズームを調整）。
- [x] (2026-02-10 11:41Z) 地球表示が出ない不具合を修正（MapLibre 4系→5系へ更新）。
- [x] (2026-02-10 11:44Z) Web公開準備として GitHub Pages 自動デプロイ workflow を追加。

## Surprises & Discoveries

- Observation: `python-docx` が環境に未導入で `.docx` 直接読取が失敗した。
  Evidence: `ModuleNotFoundError: No module named 'docx'`。
- Observation: `.docx` は ZIP + XML のため、`word/document.xml` 抽出で本文要件の確認が可能だった。
  Evidence: `zipfile` + `xml.etree.ElementTree` で見出しから受入基準まで取得できた。
- Observation: sandbox 制約により `localhost:8000` への接続確認が拒否された。
  Evidence: `curl` 実行時に `Immediate connect fail ... Operation not permitted` が返却された。
- Observation: 地球投影コードを入れても `maplibre-gl@4.7.1` では globe 機能自体が未対応で表示されない。
  Evidence: CDN 読み込みバージョンが 4 系で、globe 対応は 5 系以降。

## Decision Log

- Decision: 初回実装は S-01（閲覧画面）を MVP として完成させ、管理系（S-02〜S-05）は未実装として明記する。
  Rationale: ユーザー価値が最も高い主要導線を短時間で検証可能にし、仕様の未確定事項が多い管理系を分離するため。
  Date/Author: 2026-02-10 / Codex
- Decision: 技術構成はビルド不要の静的サイト（MapLibre GL JS + Vanilla JS）とする。
  Rationale: 新規リポジトリで最短起動でき、非エンジニアでも確認しやすいため。
  Date/Author: 2026-02-10 / Codex
- Decision: 検証は `node --check` による構文検証 + 手動確認手順提示を採用し、ブラウザ疎通はユーザー環境で実施する。
  Rationale: この実行環境では `localhost` 接続確認が禁止されており、E2E 挙動を自動確認できないため。
  Date/Author: 2026-02-10 / Codex
- Decision: 「GUIから新規追加」は MVP 段階として `タグ追加` と `拠点ポイント追加` を実装し、管理画面/APIではなく localStorage で永続化する。
  Rationale: 依頼の即応性を優先し、画面上で追加操作できる体験を最短で提供するため。後段の管理API実装時に移行しやすい構成に留めるため。
  Date/Author: 2026-02-10 / Codex
- Decision: 地図投影は globe を優先し、非対応環境では自動フォールバックする。
  Rationale: 「地球の形」のユーザー要望を満たしつつ、描画非対応ブラウザでの画面崩れを避けるため。
  Date/Author: 2026-02-10 / Codex
- Decision: 公開方式は GitHub Pages + GitHub Actions を採用する（静的配信）。
  Rationale: 現在のアプリは静的ファイルのみで構成され、最小手順で公開URLを提供できるため。
  Date/Author: 2026-02-10 / Codex

## Outcomes & Retrospective

S-01 の MVP として、全画面地図、タグフィルタ、タグ色変更、検索、詳細パネル、世界/日本切替、2D/3D切替、テーマ切替、レスポンシブ UI を備えた静的アプリを新規構築した。追加要望により、3D初期表示とズームボタン、GUIでのタグ/拠点追加（再読み込み復元付き）、さらに globe 投影による地球儀表示まで拡張した。未達は管理画面（S-02〜S-05）と API 実装であり、今回は範囲外として明示した。検証は構文チェックまで完了し、ブラウザ上の受入確認は sandbox の接続制限によりユーザー実行が必要である。

## Context and Orientation

現在のリポジトリは初期ファイルのみで、実行可能なアプリは存在しない。今回追加する主要ファイルは以下。

- `index.html`: 地図画面本体。左パネル、右上地図操作、詳細表示、モバイル用シートを含む。
- `styles.css`: 全画面地図とレスポンシブ UI のスタイル。
- `data/sample-data.js`: タグ、位置情報（GeoJSON）、パートナー情報のサンプルデータ。
- `app.js`: MapLibre 初期化、状態管理、タグ/検索/詳細の UI ロジック。
- `README.md`: 起動手順、実装範囲、仕様対応一覧。

用語定義: MapLibre はブラウザ地図描画ライブラリ。GeoJSON は地理データ形式。レイヤは地図上の描画単位。

## Plan of Work

まず `index.html` に仕様で必須の UI 領域（地図・フィルタ・検索・詳細・操作ボタン）を配置する。次に `styles.css` で PC とスマホ双方に適用されるレスポンシブ構成を作る。`data/sample-data.js` に仕様の論理モデルに沿う最小データを定義し、`app.js` で状態管理を実装する。状態には表示範囲、タグ選択、OR/AND 条件、未タグ表示、タグ色、3D 表示状態を含める。最後に `README.md` へ利用方法と未実装範囲を明示し、動作検証結果を反映する。

## Concrete Steps

作業ディレクトリは `/Users/137yugi/Documents/New project`。

1. 実装を追加した。
   - 追加ファイル: `index.html`, `styles.css`, `app.js`, `data/sample-data.js`, `README.md`。
2. 構文チェックを実行した。
   - `node --check app.js`
   - `node --check data/sample-data.js`
   - いずれも終了コード 0。
3. 起動確認コマンドを試行した。
   - `python3 -m http.server 8000`
   - `curl -sv http://127.0.0.1:8000/ -o /tmp/map_portal_index.html`
   - sandbox 制約で `localhost` 接続確認は失敗（Operation not permitted）。
4. 変更確認を実行した。
   - `rg --files`
   - `git status --short`

## Validation and Acceptance

受入判定は手動で行う。

- ページ初期表示で世界地図が全画面表示される。
- `日本` ボタンで日本へフォーカスし、`世界` ボタンで戻る。
- タグチェックで描画対象が切り替わる。
- タグ色を変更すると該当要素色が即時に変化し、再読み込み後も保持される。
- 検索候補を選ぶと対象へ移動し、詳細パネルに内容が出る。
- スマホ幅（DevTools など）で操作パネルが利用可能。

本実行環境での実施状況:

- 構文検証: 実施済み（`node --check` 成功）。
- ブラウザ受入検証: 未実施（sandbox の `localhost` 接続制限のため）。

## Idempotence and Recovery

本変更は追加中心で、同じ手順を再実行しても破壊的影響はない。HTTPサーバは `Ctrl+C` で停止できる。もしスクリプト読み込み順で表示崩れが出た場合は `index.html` の `<script>` 順序を `data/sample-data.js` → `app.js` の順に戻せば回復できる。

## Artifacts and Notes

初期エラー証跡:

    Traceback (most recent call last):
      ModuleNotFoundError: No module named 'docx'

仕様抽出は ZIP/XML 直接解析で代替した。

ネットワーク制約証跡:

    *   Trying 127.0.0.1:8000...
    * Immediate connect fail for 127.0.0.1: Operation not permitted
    * Failed to connect to 127.0.0.1 port 8000 after 0 ms: Couldn't connect to server

## Interfaces and Dependencies

依存ライブラリ:

- MapLibre GL JS（CDN 参照）

公開される主要関数（`app.js`）:

- `initMap()` 地図初期化。
- `applyFilters()` フィルタと色反映。
- `renderTagPanel()` タグUI再描画。
- `focusFeatureById(id)` 検索結果選択時のフォーカス。

データインターフェース（`data/sample-data.js`）:

- `window.MAP_PORTAL_DATA.tags: Array<{id,name,group,color}>`
- `window.MAP_PORTAL_DATA.locations: GeoJSON FeatureCollection`
- `window.MAP_PORTAL_DATA.partners: Array<{id,name,type,url,description,locationIds,tags}>`

---

Update note (2026-02-10 / Codex): 初版 ExecPlan を新規作成。仕様読取結果を反映し、MVP 範囲と検証手順を定義した。
Update note (2026-02-10 / Codex): 実装完了に合わせて Progress/Decision/Validation を更新。sandbox による localhost 制約を記録した。
Update note (2026-02-10 / Codex): 追加依頼を反映し、3D初期表示・ズームUI・GUI追加機能・localStorage復元仕様を追記した。
Update note (2026-02-10 / Codex): globe投影を導入して地球儀表示に対応し、関連する判断ログを追記した。
Update note (2026-02-10 / Codex): 地球表示不具合の原因をバージョン差異と特定し、MapLibre CDNを5系へ更新した。
Update note (2026-02-10 / Codex): 公開要望に対応するため、GitHub Pages 自動デプロイ workflow を追加した。
