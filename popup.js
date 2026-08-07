/**
 * LinkedIn 黑名單管理邏輯 (Popup Script)
 * V1.2：雙頁籤管理（公司 / 單一職缺）、Checkbox 勾選、搜尋過濾與備份匯入。
 */

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("list-container");
  const filterInput = document.getElementById("filter-input");
  const deleteBtn = document.getElementById("delete-selected");
  const saveBtn = document.getElementById("save");
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const tabCompanies = document.getElementById("tab-companies");
  const tabJobs = document.getElementById("tab-jobs");

  let currentTab = "companies"; // 'companies' 或 'jobs'
  let masterCompanies = [];
  let masterJobs = []; // 儲存物件陣列: [{ id: '123', title: '職缺名稱' }]

  // 初始化載入
  chrome.storage.local.get(["blacklist", "blockedJobs"], (res) => {
    masterCompanies = res.blacklist || [];
    masterJobs = res.blockedJobs || [];
    render();
  });

  // 頁籤切換邏輯
  tabCompanies.onclick = () => {
    currentTab = "companies";
    tabCompanies.classList.add("active");
    tabJobs.classList.remove("active");
    filterInput.placeholder = "🔍 搜尋已封鎖的公司...";
    render();
  };

  tabJobs.onclick = () => {
    currentTab = "jobs";
    tabJobs.classList.add("active");
    tabCompanies.classList.remove("active");
    filterInput.placeholder = "🔍 搜尋已封鎖的職缺...";
    render();
  };

  // 渲染清單
  function render() {
    container.innerHTML = "";
    const list = currentTab === "companies" ? masterCompanies : masterJobs;

    list.forEach((item, index) => {
      const itemEl = document.createElement("div");
      itemEl.className = "list-item";
      itemEl.style =
        "display: flex; align-items: center; padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 13px;";

      const displayText =
        currentTab === "companies"
          ? item
          : `[ID:${item.id}] ${item.title || "未命名職缺"}`;

      itemEl.innerHTML = `
        <input type="checkbox" class="del-check" data-index="${index}" style="margin-right: 10px;">
        <span class="item-name" style="flex: 1; word-break: break-all;">${displayText}</span>
      `;
      container.appendChild(itemEl);
    });
  }

  // 搜尋過濾
  filterInput.addEventListener("input", () => {
    const keyword = filterInput.value.trim().toLowerCase();
    const items = container.querySelectorAll(".list-item");

    items.forEach((item) => {
      const name = item.querySelector(".item-name").innerText.toLowerCase();
      item.style.display = name.includes(keyword) ? "flex" : "none";
    });
  });

  // 刪除勾選項目
  deleteBtn.addEventListener("click", () => {
    const checks = container.querySelectorAll(".del-check:checked");
    if (checks.length === 0) {
      alert("請先勾選要移除的項目！");
      return;
    }

    const indicesToDelete = Array.from(checks)
      .map((c) => parseInt(c.getAttribute("data-index")))
      .sort((a, b) => b - a);

    const targetList = currentTab === "companies" ? masterCompanies : masterJobs;
    indicesToDelete.forEach((idx) => targetList.splice(idx, 1));

    render();
    filterInput.value = "";
    alert("已從清單中移除所選項目，請記得按下儲存以生效。");
  });

  // 匯出備份 (JSON 包含公司與職缺)
  exportBtn.onclick = () => {
    const backupData = {
      blacklist: masterCompanies,
      blockedJobs: masterJobs,
    };
    const dataStr = JSON.stringify(backupData);

    navigator.clipboard
      .writeText(dataStr)
      .then(() => alert("完整備份資料（公司與職缺）已複製到剪貼簿！"))
      .catch((err) => console.error("無法複製", err));
  };

  // 匯入備份
  importBtn.onclick = () => {
    const inputData = prompt("請貼上備份的 JSON 字串：");
    if (inputData) {
      try {
        const parsed = JSON.parse(inputData);
        if (parsed.blacklist || parsed.blockedJobs) {
          if (Array.isArray(parsed.blacklist)) {
            masterCompanies = [...new Set([...masterCompanies, ...parsed.blacklist])];
          }
          if (Array.isArray(parsed.blockedJobs)) {
            // 物件去重 (根據 Job ID)
            const combinedJobs = [...masterJobs, ...parsed.blockedJobs];
            masterJobs = combinedJobs.filter(
              (job, index, self) => index === self.findIndex((j) => j.id === job.id)
            );
          }
          render();
          alert("成功匯入備份！請按下「儲存變更」正式寫入系統。");
        } else {
          throw new Error();
        }
      } catch (e) {
        alert("匯入失敗！格式不符合規範。");
      }
    }
  };

  // 儲存變更並重整頁面
  saveBtn.addEventListener("click", () => {
    chrome.storage.local.set(
      { blacklist: masterCompanies, blockedJobs: masterJobs },
      () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0]?.id) {
            chrome.tabs.reload(tabs[0].id);
          }
        });
        alert("黑名單已安全更新並儲存！");
      }
    );
  });
});
