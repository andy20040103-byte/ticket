# Google 試算表（票務整理）串接指南

您的最新 Google 試算表連結：
[https://docs.google.com/spreadsheets/d/1yzwfB1v_6nvql_wbgrvSyiVI-D_qnO3pWtfBPQpCDJY/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1yzwfB1v_6nvql_wbgrvSyiVI-D_qnO3pWtfBPQpCDJY/edit?usp=sharing)

系統已為您特別量身設計好包含 **3 種統計工作表** 的自動化架構：
1. 📋 **【1. 訂單記錄 (依時間排序)】**：記錄所有訂單詳細流水帳（訂單編號、時間、團員、電話、Email、票價、節目冊等）。
2. 🎟️ **【2. 席位總清冊 (依座位排序)】**：自動將所有已訂席次依「1樓 ➔ 2樓 ➔ 排數 ➔ 座號」排序，方便票務快速查驗某個座位是誰坐的。
3. 🔤 **【3. 團員訂票總表 (依姓名筆劃排序)】**：自動依團員姓名的繁體中文字筆劃（如：丁 ➔ 王 ➔ 李 ➔ 張 ➔ 陳）由少至多嚴格排序，最適合現場報到取票或快速對帳！
4. ⚙️ **【已售座位清單 (系統防撞位)】**：系統後台快速比對已售出席位 ID，防止搶位。

---

## 🚀 只要 3 步即可完成部署啟用：

### 步驟 1：開啟您的試算表並貼上程式碼
1. 點擊開啟您的試算表：[票務整理](https://docs.google.com/spreadsheets/d/1yzwfB1v_6nvql_wbgrvSyiVI-D_qnO3pWtfBPQpCDJY/edit?usp=sharing)。
2. 點擊頂端選單的 **「擴充功能」** ➔ **「Apps Script」**。
3. 把編輯器中預設的程式碼清空。
4. 打開本專案的 [`backend/google_apps_script.js`](./backend/google_apps_script.js)，將裡面的**所有程式碼完整複製並貼上**。
5. 點擊上方的 **「儲存」** 圖示（磁碟片 💾）。

### 步驟 2：執行一次初始化（自動產生 3 個精美統計表）
1. 在 Apps Script 工具列上方的函式下拉選單中，選取 **`setupSheets`**。
2. 點擊旁邊的 **「執行」**。
3. 點擊「審查權限」➔ 點選您的 Google 帳號。
4. 出現「Google 尚未驗證這個應用程式」時：
   - 點擊畫面左下角灰底小字 **「進階」 (Advanced)**。
   - 點擊展開後的 **「前往「未命名專案」（不安全）」**。
   - 點擊 **「允許」**。
5. 執行完畢後，回到 Google 試算表，您會看到下方已自動生成漂亮表頭的 3 個統計表！

### 步驟 3：部署為網路應用程式（取得 API 網址）
1. 在 Apps Script 畫面右上角，點擊藍色的 **「部署」** ➔ **「新部署作業」**。
2. 點選齒輪圖示，選擇 **「網路應用程式」** (Web App)。
3. 填寫設定：
   - **說明**：`管樂團售票 API`
   - **執行身分**：`我`
   - **誰可以存取**：**`所有人` (Anyone)** ★（務必選所有人，團員才能即時選位與查詢）
4. 點擊 **「部署」**。
5. 複製產生的 **「網路應用程式網址 (Web App URL)」**（網址以 `https://script.google.com/macros/s/.../exec` 結尾）。
6. 將該網址貼在對話框給我（或貼入本專案的 [`config.js`](./config.js) 中的 `GAS_API_URL` 欄位）即可！
