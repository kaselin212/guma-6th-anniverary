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
    if (!State.fCanvas) {
      // TODO: 之後可以根據 State.layoutType 動態改變畫布的長寬比
       State.fCanvas = new fabric.Canvas('editor-canvas', {
         width: 320,
         height: 420
       });
    }
    State.fCanvas.clear();

    if (State.capturedPhotos.length > 0) {
      const imgElem = new Image();
      imgElem.src = State.capturedPhotos[0]; 
      imgElem.onload = () => {
        const fImg = new fabric.Image(imgElem, { selectable: false, evented: false });
        fImg.scaleToWidth(State.fCanvas.width);
        State.fCanvas.add(fImg);
        State.fCanvas.sendBackwards(fImg); 
      };
    }
    loadFrame('img/polaroid/frame1.png');
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
    UI.hiddenCanvas.width = UI.video.videoWidth;
    UI.hiddenCanvas.height = UI.video.videoHeight;
    UI.ctx.drawImage(UI.video, 0, 0, UI.hiddenCanvas.width, UI.hiddenCanvas.height);
    
    const photoDataUrl = UI.hiddenCanvas.toDataURL('image/png');
    State.capturedPhotos.push(photoDataUrl);
    
    // 顯示預覽圖與進入編輯按鈕
    const img = document.createElement('img');
    img.src = photoDataUrl;
    img.style.height = '100px';
    img.style.borderRadius = '8px';
    UI.photoGallery.appendChild(img);
    UI.btnGoEdit.style.display = 'block'; 
  });

  // [第二階段] 進入編輯
  UI.btnGoEdit.addEventListener('click', () => {
    stopCamera();
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