/**
 * 大東文化藝術中心演藝廳 - 座位拓樸與票價資料
 * 依據演藝廳官方座位票價圖 1:1 精確建立
 */

const VENUE_CONFIG = {
  venueName: "大東文化藝術中心演藝廳",
  floors: {
    1: {
      name: "1樓 觀眾席",
      totalSeats: 574,
      desc: "5~18排（1~4排不開放，17~18排中央為攝影席）"
    },
    2: {
      name: "2樓 觀眾席",
      totalSeats: 173,
      desc: "2~6排（全區草綠色 100 元）"
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

    // ----- 左側區 (單號) -----
    let leftNums = [];
    if (r === 5) {
      leftNums = [23, 21, 19, 17, 15, 13];
    } else if (r === 6) {
      leftNums = [25, 23, 21, 19, 17, 15, 13];
    } else if (r === 7) {
      leftNums = [27, 25, 23, 21, 19, 17, 15, 13];
    } else if (r === 8) {
      leftNums = [29, 27, 25, 23, 21, 19, 17, 15, 13];
    } else if (r === 9) {
      leftNums = [31, 29, 27, 25, 23, 21, 19, 17, 15, 13];
    } else {
      leftNums = [33, 31, 29, 27, 25, 23, 21, 19, 17, 15, 13];
    }

    leftNums.forEach(num => {
      let price = 300;
      if (r >= 5 && r <= 7) {
        price = 1000;
      } else if (r >= 8 && r <= 14) {
        price = (num >= 29) ? 300 : 500;
      } else {
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

    // ----- 中央區 (單雙號混合) -----
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
        // 使用者特別註記：中間兩排是攝影席不開放
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

    // ----- 右側區 (雙號) -----
    let rightNums = [];
    if (r === 5) {
      rightNums = [14, 16, 18, 20, 24];
    } else if (r === 6) {
      rightNums = [14, 16, 18, 20, 22, 24];
    } else if (r === 7) {
      rightNums = [14, 16, 18, 20, 22, 24, 28];
    } else if (r === 8) {
      rightNums = [14, 16, 18, 20, 22, 26, 28, 30];
    } else if (r === 9 || r === 10) {
      rightNums = [14, 16, 18, 20, 22, 26, 28, 30, 34];
    } else if (r >= 11 && r <= 14) {
      rightNums = [14, 16, 18, 20, 24, 26, 28, 30, 34];
    } else if (r === 15) {
      rightNums = [14, 16, 18, 22, 24, 26, 28, 30, 34];
    } else if (r === 16 || r === 17) {
      rightNums = [14, 16, 18, 20, 24, 26, 28, 30, 34];
    } else if (r === 18) {
      rightNums = [14, 16, 18, 20, 24, 26, 28, 32, 34];
    }

    rightNums.forEach(num => {
      let price = 300;
      if (r >= 5 && r <= 7) {
        price = 1000;
      } else if (r >= 8 && r <= 14) {
        price = (num >= 30) ? 300 : 500;
      } else {
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
 */
function generateFloor2Seats() {
  const rows = [];
  for (let r = 2; r <= 6; r++) {
    const rowObj = {
      row: r,
      rowLabel: `${r}排`,
      left: [],
      right: []
    };

    // 左側單號 33, 31, 29, ..., 1
    const leftNums = [33, 31, 29, 27, 25, 23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1];
    leftNums.forEach(num => {
      rowObj.left.push({
        id: `2F-${r}-${num}`,
        floor: 2,
        row: r,
        seat: num,
        price: 100,
        status: 'available',
        section: 'left'
      });
    });

    // 右側雙號 2, 4, 6, ..., 34
    const rightNums = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34];
    rightNums.forEach(num => {
      rowObj.right.push({
        id: `2F-${r}-${num}`,
        floor: 2,
        row: r,
        seat: num,
        price: 100,
        status: 'available',
        section: 'right'
      });
    });

    rows.push(rowObj);
  }

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
