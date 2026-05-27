# Google Sheets 後端整合指南 (審核機制版)

為了讓您的封鎖清單系統具備「管理員審核機制」與「純文字訂閱源輸出」，請依照以下步驟設定您的 Google Apps Script。

## 1. 建立 Google 試算表
1. 前往 [Google Sheets](https://sheets.google.com/) 並建立一份新的空白試算表。
2. 將第一列 (A1 到 F1) 分別命名為：`username`, `url`, `reason`, `added_at`, `issue_id`, `status`。
   - *(注意：新增了第六個欄位 `status`，拼法必須完全一致)*

## 2. 部署 Apps Script
1. 在試算表的上方選單，點擊 **擴充功能 (Extensions)** > **Apps Script**。
2. 刪除編輯器中的預設程式碼（包含原本的 `function myFunction() {}`），並完整貼上以下程式碼（請確保複製到最後一行的 `}`）：

```javascript
// 處理 GET 請求：前端讀取清單或 TXT 訂閱源
function doGet(e) {
  // 直接取得第一個工作表，無視名稱
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: "找不到工作表" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 將資料轉為 JSON 陣列
  const headers = data[0];
  const rows = data.slice(1);
  
  const statusIndex = headers.indexOf('status');
  const urlIndex = headers.indexOf('url');
  
  // 只過濾出 status 為 Approved 的資料
  let approvedRows = rows;
  if (statusIndex !== -1) {
    approvedRows = rows.filter(row => row[statusIndex] === 'Approved');
  }

  // 若帶有 ?format=txt 參數，則輸出給廣告攔截器訂閱的純文字清單
  if (e && e.parameter && e.parameter.format === 'txt') {
    if (urlIndex === -1) {
      return ContentService.createTextOutput("Error: 找不到 url 欄位").setMimeType(ContentService.MimeType.TEXT);
    }
    const txtOutput = approvedRows.map(row => row[urlIndex]).join("\n");
    return ContentService.createTextOutput(txtOutput).setMimeType(ContentService.MimeType.TEXT);
  }

  const result = approvedRows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || "";
    });
    return obj;
  });

  // 支援 CORS，需回傳 JSON 格式
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// 處理 POST 請求：前端提交檢舉
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  
  try {
    // 解析前端傳來的 JSON
    const body = JSON.parse(e.postData.contents);
    const { username, url, reason, added_at } = body;
    
    if (!username || !url) {
      throw new Error("缺少必要參數");
    }

    // 檢查是否已存在
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === username) {
         return ContentService.createTextOutput(JSON.stringify({ status: "exists", message: "該帳號已在清單中" }))
           .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 寫入新資料 (username, url, reason, added_at, issue_id, status)
    // 預設狀態為 Pending
    sheet.appendRow([username, url, reason, added_at, "", "Pending"]);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "已送出，等待管理員審核" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 必須加上此函數處理 CORS 預檢請求
function doOptions(e) {
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. 發佈為 Web App
1. 點擊編輯器右上角的 **「部署 (Deploy)」** > **「管理部署作業 (Manage deployments)」**。
2. 點擊上方的鉛筆圖示（編輯）。
3. 將「版本」下拉選單改為 **「建立新版本 (New version)」**。
4. 點擊部署。
5. *(如果之前沒有部署過，請選新增部署作業，存取權限設為「所有人 (Anyone)」)*

## 4. 審核流程
1. 訪客於網頁提交檢舉後，網頁會跳出「已送出審核」提示。
2. 開啟您的 Google 試算表。
3. 找到狀態欄位 (`status`) 顯示為 `Pending` 的行。
4. 人工確認該帳號確實違規後，將 `Pending` 改成 `Approved`。
5. 網頁清單與訂閱源就會立刻顯示該筆資料！
