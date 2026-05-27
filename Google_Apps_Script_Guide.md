# Google Sheets 後端整合指南

為了讓您的封鎖清單系統可以改用 Google Sheets 儲存資料，請依照以下步驟設定您的 Google Apps Script。

## 1. 建立 Google 試算表
1. 前往 [Google Sheets](https://sheets.google.com/) 並建立一份新的空白試算表。
2. 將第一列 (A1 到 E1) 分別命名為：`username`, `url`, `reason`, `added_at`, `issue_id`。
   - *(注意：請務必與此順序和拼法完全一致，因為前端與腳本依賴這些標題)*

## 2. 部署 Apps Script
1. 在試算表的上方選單，點擊 **擴充功能 (Extensions)** > **Apps Script**。
2. 刪除編輯器中的預設程式碼（包含原本的 `function myFunction() {}`），並完整貼上以下程式碼（請確保複製到最後一行的 `}`）：

```javascript
const SHEET_NAME = "工作表1"; // 若您的分頁名稱不同，請在此修改 (預設可能是 Sheet1 或 工作表1)

// 處理 GET 請求：前端讀取清單
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
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
  const result = rows.map(row => {
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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  
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

    // 寫入新資料 (username, url, reason, added_at, issue_id)
    sheet.appendRow([username, url, reason, added_at, ""]);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "成功加入清單" }))
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
1. 點擊編輯器右上角的 **「部署 (Deploy)」** > **「新增部署作業 (New deployment)」**。
2. 選擇類型：**「網頁應用程式 (Web app)」**。
3. 存取權限 (Who has access)：請務必選擇 **「所有人 (Anyone)」**。
4. 點擊部署，並授權您的 Google 帳號存取該試算表。
5. 部署完成後，會給您一串 **Web App URL**。請複製該網址。

## 4. 設定前端
打開封鎖系統網頁，在「系統設定面板」中選擇「Google Sheets 模式」，並將剛才複製的 Web App URL 貼入即可生效！
