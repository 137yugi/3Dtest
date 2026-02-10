# 地図可視化ポータル MVP

`map_portal_spec_draft.docx`（2026-02-10版）をもとに、S-01「メイン（地図閲覧）」の主要導線を動作確認できる最小実装です。

## 起動方法

作業ディレクトリ:

    /Users/137yugi/Documents/map-portal-3d

起動:

    python3 -m http.server 8000

ブラウザ:

    http://localhost:8000

## 実装した機能（仕様対応）

- 全画面地図表示（PC/スマホのレスポンシブ）
- 地球儀表示（globe投影）
- 世界/日本の表示範囲切替
- 3D表示の初期化（3D/2D切替）
- 拡大/縮小ボタンによるズーム操作
- タグON/OFFフィルタ
- タグ条件 OR / AND 切替
- タグ未設定データの表示/非表示
- タグ色変更（即時反映）
- 色・フィルタ状態のローカル保存（`localStorage`）
- 検索（地名/企業名）と地図フォーカス
- 地図要素クリック時の詳細パネル表示
- ダーク/ライト切替
- GUIからの新規追加:
  - タグ追加（名前/グループ/色）
  - 拠点ポイント追加（名称/種別/範囲/座標/タグ/関連企業）
  - 追加データのローカル保存（再読み込みで復元）

## ファイル構成

- `index.html`: 画面レイアウト
- `styles.css`: UIスタイル（レスポンシブ含む）
- `app.js`: 画面ロジック、地図描画、状態保存
- `data/sample-data.js`: サンプル GeoJSON / タグ / パートナー情報
- `EXECPLAN_map_portal_mvp.md`: 実装計画と進捗ログ

## 既知の制約

- 現在は S-01 の MVP のみ（管理画面 S-02〜S-05 は未実装）。
- 地理データはサンプル（簡略化）であり、本番境界データではありません。
- ベースマップは OpenStreetMap タイル参照のため、ネットワーク接続が必要です。

## 次段階候補

- 管理画面（タグ/地点/パートナー/インポート・エクスポート）の追加
- 実データ（正式な境界 GeoJSON、企業マスタ）への差し替え
- API化（公開API/管理API）

## Web公開（GitHub Pages）

このリポジトリには `/.github/workflows/deploy-pages.yml` を追加済みです。`master` または `main` に push すると、自動で GitHub Pages にデプロイされます。

最初の公開手順:

1. GitHub で空リポジトリを作成（例: `map-portal`）。
2. このディレクトリで以下を実行。

    git remote add origin <作成したGitHubリポジトリURL>
    git push -u origin master

3. GitHub の `Actions` タブで `Deploy to GitHub Pages` が成功することを確認。
4. 公開URL:

    https://<GitHubユーザー名>.github.io/<リポジトリ名>/
