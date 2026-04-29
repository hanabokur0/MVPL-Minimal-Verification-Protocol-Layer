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
