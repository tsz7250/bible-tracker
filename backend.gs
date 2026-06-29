// ============================================================
//  LINE Bot 設定
//  請至 GAS「專案設定 → 指令碼屬性」設定以下兩個 key：
//    LINE_CHANNEL_ACCESS_TOKEN  —  LINE Channel Access Token
//    WEBAPP_URL                 —  GAS 部署後的網頁應用 URL（exec 結尾）
// ============================================================
let _lineTokenCache = null;
function getLineChannelAccessToken() {
  if (_lineTokenCache !== null) {
    return _lineTokenCache;
  }
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get("LINE_CHANNEL_ACCESS_TOKEN");
    if (cached !== null) {
      _lineTokenCache = cached;
      return _lineTokenCache;
    }
  } catch (e) {
    console.error("CacheService 讀取失敗: " + e.toString());
  }

  const value = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ACCESS_TOKEN") || "";
  _lineTokenCache = value;

  try {
    const cache = CacheService.getScriptCache();
    cache.put("LINE_CHANNEL_ACCESS_TOKEN", value, 600); // 快取 10 分鐘
  } catch (e) {
    console.error("CacheService 寫入失敗: " + e.toString());
  }
  return _lineTokenCache;
}

let _webappUrlCache = null;
function getWebappUrl() {
  if (_webappUrlCache !== null) {
    return _webappUrlCache;
  }
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get("WEBAPP_URL");
    if (cached !== null) {
      _webappUrlCache = cached;
      return _webappUrlCache;
    }
  } catch (e) {
    console.error("CacheService 讀取失敗: " + e.toString());
  }

  const value = PropertiesService.getScriptProperties().getProperty("WEBAPP_URL") || "";
  _webappUrlCache = value;

  try {
    const cache = CacheService.getScriptCache();
    cache.put("WEBAPP_URL", value, 600); // 快取 10 分鐘
  } catch (e) {
    console.error("CacheService 寫入失敗: " + e.toString());
  }
  return _webappUrlCache;
}

// 執行週期內的 Spreadsheet 快取，減少 RPC 呼叫
let _activeSS = null;
function getActiveSS() {
  if (!_activeSS) {
    _activeSS = SpreadsheetApp.getActiveSpreadsheet();
  }
  return _activeSS;
}

// 常數與 PLAN_CHAPTER_MAPPING 已搬移至 constants.gs
// ============================================================

/**
 * 處理 LINE Webhook 傳入的事件
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const events = body.events || [];

    events.forEach(function(event) {
      // 用戶在群組輸入「/GET URL」（僅限大寫）時回傳讀經連結
      if (event.type === "message" &&
          event.message.type === "text" &&
          event.message.text.trim() === "/GET URL") {

        const replyToken = event.replyToken;

        if (event.source.type === "group") {
          const groupId = event.source.groupId;
          const url = getWebappUrl() + "?groupId=" + groupId;
          replyToLine(replyToken, [{
            type: "text",
            text: "📖 本群組讀經打卡連結：\n" + url
          }]);
        } else {
          replyToLine(replyToken, [{
            type: "text",
            text: "⚠️ 此指令需在 LINE 群組中使用，Bot 才能取得群組 ID。"
          }]);
        }
      }
    });

  } catch (err) {
    console.error("doPost 錯誤: " + err.toString());
  }

  // LINE Webhook 需要回傳 200
  return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 使用 LINE Reply API 回覆訊息
 * @param {string} replyToken
 * @param {Array}  messages  - 最多 5 則訊息物件的陣列
 */
function replyToLine(replyToken, messages) {
  const token = getLineChannelAccessToken();
  if (!token) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN 未設定，跳過 LINE Reply 傳送。");
    return;
  }
  const url = "https://api.line.me/v2/bot/message/reply";
  const payload = JSON.stringify({ replyToken: replyToken, messages: messages });

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: payload,
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  console.log("LINE Reply 回應: " + response.getResponseCode() + " " + response.getContentText());
}

/**
 * 處理網頁顯示
 */
function doGet(e) {
  const groupId = (e && e.parameter && e.parameter.groupId) ? String(e.parameter.groupId).trim() : "";
  const tmpl = HtmlService.createTemplateFromFile('index');
  tmpl.appGroupId = groupId;
  return tmpl.evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle('讀經進度紀錄');
}

/**
 * 產生 UUID 前 8 位作為短 UserID
 */
function generateShortUserId() {
  return Utilities.getUuid().substring(0, 8);
}

/**
 * 取得進度分頁，若无或欄位不符則自動建立
 * Schema: [UserID, GroupID, Book, Chapter, Timestamp]
 */
function getProgressSheet() {
  const ss = getActiveSS();
  let sheet = ss.getSheetByName("Progress");

  if (!sheet) {
    sheet = ss.insertSheet("Progress");
    sheet.appendRow(["UserID", "GroupID", "ProgressJSON", "Timestamp"]);
    sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#f3f3f3");
    sheet.getRange("C:C").setNumberFormat("@");
    sheet.setFrozenRows(1);
  } else {
    const headers = sheet.getRange("A1:D1").getValues()[0];
    if (headers[0] !== "UserID" || headers[1] !== "GroupID" || headers[2] !== "ProgressJSON") {
      sheet.clearContents();
      sheet.getRange("A1:D1").setValues([["UserID", "GroupID", "ProgressJSON", "Timestamp"]]);
      sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#f3f3f3");
      sheet.getRange("C:C").setNumberFormat("@");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * 取得指定用戶在此群組的進度列資訊
 * @param {Sheet}  sheet
 * @param {string} userId
 * @param {string} groupId
 * @return {object} { index: 列號(1-based), progress: 進度對照Map, timestamp: 時間戳 }
 */
function _getUserProgressRow(sheet, userId, groupId) {
  // use TextFinder to locate the user row directly to avoid loading the whole sheet in memory
  const finder = sheet.getRange("A:A").createTextFinder(userId).matchEntireCell(true);
  const cells = finder.findAll();
  for (let i = 0; i < cells.length; i++) {
    const row = cells[i].getRow();
    const rowGroupId = String(sheet.getRange(row, 2).getValue()).trim();
    if (rowGroupId === groupId) {
      const rowValues = sheet.getRange(row, 3, 1, 2).getValues()[0];
      let progress = {};
      try {
        progress = JSON.parse(rowValues[0] || "{}");
      } catch (e) {
        console.error("解析 ProgressJSON 失敗: " + rowValues[0] + ", " + e.toString());
      }
      return {
        index: row,
        progress: progress,
        timestamp: rowValues[1]
      };
    }
  }
  return { index: -1, progress: {}, timestamp: null };
}

/**
 * 取得或建立 Stats 快取工作表
 * Schema: [GroupID, UserID, OT, NT]
 */
function getOrCreateStatsSheet() {
  const ss = getActiveSS();
  let sheet = ss.getSheetByName("Stats");

  if (!sheet) {
    sheet = ss.insertSheet("Stats");
    sheet.appendRow(["GroupID", "UserID", "OT", "NT", "LS_OT", "LS_NT"]);
    sheet.getRange("A1:F1").setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  } else {
    const headers = sheet.getRange("A1:F1").getValues()[0];
    if (headers[0] !== "GroupID" || headers[1] !== "UserID" || headers.length < 6) {
      sheet.clearContents();
      sheet.getRange("A1:F1").setValues([["GroupID", "UserID", "OT", "NT", "LS_OT", "LS_NT"]]);
      sheet.getRange("A1:F1").setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * 重新計算指定用戶在指定群組的統計，並寫入 Stats 快取表
 * @param {string} userId
 * @param {string} groupId
 * @param {Sheet} [existingSheet] - 可選，傳入已持有的 Progress Sheet 避免重複讀取
 */
function updateUserStats(userId, groupId, existingSheet) {
  try {
    const progressSheet = existingSheet || getProgressSheet();
    const lastRow = progressSheet.getLastRow();
    if (lastRow <= 1) {
      _writeStatsRow(groupId, userId, 0, 0, 0, 0);
      return;
    }
    const data = progressSheet.getRange(2, 1, lastRow - 1, 4).getValues();
    const records = [];
    data.forEach(row => {
      if (String(row[0]).trim() === userId && String(row[1]).trim() === groupId) {
        const book = String(row[2]).trim();
        const chaptersStr = String(row[3]).trim();
        const chapters = chaptersStr ? chaptersStr.split(",").map(c => c.trim()).filter(Boolean) : [];
        chapters.forEach(ch => {
          records.push({ book: book, chapter: ch });
        });
      }
    });

    const result = calculateUserTotalProgress("", userId, records);
    _writeStatsRow(groupId, userId, result.otChapters, result.ntChapters, result.lsOT, result.lsNT);
  } catch (e) {
    console.error("updateUserStats 錯誤: " + e.toString());
  }
}

/**
 * 寫入或更新 Stats 表中的一列
 */
function _writeStatsRow(groupId, userId, ot, nt, lsOT, lsNT) {
  const sheet = getOrCreateStatsSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    const allData = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    for (let i = 0; i < allData.length; i++) {
      if (String(allData[i][0]).trim() === groupId && String(allData[i][1]).trim() === userId) {
        sheet.getRange(i + 2, 3, 1, 4).setValues([[ot, nt, lsOT, lsNT]]);
        return;
      }
    }
  }
  sheet.appendRow([groupId, userId, ot, nt, lsOT, lsNT]);
}

function syncProgress(data) {
  let lock;
  try {
    const safeUserId   = String((data && data.userId)   || "").trim();
    const safeGroupId  = String((data && data.groupId)  || "").trim();
    const safeUsername = String((data && data.username) || "").trim();
    const safeToken    = String((data && data.sessionToken) || "").trim();
    const safeBook     = String((data && data.book)     || "").trim();
    const addedChapters  = Array.isArray(data && data.addedChapters) ? data.addedChapters : [];
    const removedChapters = Array.isArray(data && data.removedChapters) ? data.removedChapters : [];

    const safeAdded = Array.from(new Set(addedChapters.map(ch => String(ch).trim()).filter(Boolean)));
    const safeRemoved = Array.from(new Set(removedChapters.map(ch => String(ch).trim()).filter(Boolean)));

    if (!safeUserId || !safeGroupId || !safeUsername || !safeToken || !safeBook) {
      return { status: "error", message: "同步資料不完整" };
    }

    // 輸入安全性防護與白名單校驗
    const allBooks = new Set([...OT_BOOKS_SET, ...NT_BOOKS_SET, "一年讀經", "LifeStudy"]);
    if (!allBooks.has(safeBook)) {
      return { status: "error", message: "無效的書卷名稱" };
    }
    // 限制 chapters 的最大長度與正則格式以防範惡意注入
    const progressRegex = /^(\d+(_OT|_NT)?|.+?生讀\s?\d+.*)$/;
    for (let c of [...safeAdded, ...safeRemoved]) {
      if (c.length > 50 || !progressRegex.test(c)) {
        return { status: "error", message: "章節格式不正確" };
      }
    }

    const authResult = verifyUserAuth(safeUsername, safeToken, safeUserId);
    if (!authResult.authenticated) {
      return { status: "error", message: authResult.error || "身份驗證失敗" };
    }

    lock = LockService.getScriptLock();
    // use tryLock instead of waitLock to handle timeout gracefully
    const hasLock = lock.tryLock(10000);
    if (!hasLock) {
      return { status: "error", message: "伺服器繁忙，請稍候再試" };
    }

    const sheet = getProgressSheet();
    const now = new Date();
    
    const userRow = _getUserProgressRow(sheet, safeUserId, safeGroupId);
    const progress = userRow.progress;
    
    const existChapters = progress[safeBook] || [];
    const existSet = new Set(existChapters);
    
    let addedCount = 0;
    let removedCount = 0;
    
    safeAdded.forEach(c => {
      if (!existSet.has(c)) {
        existSet.add(c);
        addedCount++;
      }
    });
    
    safeRemoved.forEach(c => {
      if (existSet.has(c)) {
        existSet.delete(c);
        removedCount++;
      }
    });
    
    const finalChapters = Array.from(existSet);
    if (finalChapters.length > 0) {
      progress[safeBook] = finalChapters;
    } else {
      delete progress[safeBook];
    }
    
    const jsonStr = JSON.stringify(progress);
    
    if (userRow.index !== -1) {
      sheet.getRange(userRow.index, 3, 1, 2).setValues([[jsonStr, now]]);
    } else {
      sheet.appendRow([safeUserId, safeGroupId, jsonStr, now]);
    }

    // 直接在記憶體中更新 Stats
    const records = [];
    for (let book in progress) {
      progress[book].forEach(ch => {
        records.push({ book: book, chapter: ch });
      });
    }
    const statsResult = calculateUserTotalProgress("", safeUserId, records);
    _writeStatsRow(safeGroupId, safeUserId, statsResult.otChapters, statsResult.ntChapters, statsResult.lsOT, statsResult.lsNT);

    return { status: "success", addedCount: addedCount, removedCount: removedCount };
  } catch (e) {
    console.error("syncProgress 錯誤: " + e.toString());
    return { status: "error", message: e.toString() };
  } finally {
    if (lock) lock.releaseLock();
  }
}

/**
 * 取得用戶進度地圖的輔助方法 (內部調用)
 */
function _getUserProgressMap(userId, groupId, existingSheet) {
  const sheet = existingSheet || getProgressSheet();
  const userRow = _getUserProgressRow(sheet, userId, groupId);
  return userRow.progress;
}

/**
 * 讀取用戶在指定群組的所有進度 (JSON格式直接回傳)
 */
function getAllUserProgress(userId, username, sessionToken, groupId) {
  try {
    const safeUserId  = String(userId  || "").trim();
    const safeGroupId = String(groupId || "").trim();
    const safeUsername = String(username || "").trim();
    const safeToken    = String(sessionToken || "").trim();

    if (!safeGroupId) return { __error: true, message: "groupId 為空" };

    const authResult = verifyUserAuth(safeUsername, safeToken, safeUserId);
    if (!authResult.authenticated) {
      return { __error: true, message: authResult.error || "身份驗證失敗" };
    }

    return _getUserProgressMap(safeUserId, safeGroupId);
  } catch (e) {
    console.error("getAllUserProgress 錯誤: " + e.toString());
    return { __error: true, message: e.toString() };
  }
}

/**
 * 清除用戶在指定群組的特定類別進度 (扁平化架構優化版)
 */
function clearUserProgress(userId, username, sessionToken, type, groupId) {
  let lock;
  try {
    const safeUserId  = String(userId  || "").trim();
    const safeGroupId = String(groupId || "").trim();
    const safeUsername = String(username || "").trim();
    const safeToken    = String(sessionToken || "").trim();
    const safeType     = String(type     || "").trim();

    if (!safeGroupId) return { status: "error", message: "groupId 為空" };
    
    // 驗證用戶身份
    const authResult = verifyUserAuth(safeUsername, safeToken, safeUserId);
    if (!authResult.authenticated) {
      return { status: "error", message: authResult.error || "身份驗證失敗" };
    }
    
    const VALID_TYPES = ['OT', 'NT', 'Plan', 'LifeStudy', 'All'];
    if (!VALID_TYPES.includes(safeType)) {
      return { status: "error", message: "無效的 type 參數，必須為 OT／NT／Plan／LifeStudy／All" };
    }

    lock = LockService.getScriptLock();
    // tryLock instead of waitLock to handle timeout gracefully
    const hasLock = lock.tryLock(10000);
    if (!hasLock) {
      return { status: "error", message: "伺服器繁忙，請稍候再試" };
    }
    
    const sheet = getProgressSheet();
    const userRow = _getUserProgressRow(sheet, safeUserId, safeGroupId);
    
    if (userRow.index === -1) {
      return { status: "success", deletedCount: 0, updatedProgress: {} };
    }
    
    const progress = userRow.progress;
    const otBooks = OT_BOOKS_SET;
    const ntBooks = NT_BOOKS_SET;
    
    let deletedCount = 0;
    
    if (safeType === 'All') {
      for (let book in progress) {
        deletedCount += progress[book].length;
      }
      userRow.progress = {};
    } else {
      for (let book in progress) {
        let shouldDelete = false;
        if (book === "LifeStudy" && safeType === 'LifeStudy') {
          shouldDelete = true;
        } else if (safeType === 'OT' && otBooks.has(book)) {
          shouldDelete = true;
        } else if (safeType === 'NT' && ntBooks.has(book)) {
          shouldDelete = true;
        } else if (safeType === 'Plan' && book === "一年讀經") {
          shouldDelete = true;
        }
        
        if (shouldDelete) {
          deletedCount += progress[book].length;
          delete progress[book];
        }
      }
    }
    
    const now = new Date();
    const jsonStr = JSON.stringify(progress);
    sheet.getRange(userRow.index, 3, 1, 2).setValues([[jsonStr, now]]);
    
    // 直接在記憶體中更新 Stats
    const records = [];
    for (let book in progress) {
      progress[book].forEach(ch => {
        records.push({ book: book, chapter: ch });
      });
    }
    const statsResult = calculateUserTotalProgress("", safeUserId, records);
    _writeStatsRow(safeGroupId, safeUserId, statsResult.otChapters, statsResult.ntChapters, statsResult.lsOT, statsResult.lsNT);
    
    return { 
      status: "success", 
      deletedCount: deletedCount, 
      updatedProgress: progress 
    };
  } catch (e) {
    console.error("clearUserProgress 錯誤: " + e.toString());
    return { status: "error", message: e.toString() };
  } finally {
    if (lock) lock.releaseLock();
  }
}
/**
 * 取得或建立 Users 工作表
 * Schema: [Account, PIN_Hash, UserID, DisplayName]
 *   Account     — 帳號（唯一，登入用）
 *   PIN_Hash    — SHA-256 base64
 *   UserID      — UUID 前 8 碼
 *   DisplayName — 姓名（顯示用，可重複）
 */
function getOrCreateUsersSheet() {
  const ss = getActiveSS();
  let sheet = ss.getSheetByName("Users");

  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Account", "PIN_Hash", "UserID", "DisplayName"]);
    sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#f3f3f3");
    sheet.getRange("A:A").setNumberFormat("@");
    sheet.getRange("D:D").setNumberFormat("@");
    sheet.setFrozenRows(1);
  } else {
    const headerCheck = sheet.getRange("A1").getValue();
    if (headerCheck !== "Account") {
      sheet.insertRowBefore(1);
      sheet.getRange("A1:D1").setValues([["Account", "PIN_Hash", "UserID", "DisplayName"]]);
      sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#f3f3f3");
      sheet.getRange("A:A").setNumberFormat("@");
      sheet.getRange("D:D").setNumberFormat("@");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * 登入用戶（帳號已存在才能登入）
 * @param {string} account - 帳號（唯一）
 * @param {string} pinHash - PIN 哈希值 (SHA-256 base64)
 * @return {object} { success, message, userId, displayName }
 */
function loginUser(account, pinHash) {
  try {
    const safe_account = String(account || "").trim();
    const safe_pinHash = String(pinHash || "").trim();

    if (!safe_account || !safe_pinHash) {
      return { success: false, message: "帳號或密碼格式無效" };
    }

    // 暴力破解防護 (CacheService)
    const cache = CacheService.getScriptCache();
    const cacheKey = "fail_login_" + safe_account;
    const failedAttempts = Number(cache.get(cacheKey) || 0);
    if (failedAttempts >= 5) {
      return { success: false, message: "登入失敗次數過多，帳號已被鎖定 5 分鐘" };
    }

    const sheet = getOrCreateUsersSheet();
    // 使用 Column A TextFinder 精準定位帳號
    const cell = sheet.getRange("A:A").createTextFinder(safe_account).matchEntireCell(true).findNext();
    if (!cell) {
      return { success: false, message: "帳號不存在，請先註冊" };
    }

    const row = cell.getRow();
    const userData = sheet.getRange(row, 1, 1, 4).getValues()[0];
    const existingHash = String(userData[1]).trim();
    const existingUserId = String(userData[2]).trim();
    const existingDisplayName = String(userData[3]).trim();

    if (existingHash === safe_pinHash) {
      console.log("loginUser: 登入成功 - userId='" + existingUserId + "'");
      cache.remove(cacheKey); // 成功登入，清除錯誤計數
      
      // 生成 Session Token
      const sessionToken = Utilities.getUuid();
      cache.put("session_" + existingUserId, sessionToken, 21600); // 6 小時
      
      return { 
        success: true, 
        message: "登入成功", 
        userId: existingUserId, 
        displayName: existingDisplayName,
        sessionToken: sessionToken
      };
    } else {
      const newAttempts = failedAttempts + 1;
      cache.put(cacheKey, String(newAttempts), 300); // 鎖定 300 秒 (5 分鐘)
      return { success: false, message: "密碼不正確 (剩餘嘗試次數：" + (5 - newAttempts) + ")" };
    }
  } catch (e) {
    console.error("loginUser 錯誤: " + e.toString());
    return { success: false, message: "登入失敗: " + e.toString() };
  }
}

/**
 * 建立新用戶（帳號不能重複）
 * @param {string} account         - 帳號（唯一）
 * @param {string} pinHash         - PIN 哈希值 (SHA-256 base64)
 * @param {string} confirmPinHash  - 確認 PIN 哈希值
 * @param {string} displayName     - 姓名（顯示用，可重複）
 * @return {object} { success, message, userId, displayName }
 */
function registerUser(account, pinHash, confirmPinHash, displayName) {
  let lock;
  try {
    const safe_account         = String(account         || "").trim();
    const safe_pinHash         = String(pinHash         || "").trim();
    const safe_confirmPinHash  = String(confirmPinHash  || "").trim();
    const safe_displayName     = String(displayName     || "").trim();

    if (!safe_account || !safe_pinHash) {
      return { success: false, message: "帳號或密碼格式無效" };
    }
    if (!safe_displayName) {
      return { success: false, message: "姓名不能為空" };
    }
    if (safe_pinHash !== safe_confirmPinHash) {
      return { success: false, message: "兩次密碼不一致" };
    }

    lock = LockService.getScriptLock();
    // use tryLock instead of waitLock to handle timeout gracefully
    const hasLock = lock.tryLock(5000);
    if (!hasLock) {
      return { success: false, message: "伺服器繁忙，請稍候再試" };
    }

    const sheet = getOrCreateUsersSheet();
    
    // 使用 Column A TextFinder 精準搜尋是否已存在帳號
    const cell = sheet.getRange("A:A").createTextFinder(safe_account).matchEntireCell(true).findNext();
    if (cell) {
      return { success: false, message: "帳號已被使用，請選擇其他帳號" };
    }

    const newUserId = generateShortUserId();
    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1).setNumberFormat("@");
    sheet.getRange(newRow, 4).setNumberFormat("@");
    sheet.getRange(newRow, 1, 1, 4).setValues([[safe_account, safe_pinHash, newUserId, safe_displayName]]);
    console.log("registerUser: 新用戶建立 - account='" + safe_account + "', userId='" + newUserId + "'");
    
    // 生成 Session Token
    const sessionToken = Utilities.getUuid();
    const cache = CacheService.getScriptCache();
    cache.put("session_" + newUserId, sessionToken, 21600); // 6 小時

    return { 
      success: true, 
      message: "帳號建立成功", 
      userId: newUserId, 
      displayName: safe_displayName,
      sessionToken: sessionToken
    };

  } catch (e) {
    console.error("registerUser 錯誤: " + e.toString());
    return { success: false, message: "建立失敗: " + e.toString() };
  } finally {
    if (lock) lock.releaseLock();
  }
}

/**
 * 向後相容：委派給 loginUser
 */
function authenticateUser(username, pinHash) {
  return loginUser(username, pinHash);
}

/**
 * 驗證用戶身份（使用 Cache 驗證 Session Token，並提供 Brute-Force 防護）
 */
function verifyUserAuth(username, sessionToken, expectedUserId) {
  try {
    const username_safe = String(username || "").trim();
    const token_safe = String(sessionToken || "").trim();
    const expectedUserId_safe = String(expectedUserId || "").trim();
    
    if (!username_safe || !token_safe || !expectedUserId_safe) {
      return { authenticated: false, error: "驗證參數不完整" };
    }

    const cache = CacheService.getScriptCache();
    const cacheKey = "fail_auth_" + username_safe;
    const failedAttempts = Number(cache.get(cacheKey) || 0);
    if (failedAttempts >= 5) {
      return { authenticated: false, error: "帳號安全鎖定中，請 5 分鐘後再試" };
    }

    // 從快取中比對 Session Token
    const cachedToken = cache.get("session_" + expectedUserId_safe);
    if (cachedToken !== null && cachedToken === token_safe) {
      return { authenticated: true };
    }

    // 驗證失敗，紀錄錯誤次數
    const newAttempts = failedAttempts + 1;
    cache.put(cacheKey, String(newAttempts), 300); // 鎖定 5 分鐘
    return { authenticated: false, error: "憑證已過期或無效，請重新登入" };
  } catch (e) {
    console.error("verifyUserAuth 錯誤: " + e.toString());
    return { authenticated: false, error: e.toString() };
  }
}

/**
 * 計算用戶總進度（依據一年讀經或自由讀章數）
 * 若完成至少一天一年讀經，則視為使用一年計畫，僅以等效章數回傳；否則計算自由讀。
 * @param {string} username 
 * @param {string} userId 
 * @param {Array} records [{book, chapter}, ...]
 */
function calculateUserTotalProgress(username, userId, records) {
  const readOT = new Set();
  const readNT = new Set();
  const lsOT = new Set();
  const lsNT = new Set();
  let planCompletedDays = 0;
  const planDaysMap = {};
  
  // 使用全域常數
  const otBooks = OT_BOOKS_SET;
  const ntBooks = NT_BOOKS_SET;
  
  // 生命讀經書卷簡稱集合 (用於統計歸類)
  const otLsBooks = new Set(["創", "出", "利", "民", "申", "書", "士", "得", "撒", "王", "代", "拉", "尼", "斯", "伯", "詩", "箴", "傳", "歌", "賽", "耶", "哀", "結", "但", "何", "珥", "摩", "俄", "拿", "彌", "鴻", "哈", "番", "該", "亞", "瑪"]);
  const ntLsBooks = new Set(["太", "可", "路", "約", "徒", "羅", "林前", "林後", "加", "弗", "腓", "西", "帖前", "帖後", "提前", "提後", "多", "門", "來", "希", "雅", "彼前", "彼後", "約壹", "約貳", "約參", "猶", "啟"]);

  records.forEach(r => {
    if (r.book === "一年讀經") {
      const match = String(r.chapter).match(/^(\d+)_(OT|NT)$/);
      if (match) {
        const day = match[1];
        const testament = match[2];
        if (!planDaysMap[day]) planDaysMap[day] = { OT: false, NT: false };
        planDaysMap[day][testament] = true;
      }
    } else if (r.book === "LifeStudy") {
      const match = String(r.chapter).match(/^(.+?)生讀\s?(\d+.*)$/);
      if (match) {
        const prefix = match[1];
        if (otLsBooks.has(prefix)) {
          lsOT.add(r.chapter);
        } else if (ntLsBooks.has(prefix)) {
          lsNT.add(r.chapter);
        }
      }
    } else {
      if (otBooks.has(r.book)) {
        readOT.add(`${r.book}_${r.chapter}`);
      } else if (ntBooks.has(r.book)) {
        readNT.add(`${r.book}_${r.chapter}`);
      }
    }
  });

  for (let day = 1; day <= TOTAL_PLAN_DAYS; day++) {
    if (planDaysMap[day] && planDaysMap[day].OT && planDaysMap[day].NT) {
      planCompletedDays++;
    }
    
    // 如果這天有讀舊約或新約，就把映射表的章節加進去
    if (planDaysMap[day] && planDaysMap[day].OT) {
      let mapped = PLAN_CHAPTER_MAPPING[`${day}_OT`];
      if (mapped) {
        if (!Array.isArray(mapped)) mapped = [mapped];
        mapped.forEach(c => readOT.add(c));
      }
    }
    if (planDaysMap[day] && planDaysMap[day].NT) {
      let mapped = PLAN_CHAPTER_MAPPING[`${day}_NT`];
      if (mapped) {
        if (!Array.isArray(mapped)) mapped = [mapped];
        mapped.forEach(c => readNT.add(c));
      }
    }
  }

  return {
    username: username,
    userId: userId,
    otChapters: readOT.size,
    ntChapters: readNT.size,
    source: (planCompletedDays > 0) ? 'plan' : 'free',
    planDays: planCompletedDays,
    lsOT: lsOT.size,
    lsNT: lsNT.size
  };
}

/**
 * 取得群組內所有成員的進度統計（從 Stats 快取表讀取）
 * @param {string} groupId 
 * @param {string} userId - 用於驗證
 * @param {string} username - 用於驗證
 * @param {string} sessionToken - 用於驗證
 */
function getGroupMemberStats(groupId, userId, username, sessionToken) {
  try {
    const safeGroupId = String(groupId || "").trim();
    if (!safeGroupId) {
      return { status: "error", message: "groupId 為空" };
    }

    // 驗證呼叫者身份
    const authResult = verifyUserAuth(username, sessionToken, userId);
    if (!authResult.authenticated) {
      return { status: "error", message: authResult.error || "身份驗證失敗" };
    }

    // 從 Users 表載入所有用戶以進行映射 (僅讀取必要欄位)
    // batch read is faster than TextFinder for groups (reduces GAS API roundtrips)
    const usersSheet = getOrCreateUsersSheet();
    const lastRowUsers = usersSheet.getLastRow();
    const usersData = lastRowUsers > 1 ? usersSheet.getRange(2, 1, lastRowUsers - 1, 4).getValues() : [];

    // 從 Stats 快取表讀取
    const statsSheet = getOrCreateStatsSheet();
    const lastRow = statsSheet.getLastRow();
    
    if (lastRow <= 1) {
      return { status: "success", members: [], totalOT: TOTAL_OT_CHAPTERS, totalNT: TOTAL_NT_CHAPTERS };
    }

    const statsData = statsSheet.getRange(2, 1, lastRow - 1, 6).getValues();
    
    const userIdToInfo = {};
    usersData.forEach(r => {
      const uid = String(r[2]).trim();
      userIdToInfo[uid] = {
        displayName: String(r[3]).trim() || String(r[0]).trim(),
        account: String(r[0]).trim()
      };
    });

    const members = [];
    statsData.forEach(row => {
      const gId = String(row[0]).trim();
      if (gId === safeGroupId) {
        const uId = String(row[1]).trim();
        const info = userIdToInfo[uId] || { displayName: "未知用戶", account: uId };
        members.push({
          _displayName: info.displayName,
          _account: info.account,
          username: info.displayName,  // 暫定，下方會依重複情況覆寫
          userId: uId,
          otChapters: Number(row[2]) || 0,
          ntChapters: Number(row[3]) || 0,
          lsOT: Number(row[4]) || 0,
          lsNT: Number(row[5]) || 0
        });
      }
    });

    // 同群組有重複姓名時，在姓名後附加 (帳號)
    const nameCount = {};
    members.forEach(m => { nameCount[m._displayName] = (nameCount[m._displayName] || 0) + 1; });
    members.forEach(m => {
      if (nameCount[m._displayName] > 1) {
        m.username = m._displayName + "(" + m._account + ")";
      }
      delete m._displayName;
      delete m._account;
    });
    
    return { 
      status: "success", 
      members: members, 
      totalOT: TOTAL_OT_CHAPTERS, 
      totalNT: TOTAL_NT_CHAPTERS 
    };
  } catch (e) {
    console.error("getGroupMemberStats 錯誤: " + e.toString());
    return { status: "error", message: e.toString() };
  }
}

/**
 * 測試套件：進行單元與效能基準測試
 */
function testSuite() {
  console.log("=== 啟動單元與基準測試 ===");
  const testUser = "test_user_benchmark";
  const testGroup = "test_group_benchmark";
  
  // 1. 測試 TextFinder vs getValues 效能
  const sheet = getProgressSheet();
  
  console.log("正在測試舊版 getValues 遍歷查詢...");
  const t0 = new Date().getTime();
  const lastRow = sheet.getLastRow();
  let foundOld = false;
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === testUser && String(data[i][1]).trim() === testGroup) {
        foundOld = true;
      }
    }
  }
  const t1 = new Date().getTime();
  console.log(`getValues 遍歷耗時: ${t1 - t0} ms (找到: ${foundOld})`);
  
  console.log("正在測試新版 TextFinder 定位查詢...");
  const t2 = new Date().getTime();
  const finder = sheet.getRange("A:A").createTextFinder(testUser).matchEntireCell(true);
  const cells = finder.findAll();
  let foundNew = false;
  for (let i = 0; i < cells.length; i++) {
    const row = cells[i].getRow();
    const rowGroupId = String(sheet.getRange(row, 2).getValue()).trim();
    if (rowGroupId === testGroup) {
      foundNew = true;
    }
  }
  const t3 = new Date().getTime();
  console.log(`TextFinder 定位耗時: ${t3 - t2} ms (找到: ${foundNew})`);
  
  // 2. 測試 Session Token 驗證與 Brute-Force 機制
  console.log("正在測試 Session Token 生成與驗證...");
  const mockUserId = "test_uid_123";
  const mockToken = Utilities.getUuid();
  const cache = CacheService.getScriptCache();
  cache.put("session_" + mockUserId, mockToken, 300);
  
  const authValid = verifyUserAuth("test_account", mockToken, mockUserId);
  console.log("驗證合法 Token: ", authValid.authenticated === true ? "通過 (OK)" : "失敗 (FAIL)");
  
  const authInvalid = verifyUserAuth("test_account", "wrong_token", mockUserId);
  console.log("驗證非法 Token: ", authInvalid.authenticated === false ? "拒絕 (OK)" : "通過 (FAIL)");
  
  console.log("=== 測試完成 ===");
}