# MVPL Excel Adapter

MVPL照合エンジンのExcel外付けアダプター。
**Excelファイルを渡すだけで、フィールド照合とルーティングが動く。**

---

## 使い方

```bash
node adapter.js --input invoices.xlsx --reference orders.xlsx --output result.xlsx
```

| オプション | 説明 |
|---|---|
| `--input` | 照合対象のExcelファイル |
| `--reference` | 基準となるExcelファイル（発注書、マスタ等） |
| `--output` | 結果出力先（省略時: result.xlsx） |
| `--config` | フィールド設定JSON（省略可） |

---

## Excelフォーマット

**1行目 = 列名（フィールド名）**  
**2行目以降 = データ**

```
| vendor_code | amount | invoice_date | item_code |
|-------------|--------|--------------|-----------|
| V001        | 150000 | 2026-04-01   | ITM-A     |
```

- referenceが1行 → 全inputレコードに適用
- referenceが複数行 → inputと1対1で照合

---

## 出力結果

各レコードに以下が追記される：

| 列 | 説明 |
|---|---|
| `{field}_match` | フィールドごとの照合結果（✓/✗） |
| `SCORE` | マッチしたフィールド数（重み付き） |
| `MATCH_RATE` | 一致率（%） |
| `ROUTE` | 判定結果 |

### ルーティング判定

| ROUTE | 条件 |
|---|---|
| **AUTO** | 全フィールド一致 |
| **HUMAN REVIEW** | 一致率60%以上 |
| **ESCALATE** | 一致率60%未満、またはcriticalフィールド不一致 |
| **UNKNOWN** | 一致なし |

---

## フィールド設定（config.json）

```json
{
  "vendor_code": {
    "weight": 2,
    "critical": true
  },
  "amount": {
    "weight": 2,
    "tolerance": 1
  },
  "invoice_date": {
    "weight": 1
  }
}
```

| パラメータ | 説明 |
|---|---|
| `weight` | 重み（デフォルト: 1） |
| `critical` | trueの場合、不一致でESCALATE確定 |
| `tolerance` | 数値の許容誤差（例: 1円以内なら一致扱い） |
| `partial` | 部分一致を許可（文字列） |

---

## ユースケース例

| 業務 | input | reference |
|---|---|---|
| 請求書照合 | 受領請求書 | 発注書 |
| 採用条件確認 | 応募者データ | 採用要件 |
| 在庫突合 | 入荷記録 | 発注データ |
| 契約条件確認 | 契約書項目 | 条件マスタ |

---

## インストール

```bash
npm install
```

依存: `xlsx` のみ。

---

## ライセンス

MIT

---

## ブラウザで使う（コード不要）

`mvpl_verifier.html` をダブルクリックしてブラウザで開く。

**手順：**

1. 左側に照合対象のExcel（請求書・申請データ等）をドロップ
2. 右側に基準データのExcel（発注書・マスタ等）をドロップ
3. criticalにするフィールドをチェック（不一致でSTOP確定）
4. 「照合を実行」ボタンを押す
5. 結果が表示されたら「結果をExcelでダウンロード」

Node.jsもインストール不要。ブラウザだけで動く。

---

## 会社ごとの列マッピング

取引先によってExcelの列構成が異なる場合、会社ごとにcriticalフィールドを変えるだけでいい。

**A社（vendor_codeとamountがcritical）**

```json
{ "critical_fields": ["vendor_code", "amount"] }
```

**B社（invoice_noのみcritical）**

```json
{ "critical_fields": ["invoice_no"] }
```

ブラウザUIではExcelをドロップした時点で列名が自動的に読み込まれる。その場でcriticalを選択できるので、設定ファイルの保存は不要。

列名が会社ごとに違う場合は、Excelの1行目（列名）をあらかじめ統一しておくか、照合したい列だけを別シートに抜き出してから使う。

---

## verdict（判定結果）の見方

| verdict | 意味 | 対応 |
|---|---|---|
| `AUTO_EXECUTE` | 全フィールド一致 | そのまま処理可 |
| `HUMAN_REVIEW` | 一致率70%以上 | 担当者が確認 |
| `STOP` | criticalフィールド不一致 | 要調査・差し戻し |
| `UNKNOWN` | 一致率低 | 要確認 |
