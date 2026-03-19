/**
 * 104 職缺黑名單管理邏輯 (Popup Script)
 * 升級版 V1.1：支援 Checkbox 勾選、搜尋過濾及備份匯入功能，防止資料誤刪。
 */

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("list-container");
  const filterInput = document.getElementById("filter-input");
  const deleteBtn = document.getElementById("delete-selected");
  const saveBtn = document.getElementById("save");
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");

  let masterList = []; // MIS 資料緩衝區：保存完整原始名單

  /**
   * 1. 初始化載入邏輯
   */
  chrome.storage.local.get(["blacklist"], (res) => {
    masterList = res.blacklist || [];
    render(masterList);
  });

  /**
   * 渲染函式：將陣列轉化為具備 Checkbox 的清單
   */
  function render(list) {
    container.innerHTML = "";
    list.forEach((name, index) => {
      const item = document.createElement("div");
      item.className = "list-item";
      item.style =
        "display: flex; align-items: center; padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 14px;";

      item.innerHTML = `
        <input type="checkbox" class="del-check" data-index="${index}" style="margin-right: 10px;">
        <span class="company-name" style="flex: 1;">${name}</span>
      `;
      container.appendChild(item);
    });
  }

  /**
   * 搜尋過濾邏輯 (僅隱藏項目，不影響 masterList)
   */
  filterInput.addEventListener("input", () => {
    const keyword = filterInput.value.trim().toLowerCase();
    const items = container.querySelectorAll(".list-item");

    items.forEach((item) => {
      const name = item.querySelector(".company-name").innerText.toLowerCase();
      item.style.display = name.includes(keyword) ? "flex" : "none";
    });
  });

  /**
   * 2. 移除勾選項目邏輯
   */
  deleteBtn.addEventListener("click", () => {
    const checks = container.querySelectorAll(".del-check:checked");
    if (checks.length === 0) {
      alert("請先勾選要移除的公司！");
      return;
    }

    // 由大到小排序索引，避免刪除時影響後續位置
    const indicesToDelete = Array.from(checks)
      .map((c) => parseInt(c.getAttribute("data-index")))
      .sort((a, b) => b - a);

    indicesToDelete.forEach((idx) => {
      masterList.splice(idx, 1);
    });

    render(masterList);
    filterInput.value = "";
    alert("已從清單中移除所選項目，請記得按下儲存以生效。");
  });

  /**
   * 3. 匯出與匯入 (災難復原機制)
   */
  exportBtn.onclick = () => {
    if (masterList.length === 0) {
      alert("目前沒有資料可以匯出！");
      return;
    }
    const dataStr = JSON.stringify(masterList);

    // 使用 navigator.clipboard 進行複製
    navigator.clipboard
      .writeText(dataStr)
      .then(() => {
        alert("備份資料已複製到剪貼簿！\n請妥善保存於記事本。");
      })
      .catch((err) => {
        console.error("無法複製", err);
      });
  };

  importBtn.onclick = () => {
    const inputData = prompt(
      '請貼上備份的 JSON 字串：\n(格式範例：["公司A", "公司B"])',
    );
    if (inputData) {
      try {
        const parsedData = JSON.parse(inputData);
        if (Array.isArray(parsedData)) {
          // 合併並自動去重
          masterList = [...new Set([...masterList, ...parsedData])];
          render(masterList);
          alert(
            `成功匯入！目前共 ${masterList.length} 筆資料。\n請按下「儲存變更」正式寫入系統。`,
          );
        } else {
          throw new Error();
        }
      } catch (e) {
        alert("匯入失敗！格式不正確。");
      }
    }
  };

  /**
   * 4. 最終資料儲存與分頁重整
   */
  saveBtn.addEventListener("click", () => {
    chrome.storage.local.set({ blacklist: masterList }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]?.id) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
      alert("黑名單已安全更新並儲存！");
    });
  });
});
