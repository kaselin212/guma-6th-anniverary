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