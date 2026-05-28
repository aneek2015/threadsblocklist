// ==UserScript==
// @name         Threads 詐騙與廣告封鎖防護網
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自動攔截並隱藏 Threads 上的詐騙與廣告帳號貼文。自動同步 Google Sheets 系統訂閱源。
// @author       Threads Blocker System
// @match        *://*.threads.net/*
// @match        *://threads.net/*
// @grant        GM_xmlhttpRequest
// @connect      script.google.com
// @connect      script.googleusercontent.com
// ==/UserScript==

(function() {
    'use strict';

    // 您的 Google Web App API 網址 (系統訂閱源)
    const API_URL = 'https://script.google.com/macros/s/AKfycbzqLcPOlsONoujtSaBneMvPqBQfsRUs6KLZwlyBqQ6FtUp_B6-BXs9pJ4iu_MYjromfAA/exec';
    
    let blocklist = new Set();
    let isLoaded = false;

    // 1. 取得最新黑名單
    function fetchBlocklist() {
        console.log('[Threads Blocker] 正在同步封鎖清單...');
        GM_xmlhttpRequest({
            method: 'GET',
            url: API_URL,
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    if (Array.isArray(data)) {
                        data.forEach(item => {
                            if (item.username) {
                                blocklist.add(item.username.toLowerCase());
                            }
                        });
                        isLoaded = true;
                        console.log(`[Threads Blocker] 同步成功！已載入 ${blocklist.size} 筆封鎖帳號。`);
                        scanAndHide(); // 初次掃描
                    }
                } catch (e) {
                    console.error('[Threads Blocker] 解析名單失敗', e);
                }
            },
            onerror: function(err) {
                console.error('[Threads Blocker] 網路請求失敗', err);
            }
        });
    }

    // 2. 掃描與隱藏邏輯
    function scanAndHide() {
        if (!isLoaded || blocklist.size === 0) return;

        // 尋找畫面上所有指向帳號頁面的連結 (例如 href="/@username")
        const links = document.querySelectorAll('a[href^="/@"]');
        
        links.forEach(link => {
            // 避免重複處理
            if (link.dataset.scamChecked) return;
            link.dataset.scamChecked = 'true';

            const href = link.getAttribute('href');
            // 解析出帳號 ID
            const usernameMatch = href.match(/^\/@([a-zA-Z0-9_\.]+)/);
            
            if (usernameMatch) {
                const username = usernameMatch[1].toLowerCase();
                
                // 比對黑名單
                if (blocklist.has(username)) {
                    // Threads 的 DOM 經常變動，我們嘗試尋找貼文的外層容器
                    // 通常貼文容器會有 data-pressable-container="true" 或是 role="article"
                    let container = link.closest('div[data-pressable-container="true"]') || 
                                    link.closest('div[role="article"]');
                    
                    // 若找不到標準標籤，就直接往上尋找 6 層作為容器
                    if (!container) {
                        container = link;
                        for(let i = 0; i < 6; i++) {
                            if(container.parentElement) {
                                container = container.parentElement;
                            }
                        }
                    }

                    // 進行隱藏與視覺標記 (不刪除 DOM 以免造成 React 崩潰)
                    if (container && !container.dataset.scamBlocked) {
                        container.dataset.scamBlocked = 'true';
                        
                        // 套用 Cyber-Brutalist 封鎖特效
                        container.style.opacity = '0.15';
                        container.style.filter = 'grayscale(100%) blur(2px)';
                        container.style.pointerEvents = 'none';
                        container.style.borderLeft = '4px solid #FF2A55';
                        container.style.transition = 'all 0.3s ease';
                        
                        console.log(`[Threads Blocker] 🛑 已攔截並隱藏詐騙貼文: @${username}`);
                    }
                }
            }
        });
    }

    // 3. 監聽畫面變動 (應對無限捲動與動態載入)
    const observer = new MutationObserver((mutations) => {
        let shouldScan = false;
        for (let mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldScan = true;
                break;
            }
        }
        if (shouldScan) {
            // 使用 requestAnimationFrame 避免過度消耗效能
            requestAnimationFrame(scanAndHide);
        }
    });

    // 啟動系統
    fetchBlocklist();
    observer.observe(document.body, { childList: true, subtree: true });

})();
