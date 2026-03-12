document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. 狀態管理 (State)
  // ==========================================
  const State = {
    layoutType: 'polaroid', // 預設排版
    currentStream: null,
    isFrontCamera: true,
    capturedPhotos: [],
    fCanvas: null,
    currentFrameLayer: null
  };

  // ==========================================
  // 1.5 排版設定檔 (Layout Configuration)
  // ==========================================
  const LayoutConfig = {
    polaroid: {
      canvasWidth: 360,   // 對應真實 1080px
      canvasHeight: 500,  // 對應真實 1500px
      maxPhotos: 1,       // 只需要拍 1 張
      // 定義照片要放進去的「挖洞」座標與大小 (對應 900x1200)
      slots: [
        { x: 40, y: 40, width: 280, height: 373.3 } 
      ]
    },
    korean4x1: {
      canvasWidth: 200,   // 對應真實 600px
      canvasHeight: 600,  // 對應真實 1800px
      maxPhotos: 4,       // 需要拍 4 張！
      // 定義 4 個挖洞的座標與大小 (對應 520x390)
      slots: [
        { x: 20, y: 20, width: 160, height: 120 },
        { x: 20, y: 146.7, width: 160, height: 120 },
        { x: 20, y: 273.3, width: 160, height: 120 },
        { x: 20, y: 400, width: 160, height: 120 }
      ]
    }
  };

  // ==========================================
  // 2. DOM 元素集中管理 (UI Elements)
  // ==========================================
  const UI = {
    // 區塊
    phase1: document.getElementById('phase1-layout'),
    phase2: document.getElementById('phase2-camera'),
    phase3: document.getElementById('phase3-editor'),
    // 按鈕
    btnNext: document.getElementById('btn-next'),
    btnBack: document.getElementById('btn-back'),
    btnSwitchCam: document.getElementById('btn-switch-cam'),
    btnCapture: document.getElementById('btn-capture'),
    btnGoEdit: document.getElementById('btn-go-edit'),
    // 相機與畫布元件
    video: document.getElementById('camera-stream'),
    hiddenCanvas: document.getElementById('capture-canvas'),
    ctx: document.getElementById('capture-canvas').getContext('2d'),
    photoGallery: document.getElementById('photo-gallery')
  };

  // ==========================================
  // 3. 核心功能函式 (Functions)
  // ==========================================
  
  // 啟動相機
  async function startCamera() {
    if (State.currentStream) {
      State.currentStream.getTracks().forEach(track => track.stop());
    }
    const constraints = {
      video: {
        facingMode: State.isFrontCamera ? "user" : "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 } 
      },
      audio: false
    };
    try {
      State.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      UI.video.srcObject = State.currentStream;
    } catch (err) {
      console.error("無法開啟相機:", err);
      alert("請允許相機權限，或確認設備是否有相機！");
    }
  }

  // 停止相機
  function stopCamera() {
    if (State.currentStream) {
      State.currentStream.getTracks().forEach(track => track.stop());
      State.currentStream = null;
    }
  }

  // 初始化編輯畫布
  function initEditor() {
    const config = LayoutConfig[State.layoutType];

    if (!State.fCanvas) {
       State.fCanvas = new fabric.Canvas('editor-canvas');
    }
    // 1. 動態設定畫布大小
    State.fCanvas.setWidth(config.canvasWidth);
    State.fCanvas.setHeight(config.canvasHeight);
    State.fCanvas.clear();

    // 2. 讀取拍下來的照片，並裁切放入對應的洞口
    State.capturedPhotos.forEach((photoUrl, index) => {
      const slot = config.slots[index]; // 取得對應洞口的座標大小
      
      fabric.Image.fromURL(photoUrl).then(fImg => {
        // 算出照片要放大縮小多少，才能剛好「填滿 (Cover)」這個洞口
        const scale = Math.max(slot.width / fImg.width, slot.height / fImg.height);
        
        fImg.set({
          // 將照片中心點對齊洞口的中心點
          left: slot.x + slot.width / 2,
          top: slot.y + slot.height / 2,
          originX: 'center', 
          originY: 'center',
          scaleX: scale, 
          scaleY: scale,
          selectable: false, 
          evented: false,
          
          // ✨ 魔法修正：加入 absolutePositioned，讓遮罩不受照片本身縮放影響
          clipPath: new fabric.Rect({
            left: slot.x + slot.width / 2,   // 遮罩中心點對齊洞口中心點
            top: slot.y + slot.height / 2,
            width: slot.width,               // 遮罩大小完美等於洞口大小
            height: slot.height,
            originX: 'center',
            originY: 'center',
            absolutePositioned: true         // 絕對座標模式
          })
        });
        
        State.fCanvas.add(fImg);
        State.fCanvas.sendBackwards(fImg); // 丟到底層
      });
    });

    // 3. 載入對應排版的預設相框 (根據 layoutType 抓取不同資料夾)
    const defaultFrame = State.layoutType === 'polaroid' 
      ? 'img/polaroid/frame1.png' 
      : 'img/korean4x1/frame1.png';
    loadFrame(defaultFrame);
  }

  // 載入相框圖層
  async function loadFrame(imageUrl) {
    try {
      if (State.currentFrameLayer) {
        State.fCanvas.remove(State.currentFrameLayer);
      }
      const frameImg = await fabric.Image.fromURL(imageUrl);
      frameImg.scaleToWidth(State.fCanvas.width);
      frameImg.set({ selectable: false, evented: false, left: 0, top: 0 });
      
      State.fCanvas.add(frameImg);
      State.currentFrameLayer = frameImg;
      
      State.fCanvas.sendBackwards(frameImg); 
      const photoLayer = State.fCanvas.getObjects().find(obj => obj !== frameImg && obj.type === 'image');
      if (photoLayer) State.fCanvas.sendBackwards(photoLayer);
      
      State.fCanvas.renderAll();
    } catch (error) {
      console.error("相框載入失敗:", error);
    }
  }

  // ==========================================
  // 4. 事件監聽綁定 (Event Listeners)
  // ==========================================

  // [第一階段] 點擊下一步：切換視圖並開啟相機
  UI.btnNext.addEventListener('click', () => {
    State.layoutType = document.querySelector('input[name="layoutType"]:checked').value;
    if (State.layoutType === 'korean4x1') {
      document.body.classList.add('require-landscape');
    }
    UI.phase1.classList.remove('active');
    UI.phase2.classList.add('active');
    startCamera();
  });

  // [第二階段] 返回重選
  UI.btnBack.addEventListener('click', () => {
    document.body.classList.remove('require-landscape');
    stopCamera();
    UI.photoGallery.innerHTML = '';
    State.capturedPhotos.length = 0;
    UI.btnGoEdit.style.display = 'none';
    UI.phase2.classList.remove('active');
    UI.phase1.classList.add('active');
  });

  // [第二階段] 切換前後鏡頭
  UI.btnSwitchCam.addEventListener('click', () => {
    State.isFrontCamera = !State.isFrontCamera;
    startCamera();
  });

  // [第二階段] 拍照
  UI.btnCapture.addEventListener('click', () => {
    const config = LayoutConfig[State.layoutType]; // 取得目前排版的設定
    
    // 如果還沒拍滿，才執行拍照
    if (State.capturedPhotos.length < config.maxPhotos) {
      UI.hiddenCanvas.width = UI.video.videoWidth;
      UI.hiddenCanvas.height = UI.video.videoHeight;
      
      // 擷取畫面
      UI.ctx.drawImage(UI.video, 0, 0, UI.hiddenCanvas.width, UI.hiddenCanvas.height);
      const photoDataUrl = UI.hiddenCanvas.toDataURL('image/png');
      State.capturedPhotos.push(photoDataUrl);
      
      // 在下方顯示預覽小圖
      const img = document.createElement('img');
      img.src = photoDataUrl;
      img.style.height = '60px';
      img.style.borderRadius = '4px';
      UI.photoGallery.appendChild(img);
    }

    // UX 回饋：如果拍滿了，顯示進入編輯按鈕，並隱藏拍照按鈕
    if (State.capturedPhotos.length === config.maxPhotos) {
      UI.btnGoEdit.style.display = 'block';
      UI.btnCapture.style.display = 'none'; // 拍滿就不能再拍了
    } else {
      // (選做) 若是 4x1，可以更新按鈕文字提示進度
      UI.btnCapture.innerText = `📸 拍照 (${State.capturedPhotos.length}/${config.maxPhotos})`;
    }
  });

  // [第二階段] 進入編輯
  UI.btnGoEdit.addEventListener('click', () => {
    stopCamera();

    // ✨ UX 優化：進入編輯模式時，解除強制橫向的鎖定，讓使用者轉回直式舒適操作
    document.body.classList.remove('require-landscape');

    UI.phase2.classList.remove('active');
    UI.phase3.classList.add('active');
    initEditor();
  });

  // [第三階段] 切換相框
  document.querySelectorAll('.btn-frame').forEach(frameBtn => {
    frameBtn.addEventListener('click', (e) => {
      const selectedFrameUrl = e.target.getAttribute('src');
      loadFrame(selectedFrameUrl);
      document.querySelectorAll('.btn-frame').forEach(btn => btn.style.borderColor = 'transparent');
      e.target.style.borderColor = 'var(--primary-color)';
    });
  });

  // [第三階段] 新增貼紙
  document.querySelectorAll('.btn-sticker').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const emoji = e.target.innerText;
      const sticker = new fabric.Text(emoji, {
        left: State.fCanvas.width / 2 - 20,
        top: State.fCanvas.height / 2 - 20,
        fontSize: 40,
        transparentCorners: false,
        cornerColor: '#ff6b6b',
        cornerStyle: 'circle'
      });
      State.fCanvas.add(sticker);
      State.fCanvas.setActiveObject(sticker); 
    });
  });

});