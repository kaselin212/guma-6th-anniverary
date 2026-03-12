document.addEventListener('DOMContentLoaded', () => {
  const phase1 = document.getElementById('phase1-layout');
  const phase2 = document.getElementById('phase2-camera');
  const btnNext = document.getElementById('btn-next');
  const btnBack = document.getElementById('btn-back');

  // 進入下一步：相機模式
  btnNext.addEventListener('click', () => {
    // 取得當前選中的排版類型
    const selectedLayout = document.querySelector('input[name="layoutType"]:checked').value;
    
    // 如果選擇了橫式的韓式排版，替 body 加上 require-landscape class
    if (selectedLayout === 'korean4x1') {
      document.body.classList.add('require-landscape');
    }

    // 切換 UI 視圖
    phase1.classList.remove('active');
    phase2.classList.add('active');
  });

  // 返回重選
  btnBack.addEventListener('click', () => {
    // 移除轉向限制
    document.body.classList.remove('require-landscape');
    
    // 切換 UI 視圖
    phase2.classList.remove('active');
    phase1.classList.add('active');
  });
});


// 新增全域變數來管理相機狀態
let currentStream = null;
let isFrontCamera = true; // 預設使用前鏡頭
const capturedPhotos = []; // 用來存放拍下來的照片

// 取得 HTML 元素
const videoElement = document.getElementById('camera-stream');
const canvasElement = document.getElementById('capture-canvas');
const ctx = canvasElement.getContext('2d');
const btnSwitchCam = document.getElementById('btn-switch-cam');
const btnCapture = document.getElementById('btn-capture');
const photoGallery = document.getElementById('photo-gallery');

// --- 核心功能 1：啟動相機 ---
async function startCamera() {
  // 如果目前已經有開啟的鏡頭，先把它關掉 (這對切換鏡頭很重要)
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  // 設定相機條件 (facingMode: user 是前鏡頭，environment 是後鏡頭)
  const constraints = {
    video: {
      facingMode: isFrontCamera ? "user" : "environment",
      // 建議設定較高的解析度，避免拍出來糊糊的
      width: { ideal: 1920 },
      height: { ideal: 1080 } 
    },
    audio: false // 拍貼機不需要麥克風權限
  };

  try {
    // 呼叫瀏覽器 API 請求鏡頭權限
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = currentStream;
  } catch (err) {
    console.error("無法開啟相機:", err);
    alert("請允許相機權限，或確認設備是否有相機！");
  }
}

// --- 核心功能 2：切換前後鏡頭 ---
btnSwitchCam.addEventListener('click', () => {
  isFrontCamera = !isFrontCamera; // 反轉布林值
  startCamera(); // 重新啟動相機
});

// --- 核心功能 3：拍照與擷取畫面 ---
btnCapture.addEventListener('click', () => {
  // 1. 將 Canvas 的長寬設定為跟 Video 來源一樣大
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  // 2. 將 Video 當下的那一幀畫面，畫到 Canvas 上
  // 如果是前鏡頭，通常需要水平翻轉 (鏡面效果)，這裡先做最單純的直接擷取
  ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

  // 3. 把 Canvas 轉成 Base64 圖片字串 (格式為 PNG)
  const photoDataUrl = canvasElement.toDataURL('image/png');
  
  // 4. 存入陣列中 (後續 Phase 4 組合相框會用到)
  capturedPhotos.push(photoDataUrl);

  // 5. [測試用] 將拍下的照片立刻顯示在下方確認
  const img = document.createElement('img');
  img.src = photoDataUrl;
  img.style.height = '100px';
  img.style.borderRadius = '8px';
  photoGallery.appendChild(img);
});

/* 記得修改原本的 btnNext 邏輯！
  當使用者從 Phase 1 點擊「下一步」進入 Phase 2 時，才觸發啟動相機。
*/
document.getElementById('btn-next').addEventListener('click', () => {
  // ... (保留原本判斷 require-landscape 的邏輯) ...
  startCamera(); // 進入這頁時啟動相機
});

// 當使用者點擊「返回重選」時，記得關閉相機節省資源
document.getElementById('btn-back').addEventListener('click', () => {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
  // 清空測試圖庫
  photoGallery.innerHTML = '';
  capturedPhotos.length = 0;
});