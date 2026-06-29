// ============================================================
//  LINE Bot 設定
//  請至 GAS「專案設定 → 指令碼屬性」設定以下兩個 key：
//    LINE_CHANNEL_ACCESS_TOKEN  —  LINE Channel Access Token
//    WEBAPP_URL                 —  GAS 部署後的網頁應用 URL（exec 結尾）
// ============================================================
let _lineTokenCache = null;
function getLineChannelAccessToken() {
  if (_lineTokenCache === null) {
    _lineTokenCache = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ACCESS_TOKEN") || "";
  }
  return _lineTokenCache;
}

let _webappUrlCache = null;
function getWebappUrl() {
  if (_webappUrlCache === null) {
    _webappUrlCache = PropertiesService.getScriptProperties().getProperty("WEBAPP_URL") || "";
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
// 執行週期內的 Users 快取（避免同一次請求中重複讀取試算表）
let _executionUsersCache = null;

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
  const url = "https://api.line.me/v2/bot/message/reply";
  const payload = JSON.stringify({ replyToken: replyToken, messages: messages });

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + getLineChannelAccessToken() },
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
    sheet.appendRow(["UserID", "GroupID", "Book", "Chapter", "Timestamp"]);
    sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  } else {
    const headers = sheet.getRange("A1:E1").getValues()[0];
    if (headers[0] !== "UserID" || headers[1] !== "GroupID") {
      // 欄位不符，清除重建（開發期間允許直接重置）
      sheet.clearContents();
      sheet.getRange("A1:E1").setValues([["UserID", "GroupID", "Book", "Chapter", "Timestamp"]]);
      sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
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
        records.push({ book: String(row[2]).trim(), chapter: String(row[3]).trim() });
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

/**
 * 儲存進度
 */
function saveProgress(data) {
  let lock;
  try {
    const safeUserId   = String((data && data.userId)   || "").trim();
    const safeGroupId  = String((data && data.groupId)  || "").trim();
    const safeUsername = String((data && data.username) || "").trim();
    const safePin      = String((data && data.pin)      || "").trim();
    const safeBook     = String((data && data.book)     || "").trim();
    const rawChapters  = Array.isArray(data && data.chapters) ? data.chapters : [];
    const safeChapters = Array.from(new Set(rawChapters.map(ch => String(ch).trim()).filter(Boolean)));

    console.log("saveProgress: userId='" + safeUserId + "', groupId='" + safeGroupId + "', book='" + safeBook + "', chapters=" + JSON.stringify(safeChapters));

    if (!safeUserId || !safeGroupId || !safeUsername || !safePin || !safeBook || !safeChapters.length) {
      return { status: "error", message: "儲存資料不完整", addedCount: 0, skippedCount: 0 };
    }

    const authResult = verifyUserAuth(safeUsername, safePin, safeUserId);
    if (!authResult.authenticated) {
      return { status: "error", message: authResult.error || "身份驗證失敗", addedCount: 0, skippedCount: 0 };
    }

    lock = LockService.getScriptLock();
    lock.waitLock(5000);

    const sheet = getProgressSheet();
    const now = new Date();

    // 前端已做去重，後端直接 append（不再掃全表比對）
    const rowsToInsert = safeChapters.map(chapter => [safeUserId, safeGroupId, safeBook, chapter, now]);

    if (rowsToInsert.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToInsert.length, 5).setValues(rowsToInsert);
    }
    console.log("saveProgress: 新增 " + rowsToInsert.length + " 筆");

    // 更新 Stats 快取（傳入已持有的 sheet 避免重複讀取）
    updateUserStats(safeUserId, safeGroupId, sheet);

    return { status: "success", addedCount: rowsToInsert.length };
  } catch (e) {
    console.log("saveProgress 錯誤: " + e.toString());
    throw new Error("試算表寫入失敗: " + e.message);
  } finally {
    if (lock) lock.releaseLock();
  }
}

/**
 * 同步進度（支援同時新增與移除）
 */
function syncProgress(data) {
  let lock;
  try {
    const safeUserId   = String((data && data.userId)   || "").trim();
    const safeGroupId  = String((data && data.groupId)  || "").trim();
    const safeUsername = String((data && data.username) || "").trim();
    const safePin      = String((data && data.pin)      || "").trim();
    const safeBook     = String((data && data.book)     || "").trim();
    const addedChapters  = Array.isArray(data && data.addedChapters) ? data.addedChapters : [];
    const removedChapters = Array.isArray(data && data.removedChapters) ? data.removedChapters : [];

    const safeAdded = Array.from(new Set(addedChapters.map(ch => String(ch).trim()).filter(Boolean)));
    const safeRemoved = Array.from(new Set(removedChapters.map(ch => String(ch).trim()).filter(Boolean)));

    console.log("syncProgress: userId='" + safeUserId + "', book='" + safeBook + "', added=" + JSON.stringify(safeAdded) + ", removed=" + JSON.stringify(safeRemoved));

    if (!safeUserId || !safeGroupId || !safeUsername || !safePin || !safeBook) {
      return { status: "error", message: "同步資料不完整" };
    }

    const authResult = verifyUserAuth(safeUsername, safePin, safeUserId);
    if (!authResult.authenticated) {
      return { status: "error", message: authResult.error || "身份驗證失敗" };
    }

    lock = LockService.getScriptLock();
    lock.waitLock(10000);

    const sheet = getProgressSheet();
    const lastRow = sheet.getLastRow();
    const now = new Date();

    // 處理移除
    if (safeRemoved.length > 0 && lastRow > 1) {
      const removedSet = new Set(safeRemoved);
      const allData = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
      const rowsToKeep = allData.filter(row => {
        const rowUser  = String(row[0]).trim();
        const rowGroup = String(row[1]).trim();
        const rowBook  = String(row[2]).trim();
        const rowChap  = String(row[3]).trim();
        if (rowUser === safeUserId && rowGroup === safeGroupId && rowBook === safeBook && removedSet.has(rowChap)) {
          return false;
        }
        return true;
      });

      if (allData.length !== rowsToKeep.length) {
        sheet.getRange(2, 1, lastRow - 1, 5).clearContent();
        if (rowsToKeep.length > 0) {
          sheet.getRange(2, 1, rowsToKeep.length, 5).setValues(rowsToKeep);
        }
      }
    }

    // 處理新增
    if (safeAdded.length > 0) {
      const currentLastRow = sheet.getLastRow();
      const rowsToInsert = safeAdded.map(chapter => [safeUserId, safeGroupId, safeBook, chapter, now]);
      sheet.getRange(currentLastRow + 1, 1, rowsToInsert.length, 5).setValues(rowsToInsert);
    }

    // 更新 Stats 快取
    updateUserStats(safeUserId, safeGroupId, sheet);

    return { status: "success", addedCount: safeAdded.length, removedCount: safeRemoved.length };
  } catch (e) {
    console.error("syncProgress 錯誤: " + e.toString());
    return { status: "error", message: e.toString() };
  } finally {
    if (lock) lock.releaseLock();
  }
}

/**
 * 讀取用戶在指定群組的所有進度
 */
function getAllUserProgress(userId, username, pin, groupId) {
  try {
    const safeUserId  = String(userId  || "").trim();
    const safeGroupId = String(groupId || "").trim();
    const safeUsername = String(username || "").trim();
    const safePin      = String(pin      || "").trim();

    if (!safeGroupId) return { __error: true, message: "groupId 為空" };

    const authResult = verifyUserAuth(safeUsername, safePin, safeUserId);
    if (!authResult.authenticated) {
      return { __error: true, message: authResult.error || "身份驗證失敗" };
    }

    const sheet = getProgressSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return {};

    // 欄位順序：[UserID, GroupID, Book, Chapter, Timestamp]
    const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    const progressSets = {};  // 用 Set 收集，自動去重
    data.forEach(row => {
      if (String(row[0]).trim() === safeUserId && String(row[1]).trim() === safeGroupId) {
        const book    = String(row[2]).trim();
        const chapter = String(row[3]).trim();
        if (!progressSets[book]) progressSets[book] = new Set();
        progressSets[book].add(chapter);
      }
    });
    // 轉換為 Array 格式回傳（前端相容）
    const progressMap = {};
    for (const book in progressSets) {
      progressMap[book] = Array.from(progressSets[book]);
    }
    return progressMap;
  } catch (e) {
    console.error("getAllUserProgress 錯誤: " + e.toString());
    return { __error: true, message: e.toString() };
  }
}

/**
 * 清除用戶在指定群組的特定類別進度
 */
function clearUserProgress(userId, username, pin, type, groupId) {
  let lock;
  try {
    const safeUserId  = String(userId  || "").trim();
    const safeGroupId = String(groupId || "").trim();
    const safeUsername = String(username || "").trim();
    const safePin      = String(pin      || "").trim();
    const safeType     = String(type     || "").trim();

    if (!safeGroupId) return { status: "error", message: "groupId 為空" };
    
    // 驗證用戶身份
    const authResult = verifyUserAuth(safeUsername, safePin, safeUserId);
    if (!authResult.authenticated) {
      return { status: "error", message: authResult.error || "身份驗證失敗" };
    }
    
    const VALID_TYPES = ['OT', 'NT', 'Plan', 'LifeStudy', 'All'];
    if (!VALID_TYPES.includes(safeType)) {
      return { status: "error", message: "無效的 type 參數，必須為 OT／NT／Plan／LifeStudy／All" };
    }

    lock = LockService.getScriptLock();
    lock.waitLock(10000);
    
    const sheet = getProgressSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return { status: "success" };
    }

    // 使用全域常數
    const otBooks = OT_BOOKS_SET;
    const ntBooks = NT_BOOKS_SET;

    // 批次讀取所有資料列（含 GroupID 與 Timestamp，共 5 欄）
    // 欄位順序：[UserID, GroupID, Book, Chapter, Timestamp]
    const allData = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

    const rowsToKeep = allData.filter(row => {
      const rowUser  = String(row[0]).trim();
      const rowGroup = String(row[1]).trim();
      const rowBook  = String(row[2]).trim();
      // 不同用戶或不同群組的資料一律保留
      if (rowUser !== safeUserId || rowGroup !== safeGroupId) return true;
      
      // 生命讀經：僅當 type 為 LifeStudy 或 All 時清除
      if (rowBook === "LifeStudy") {
        if (safeType === 'LifeStudy' || safeType === 'All') return false;
        return true;
      }

      if (safeType === 'OT'   && otBooks.has(rowBook)) return false;
      if (safeType === 'NT'   && ntBooks.has(rowBook)) return false;
      if (safeType === 'Plan' && rowBook === "一年讀經")    return false;
      if (safeType === 'All') return false;
      return true;
    });

    const deleteCount = allData.length - rowsToKeep.length;

    sheet.getRange(2, 1, lastRow - 1, 5).clearContent();
    if (rowsToKeep.length > 0) {
      sheet.getRange(2, 1, rowsToKeep.length, 5).setValues(rowsToKeep);
    }

    // 更新 Stats 快取
    updateUserStats(safeUserId, safeGroupId);

    return { status: "success", deletedCount: deleteCount };
  } catch (e) {
    console.error("clearUserProgress 錯誤: " + e.toString());
    return { status: "error", message: e.toString() };
  } finally {
    if (lock) lock.releaseLock();
  }
}

/**
 * 取得或建立 Users 工作表（儲存用戶名、PIN hash 和 UserID）
 */
function getOrCreateUsersSheet() {
  const ss = getActiveSS();
  let sheet = ss.getSheetByName("Users");
  
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Username", "PIN_Hash", "UserID"]);
    sheet.getRange("A1:C1").setFontWeight("bold").setBackground("#f3f3f3");
    // 強制整個 A 欄為文本格式（防止 "001" 被轉換為 1）
    sheet.getRange("A:A").setNumberFormat("@");
    sheet.setFrozenRows(1);
  } else {
    const headerCheck = sheet.getRange("A1").getValue();
    if (headerCheck !== "Username") {
      sheet.insertRowBefore(1);
      sheet.getRange("A1:C1").setValues([["Username", "PIN_Hash", "UserID"]]);
      sheet.getRange("A1:C1").setFontWeight("bold").setBackground("#f3f3f3");
      sheet.getRange("A:A").setNumberFormat("@");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * 計算 PIN 的 SHA256 hash
 */
function computePinHash(pin) {
  // GAS 的 Utilities.computeDigest_ 返回 byte array，需轉換為 hex string
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin);
  return Utilities.base64Encode(hash); // 用 base64 編碼作為 hash 儲存
}

/**
 * 驗證或建立用戶
 * @param {string} username - 用戶名稱
 * @param {string} pin - PIN 明文 (4 碼)
 * @return {object} { success: boolean, message: string, userId: string }
 */
function authenticateUser(username, pin) {
  let lock;
  try {
    const username_safe = String(username || "").trim();
    const pin_safe = String(pin || "").trim();
    
    console.log("authenticateUser: 嘗試登入 - username='" + username_safe + "', pin='" + pin_safe + "'");
    
    if (!username_safe || !pin_safe || pin_safe.length !== 4 || !/^\d{4}$/.test(pin_safe)) {
      console.log("authenticateUser: 格式驗證失敗");
      return { success: false, message: "用戶名或 PIN 格式無效" };
    }
    
    const pinHash = computePinHash(pin_safe);

    lock = LockService.getScriptLock();
    lock.waitLock(5000);

    const sheet = getOrCreateUsersSheet();
    const lastRow = sheet.getLastRow();
    console.log("authenticateUser: Users 表共 " + lastRow + " 列");

    // 檢查用戶是否已存在（根據 username + pinHash）
    if (lastRow > 1) {
      const allUsers = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
      // 同步更新快取
      _executionUsersCache = allUsers;
      for (let i = 0; i < allUsers.length; i++) {
        const existingUsername = String(allUsers[i][0]).trim();
        const existingHash     = String(allUsers[i][1]).trim();
        const existingUserId   = String(allUsers[i][2]).trim();
        if (existingUsername === username_safe) {
          if (existingHash === pinHash) {
            console.log("authenticateUser: 登入成功 - userId='" + existingUserId + "'");
            return { success: true, message: "登入成功", userId: existingUserId };
          } else {
            console.log("authenticateUser: PIN 不正確");
            return { success: false, message: "PIN 不正確" };
          }
        }
      }
    }

    // 用戶不存在，建立新用戶（使用 UUID 前 8 位作為 UserID）
    const newUserId = generateShortUserId();
    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1).setNumberFormat("@");
    sheet.getRange(newRow, 1, 1, 3).setValues([[username_safe, pinHash, newUserId]]);
    // 更新快取
    _executionUsersCache = null;
    console.log("authenticateUser: 新用戶建立 - userId='" + newUserId + "'");
    return { success: true, message: "新用戶建立成功", userId: newUserId };
    
  } catch (e) {
    console.error("authenticateUser 錯誤: " + e.toString());
    return { success: false, message: "驗證失敗: " + e.toString() };
  } finally {
    if (lock) lock.releaseLock();
  }
}

/**
 * 驗證用戶身份（用於其他 API 調用）
 */
function verifyUserAuth(username, pin, expectedUserId) {
  try {
    const username_safe = String(username || "").trim();
    const pin_safe = String(pin || "").trim();
    
    if (!username_safe || !pin_safe || pin_safe.length !== 4 || !/^\d{4}$/.test(pin_safe)) {
      return { authenticated: false, error: "用戶名或 PIN 格式無效" };
    }

    const pinHash = computePinHash(pin_safe);

    // 使用執行週期內快取，避免同次請求中多次讀取試算表
    if (!_executionUsersCache) {
      const sheet = getOrCreateUsersSheet();
      const lastRow = sheet.getLastRow();
      _executionUsersCache = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 3).getValues() : [];
    }
    const allUsers = _executionUsersCache;

    if (allUsers.length === 0) {
      return { authenticated: false, error: "用戶不存在" };
    }
    
    for (let i = 0; i < allUsers.length; i++) {
      const existingUsername = String(allUsers[i][0]).trim();
      const existingHash = String(allUsers[i][1]).trim();
      const existingUserId = String(allUsers[i][2]).trim();
      
      if (existingUsername === username_safe && existingHash === pinHash) {
        if (expectedUserId && existingUserId !== expectedUserId) {
          console.log("verifyUserAuth: UserID 不匹配");
          return { authenticated: false, error: "UserID 不匹配" };
        }
        return { authenticated: true };
      }
    }
    
    return { authenticated: false, error: "身份驗證失敗" };
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
 * @param {string} pin - 用於驗證
 */
function getGroupMemberStats(groupId, userId, username, pin) {
  try {
    const safeGroupId = String(groupId || "").trim();
    
    // 驗證呼叫者
    const authResult = verifyUserAuth(username, pin, userId);
    if (!authResult.authenticated) {
      return { status: "error", message: authResult.error || "身份驗證失敗" };
    }
    
    if (!safeGroupId) {
      return { status: "error", message: "groupId 為空" };
    }

    // 從 Stats 快取表讀取（不再掃描 Progress 全表）
    const statsSheet = getOrCreateStatsSheet();
    const lastRow = statsSheet.getLastRow();
    
    if (lastRow <= 1) {
      return { status: "success", members: [], totalOT: TOTAL_OT_CHAPTERS, totalNT: TOTAL_NT_CHAPTERS };
    }

    const statsData = statsSheet.getRange(2, 1, lastRow - 1, 6).getValues();
    
    // 從 _executionUsersCache 取得用戶名對應（verifyUserAuth 已讀取並快取）
    const usersData = _executionUsersCache || [];
    const userIdToName = {};
    usersData.forEach(r => {
      userIdToName[String(r[2]).trim()] = String(r[0]).trim();
    });

    const members = [];
    statsData.forEach(row => {
      const gId = String(row[0]).trim();
      if (gId === safeGroupId) {
        const uId = String(row[1]).trim();
        members.push({
          username: userIdToName[uId] || "未知用戶",
          userId: uId,
          otChapters: Number(row[2]) || 0,
          ntChapters: Number(row[3]) || 0,
          lsOT: Number(row[4]) || 0,
          lsNT: Number(row[5]) || 0
        });
      }
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