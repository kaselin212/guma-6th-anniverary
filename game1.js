const container = document.getElementById('game-container');
const scoreEl = document.getElementById('score-val');
let score = 0;
const TARGET_SCORE = 10;
const DAMAGE = 200; 

// --- 初始狀態設為 false，等玩家看完說明按開始才變 true ---
let gameActive = false; 

sessionStorage.removeItem('guma_current_score');
let startTime; // 改到按下開始時才記錄
let misses = 0;

const MINION_SIZE = 70; 

// 開始遊戲函數 (由 HTML 的「開始挑戰」按鈕觸發)
function startGame() {
    // 隱藏說明 Popup
    const tutorialModal = document.getElementById('tutorial-modal');
    tutorialModal.classList.remove('show');
    
    setTimeout(() => {
        tutorialModal.style.display = 'none';
        // 正式啟動遊戲
        gameActive = true;
        startTime = Date.now();
        scheduleNextSpawn();
    }, 400); // 等待淡出動畫結束
}

function getSafePosition() {
    const maxAttempts = 50; 
    let attempt = 0;
    
    // 扣除掉小兵的寬高，避免生成在框外
    const maxX = container.clientWidth - MINION_SIZE;
    const maxY = container.clientHeight - MINION_SIZE;

    while (attempt < maxAttempts) {
        const x = Math.random() * maxX; 
        const y = Math.random() * maxY; 
        
        let collision = false;
        const existingMinions = document.querySelectorAll('.minion');
        
        for (let m of existingMinions) {
            const mx = parseFloat(m.style.left);
            const my = parseFloat(m.style.top);
            const dist = Math.hypot(x - mx, y - my);
            
            if (dist < MINION_SIZE) {
                collision = true;
                break; 
            }
        }
        
        if (!collision) return { x, y };
        attempt++;
    }
    return null;
}

function scheduleNextSpawn() {
    if (!gameActive) return;
    const randomDelay = Math.random() * 1000 + 400; // 稍微加快一點生成速度
    setTimeout(() => {
        spawnMinion();
        scheduleNextSpawn(); 
    }, randomDelay);
}

function spawnMinion() {
    if (!gameActive) return;

    const pos = getSafePosition();
    if (!pos) return; 

    const minion = document.createElement('div');
    minion.classList.add('minion');
    minion.style.position = 'absolute'; // 確保絕對定位
    minion.style.width = '60px';  // 設定小兵大小
    minion.style.height = '60px';
    minion.style.cursor = 'pointer';
    minion.style.left = pos.x + 'px';
    minion.style.top = pos.y + 'px';
    
    // --- 換成您專屬的可愛小兵圖片 ---
    minion.innerHTML = '<img src="img/game1-enemy.png" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 5px 5px rgba(0,0,0,0.3));">';
    
    // 建立血條
    const hpContainer = document.createElement('div');
    hpContainer.classList.add('hp-bar-container');
    
    const gridOverlay = document.createElement('div');
    gridOverlay.classList.add('hp-grid-overlay');
    hpContainer.appendChild(gridOverlay);

    const hpFill = document.createElement('div');
    hpFill.classList.add('hp-bar-fill');
    hpContainer.appendChild(hpFill);
    
    minion.appendChild(hpContainer);
    container.appendChild(minion);

    let hp = 1000;
    const maxHp = 1000;
    let isDead = false;

    function takeDamageLoop() {
        if (isDead || !gameActive) return;
        const nextHitTime = Math.random() * 900 + 400; 

        setTimeout(() => {
            if (isDead || !gameActive) return;
            const damageChunk = Math.random() * 80 + 50; 
            hp -= damageChunk;
            const pct = (hp / maxHp) * 100;
            hpFill.style.width = Math.max(0, pct) + '%';
            
            // 受擊動畫 (輕微震動)
            minion.style.transform = "translateX(-3px)";
            setTimeout(() => minion.style.transform = "translateX(3px)", 50);
            setTimeout(() => minion.style.transform = "translateX(0)", 100);

            if (hp <= DAMAGE) hpFill.classList.add('executable');

            if (hp <= 0) {
                isDead = true;
                minion.style.opacity = '0';
                setTimeout(() => minion.remove(), 200);
                misses++;
                showFloatingText(pos.x, pos.y, "Miss...", "#888");
            } else {
                takeDamageLoop();
            }
        }, nextHitTime);
    }

    takeDamageLoop();

    // 點擊事件
    minion.addEventListener('mousedown', () => {
        if (isDead) return;

        if (hp <= DAMAGE) {
            isDead = true;
            score++;
            scoreEl.innerText = score;
            showFloatingText(pos.x, pos.y, "+21g", "#C69C6D"); // 金幣顏色
            
            // 尾刀成功動畫 (放大後消失)
            minion.style.transition = "all 0.15s ease-out";
            minion.style.transform = "scale(1.3)";
            minion.style.opacity = "0";
            setTimeout(() => minion.remove(), 150);
            
            checkWin();
        } else {
            showFloatingText(pos.x, pos.y, "Too Early!", "#E4002B"); // 警告色
        }
    });
}

function showFloatingText(x, y, text, color) {
    const el = document.createElement('div');
    el.innerText = text;
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color;
    el.style.fontWeight = 'bold';
    el.style.fontFamily = 'Arial, sans-serif';
    el.style.pointerEvents = 'none';
    el.style.transition = 'all 0.8s ease-out';
    el.style.zIndex = 100;
    el.style.textShadow = '0 2px 4px rgba(0,0,0,0.8)';
    container.appendChild(el);
    
    requestAnimationFrame(() => {
        el.style.top = (y - 40) + 'px';
        el.style.opacity = 0;
    });
    setTimeout(() => el.remove(), 800);
}

function checkWin() {
    if (score >= TARGET_SCORE) {
        gameActive = false;
        
        let timeTaken = (Date.now() - startTime) / 1000;
        let timeBonus = Math.max(0, 1500 - Math.floor(timeTaken * 30)); 
        let levelScore = 1000 + timeBonus - (misses * 50); 
        levelScore = Math.max(0, Math.floor(levelScore));
        
        // 將第一關的分數存入瀏覽器暫存
        sessionStorage.setItem('guma_current_score', levelScore);

        // --- 核心改動：將算好的分數顯示在 HTML 上 ---
        document.getElementById('current-total-score').innerText = levelScore;

        // 顯示新版的過關卡片
        const modal = document.getElementById('victory-modal');
        modal.classList.add('show');
    }
}