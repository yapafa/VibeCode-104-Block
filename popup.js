/**
 * 104 職缺黑名單管理邏輯 (Popup Script)
 * 負責處理管理介面的初始化載入、資料格式化儲存，以及觸發網頁重整。
 */

document.addEventListener("DOMContentLoaded", () => {
  const area = document.getElementById("list");
  const saveBtn = document.getElementById("save");

  /**
   * 1. 初始化載入邏輯
   * 從 Chrome 本地存儲空間讀取現有的黑名單陣列，並將其轉換為換行字串顯示於 Textarea 中。
   */
  chrome.storage.local.get(["blacklist"], (res) => {
    if (res.blacklist && Array.isArray(res.blacklist)) {
      // 將陣列元素以換行符號結合，便於使用者閱讀與編輯
      area.value = res.blacklist.join("\n");
    }
  });

  /**
   * 2. 資料儲存與分頁互動邏輯
   * 點擊儲存按鈕後，執行資料清洗（Sanitization）並更新 Storage，最後強制重新整理當前分頁。
   */
  saveBtn.addEventListener("click", () => {
    // 將輸入內容按行切割，並移除多餘空白與空行，確保資料庫整潔
    const list = area.value
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s);

    // 執行非同步寫入操作
    chrome.storage.local.set({ blacklist: list }, () => {
      /**
       * 3. 自動化維運動作：分頁同步重整
       * 透過 chrome.tabs API 抓取當前活動分頁，並立即觸發 reload。
       * 目的：確保使用者在修改黑名單後，不需手動按 F5 即可立刻看到過濾效果。
       */
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // 安全性檢查：確認分頁存在且擁有有效的 ID
        if (tabs && tabs[0] && tabs[0].id) {
          // 直接執行重整，無需額外判斷網址，提升執行成功率
          chrome.tabs.reload(tabs[0].id);
        }
      });

      // 維運日誌：於主控台記錄儲存狀態（符合 MIS 監控習慣）
      console.log(
        `[系統訊息] 黑名單儲存成功，當前共計 ${list.length} 筆資料。`,
      );

      // 使用者互動反饋：確認設定已生效
      alert("黑名單已更新，頁面將自動重整！");
    });
  });
});
