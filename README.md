# Threads 詐騙與廣告封鎖清單

這是一個無伺服器（Serverless）架構的 Threads 帳號封鎖平台，完全基於 GitHub 生態系運作。

## 系統特點
- **無需後端伺服器**：使用 GitHub Pages 託管前端網頁。
- **免資料庫**：透過 `blocklist.json` 和 `blocklist.txt` 儲存資料。
- **自動化審核流程**：使用 GitHub Issues 收取檢舉，管理員標記 `approved` 後，由 GitHub Actions 自動解析並更新清單。
- **支援第三方訂閱**：過濾器（如 AdGuard）可直接訂閱 `blocklist.txt`。

## 如何使用（管理員指南）
1. Fork 此專案，並啟用 GitHub Pages (指向 `main` 分支根目錄)。
2. 在 `index.html` 中修改 `GITHUB_OWNER` 與 `GITHUB_REPO` 變數為您的儲存庫資訊。
3. 若有人透過網頁提交檢舉，您會在 Issues 中收到通知。
4. 人工確認該帳號確實為詐騙/廣告後，在此 Issue 加上 `approved` 標籤。
5. GitHub Actions 會自動更新 `blocklist.json` 及 `txt`，並自動關閉該 Issue。
