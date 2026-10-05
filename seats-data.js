/**
 * 大東文化藝術中心演藝廳 - 座位拓樸與票價資料
 * 依據演藝廳官方座位票價圖 1:1 精確建立
 */

const VENUE_CONFIG = {
  venueName: "大東文化藝術中心演藝廳",
  floors: {
    1: {
      name: "1樓 觀眾席",
      totalSeats: 468,
      desc: "5~18排（1~4排不開放，17~18排中央為攝影席）"
    },
    2: {
      name: "2樓 觀眾席",
      totalSeats: 173,
      desc: "2~6排（全區草綠色 100 元，含工作席與視線受阻席）"
    },
    3: {
      name: "3樓 觀眾席",
      totalSeats: 133,
      desc: "2~5排（本場次不開放）"
    }
  },
  priceTiers: {
    1000: { name: "1000 元", color: "#db2777", discountRate: 0.7, hasBooklet: true, desc: "中央最佳區域（7折優惠價 $700，含節目冊）" },
    500:  { name: "500 元",  color: "#f59e0b", discountRate: 0.7, hasBooklet: true, desc: "主力席（7折優惠價 $350，含節目冊）" },
    300:  { name: "300 元",  color: "#0284c7", discountRate: 0.7, hasBooklet: false, desc: "超值席（團員享前2張免費，第3張起7折 $210）" },
    100:  { name: "100 元",  color: "#10b981", discountRate: 1.0, hasBooklet: false, desc: "2樓全區（無折扣 $100）" }
  }
};

/**
 * 產生大東演藝廳 1樓所有座位
 * 規則：奇數在左邊（由外而內降序至走道），偶數在右邊（由走道而外升序），中央區由 11..12
 * 絕不漏掉任何座號（如 20, 22, 32 皆完整保留）
 */
function generateFloor1Seats() {
  const rows = [];

  for (let r = 5; r <= 18; r++) {
    const rowObj = {
      row: r,
      rowLabel: `${r}排`,
      left: [],
      center: [],
      right: []
    };

    // ----- 1. 左側區 (單號，由外側降序往走道) -----
    let leftNums = [];
    if (r === 5) {
      // 5排左側8席 (27..13)
      leftNums = [27, 25, 23, 21, 19, 17, 15, 13];
    } else if (r === 6) {
      // 6排左側10席 (31, 29 為300元；27..13 為1000元)
      leftNums = [31, 29, 27, 25, 23, 21, 19, 17, 15, 13];
    } else {
      // 7~18排左側11席 (33..13 完整無漏)
      leftNums = [33, 31, 29, 27, 25, 23, 21, 19, 17, 15, 13];
    }

    leftNums.forEach(num => {
      let price = 300;
      if (r === 5) {
        price = 1000;
      } else if (r === 6 || r === 7) {
        price = (num >= 29) ? 300 : 1000;
      } else if (r >= 8 && r <= 14) {
        price = (num >= 29) ? 300 : 500;
      } else {
        // 15~18排
        price = 300;
      }

      rowObj.left.push({
        id: `1F-${r}-${num}`,
        floor: 1,
        row: r,
        seat: num,
        price: price,
        status: 'available',
        section: 'left'
      });
    });

    // ----- 2. 中央區 (12席: 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12) -----
    const centerNums = [11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12];
    centerNums.forEach(num => {
      let price = 300;
      let isBlocked = false;
      let blockedReason = '';

      if (r >= 5 && r <= 7) {
        price = 1000;
      } else if (r >= 8 && r <= 14) {
        price = 500;
      } else if (r >= 15 && r <= 16) {
        price = 300;
      } else if (r === 17 || r === 18) {
        // 17、18排中央攝影席（不開放）
        price = 300;
        isBlocked = true;
        blockedReason = '攝影席 (不開放)';
      }

      rowObj.center.push({
        id: `1F-${r}-${num}`,
        floor: 1,
        row: r,
        seat: num,
        price: price,
        status: isBlocked ? 'blocked' : 'available',
        blockedReason: blockedReason,
        section: 'center'
      });
    });

    // ----- 3. 右側區 (雙號，由走道升序往外側，完全不漏號) -----
    let rightNums = [];
    if (r === 5) {
      // 5排右側8席 (14..28)
      rightNums = [14, 16, 18, 20, 22, 24, 26, 28];
    } else if (r === 6) {
      // 6排右側10席 (14..28 為1000元；30, 32 為300元)
      rightNums = [14, 16, 18, 20, 22, 24, 26, 28, 30, 32];
    } else {
      // 7~18排右側11席 (14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34 完整無漏)
      rightNums = [14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34];
    }

    rightNums.forEach(num => {
      let price = 300;
      if (r === 5) {
        price = 1000;
      } else if (r === 6 || r === 7) {
        price = (num >= 30) ? 300 : 1000;
      } else if (r >= 8 && r <= 14) {
        price = (num >= 30) ? 300 : 500;
      } else {
        // 15~18排
        price = 300;
      }

      rowObj.right.push({
        id: `1F-${r}-${num}`,
        floor: 1,
        row: r,
        seat: num,
        price: price,
        status: 'available',
        section: 'right'
      });
    });

    rows.push(rowObj);
  }

  return rows;
}

/**
 * 產生大東演藝廳 2樓所有座位
 * 依據演藝廳官方二樓座位圖（含工作席與視線受阻席次）精確建立
 */
function generateFloor2Seats() {
  const rows = [];

  // ================= 2樓特別區與輪椅席 (頂部) =================
  const specialRow = {
    row: "special",
    rowLabel: "特別區",
    wheelchair: [
      { id: "2F-W1", floor: 2, row: "特別區", seat: "輪1", price: 0, status: "blocked", blockedReason: "輪椅席 (需推輪椅進場)", section: "wheelchair" }
    ],
    vip: [
      { id: "2F-VIP-2", floor: 2, row: "特別區", seat: 2, price: 0, status: "blocked", blockedReason: "2樓特別區 (不開放)", section: "vip" },
      { id: "2F-VIP-4", floor: 2, row: "特別區", seat: 4, price: 0, status: "blocked", blockedReason: "2樓特別區 (不開放)", section: "vip" },
      { id: "2F-VIP-6", floor: 2, row: "特別區", seat: 6, price: 0, status: "blocked", blockedReason: "2樓特別區 (不開放)", section: "vip" }
    ]
  };

  for (let r = 2; r <= 6; r++) {
    const rowObj = {
      row: r,
      rowLabel: `${r}排`,
      left: [],
      right: []
    };

    if (r === 2) {
      // 2排：左側 33(工作席), 31/29(視線受阻), 27..1(100元)
      const leftDefs = [
        { seat: 33, status: "blocked", blockedReason: "工作席 (不售票)" },
        { seat: 31, status: "blocked", blockedReason: "視線受阻席 (不售票)" },
        { seat: 29, status: "blocked", blockedReason: "視線受阻席 (不售票)" }
      ];
      for (let n = 27; n >= 1; n -= 2) {
        leftDefs.push({ seat: n, status: "available" });
      }
      leftDefs.forEach(d => {
        rowObj.left.push({
          id: `2F-${r}-${d.seat}`,
          floor: 2,
          row: r,
          seat: d.seat,
          price: (d.status === "available") ? 100 : 0,
          status: d.status,
          blockedReason: d.blockedReason || "",
          section: "left"
        });
      });

      // 2排：右側 2..28(100元), 30/32(視線受阻), 34(工作席)
      const rightDefs = [];
      for (let n = 2; n <= 28; n += 2) {
        rightDefs.push({ seat: n, status: "available" });
      }
      rightDefs.push({ seat: 30, status: "blocked", blockedReason: "視線受阻席 (不售票)" });
      rightDefs.push({ seat: 32, status: "blocked", blockedReason: "視線受阻席 (不售票)" });
      rightDefs.push({ seat: 34, status: "blocked", blockedReason: "工作席 (不售票)" });

      rightDefs.forEach(d => {
        rowObj.right.push({
          id: `2F-${r}-${d.seat}`,
          floor: 2,
          row: r,
          seat: d.seat,
          price: (d.status === "available") ? 100 : 0,
          status: d.status,
          blockedReason: d.blockedReason || "",
          section: "right"
        });
      });

    } else if (r === 3) {
      // 3排：左側 31/29(視線受阻), 27..1(100元)
      const leftDefs = [
        { seat: 31, status: "blocked", blockedReason: "視線受阻席 (不售票)" },
        { seat: 29, status: "blocked", blockedReason: "視線受阻席 (不售票)" }
      ];
      for (let n = 27; n >= 1; n -= 2) {
        leftDefs.push({ seat: n, status: "available" });
      }
      leftDefs.forEach(d => {
        rowObj.left.push({
          id: `2F-${r}-${d.seat}`,
          floor: 2,
          row: r,
          seat: d.seat,
          price: (d.status === "available") ? 100 : 0,
          status: d.status,
          blockedReason: d.blockedReason || "",
          section: "left"
        });
      });

      // 3排：右側 2..28(100元), 30/32(視線受阻)
      const rightDefs = [];
      for (let n = 2; n <= 28; n += 2) {
        rightDefs.push({ seat: n, status: "available" });
      }
      rightDefs.push({ seat: 30, status: "blocked", blockedReason: "視線受阻席 (不售票)" });
      rightDefs.push({ seat: 32, status: "blocked", blockedReason: "視線受阻席 (不售票)" });

      rightDefs.forEach(d => {
        rowObj.right.push({
          id: `2F-${r}-${d.seat}`,
          floor: 2,
          row: r,
          seat: d.seat,
          price: (d.status === "available") ? 100 : 0,
          status: d.status,
          blockedReason: d.blockedReason || "",
          section: "right"
        });
      });

    } else if (r === 4) {
      // 4排：左側 33(視線受阻), 31..1(100元)
      const leftDefs = [
        { seat: 33, status: "blocked", blockedReason: "視線受阻席 (不售票)" }
      ];
      for (let n = 31; n >= 1; n -= 2) {
        leftDefs.push({ seat: n, status: "available" });
      }
      leftDefs.forEach(d => {
        rowObj.left.push({
          id: `2F-${r}-${d.seat}`,
          floor: 2,
          row: r,
          seat: d.seat,
          price: (d.status === "available") ? 100 : 0,
          status: d.status,
          blockedReason: d.blockedReason || "",
          section: "left"
        });
      });

      // 4排：右側 2..32(100元), 34(視線受阻)
      const rightDefs = [];
      for (let n = 2; n <= 32; n += 2) {
        rightDefs.push({ seat: n, status: "available" });
      }
      rightDefs.push({ seat: 34, status: "blocked", blockedReason: "視線受阻席 (不售票)" });

      rightDefs.forEach(d => {
        rowObj.right.push({
          id: `2F-${r}-${d.seat}`,
          floor: 2,
          row: r,
          seat: d.seat,
          price: (d.status === "available") ? 100 : 0,
          status: d.status,
          blockedReason: d.blockedReason || "",
          section: "right"
        });
      });

    } else if (r === 5) {
      // 5排：左側 31..1(全100元)
      for (let n = 31; n >= 1; n -= 2) {
        rowObj.left.push({
          id: `2F-${r}-${n}`,
          floor: 2,
          row: r,
          seat: n,
          price: 100,
          status: "available",
          section: "left"
        });
      }
      // 5排：右側 2..32(全100元)
      for (let n = 2; n <= 32; n += 2) {
        rowObj.right.push({
          id: `2F-${r}-${n}`,
          floor: 2,
          row: r,
          seat: n,
          price: 100,
          status: "available",
          section: "right"
        });
      }

    } else if (r === 6) {
      // 6排：中央連續無走道！
      // 左側 37(視線受阻), 35..1(100元)
      const leftDefs = [
        { seat: 37, status: "blocked", blockedReason: "視線受阻席 (不售票)" }
      ];
      for (let n = 35; n >= 1; n -= 2) {
        leftDefs.push({ seat: n, status: "available" });
      }
      leftDefs.forEach(d => {
        rowObj.left.push({
          id: `2F-${r}-${d.seat}`,
          floor: 2,
          row: r,
          seat: d.seat,
          price: (d.status === "available") ? 100 : 0,
          status: d.status,
          blockedReason: d.blockedReason || "",
          section: "left"
        });
      });

      // 右側 2..36(100元), 38(視線受阻)
      const rightDefs = [];
      for (let n = 2; n <= 36; n += 2) {
        rightDefs.push({ seat: n, status: "available" });
      }
      rightDefs.push({ seat: 38, status: "blocked", blockedReason: "視線受阻席 (不售票)" });

      rightDefs.forEach(d => {
        rowObj.right.push({
          id: `2F-${r}-${d.seat}`,
          floor: 2,
          row: r,
          seat: d.seat,
          price: (d.status === "available") ? 100 : 0,
          status: d.status,
          blockedReason: d.blockedReason || "",
          section: "right"
        });
      });
    }

    rows.push(rowObj);
  }

  rows.specialRow = specialRow;
  return rows;
}

/**
 * 產生大東演藝廳 3樓所有座位（標記為不開放）
 */
function generateFloor3Seats() {
  const rows = [];
  for (let r = 2; r <= 5; r++) {
    const rowObj = {
      row: r,
      rowLabel: `${r}排`,
      left: [],
      right: []
    };

    const leftNums = [33, 31, 29, 27, 25, 23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1];
    leftNums.forEach(num => {
      rowObj.left.push({
        id: `3F-${r}-${num}`,
        floor: 3,
        row: r,
        seat: num,
        price: 0,
        status: 'unopened',
        blockedReason: '3樓不開放',
        section: 'left'
      });
    });

    const rightNums = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34];
    rightNums.forEach(num => {
      rowObj.right.push({
        id: `3F-${r}-${num}`,
        floor: 3,
        row: r,
        seat: num,
        price: 0,
        status: 'unopened',
        blockedReason: '3樓不開放',
        section: 'right'
      });
    });

    rows.push(rowObj);
  }

  return rows;
}

// 導出全域資料供前端調用
window.ALL_SEATS_DATA = {
  floor1: generateFloor1Seats(),
  floor2: generateFloor2Seats(),
  floor3: generateFloor3Seats()
};

// 扁平化映射表
window.SEAT_MAP_BY_ID = {};
[...window.ALL_SEATS_DATA.floor1, ...window.ALL_SEATS_DATA.floor2, ...window.ALL_SEATS_DATA.floor3].forEach(rowObj => {
  if (rowObj.left) rowObj.left.forEach(s => window.SEAT_MAP_BY_ID[s.id] = s);
  if (rowObj.center) rowObj.center.forEach(s => window.SEAT_MAP_BY_ID[s.id] = s);
  if (rowObj.right) rowObj.right.forEach(s => window.SEAT_MAP_BY_ID[s.id] = s);
});

// 加入 2樓特別區
if (window.ALL_SEATS_DATA.floor2.specialRow) {
  const sp = window.ALL_SEATS_DATA.floor2.specialRow;
  if (sp.wheelchair) sp.wheelchair.forEach(s => window.SEAT_MAP_BY_ID[s.id] = s);
  if (sp.vip) sp.vip.forEach(s => window.SEAT_MAP_BY_ID[s.id] = s);
}
