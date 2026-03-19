/**
 * 104 職缺黑名單過濾器 - 核心邏輯腳本
 * 功能：自動識別網頁中的公司名稱，並根據黑名單進行即時隱藏與封鎖功能注入。
 */

/**
 * 主要執行函式：執行黑名單比對與 DOM 過濾
 */
function finalDestroyer() {
  chrome.storage.local.get(["blacklist"], (res) => {
    // 取得黑名單並進行標準化處理
    const blacklist = (res.blacklist || [])
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k);

    // 選取網頁中所有的 <a> 標籤
    const allLinks = document.querySelectorAll("a");

    allLinks.forEach((link) => {
      // 提取公司名稱並移除按鈕產生的干擾文字
      const text = link.innerText.replace("[封鎖]", "").trim();
      if (!text || text.length < 2) return;

      const lowerName = text.toLowerCase();
      // 檢查當前公司名稱是否命中黑名單關鍵字
      const shouldBlock = blacklist.some((key) => lowerName.includes(key));

      if (shouldBlock) {
        /**
         * 命中黑名單處理邏輯：隱藏整個職缺卡片
         */
        let target = link;
        for (let i = 0; i < 5; i++) {
          if (target.parentElement) target = target.parentElement;
        }
        target.style.setProperty("display", "none", "important");
      } else {
        /**
         * 未命中黑名單：判斷是否需注入「封鎖」按鈕
         */
        const isCompanyLink =
          link.href.includes("company") ||
          link.classList.contains("cust-name") ||
          link.href.includes("custno=");

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
 */
function injectBtn(el, name) {
  if (el.parentElement.querySelector(".my-block-btn")) return;

  const btn = document.createElement("span");
  btn.innerText = " [封鎖]";
  btn.className = "my-block-btn";
  btn.style =
    "color:#ff4d4f; cursor:pointer; font-weight:bold; font-size:13px; margin-left:8px; display:inline-block;";

  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isConfirmed = confirm(`確定要封鎖「${name}」嗎？`);

    if (isConfirmed) {
      // 視覺即時隱藏 (Optimistic UI)
      let target = el;
      for (let i = 0; i < 5; i++) {
        if (target.parentElement) target = target.parentElement;
      }
      target.style.setProperty("display", "none", "important");

      // 寫入 Storage
      chrome.storage.local.get(["blacklist"], (res) => {
        let list = res.blacklist || [];

        // V1.1 強化點：確保寫入前進行去重與清洗，防止儲存髒資料
        const cleanName = name.trim();
        if (!list.includes(cleanName)) {
          list.push(cleanName);
          chrome.storage.local.set({ blacklist: list }, () => {
            console.log(`[系統訊息] 已成功封鎖：${cleanName}`);
          });
        }
      });
    }
  };
  el.parentElement.appendChild(btn);
}

/**
 * 監聽邏輯優化
 */
let scrollTimeout;
window.addEventListener("scroll", () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(finalDestroyer, 300);
});

// 初始觸發
setTimeout(finalDestroyer, 1000);
