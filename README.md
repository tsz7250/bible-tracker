# 📖 聖經與生命讀經 進度紀錄

一個以 LINE Bot + Google Apps Script (GAS) 製作的讀經進度紀錄應用，幫助群組成員記錄每日讀經、追蹤完成度，並同步整合生命讀經進度與群組統計排名。

<p align="center">
  <img src="pic/demo.png" alt="一年讀經畫面" width="360">
</p>

## ✨ 功能特色

- **自由讀經** — 從舊約 39 卷 / 新約 27 卷中任意選取章節打卡。
- **一年讀經計畫** — 內建 364 天讀經計畫，每日包含舊約與新約自動配對進度。
- **✨ 生命讀經 (Life-Study) 整合** — 
    - **自動連動**：根據一年讀經進度，自動顯示當日對應的生命讀經篇目。
    - **專屬紀錄**：可獨立勾選生命讀經進度，並提供「生命讀經總覽」進行全本編輯。
- **智慧去重與同步** — 自由讀經、一年計畫與生命讀經紀錄自動合併，確保數據精確且不重複計算。
- **個人進度儀表板** — 即時查看舊約、新約、一年計畫及生命讀經的完成百分比。
- **📊 群組成員統計** — 
    - **即時排名**：查看群組內所有成員的閱讀比例與排名。
- **LINE Bot 整合** — 在 LINE 群組輸入 `/GET URL` 即可取得專屬讀經連結。
- **卓越用戶體驗** — 
    - **批次儲存**：優化章節選取邏輯，支援一次勾選多章後批次儲存。
    - **PIN 驗證**：4 位數字密碼搭配 SHA-256 雜湊，保護個人資料。

## 🏗️ 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | 單頁 HTML + Vanilla JS + CSS（Mobile-first RWD） |
| 後端 | Google Apps Script (GAS) |
| 資料庫 | Google Sheets（Progress / Users / Stats 三張工作表） |
| 訊息整合 | LINE Messaging API（Webhook + Reply） |
| 部署 | GAS Web App（`doGet` 渲染頁面、`doPost` 處理 Webhook） |

## 📁 專案結構

```
bible-tracker/
├── index.html      # 前端網頁（UI 佈局、LS 映射表、業務邏輯）
├── backend.gs      # GAS 後端（API 處理、資料庫操作、LINE Webhook）
├── README.md       # 專案說明文件
└── pic/            # 文件資源與範例截圖
```

## 🚀 部署步驟

### 1. 建立 Google Apps Script 專案

1. 前往 [Google Apps Script](https://script.google.com/) 建立新專案。
2. 將 `backend.gs` 的內容貼入 `Code.gs`。
3. 新增 HTML 檔案並命名為 `index`，將 `index.html` 的內容貼入。

### 2. 設定 Google Sheets

專案首次執行時會自動建立以下工作表：

- **Progress** — 儲存所有讀經紀錄 `[UserID, GroupID, Book, Chapter, Timestamp]`。
- **Users** — 儲存用戶帳號 `[Username, PIN_Hash, UserID]`。
- **Stats** — 統計快取 `[GroupID, UserID, OT, NT, LS_OT, LS_NT]`。

### 3. 設定指令碼屬性

在 GAS「專案設定 → 指令碼屬性」中設定：

| 屬性名稱 | 說明 |
|----------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token |
| `WEBAPP_URL` | GAS 部署後的 Web App URL（需以 `exec` 結尾） |

### 4. 部署 Web App

1. 點擊「部署 → 新增部署作業」。
2. 類型選擇「網頁應用程式」。
3. 存取權限設為「所有人」。
4. 複製部署 URL，務必更新回指令碼屬性的 `WEBAPP_URL`。

### 5. 設定 LINE Bot

1. 在 [LINE Developers Console](https://developers.line.biz/) 建立 Messaging API Channel。
2. 將 GAS 部署 URL 設為 Webhook URL。
3. 將 Bot 加入 LINE 群組。
4. 在群組中輸入 `/GET URL` 即可取得該群組專屬的讀經連結。

## 📱 使用方式

1. **登入**：透過連結開啟，輸入姓名與 4 位密碼（首次進入自動註冊）。
2. **讀經**：
    - 切換「舊約/新約」進行自由打卡。
    - 切換「一年讀經」跟隨每日進度，下方會顯示相關的生命讀經篇目。
3. **管理**：點擊「📊 進度」查看概況，或至「更多」中開啟「生命讀經總覽」進行進階編輯。
4. **清理**：若需重新開始，可在「更多」頁面中選擇清除特定範圍的紀錄。

## 📄 授權

MIT License