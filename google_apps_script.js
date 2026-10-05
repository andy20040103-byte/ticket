/**
 * ==========================================================================
 * 管樂團售票系統 - Google Apps Script (GAS) 後端自動化程式
 * 試算表：張佳韻 票務登記
 * ==========================================================================
 * 
 * 【功能工作表說明】
 * 1. 【1. 訂單記錄 (依時間排序)】：依團員訂位下單先後順序排列，記錄完整訂單與金額明細。
 * 2. 【2. 席位總清冊 (依座位排序)】：將所有已售出的席次依「樓層 ➔ 排數 ➔ 座號」精確排序，方便票務快速核對特定座位是由哪位團員購買。
 * 3. 【3. 團員訂票總表 (依姓名筆劃排序)】：依團員姓名筆劃（繁體中文筆劃序）精確排序，方便現場取票簽到或個別團員對帳。
 * 4. 【已售座位清單 (系統防撞位)】：供售票網站前端即時查詢已售出座位 ID，防止撞位。
 * 
 * 【使用步驟】
 * 1. 開啟您的 Google 試算表（張佳韻 票務登記）。
 * 2. 點選上方「擴充功能」->「Apps Script」。
 * 3. 將本檔案全部程式碼複製貼上，覆蓋原內容並儲存。
 * 4. 工具列選擇「setupSheets」執行一次，系統即會自動建立美化這三個統計工作表！
 * 5. 點選右上角「部署」->「新部署作業」-> 種類選「網路應用程式」：
 *    - 執行身分：我
 *    - 誰可以存取：所有人 (Anyone) ★注意：一定要選所有人！
 * 6. 複製獲得的「網路應用程式網址」，貼入 config.js 的 GAS_API_URL 中即可！
 */

const SHEET_TIME_ORDERS = "1. 訂單記錄 (依時間排序)";
const SHEET_SEAT_SORTED = "2. 席位總清冊 (依座位排序)";
const SHEET_NAME_SORTED = "3. 團員訂票總表 (依姓名筆劃排序)";
const SHEET_RAW_SEATS   = "已售座位清單 (系統防撞位)";

/**
 * 首次初始化工作表結構與表頭美化
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 初始化【1. 訂單記錄 (依時間排序)】
  let sheet1 = getOrCreateSheet(ss, SHEET_TIME_ORDERS, 0);
  const headers1 = [
    "訂單編號", "下單時間", "團員姓名", "所屬聲部", "電子信箱", "聯絡電話", 
    "LINE ID", "選購座席清單", "總張數", "原價合計", "團員優惠折抵", "實付金額", 
    "贈送節目冊數", "備註需求", "訂單狀態"
  ];
  styleHeader(sheet1, headers1, "#292524", "#faf8f5");

  // 2. 初始化【2. 席位總清冊 (依座位排序)】
  let sheet2 = getOrCreateSheet(ss, SHEET_SEAT_SORTED, 1);
  const headers2 = [
    "座位代碼", "樓層", "排數", "座號", "座位完整標示", "票價原價", 
    "訂位團員", "所屬聲部", "聯絡電話", "電子信箱", "所屬訂單編號", "下單時間"
  ];
  styleHeader(sheet2, headers2, "#78350f", "#fef3c7");

  // 3. 初始化【3. 團員訂票總表 (依姓名筆劃排序)】
  let sheet3 = getOrCreateSheet(ss, SHEET_NAME_SORTED, 2);
  const headers3 = [
    "團員姓名 (筆劃序)", "所屬聲部", "聯絡電話", "電子信箱", "訂購座席明細", 
    "總張數", "實付金額", "贈送節目冊數", "訂單編號", "下單時間", "訂單狀態"
  ];
  styleHeader(sheet3, headers3, "#1e3a8a", "#eff6ff");

  // 4. 初始化【已售座位清單 (系統防撞位)】
  let sheet4 = getOrCreateSheet(ss, SHEET_RAW_SEATS, 3);
  const headers4 = ["座位代碼 (ID)", "座位說明", "所屬訂單編號", "團員姓名", "電子信箱", "登記時間"];
  styleHeader(sheet4, headers4, "#57534e", "#faf8f5");

  SpreadsheetApp.flush();
  refreshAllSortedViews(ss);
  Logger.log("✅ 全部 4 個工作表初始化並美化完成！");
}

function getOrCreateSheet(ss, name, index) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name, index);
  }
  return sheet;
}

function styleHeader(sheet, headers, bgColor, fontColor) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground(bgColor)
    .setFontColor(fontColor)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);
  sheet.setFrozenRows(1);
}

/**
 * 處理 GET 請求
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const queryEmail = (e.parameter && e.parameter.email) ? String(e.parameter.email).trim().toLowerCase() : "";
    const queryOrderId = (e.parameter && e.parameter.orderId) ? String(e.parameter.orderId).trim() : "";

    // 團員查詢訂單
    if (queryEmail || queryOrderId) {
      const orderSheet = ss.getSheetByName(SHEET_TIME_ORDERS);
      if (!orderSheet || orderSheet.getLastRow() <= 1) {
        return createJsonResponse({ status: "success", orders: [] });
      }

      const rows = orderSheet.getRange(2, 1, orderSheet.getLastRow() - 1, 15).getValues();
      const matchedOrders = [];

      rows.forEach(r => {
        const orderId = String(r[0]).trim();
        const email = String(r[4]).trim().toLowerCase();
        const status = String(r[14]).trim();

        if ((queryEmail && email === queryEmail) || (queryOrderId && orderId === queryOrderId)) {
          matchedOrders.push({
            orderId: orderId,
            timestamp: r[1],
            memberName: r[2],
            section: r[3],
            email: r[4],
            phone: r[5],
            seats: String(r[7]).split(", ").map(s => s.trim()),
            seatDetails: String(r[7]).split(", ").map(s => s.trim()),
            seatCount: r[8],
            originalTotal: r[9],
            discountTotal: r[10],
            finalTotal: r[11],
            bookletsCount: r[12],
            notes: r[13],
            status: status || "有效登記"
          });
        }
      });

      return createJsonResponse({ status: "success", orders: matchedOrders });
    }

    // 常規讀取已售出的席次 ID 清單
    let rawSheet = ss.getSheetByName(SHEET_RAW_SEATS);
    if (!rawSheet) {
      setupSheets();
      rawSheet = ss.getSheetByName(SHEET_RAW_SEATS);
    }
    
    const lastRow = rawSheet.getLastRow();
    let soldSeatIds = [];
    if (lastRow > 1) {
      const values = rawSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      soldSeatIds = values.map(row => String(row[0]).trim()).filter(id => id.length > 0);
    }
    
    return createJsonResponse({
      status: "success",
      totalSold: soldSeatIds.length,
      soldSeats: soldSeatIds,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * 處理 POST 請求（建立新訂單 或 取消訂單）
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  const success = lock.tryLock(10000); // 10秒排隊鎖定防搶位
  
  if (!success) {
    return createJsonResponse({
      status: "error",
      message: "系統目前忙碌中，請於 3 秒後重試"
    });
  }
  
  try {
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
      if (typeof data.seats === 'string') data.seats = JSON.parse(data.seats);
    } else {
      throw new Error("無效的資料格式");
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let timeSheet = ss.getSheetByName(SHEET_TIME_ORDERS);
    let rawSheet  = ss.getSheetByName(SHEET_RAW_SEATS);
    
    if (!timeSheet || !rawSheet) {
      setupSheets();
      timeSheet = ss.getSheetByName(SHEET_TIME_ORDERS);
      rawSheet  = ss.getSheetByName(SHEET_RAW_SEATS);
    }

    // ================= 1. 取消訂單請求 =================
    if (data.action === "cancel_order") {
      const targetOrderId = String(data.orderId || "").trim();
      const targetEmail = String(data.email || "").trim().toLowerCase();

      if (!targetOrderId) {
        return createJsonResponse({ status: "error", message: "缺少訂單編號" });
      }

      // 更新【1. 訂單記錄】狀態
      const lastOrderRow = timeSheet.getLastRow();
      let orderFound = false;

      if (lastOrderRow > 1) {
        const orderValues = timeSheet.getRange(2, 1, lastOrderRow - 1, 15).getValues();
        for (let i = 0; i < orderValues.length; i++) {
          const rowOrderId = String(orderValues[i][0]).trim();
          const rowEmail = String(orderValues[i][4]).trim().toLowerCase();

          if (rowOrderId === targetOrderId) {
            if (targetEmail && rowEmail && rowEmail !== targetEmail) {
              return createJsonResponse({ status: "error", message: "信箱與訂單登記不符" });
            }
            timeSheet.getRange(i + 2, 15).setValue("已取消 (團員自行釋出)");
            orderFound = true;
            break;
          }
        }
      }

      if (!orderFound) {
        return createJsonResponse({ status: "error", message: "找不到該筆訂單" });
      }

      // 從【已售座位清單】中刪除
      const lastSeatRow = rawSheet.getLastRow();
      if (lastSeatRow > 1) {
        const seatValues = rawSheet.getRange(2, 1, lastSeatRow - 1, 3).getValues();
        for (let j = seatValues.length - 1; j >= 0; j--) {
          if (String(seatValues[j][2]).trim() === targetOrderId) {
            rawSheet.deleteRow(j + 2);
          }
        }
      }

      SpreadsheetApp.flush();
      // 同步重算另外兩個統計工作表
      refreshAllSortedViews(ss);

      return createJsonResponse({
        status: "success",
        message: "訂單已成功取消，座位已重新釋出！"
      });
    }

    // ================= 2. 建立新訂單請求 =================
    const requestedSeatIds = data.seats.map(s => typeof s === 'string' ? s : s.id);
    const lastSeatRow = rawSheet.getLastRow();
    let existingSoldSeats = [];
    
    if (lastSeatRow > 1) {
      const seatValues = rawSheet.getRange(2, 1, lastSeatRow - 1, 1).getValues();
      existingSoldSeats = seatValues.map(r => String(r[0]).trim());
    }
    
    // 嚴格衝突檢查：若已被搶先買走
    const conflictSeats = requestedSeatIds.filter(id => existingSoldSeats.includes(id));
    if (conflictSeats.length > 0) {
      return createJsonResponse({
        status: "conflict",
        message: "抱歉！以下席次剛剛已被其他團員搶先登記完成：" + conflictSeats.join(", "),
        conflictSeats: conflictSeats
      });
    }
    
    // 寫入【1. 訂單記錄 (依時間排序)】
    const nowStr = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
    const orderId = data.orderId || ("WB-" + Utilities.formatDate(new Date(), "Asia/Taipei", "yyyyMMdd-HHmmss") + "-" + Math.floor(100 + Math.random() * 900));
    const seatNames = Array.isArray(data.seatDetails) ? data.seatDetails.join(", ") : requestedSeatIds.join(", ");
    
    const newOrderRow = [
      orderId,
      nowStr,
      data.memberName || "",
      data.section || "",
      data.email || "",
      data.phone || "",
      data.lineId || "",
      seatNames,
      data.seatCount || requestedSeatIds.length,
      data.originalTotal || 0,
      data.discountTotal || 0,
      data.finalTotal || 0,
      data.bookletsCount || 0,
      data.notes || "",
      "有效登記 (待對帳)"
    ];
    
    timeSheet.appendRow(newOrderRow);
    
    // 寫入【已售座位清單 (系統防撞位)】
    const newSeatRows = requestedSeatIds.map(id => [
      id,
      seatNames,
      orderId,
      data.memberName || "",
      data.email || "",
      nowStr
    ]);
    
    if (newSeatRows.length > 0) {
      rawSheet.getRange(rawSheet.getLastRow() + 1, 1, newSeatRows.length, 6).setValues(newSeatRows);
    }
    
    SpreadsheetApp.flush();

    // ★ 同步刷新【2. 席位總清冊 (依座位排序)】與【3. 團員訂票總表 (依姓名筆劃排序)】
    refreshAllSortedViews(ss);
    
    return createJsonResponse({
      status: "success",
      orderId: orderId,
      message: "訂票成功！",
      bookedSeats: requestedSeatIds
    });
    
  } catch (err) {
    return createJsonResponse({ status: "error", message: "處理失敗：" + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 自動同步並重新計算另外兩張排序工作表
 */
function refreshAllSortedViews(ss) {
  try {
    const timeSheet = ss.getSheetByName(SHEET_TIME_ORDERS);
    const seatSortedSheet = ss.getSheetByName(SHEET_SEAT_SORTED);
    const nameSortedSheet = ss.getSheetByName(SHEET_NAME_SORTED);

    if (!timeSheet || !seatSortedSheet || !nameSortedSheet) return;

    const lastRow = timeSheet.getLastRow();
    if (lastRow <= 1) {
      clearSheetData(seatSortedSheet);
      clearSheetData(nameSortedSheet);
      return;
    }

    const orderRows = timeSheet.getRange(2, 1, lastRow - 1, 15).getValues();
    // 僅統計「有效登記」的訂單
    const validOrders = orderRows.filter(r => !String(r[14]).includes("已取消"));

    // ================= A. 產生【2. 席位總清冊 (依座位排序)】=================
    const seatList = [];
    validOrders.forEach(order => {
      const orderId = order[0];
      const timeStr = order[1];
      const memberName = order[2];
      const section = order[3];
      const email = order[4];
      const phone = order[5];
      const seatNames = String(order[7]).split(",").map(s => s.trim());

      seatNames.forEach(seatName => {
        // 解析座位資訊 例如 "1樓 8排 15號" 或 "1F-8-15"
        const parsed = parseSeatDetails(seatName);
        seatList.push({
          seatId: parsed.id,
          floor: parsed.floor,
          row: parsed.row,
          seatNum: parsed.seat,
          displayName: seatName,
          price: parsed.price,
          memberName: memberName,
          section: section,
          phone: phone,
          email: email,
          orderId: orderId,
          timeStr: timeStr
        });
      });
    });

    // 依「樓層 ➔ 排數 ➔ 座號」排序
    seatList.sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      if (a.row !== b.row) return a.row - b.row;
      return a.seatNum - b.seatNum;
    });

    clearSheetData(seatSortedSheet);
    if (seatList.length > 0) {
      const seatRows = seatList.map(s => [
        s.seatId,
        `${s.floor}樓`,
        `${s.row}排`,
        `${s.seatNum}號`,
        s.displayName,
        s.price,
        s.memberName,
        s.section,
        s.phone,
        s.email,
        s.orderId,
        s.timeStr
      ]);
      seatSortedSheet.getRange(2, 1, seatRows.length, 12).setValues(seatRows);
      seatSortedSheet.getRange(2, 6, seatRows.length, 1).setNumberFormat("$#,##0");
      seatSortedSheet.getRange(2, 1, seatRows.length, 5).setHorizontalAlignment("center");
    }

    // ================= B. 產生【3. 團員訂票總表 (依姓名筆劃排序)】=================
    const memberOrders = validOrders.map(r => ({
      name: String(r[2]).trim(),
      section: r[3],
      phone: r[5],
      email: r[4],
      seats: r[7],
      count: r[8],
      total: r[11],
      booklets: r[12],
      orderId: r[0],
      time: r[1],
      status: r[14]
    }));

    // 依繁體中文「姓名筆劃序 (zh-Hant)」排序
    memberOrders.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant", { numeric: true }));

    clearSheetData(nameSortedSheet);
    if (memberOrders.length > 0) {
      const nameRows = memberOrders.map(m => [
        m.name,
        m.section,
        m.phone,
        m.email,
        m.seats,
        m.count,
        m.total,
        m.booklets,
        m.orderId,
        m.time,
        m.status
      ]);
      nameSortedSheet.getRange(2, 1, nameRows.length, 11).setValues(nameRows);
      nameSortedSheet.getRange(2, 7, nameRows.length, 1).setNumberFormat("$#,##0");
      nameSortedSheet.getRange(2, 6, nameRows.length, 1).setHorizontalAlignment("center");
      nameSortedSheet.getRange(2, 8, nameRows.length, 1).setHorizontalAlignment("center");
    }

    SpreadsheetApp.flush();
  } catch (e) {
    Logger.log("刷新排序視圖時發生錯誤：" + e);
  }
}

function clearSheetData(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
}

/**
 * 座位名稱解析輔助函式
 */
function parseSeatDetails(seatName) {
  // 匹配 "1樓 8排 15號" 或 "1F-8-15"
  let floor = 1, row = 0, seat = 0;
  const match1 = seatName.match(/(\d+)樓\s*(\d+)排\s*(\d+)號/);
  if (match1) {
    floor = parseInt(match1[1]);
    row = parseInt(match1[2]);
    seat = parseInt(match1[3]);
  } else {
    const match2 = seatName.match(/(\d+)F-(\d+)-(\d+)/i);
    if (match2) {
      floor = parseInt(match2[1]);
      row = parseInt(match2[2]);
      seat = parseInt(match2[3]);
    }
  }

  let price = 300;
  if (floor === 2) {
    price = 100;
  } else if (floor === 1) {
    if (row >= 5 && row <= 7) price = 1000;
    else if (row >= 8 && row <= 14) {
      if (seat >= 29) price = 300;
      else price = 500;
    } else {
      price = 300;
    }
  }

  return {
    id: `${floor}F-${row}-${seat}`,
    floor: floor,
    row: row,
    seat: seat,
    price: price
  };
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
