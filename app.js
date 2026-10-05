/**
 * ====================================================
 * 管樂團售票系統 - 前端核心互動、防撞位與訂單管理
 * 象牙白與大地土色調 1:1 整合畫布版本
 * ====================================================
 */

// 清除舊版本殘留快取（避免舊版示範的 1樓6排1、2號等席次殘留）
try {
  localStorage.removeItem("SOLD_SEATS_CACHE");
} catch (e) {}

// 應用程式狀態
const state = {
  selectedSeats: new Map(), // seatId -> seatObj
  soldSeats: new Set(),     // 初始為完全乾淨的空集合，絕無任何預設售出座位
  zoomLevel: 1.0,
  gasApiUrl: (typeof SYSTEM_CONFIG !== "undefined" && SYSTEM_CONFIG.GAS_API_URL) 
    ? SYSTEM_CONFIG.GAS_API_URL.trim() 
    : (localStorage.getItem("GAS_API_URL") || ""),
  localOrders: JSON.parse(localStorage.getItem("LOCAL_ORDERS") || "[]")
};

// 樂器分部選單
const SECTIONS = [
  "長笛 / 短笛",
  "雙簧管",
  "單簧管 (豎笛)",
  "低音管 (巴松管)",
  "中音薩克斯風 (Alto Sax)",
  "次中音薩克斯風 (Tenor Sax)",
  "上低音薩克斯風 (Baritone Sax)",
  "小號 (Trumpet)",
  "法國號 (Horn)",
  "長號 (Trombone)",
  "上低音號 (Euphonium)",
  "低音號 (Tuba)",
  "打擊樂 (Percussion)",
  "指揮 / 老師 / 團行政 / 工作人員",
  "其他"
];

// 初始化應用程式
document.addEventListener("DOMContentLoaded", () => {
  // 強制重設已售座位為全新空白，無任何預設打叉
  localStorage.removeItem("SOLD_SEATS_CACHE");
  state.soldSeats.clear();

  setupSectionDropdown();
  setupEventListeners();
  renderFullTheaterMap();
  updateCartUI();

  // 若有設定 GAS 網址，自動抓取真實試算表已售席位
  if (state.gasApiUrl) {
    fetchSoldSeatsFromGAS(true);
  }
});

function saveSoldSeatsCache() {
  // 不額外暫存任何假售出紀錄，完全依據 Google 試算表即時狀態
}

/**
 * 聲部下拉選單
 */
function setupSectionDropdown() {
  const select = document.getElementById("member-section");
  if (!select) return;
  select.innerHTML = '<option value="">請選擇所屬聲部 / 樂器...</option>';
  SECTIONS.forEach(sec => {
    const opt = document.createElement("option");
    opt.value = sec;
    opt.textContent = sec;
    select.appendChild(opt);
  });
}

/**
 * 核心折扣與金額試算引擎
 * 規則：
 * 1. 團員有兩張免費的 300 元座位
 * 2. 其餘位置一律打七折（100 元無折扣）
 * 3. 1000 元、500 元座位包含節目冊
 */
function calculateOrder(seatsArray) {
  let originalTotal = 0;
  const seats300 = [];
  const seats1000 = [];
  const seats500 = [];
  const seats100 = [];

  seatsArray.forEach(s => {
    originalTotal += s.price;
    if (s.price === 300) seats300.push(s);
    else if (s.price === 1000) seats1000.push(s);
    else if (s.price === 500) seats500.push(s);
    else if (s.price === 100) seats100.push(s);
  });

  // 1. 300元座位折扣：前 2 張免費 ($0)，第 3 張起 7 折 ($210)
  const free300Count = Math.min(2, seats300.length);
  const paid300Count = Math.max(0, seats300.length - 2);
  const free300Saved = free300Count * 300;
  const paid300Total = Math.round(paid300Count * 300 * 0.7);

  // 2. 1000元座位折扣：一律 7 折 ($700)
  const total1000 = Math.round(seats1000.length * 1000 * 0.7);

  // 3. 500元座位折扣：一律 7 折 ($350)
  const total500 = Math.round(seats500.length * 500 * 0.7);

  // 4. 100元座位：無折扣 ($100)
  const total100 = seats100.length * 100;

  const finalTotal = paid300Total + total1000 + total500 + total100;
  const discountTotal = originalTotal - finalTotal;

  // 5. 節目冊贈送本數：1000元與 500元座位皆隨票附贈
  const bookletsCount = seats1000.length + seats500.length;

  return {
    seatCount: seatsArray.length,
    originalTotal,
    discountTotal,
    finalTotal,
    free300Count,
    paid300Count,
    free300Saved,
    bookletsCount,
    counts: {
      p1000: seats1000.length,
      p500: seats500.length,
      p300: seats300.length,
      p100: seats100.length
    }
  };
}

/**
 * 繪製整個大東演藝廳（1樓、2樓、3樓整合在同一個畫布空間）
 */
function renderFullTheaterMap() {
  const container = document.getElementById("seating-container");
  if (!container) return;
  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "flex flex-col items-center gap-2 w-max mx-auto px-6 py-4";

  // ================= 1. 舞台 (STAGE) =================
  const stageEl = document.createElement("div");
  stageEl.className = "stage-curve w-[720px] h-12 flex items-center justify-center font-bold tracking-widest text-base mb-2";
  stageEl.innerHTML = `<span class="flex items-center gap-2.5"><i class="fas fa-theater-masks text-amber-300"></i> 舞 台 (STAGE)</span>`;
  wrapper.appendChild(stageEl);

  // 1~4 排不開放提示
  const closedRowEl = document.createElement("div");
  closedRowEl.className = "w-[720px] py-1 text-center bg-stone-200/70 border border-stone-300 text-stone-600 text-xs rounded-lg mb-3 font-medium tracking-wide";
  closedRowEl.textContent = "1 ～ 4 排 不開放（不設席次）";
  wrapper.appendChild(closedRowEl);

  // ================= 2. 1樓 觀眾席 (5~18排) =================
  const floor1Title = document.createElement("div");
  floor1Title.className = "w-[720px] flex items-center justify-between text-xs font-bold text-stone-700 border-b border-stone-300 pb-1 mb-2";
  floor1Title.innerHTML = `
    <span><i class="fas fa-couch text-amber-700"></i> 1 樓 觀眾席（共 574 席，含工作席）</span>
    <span class="text-[11px] font-normal text-stone-500">17~18排中央為攝影席（不開放）</span>
  `;
  wrapper.appendChild(floor1Title);

  window.ALL_SEATS_DATA.floor1.forEach(rowObj => {
    const rowRow = document.createElement("div");
    rowRow.className = "flex items-center gap-2";

    // 左排號
    const leftLabel = document.createElement("div");
    leftLabel.className = "row-label";
    leftLabel.textContent = rowObj.rowLabel;
    rowRow.appendChild(leftLabel);

    // 左區席位
    const leftBlock = document.createElement("div");
    leftBlock.className = "flex items-center justify-end gap-1 w-[220px]";
    rowObj.left.forEach(seat => leftBlock.appendChild(createSeatButton(seat)));
    rowRow.appendChild(leftBlock);

    // 左走道
    const leftAisle = document.createElement("div");
    leftAisle.className = "w-4 text-center aisle-label font-mono";
    rowRow.appendChild(leftAisle);

    // 中央區席位
    const centerBlock = document.createElement("div");
    centerBlock.className = "flex items-center justify-center gap-1 w-[350px]";
    
    // 17、18 排攝影席特殊標記
    if (rowObj.row === 17 || rowObj.row === 18) {
      centerBlock.className += " relative bg-red-100/60 p-0.5 rounded border border-red-300";
    }

    rowObj.center.forEach(seat => centerBlock.appendChild(createSeatButton(seat)));
    rowRow.appendChild(centerBlock);

    // 右走道
    const rightAisle = document.createElement("div");
    rightAisle.className = "w-4 text-center aisle-label font-mono";
    rowRow.appendChild(rightAisle);

    // 右區席位
    const rightBlock = document.createElement("div");
    rightBlock.className = "flex items-center justify-start gap-1 w-[220px]";
    rowObj.right.forEach(seat => rightBlock.appendChild(createSeatButton(seat)));
    rowRow.appendChild(rightBlock);

    // 右排號
    const rightLabel = document.createElement("div");
    rightLabel.className = "row-label";
    rightLabel.textContent = rowObj.rowLabel;
    rowRow.appendChild(rightLabel);

    wrapper.appendChild(rowRow);
  });

  // ================= 3. 樓層分隔裝飾線 =================
  const divider1 = document.createElement("div");
  divider1.className = "w-[760px] my-5 border-t-2 border-dashed border-stone-300 relative text-center";
  divider1.innerHTML = `<span class="bg-[#f4ede4] px-4 text-xs font-bold text-stone-500 uppercase tracking-widest relative -top-2.5">▲ 一樓觀眾席 ｜ 二樓觀眾席 ▼</span>`;
  wrapper.appendChild(divider1);

  // ================= 4. 2樓 觀眾席 (2~6排) =================
  const floor2Title = document.createElement("div");
  floor2Title.className = "w-[720px] flex items-center justify-between text-xs font-bold text-stone-700 border-b border-stone-300 pb-1 mb-2";
  floor2Title.innerHTML = `
    <span><i class="fas fa-layer-group text-emerald-700"></i> 2 樓 觀眾席（共 173 席，全區草綠色 100 元，不適用折扣）</span>
    <span class="text-[11px] font-normal text-stone-500">2～6排</span>
  `;
  wrapper.appendChild(floor2Title);

  window.ALL_SEATS_DATA.floor2.forEach(rowObj => {
    const rowRow = document.createElement("div");
    rowRow.className = "flex items-center gap-2";

    // 左排號
    const leftLabel = document.createElement("div");
    leftLabel.className = "row-label";
    leftLabel.textContent = rowObj.rowLabel;
    rowRow.appendChild(leftLabel);

    // 左區 (33..1)
    const leftBlock = document.createElement("div");
    leftBlock.className = "flex items-center justify-end gap-1 w-[350px]";
    rowObj.left.forEach(seat => leftBlock.appendChild(createSeatButton(seat)));
    rowRow.appendChild(leftBlock);

    // 中央大走道
    const centerAisle = document.createElement("div");
    centerAisle.className = "w-10 text-center aisle-label font-mono font-medium";
    centerAisle.textContent = "走道";
    rowRow.appendChild(centerAisle);

    // 右區 (2..34)
    const rightBlock = document.createElement("div");
    rightBlock.className = "flex items-center justify-start gap-1 w-[350px]";
    rowObj.right.forEach(seat => rightBlock.appendChild(createSeatButton(seat)));
    rowRow.appendChild(rightBlock);

    // 右排號
    const rightLabel = document.createElement("div");
    rightLabel.className = "row-label";
    rightLabel.textContent = rowObj.rowLabel;
    rowRow.appendChild(rightLabel);

    wrapper.appendChild(rowRow);
  });

  // ================= 5. 3樓 觀眾席 (不開放) =================
  const divider2 = document.createElement("div");
  divider2.className = "w-[760px] my-5 border-t border-stone-300 text-center relative";
  divider2.innerHTML = `<span class="bg-[#f4ede4] px-4 text-xs font-medium text-stone-400 relative -top-2.5">3 樓 觀眾席（本場次不開放）</span>`;
  wrapper.appendChild(divider2);

  window.ALL_SEATS_DATA.floor3.forEach(rowObj => {
    const rowRow = document.createElement("div");
    rowRow.className = "flex items-center gap-2 opacity-50";

    const leftLabel = document.createElement("div");
    leftLabel.className = "row-label text-stone-400";
    leftLabel.textContent = rowObj.rowLabel;
    rowRow.appendChild(leftLabel);

    const leftBlock = document.createElement("div");
    leftBlock.className = "flex items-center justify-end gap-1 w-[350px]";
    rowObj.left.forEach(seat => leftBlock.appendChild(createSeatButton(seat)));
    rowRow.appendChild(leftBlock);

    const centerAisle = document.createElement("div");
    centerAisle.className = "w-10 text-center aisle-label";
    centerAisle.textContent = "走道";
    rowRow.appendChild(centerAisle);

    const rightBlock = document.createElement("div");
    rightBlock.className = "flex items-center justify-start gap-1 w-[350px]";
    rowObj.right.forEach(seat => rightBlock.appendChild(createSeatButton(seat)));
    rowRow.appendChild(rightBlock);

    const rightLabel = document.createElement("div");
    rightLabel.className = "row-label text-stone-400";
    rightLabel.textContent = rowObj.rowLabel;
    rowRow.appendChild(rightLabel);

    wrapper.appendChild(rowRow);
  });

  container.appendChild(wrapper);
  updateRemainingStats();
}

/**
 * 建立單個座位按鈕
 */
function createSeatButton(seat) {
  const btn = document.createElement("button");
  btn.className = "seat-btn";
  btn.setAttribute("data-seat-id", seat.id);
  btn.textContent = seat.seat;

  // 判斷票價等級
  if (seat.price > 0) {
    btn.classList.add(`seat-${seat.price}`);
  }

  // 判斷狀態
  const isSold = state.soldSeats.has(seat.id);
  const isSelected = state.selectedSeats.has(seat.id);
  const isBlocked = seat.status === 'blocked';
  const isUnopened = seat.status === 'unopened';

  if (isUnopened) {
    btn.classList.add("seat-unopened");
    btn.title = `3樓 ${seat.row}排 ${seat.seat}號 [不開放]`;
  } else if (isBlocked) {
    btn.classList.add("seat-blocked");
    btn.title = `${seat.floor}樓 ${seat.row}排 ${seat.seat}號 [${seat.blockedReason || '不開放'}]`;
  } else if (isSold) {
    btn.classList.add("seat-sold");
    btn.title = `${seat.floor}樓 ${seat.row}排 ${seat.seat}號 [已售出 / 已保留]`;
  } else if (isSelected) {
    btn.classList.add("seat-selected");
    btn.title = `${seat.floor}樓 ${seat.row}排 ${seat.seat}號 [已選取]`;
  }

  // 點擊事件
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleSeatClick(seat, btn);
  });

  // Tooltip
  btn.addEventListener("mouseenter", (e) => showSeatTooltip(seat, e));
  btn.addEventListener("mouseleave", hideSeatTooltip);

  return btn;
}

/**
 * 點選座位處理邏輯
 */
function handleSeatClick(seat, btnElement) {
  if (seat.status === 'unopened') {
    showToast("3 樓本場次不開放選位", "warning");
    return;
  }

  if (seat.status === 'blocked') {
    showToast(`此席次為【${seat.blockedReason || '不開放席位'}】，無法選取`, "warning");
    return;
  }

  if (state.soldSeats.has(seat.id)) {
    showToast(`此席次已被預訂：${getSeatFriendlyName(seat)}`, "warning");
    return;
  }

  // 切換選取狀態
  if (state.selectedSeats.has(seat.id)) {
    state.selectedSeats.delete(seat.id);
    btnElement.classList.remove("seat-selected");
  } else {
    state.selectedSeats.set(seat.id, seat);
    btnElement.classList.add("seat-selected");
  }

  updateCartUI();
}

function getSeatFriendlyName(seat) {
  return `${seat.floor}樓 ${seat.row}排 ${seat.seat}號`;
}

/**
 * 懸停提示資訊卡
 */
function showSeatTooltip(seat, event) {
  const tooltip = document.getElementById("seat-tooltip");
  if (!tooltip) return;

  if (seat.status === 'unopened') {
    tooltip.innerHTML = `<span class="text-stone-400">3樓 ${seat.row}排 ${seat.seat}號 (不開放)</span>`;
    tooltip.style.display = "block";
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
    return;
  }

  let priceText = `$${seat.price}`;
  let discountNote = "";
  if (seat.price === 300) {
    discountNote = "（團員首2張免費，之後7折 $210）";
  } else if (seat.price === 1000) {
    discountNote = "（團員7折 $700，含節目冊）";
  } else if (seat.price === 500) {
    discountNote = "（團員7折 $350，含節目冊）";
  } else if (seat.price === 100) {
    discountNote = "（2樓全區無折扣 $100）";
  }

  let statusText = `<span class="text-emerald-400 font-bold">● 可選購</span>`;
  if (seat.status === 'blocked') {
    statusText = `<span class="text-rose-400 font-bold">✕ ${seat.blockedReason || '不開放'}</span>`;
  } else if (state.soldSeats.has(seat.id)) {
    statusText = `<span class="text-stone-400">✕ 已售出</span>`;
  } else if (state.selectedSeats.has(seat.id)) {
    statusText = `<span class="text-amber-400 font-bold">✓ 已選取</span>`;
  }

  tooltip.innerHTML = `
    <div class="font-bold text-white text-sm flex items-center justify-between gap-3">
      <span>${getSeatFriendlyName(seat)}</span>
      ${statusText}
    </div>
    <div class="text-xs text-stone-300 mt-1">
      票價：<span class="font-bold text-amber-300">${priceText}</span> ${discountNote}
    </div>
  `;

  tooltip.style.display = "block";
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function hideSeatTooltip() {
  const tooltip = document.getElementById("seat-tooltip");
  if (tooltip) tooltip.style.display = "none";
}

/**
 * 更新底部購物車 UI
 */
function updateCartUI() {
  const seatsArray = Array.from(state.selectedSeats.values());
  const calc = calculateOrder(seatsArray);

  const cartCountEl = document.getElementById("cart-count");
  const cartFinalTotalEl = document.getElementById("cart-final-total");
  const cartOriginalTotalEl = document.getElementById("cart-original-total");
  const cartDiscountSavedEl = document.getElementById("cart-discount-saved");
  const cartBookletsEl = document.getElementById("cart-booklets");
  const btnCheckout = document.getElementById("btn-checkout");

  if (cartCountEl) cartCountEl.textContent = calc.seatCount;
  if (cartFinalTotalEl) cartFinalTotalEl.textContent = `$${calc.finalTotal.toLocaleString()}`;
  if (cartOriginalTotalEl) cartOriginalTotalEl.textContent = `$${calc.originalTotal.toLocaleString()}`;
  if (cartDiscountSavedEl) cartDiscountSavedEl.textContent = `-$${calc.discountTotal.toLocaleString()}`;
  if (cartBookletsEl) cartBookletsEl.textContent = `${calc.bookletsCount} 本`;

  if (btnCheckout) {
    btnCheckout.disabled = calc.seatCount === 0;
  }

  const selectedListEl = document.getElementById("selected-seats-list");
  if (selectedListEl) {
    selectedListEl.innerHTML = "";
    if (seatsArray.length === 0) {
      selectedListEl.innerHTML = `<span class="text-xs text-stone-500 italic">尚未點選座位，請於上方座位表點擊選位</span>`;
    } else {
      seatsArray.sort((a, b) => (a.floor - b.floor) || (a.row - b.row) || (a.seat - b.seat));

      let free300Used = 0;
      seatsArray.forEach(seat => {
        const badge = document.createElement("div");
        badge.className = "ticket-badge bg-stone-100 border border-stone-300 text-stone-800 text-xs shadow-sm";

        let tagText = `$${seat.price}`;
        let tagBg = `bg-stone-200 text-stone-700`;

        if (seat.price === 300) {
          if (free300Used < 2) {
            free300Used++;
            tagText = `免費 (團員首2張)`;
            tagBg = `bg-emerald-100 text-emerald-800 border border-emerald-300`;
          } else {
            tagText = `7折 $210`;
            tagBg = `bg-sky-100 text-sky-800`;
          }
        } else if (seat.price === 1000) {
          tagText = `7折 $700 + 節目冊`;
          tagBg = `bg-pink-100 text-pink-800`;
        } else if (seat.price === 500) {
          tagText = `7折 $350 + 節目冊`;
          tagBg = `bg-amber-100 text-amber-800`;
        } else if (seat.price === 100) {
          tagText = `原價 $100`;
          tagBg = `bg-emerald-50 text-emerald-800`;
        }

        badge.innerHTML = `
          <span class="font-bold">${getSeatFriendlyName(seat)}</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${tagBg}">${tagText}</span>
          <button class="hover:text-rose-600 ml-1 text-stone-400 hover:font-bold transition-colors" title="移除此座位">&times;</button>
        `;

        badge.querySelector("button").addEventListener("click", () => {
          state.selectedSeats.delete(seat.id);
          const btn = document.querySelector(`[data-seat-id="${seat.id}"]`);
          if (btn) btn.classList.remove("seat-selected");
          updateCartUI();
        });

        selectedListEl.appendChild(badge);
      });
    }
  }
}

/**
 * 更新剩餘席位統計
 */
function updateRemainingStats() {
  let count1000 = 0, count500 = 0, count300 = 0, count100 = 0;
  
  Object.values(window.SEAT_MAP_BY_ID).forEach(s => {
    if (s.status !== 'blocked' && s.status !== 'unopened' && !state.soldSeats.has(s.id)) {
      if (s.price === 1000) count1000++;
      else if (s.price === 500) count500++;
      else if (s.price === 300) count300++;
      else if (s.price === 100) count100++;
    }
  });

  const el1000 = document.getElementById("stat-remain-1000");
  const el500  = document.getElementById("stat-remain-500");
  const el300  = document.getElementById("stat-remain-300");
  const el100  = document.getElementById("stat-remain-100");

  if (el1000) el1000.textContent = `(餘 ${count1000})`;
  if (el500)  el500.textContent  = `(餘 ${count500})`;
  if (el300)  el300.textContent  = `(餘 ${count300})`;
  if (el100)  el100.textContent  = `(餘 ${count100})`;
}

/**
 * 事件監聽器設定
 */
function setupEventListeners() {
  // 縮放控制
  const zoomInBtn = document.getElementById("btn-zoom-in");
  const zoomOutBtn = document.getElementById("btn-zoom-out");
  const zoomResetBtn = document.getElementById("btn-zoom-reset");
  const panZoomContainer = document.getElementById("pan-zoom-target");

  const applyZoom = () => {
    if (panZoomContainer) {
      panZoomContainer.style.transform = `scale(${state.zoomLevel})`;
    }
  };

  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", () => {
      if (state.zoomLevel < 1.6) {
        state.zoomLevel += 0.15;
        applyZoom();
      }
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", () => {
      if (state.zoomLevel > 0.5) {
        state.zoomLevel -= 0.15;
        applyZoom();
      }
    });
  }

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener("click", () => {
      state.zoomLevel = 1.0;
      applyZoom();
    });
  }

  // 清空全部選取
  const btnClearSelection = document.getElementById("btn-clear-selection");
  if (btnClearSelection) {
    btnClearSelection.addEventListener("click", () => {
      if (state.selectedSeats.size === 0) return;
      if (confirm("確定要清空目前選取的所有座位嗎？")) {
        state.selectedSeats.clear();
        document.querySelectorAll(".seat-selected").forEach(el => el.classList.remove("seat-selected"));
        updateCartUI();
      }
    });
  }

  // 下一步填寫資料
  const btnCheckout = document.getElementById("btn-checkout");
  if (btnCheckout) {
    btnCheckout.addEventListener("click", () => {
      if (state.selectedSeats.size === 0) {
        showToast("請至少選取一個座位！", "warning");
        return;
      }
      openCheckoutModal();
    });
  }

  // 關閉 Modal 按鈕
  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close-modal");
      closeModal(modalId);
    });
  });

  // 提交訂單表單
  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", handleOrderSubmit);
  }

  // 重新整理已售座位 (Sync)
  const btnSyncSeats = document.getElementById("btn-sync-seats");
  if (btnSyncSeats) {
    btnSyncSeats.addEventListener("click", () => {
      fetchSoldSeatsFromGAS(false);
    });
  }

  // 開啟「查詢 / 取消訂單」視窗
  const btnOpenSearch = document.getElementById("btn-open-search");
  if (btnOpenSearch) {
    btnOpenSearch.addEventListener("click", () => {
      openModal("search-modal");
      document.getElementById("search-input").focus();
    });
  }

  // 執行訂單查詢
  const searchForm = document.getElementById("search-form");
  if (searchForm) {
    searchForm.addEventListener("submit", handleOrderSearch);
  }
}

/**
 * 開啟結帳填表視窗
 */
function openCheckoutModal() {
  const seatsArray = Array.from(state.selectedSeats.values());
  const calc = calculateOrder(seatsArray);

  document.getElementById("modal-summary-seats").textContent = seatsArray.map(s => getSeatFriendlyName(s)).join("、");
  document.getElementById("modal-summary-count").textContent = `${calc.seatCount} 席`;
  document.getElementById("modal-summary-original").textContent = `$${calc.originalTotal.toLocaleString()}`;
  document.getElementById("modal-summary-discount").textContent = `-$${calc.discountTotal.toLocaleString()}`;
  document.getElementById("modal-summary-final").textContent = `$${calc.finalTotal.toLocaleString()}`;
  document.getElementById("modal-summary-booklets").textContent = `${calc.bookletsCount} 本`;

  const discountDetails = [];
  if (calc.free300Count > 0) {
    discountDetails.push(`300元免費名額扣抵 ${calc.free300Count} 張 (省 $${calc.free300Saved})`);
  }
  if (calc.paid300Count > 0) {
    discountDetails.push(`其餘 300元共 ${calc.paid300Count} 張享 7 折`);
  }
  if (calc.counts.p1000 > 0) {
    discountDetails.push(`1000元共 ${calc.counts.p1000} 張享 7 折 (贈節目冊 ${calc.counts.p1000} 本)`);
  }
  if (calc.counts.p500 > 0) {
    discountDetails.push(`500元共 ${calc.counts.p500} 張享 7 折 (贈節目冊 ${calc.counts.p500} 本)`);
  }
  if (calc.counts.p100 > 0) {
    discountDetails.push(`100元共 ${calc.counts.p100} 張無折扣`);
  }

  const detailEl = document.getElementById("modal-discount-breakdown");
  if (detailEl) {
    detailEl.innerHTML = discountDetails.map(d => `<li>• ${d}</li>`).join("");
  }

  openModal("checkout-modal");
}

/**
 * 送出訂單處理（嚴格防撞位＋自動撤單機制）
 */
async function handleOrderSubmit(e) {
  e.preventDefault();

  const memberName = document.getElementById("member-name").value.trim();
  const section = document.getElementById("member-section").value;
  const email = document.getElementById("member-email").value.trim().toLowerCase();
  const phone = document.getElementById("member-phone").value.trim();
  const lineId = document.getElementById("member-line").value.trim();
  const notes = document.getElementById("member-notes").value.trim();

  // 嚴格驗證必填
  if (!memberName || !section || !email || !phone) {
    showToast("請確實填寫「姓名」、「聲部」、「電子信箱」與「電話」！", "error");
    return;
  }

  // 驗證 Email 格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast("請輸入有效的電子信箱格式！", "error");
    return;
  }

  const seatsArray = Array.from(state.selectedSeats.values());
  const requestedSeatIds = seatsArray.map(s => s.id);

  // 本地端防撞位預先檢查
  const localConflicts = requestedSeatIds.filter(id => state.soldSeats.has(id));
  if (localConflicts.length > 0) {
    triggerConflictAbort(localConflicts);
    return;
  }

  const calc = calculateOrder(seatsArray);
  const now = new Date();
  const orderId = "WB-" + now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + "-" +
    String(Math.floor(1000 + Math.random() * 9000));

  const orderPayload = {
    orderId: orderId,
    timestamp: now.toISOString(),
    memberName: memberName,
    section: section,
    email: email,
    phone: phone,
    lineId: lineId,
    notes: notes,
    seats: requestedSeatIds,
    seatDetails: seatsArray.map(s => getSeatFriendlyName(s)),
    seatCount: calc.seatCount,
    originalTotal: calc.originalTotal,
    discountTotal: calc.discountTotal,
    finalTotal: calc.finalTotal,
    free300Count: calc.free300Count,
    bookletsCount: calc.bookletsCount,
    status: "有效登記 (待對帳)"
  };

  const submitBtn = document.getElementById("btn-submit-order");
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> 檢查座位並登記中...`;

  try {
    // 若有設定 GAS，先送往後端進行嚴格比對
    if (state.gasApiUrl) {
      const resp = await fetch(state.gasApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(orderPayload)
      });

      const result = await resp.json();

      // ★ 撞位衝突：後端回傳已有他人搶先購買，自動取消訂單並跳出警示
      if (result.status === "conflict") {
        const conflictSeats = result.conflictSeats || [];
        triggerConflictAbort(conflictSeats);
        return;
      }

      if (result.status === "error") {
        throw new Error(result.message || "伺服器處理失敗");
      }
    }

    // 成功登記：標記已售出
    requestedSeatIds.forEach(id => state.soldSeats.add(id));
    saveSoldSeatsCache();

    // 儲存本地備份
    state.localOrders.unshift(orderPayload);
    localStorage.setItem("LOCAL_ORDERS", JSON.stringify(state.localOrders));

    // 清空購物車
    state.selectedSeats.clear();
    renderFullTheaterMap();
    updateCartUI();

    closeModal("checkout-modal");
    document.getElementById("checkout-form").reset();

    // 顯示成功收據
    showSuccessModal(orderPayload);

  } catch (err) {
    console.error("登記處理失敗", err);
    showToast("送出失敗，請檢查網路連線或稍後重試", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `確認送出訂單`;
  }
}

/**
 * 觸發撞位衝突：自動取消訂單並彈出專屬視窗
 */
function triggerConflictAbort(conflictSeatIds) {
  closeModal("checkout-modal");

  // 將已被搶走的座位標註為已售出
  conflictSeatIds.forEach(id => {
    state.soldSeats.add(id);
    state.selectedSeats.delete(id);
  });
  saveSoldSeatsCache();

  // 轉換為中文易讀名稱
  const conflictNames = conflictSeatIds.map(id => {
    const s = window.SEAT_MAP_BY_ID[id];
    return s ? getSeatFriendlyName(s) : id;
  });

  const conflictListEl = document.getElementById("conflict-seats-list");
  if (conflictListEl) {
    conflictListEl.innerHTML = conflictNames.map(name => `
      <span class="px-2.5 py-1 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs inline-block">${name}</span>
    `).join(" ");
  }

  // 重新渲染座位表與購物車
  renderFullTheaterMap();
  updateCartUI();

  // 跳出衝突專屬彈窗
  openModal("conflict-modal");
}

/**
 * 訂購成功收據 Modal
 */
function showSuccessModal(order) {
  document.getElementById("success-order-id").textContent = order.orderId;
  document.getElementById("success-member-name").textContent = `${order.memberName} (${order.section})`;
  document.getElementById("success-email").textContent = order.email;
  document.getElementById("success-seats").textContent = order.seatDetails.join("、");
  document.getElementById("success-final-total").textContent = `$${order.finalTotal.toLocaleString()}`;
  document.getElementById("success-booklets").textContent = `${order.bookletsCount} 本`;

  const copyBtn = document.getElementById("btn-copy-receipt");
  if (copyBtn) {
    copyBtn.onclick = () => {
      const text = `【管樂團演出團員購票明細】\n` +
        `訂單編號：${order.orderId}\n` +
        `團員：${order.memberName} (${order.section})\n` +
        `電子信箱：${order.email}\n` +
        `座席：${order.seatDetails.join("、")}\n` +
        `實付金額：$${order.finalTotal} 元\n` +
        `贈送節目冊：${order.bookletsCount} 本\n` +
        `登記時間：${new Date().toLocaleString('zh-TW')}`;
      navigator.clipboard.writeText(text).then(() => {
        showToast("訂單明細已複製到剪貼簿！可傳至 LINE");
      });
    };
  }

  openModal("success-modal");
}

/**
 * 訂單查詢處理
 */
async function handleOrderSearch(e) {
  e.preventDefault();
  const searchInput = document.getElementById("search-input").value.trim().toLowerCase();
  if (!searchInput) {
    showToast("請輸入欲查詢的電子信箱或訂單編號", "warning");
    return;
  }

  const resultContainer = document.getElementById("search-results");
  resultContainer.innerHTML = `<div class="py-6 text-center text-stone-500 text-xs"><i class="fas fa-spinner fa-spin mr-2"></i> 查詢中...</div>`;

  let matchedOrders = [];

  // 若有串接 GAS，透過 GET API 查詢
  if (state.gasApiUrl) {
    try {
      const url = `${state.gasApiUrl}?email=${encodeURIComponent(searchInput)}&orderId=${encodeURIComponent(searchInput)}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status === "success" && Array.isArray(data.orders)) {
        matchedOrders = data.orders;
      }
    } catch (err) {
      console.warn("GAS 查詢異常，改用本地快取比對", err);
    }
  }

  // 若線上無結果，比對本地儲存
  if (matchedOrders.length === 0) {
    matchedOrders = state.localOrders.filter(o => 
      (o.email && o.email.toLowerCase() === searchInput) ||
      (o.orderId && o.orderId.toLowerCase() === searchInput)
    );
  }

  renderSearchResults(matchedOrders, searchInput);
}

/**
 * 渲染訂單查詢結果
 */
function renderSearchResults(orders, queryKeyword) {
  const resultContainer = document.getElementById("search-results");
  if (!resultContainer) return;

  if (orders.length === 0) {
    resultContainer.innerHTML = `
      <div class="py-8 text-center text-stone-400 text-xs bg-stone-50 rounded-xl border border-stone-200">
        <i class="fas fa-search text-stone-300 text-3xl mb-2 block"></i>
        查無符合「<span class="font-bold text-stone-600">${queryKeyword}</span>」的有效訂票紀錄。<br>
        請確認信箱是否與當初填寫時一致。
      </div>
    `;
    return;
  }

  resultContainer.innerHTML = "";
  orders.forEach(order => {
    const isCancelled = order.status && order.status.includes("已取消");
    const card = document.createElement("div");
    card.className = `p-4 rounded-xl border text-xs space-y-2 relative transition-all ${
      isCancelled ? "bg-stone-100 border-stone-300 opacity-60" : "bg-white border-stone-300 shadow-sm"
    }`;

    card.innerHTML = `
      <div class="flex items-center justify-between border-b border-stone-200 pb-2">
        <div class="flex items-center gap-2">
          <span class="font-mono font-bold text-stone-800 text-sm">${order.orderId}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
            isCancelled ? "bg-stone-200 text-stone-600" : "bg-emerald-100 text-emerald-800"
          }">${order.status || "有效登記"}</span>
        </div>
        <span class="text-stone-400 text-[11px]">${order.timestamp ? new Date(order.timestamp).toLocaleDateString('zh-TW') : ''}</span>
      </div>

      <div class="grid grid-cols-2 gap-2 text-stone-600 pt-1">
        <div>團員姓名：<span class="font-bold text-stone-800">${order.memberName}</span> (${order.section})</div>
        <div>電子信箱：<span class="text-stone-800">${order.email}</span></div>
        <div class="col-span-2">劃定位子：<span class="font-bold text-stone-800">${(order.seatDetails || []).join("、")}</span></div>
        <div>實付金額：<span class="font-mono font-black text-amber-700 text-sm">$${(order.finalTotal || 0).toLocaleString()}</span></div>
        <div>附贈節目冊：<span class="font-bold text-pink-700">${order.bookletsCount || 0} 本</span></div>
      </div>

      ${!isCancelled ? `
        <div class="border-t border-stone-200 pt-2.5 flex items-center justify-end gap-2">
          <button class="btn-cancel-order px-3 py-1.5 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold transition-all flex items-center gap-1.5">
            <i class="fas fa-ban"></i> 取消此筆訂單並釋出座位
          </button>
        </div>
      ` : `
        <div class="text-[11px] text-stone-400 italic pt-1 text-right">此訂單已被取消，座位已釋出</div>
      `}
    `;

    // 綁定取消訂單按鈕
    const cancelBtn = card.querySelector(".btn-cancel-order");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => handleCancelOrder(order));
    }

    resultContainer.appendChild(card);
  });
}

/**
 * 執行取消訂單邏輯（釋出座位並同步後端）
 */
async function handleCancelOrder(order) {
  const confirmMsg = `確定要取消訂單【${order.orderId}】嗎？\n\n` +
    `購買座位：${(order.seatDetails || []).join("、")}\n` +
    `取消後這些座位將立即重新釋出給其他團員選購！`;

  if (!confirm(confirmMsg)) return;

  const btn = event.target.closest("button");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> 處理中...`;
  }

  try {
    // 1. 若有 GAS，向後端發送取消請求
    if (state.gasApiUrl) {
      const resp = await fetch(state.gasApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          action: "cancel_order",
          orderId: order.orderId,
          email: order.email
        })
      });

      const res = await resp.json();
      if (res.status !== "success") {
        throw new Error(res.message || "取消失敗");
      }
    }

    // 2. 本地釋出座位
    (order.seats || []).forEach(id => {
      state.soldSeats.delete(id);
    });
    saveSoldSeatsCache();

    // 3. 更新本地訂單狀態
    state.localOrders.forEach(o => {
      if (o.orderId === order.orderId) {
        o.status = "已取消 (團員自行釋出)";
      }
    });
    localStorage.setItem("LOCAL_ORDERS", JSON.stringify(state.localOrders));

    // 4. 重新繪製座位表與刷新查詢
    renderFullTheaterMap();
    updateCartUI();
    showToast(`訂單 ${order.orderId} 已成功取消，座位已重新釋出！`);

    // 重新觸發查詢
    const searchInput = document.getElementById("search-input").value.trim().toLowerCase();
    const updatedOrders = state.localOrders.filter(o => 
      (o.email && o.email.toLowerCase() === searchInput) ||
      (o.orderId && o.orderId.toLowerCase() === searchInput)
    );
    renderSearchResults(updatedOrders, searchInput);

  } catch (err) {
    console.error("取消失敗", err);
    showToast("取消失敗，請稍後重試或向票務人員回報", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-ban"></i> 取消此筆訂單並釋出座位`;
    }
  }
}

/**
 * 從 Google Apps Script 抓取最新真實已售席位
 */
async function fetchSoldSeatsFromGAS(silent = false) {
  if (!state.gasApiUrl) return;

  const syncIcon = document.getElementById("sync-icon");
  if (syncIcon) syncIcon.classList.add("fa-spin");

  try {
    const resp = await fetch(state.gasApiUrl);
    const data = await resp.json();

    if (data.status === "success" && Array.isArray(data.soldSeats)) {
      state.soldSeats.clear();
      data.soldSeats.forEach(id => state.soldSeats.add(id));
      saveSoldSeatsCache();
      renderFullTheaterMap();
      updateCartUI();
      if (!silent) showToast(`同步成功！目前全場共 ${data.soldSeats.length} 席已登記`);
    }
  } catch (err) {
    console.warn("無法即時連線至 Google 試算表", err);
    if (!silent) showToast("無法連線至 Google 試算表，已套用本地紀錄", "warning");
  } finally {
    if (syncIcon) syncIcon.classList.remove("fa-spin");
  }
}

/**
 * 彈窗控制輔助函式
 */
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

/**
 * 輕量提示 (Toast)
 */
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  const bgClass = type === "error" 
    ? "bg-rose-700 text-white" 
    : (type === "warning" ? "bg-amber-700 text-white" : "bg-[#4a3728] text-[#faf8f5]");
  
  toast.className = `fixed top-6 right-6 z-50 px-4 py-2.5 rounded-lg font-medium text-xs shadow-2xl flex items-center gap-2 transform transition-all duration-300 translate-y-[-20px] opacity-0 ${bgClass}`;
  
  const icon = type === "error" ? "fa-circle-xmark" : (type === "warning" ? "fa-triangle-exclamation" : "fa-circle-check");
  toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
  
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-[-20px]", "opacity-0");
  });

  setTimeout(() => {
    toast.classList.add("translate-y-[-20px]", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
