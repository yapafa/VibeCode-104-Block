/**
 * LinkedIn 職缺與公司黑名單過濾器 - V3.1 (垂直堆疊按鈕版)
 */

function processNode(targetNode = document) {
  if (!chrome?.runtime?.id) return;

  try {
    chrome.storage.local.get(["blacklist", "blockedJobs"], (res) => {
      if (!chrome?.runtime?.id) return;

      const companyBlacklist = (res.blacklist || []).map((k) => k.trim().toLowerCase()).filter(Boolean);
      const blockedJobs = res.blockedJobs || [];
      const blockedJobIds = blockedJobs.map((j) => String(j.id));

      // 1. 抓取所有職缺卡片容器 (包含新版 componentkey="job-card-..." 與舊版 li / job-card)
      const jobCards = targetNode.querySelectorAll('[componentkey*="job-card-component-ref-"], div[role="button"][componentkey*="job-card"]');

      jobCards.forEach((card) => {
        // A. 擷取 Job ID
        const componentKey = card.getAttribute("componentkey") || "";
        const idMatch = componentKey.match(/\d+/);
        const jobId = idMatch ? idMatch[0] : null;

        // B. 擷取職缺標題
        let jobTitle = "";
        const titleSpan = card.querySelector('p span[aria-hidden="true"]');
        if (titleSpan) {
          jobTitle = titleSpan.childNodes[0]?.textContent?.trim() || titleSpan.innerText.trim();
        } else {
          const pEl = card.querySelector('p');
          if (pEl) jobTitle = pEl.innerText.trim();
        }

        // C. 擷取公司名稱
        let companyName = "";
        const allParagraphs = card.querySelectorAll('p');
        if (allParagraphs.length >= 2) {
          companyName = allParagraphs[1].innerText.trim();
        }

        const lowerCompany = companyName.toLowerCase();

        // D. 比對黑名單並隱藏
        const isCompanyBlocked = lowerCompany && companyBlacklist.some((k) => lowerCompany.includes(k));
        const isJobBlocked = jobId && blockedJobIds.includes(String(jobId));

        if (isCompanyBlocked || isJobBlocked) {
          card.style.setProperty("display", "none", "important");
        } else {
          // E. 注入按鈕
          if (!card.querySelector('.my-block-btn-row')) {
            injectBtnRow(card, companyName, jobId, jobTitle);
          }
        }
      });
    });
  } catch (e) {
    // 靜默處理 context 銷毀狀況
  }
}

/**
 * 建立按鈕並垂直注入到卡片內
 */
function injectBtnRow(cardContainer, companyName, jobId, jobTitle) {
  if (cardContainer.querySelector(".my-block-btn-row")) return;

  // 改為 flex-direction: column (上下排列)，並向左對齊 (align-items: flex-start)
  const btnRow = document.createElement("div");
  btnRow.className = "my-block-btn-row";
  btnRow.style.cssText = "display: flex; flex-direction: column; gap: 4px; margin-top: 6px; margin-bottom: 6px; align-items: flex-start; z-index: 100; position: relative;";

  const baseBtnStyle = `
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    transition: all 0.15s ease-in-out;
    user-select: none;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    white-space: nowrap;
  `;

  // 1. 封鎖公司按鈕
  if (companyName) {
    const compBtn = document.createElement("button");
    compBtn.type = "button";
    compBtn.innerText = "🚫 封鎖公司";
    compBtn.style.cssText = baseBtnStyle + "color: #d9363e; background: #fff1f0; border: 1px solid #ffa39e;";

    compBtn.onmouseover = () => { compBtn.style.background = "#ffccc7"; };
    compBtn.onmouseout = () => { compBtn.style.background = "#fff1f0"; };
    compBtn.onmousedown = () => { compBtn.style.transform = "scale(0.95)"; };
    compBtn.onmouseup = () => { compBtn.style.transform = "scale(1)"; };

    compBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (confirm(`確定要封鎖公司「${companyName}」嗎？\n(今後該公司的職缺將自動隱藏)`)) {
        cardContainer.style.setProperty("display", "none", "important");
        chrome.storage.local.get(["blacklist"], (res) => {
          let list = res.blacklist || [];
          if (!list.includes(companyName.trim())) {
            list.push(companyName.trim());
            chrome.storage.local.set({ blacklist: list }, () => processNode());
          }
        });
      }
    };
    btnRow.appendChild(compBtn);
  }

  // 2. 封鎖此職缺按鈕
  if (jobId) {
    const jobBtn = document.createElement("button");
    jobBtn.type = "button";
    jobBtn.innerText = "❌ 封鎖此職缺";
    jobBtn.style.cssText = baseBtnStyle + "color: #d46b08; background: #fffbe6; border: 1px solid #ffe58f;";

    jobBtn.onmouseover = () => { jobBtn.style.background = "#fff1b8"; };
    jobBtn.onmouseout = () => { jobBtn.style.background = "#fffbe6"; };
    jobBtn.onmousedown = () => { jobBtn.style.transform = "scale(0.95)"; };
    jobBtn.onmouseup = () => { jobBtn.style.transform = "scale(1)"; };

    jobBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (confirm(`確定要封鎖此職缺嗎？\n(職缺：${jobTitle || jobId})`)) {
        cardContainer.style.setProperty("display", "none", "important");
        chrome.storage.local.get(["blockedJobs"], (res) => {
          let list = res.blockedJobs || [];
          if (!list.some((j) => String(j.id) === String(jobId))) {
            list.push({ id: jobId, title: jobTitle || "未命名職缺" });
            chrome.storage.local.set({ blockedJobs: list }, () => processNode());
          }
        });
      }
    };
    btnRow.appendChild(jobBtn);
  }

  // 找到標題與公司資訊區域，把按鈕插在下方
  const targetParent = cardContainer.querySelector('figure')?.parentElement || cardContainer;
  targetParent.appendChild(btnRow);
}

// ----------------------------------------------------
// 動態監聽 DOM 變化機制 (MutationObserver)
// ----------------------------------------------------
let timer = null;
const observer = new MutationObserver(() => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    processNode();
  }, 150);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 初次載入與滾動備用監聽
processNode();
window.addEventListener("scroll", () => processNode(), { passive: true });
