/**
 * 104 職缺黑名單過濾器 - 核心邏輯腳本
 * 功能：自動識別網頁中的公司名稱，並根據黑名單進行即時隱藏與封鎖功能注入。
 */

/**
 * 主要執行函式：執行黑名單比對與 DOM 過濾
 * 邏輯：從 Chrome Storage 取得黑名單，遍歷網頁連結並執行對應動作。
 */
function finalDestroyer() {
  chrome.storage.local.get(["blacklist"], (res) => {
    // 取得黑名單並進行標準化處理（去空白、轉小寫、過濾空值）
    const blacklist = (res.blacklist || [])
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k);

    // 選取網頁中所有的 <a> 標籤，準備進行掃描
    const allLinks = document.querySelectorAll("a");

    allLinks.forEach((link) => {
      // 提取公司名稱並移除按鈕產生的干擾文字
      const text = link.innerText.replace("[封鎖]", "").trim();
      if (!text || text.length < 2) return;

      const lowerName = text.toLowerCase();
      // 檢查當前公司名稱是否包含在黑名單關鍵字中
      const shouldBlock = blacklist.some((key) => lowerName.includes(key));

      if (shouldBlock) {
        /**
         * 命中黑名單處理邏輯
         * 向上追蹤 5 層父元素以確保能包覆整個職缺卡片區域 (Job Card Container)
         */
        let target = link;
        for (let i = 0; i < 5; i++) {
          if (target.parentElement) target = target.parentElement;
        }
        // 強制隱藏該元件，避免 104 原生樣式覆寫
        target.style.setProperty("display", "none", "important");
      } else {
        /**
         * 未命中黑名單：檢查是否為公司連結，並判斷是否需注入「封鎖」按鈕
         * 識別特徵：包含 company 關鍵字、特定 Class 或 custno 參數
         */
        const isCompanyLink =
          link.href.includes("company") ||
          link.classList.contains("cust-name") ||
          link.href.includes("custno=");

        // 使用 dataset 標記位防止重複注入按鈕
        if (isCompanyLink && !link.dataset.hasBlockBtn) {
          link.dataset.hasBlockBtn = "true";
          injectBtn(link, text);
        }
      }
    });
  });
}

/**
 * 按鈕注入函式
 * @param {HTMLElement} el - 目標連結元素
 * @param {string} name - 公司名稱
 */
function injectBtn(el, name) {
  // 二次檢查確保同一層級不重複產生按鈕
  if (el.parentElement.querySelector(".my-block-btn")) return;

  const btn = document.createElement("span");
  btn.innerText = " [封鎖]";
  btn.className = "my-block-btn";
  // 設定顯眼的紅色警示樣式
  btn.style =
    "color:#ff4d4f; cursor:pointer; font-weight:bold; font-size:13px; margin-left:8px; display:inline-block;";

  btn.onclick = (e) => {
    // 攔截事件冒泡與預設行為，防止點擊時觸發 104 網頁跳轉
    e.preventDefault();
    e.stopPropagation();

    // 執行確認程序
    const isConfirmed = confirm(`確定要封鎖「${name}」嗎？`);

    if (isConfirmed) {
      /**
       * 使用者體驗優化 (UX Optimistic UI)
       * 先執行視覺上的隱藏，讓使用者感覺操作即刻生效，無需等待資料庫寫入完成
       */
      let target = el;
      for (let i = 0; i < 5; i++) {
        if (target.parentElement) target = target.parentElement;
      }
      target.style.setProperty("display", "none", "important");

      // 非同步將封鎖名稱寫入 Chrome 本地端儲存空間
      chrome.storage.local.get(["blacklist"], (res) => {
        const list = res.blacklist || [];
        if (!list.includes(name)) {
          list.push(name);
          chrome.storage.local.set({ blacklist: list });
        }
      });
    }
  };
  // 將按鈕掛載於公司名稱連結之後
  el.parentElement.appendChild(btn);
}

/**
 * 滾動監聽優化 (Debounce 概念)
 * 104 採用異步載入機制，當使用者捲動頁面時，以 300ms 緩衝觸發掃描，平衡效能與體驗
 */
let scrollTimeout;
window.addEventListener("scroll", () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(finalDestroyer, 300);
});

/**
 * 初始觸發
 * 延遲 1 秒執行，確保 104 異步載入的 DOM 元素已渲染完成
 */
setTimeout(finalDestroyer, 1000);
