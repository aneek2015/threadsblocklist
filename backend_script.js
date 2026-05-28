/**
 * Threads 封鎖防護網 - Google Apps Script 後端
 * 
 * [安裝說明]
 * 1. 打開 Google Sheets
 * 2. 建立兩個工作表 (Tabs)：
 *    - 第一個命名為「工作表1」或「Main」(對應下方 sheetName)
 *    - 第二個命名為「申訴審核」(對應下方 appealSheetName)
 * 3. 前往 擴充功能 -> Apps Script，貼上此程式碼
 * 4. 點擊 部署 -> 新增部署作業 -> 網頁應用程式 -> 存取權限設為「所有人」
 */

const sheetName = '工作表1'; // 主黑名單資料表名稱
const appealSheetName = '申訴審核'; // 申訴專用資料表名稱

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const username = postData.username;
    const url = postData.url;
    const reason = postData.reason;
    const addedAt = postData.added_at;
    const action = postData.action || 'report'; // 預設為一般舉報

    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]; // Fallback 到第一個分頁

    const appealSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(appealSheetName);

    // 如果沒有申訴分頁，自動建立一個
    let targetSheet = appealSheet;
    if (action === 'appeal' && !targetSheet) {
      targetSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(appealSheetName);
      targetSheet.appendRow(['帳號', 'URL', '申訴理由', '時間', '狀態(若駁回填此)']);
    }

    if (action === 'appeal') {
      // 處理申訴 (Appeal) - 不執行重複檢查，直接寫入申訴分頁
      targetSheet.appendRow([username, url, reason, addedAt, '審核中']);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Appeal submitted' })).setMimeType(ContentService.MimeType.JSON);
    } else {
      // 處理一般舉報 (Report) - 執行重複檢查
      const data = sheet.getDataRange().getValues();
      const exists = data.some(row => row[0] && row[0].toString().toLowerCase() === username.toLowerCase());

      if (exists) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'exists', message: 'User already exists' })).setMimeType(ContentService.MimeType.JSON);
      } else {
        // 寫入一般名單
        sheet.appendRow([username, url, reason, addedAt]);
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Report submitted' })).setMimeType(ContentService.MimeType.JSON);
      }
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // 處理 GET 請求，回傳 JSON 或 TXT
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]; // Fallback 到第一個分頁

  const format = e.parameter.format;
  const type = e.parameter.type;

  if (type === 'appeals') {
    const appealSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(appealSheetName);
    if (!appealSheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    
    const data = appealSheet.getDataRange().getValues();
    const result = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        result.push({
          username: data[i][0],
          url: data[i][1],
          reason: data[i][2],
          added_at: data[i][3],
          status: data[i][4] || '審核中' // 第5欄(E欄)為狀態
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const result = [];
  // 假設第一行是標題，從第二行開始讀取
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      result.push({
        username: data[i][0],
        url: data[i][1],
        reason: data[i][2],
        added_at: data[i][3]
      });
    }
  }

  if (format === 'txt') {
    const textOutput = result.map(item => `https://www.threads.net/@${item.username}`).join('\n');
    return ContentService.createTextOutput(textOutput).setMimeType(ContentService.MimeType.TEXT);
  } else {
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
}
