const container = document.getElementById('game-container');
const scoreEl = document.getElementById('score-val');
let score = 0;
const TARGET_SCORE = 10;
const DAMAGE = 200; 
let gameActive = true;

// 小兵尺寸 (用來計算碰撞)
const MINION_SIZE = 70; // 60px本體 + 10px的安全距離

// --- 核心改動 1: 防止重疊的座標計算函數 ---
function getSafePosition() {
    const maxAttempts = 50; // 最多嘗試50次，避免畫面滿了造成死無窮迴圈
    let attempt = 0;
    
    while (attempt < maxAttempts) {
        // 1. 隨機生成座標
        const x = Math.random() * (740); // 容器寬800 - 60
        const y = Math.random() * (440); // 容器高500 - 60
        
        // 2. 檢查是否跟現有的任何一隻小兵重疊
        let collision = false;
        const existingMinions = document.querySelectorAll('.minion');
        
        for (let m of existingMinions) {
            const rect = m.getBoundingClientRect();
            // 取得現有小兵的座標 (相對於遊戲容器)
            // 注意：這裡簡單計算，用 style.left/top 比較快
            const mx = parseFloat(m.style.left);
            const my = parseFloat(m.style.top);
            
            // 計算兩點距離 (畢氏定理)
            const dist = Math.hypot(x - mx, y - my);
            
            // 如果距離太近 (小於兩隻小兵的寬度)，就算重疊
            if (dist < MINION_SIZE) {
                collision = true;
                break; // 撞到了，不用檢查其他的，直接換下一個位置
            }
        }
        
        // 3. 如果沒撞到，這就是好位置！
        if (!collision) {
            return { x, y };
        }
        
        attempt++;
    }
    
    // 如果試了50次都找不到位置 (畫面太擠)，這次就不生成
    return null;
}

function scheduleNextSpawn() {
    if (!gameActive) return;
    const randomDelay = Math.random() * 1000 + 500; 
    setTimeout(() => {
        spawnMinion();
        scheduleNextSpawn(); 
    }, randomDelay);
}

function spawnMinion() {
    if (!gameActive) return;

    // --- 呼叫上面的新函數取得位置 ---
    const pos = getSafePosition();
    
    // 如果回傳 null (找不到位置)，這次就跳過
    if (!pos) return; 

    const minion = document.createElement('div');
    minion.classList.add('minion');
    
    // --- 核心改動 2: 插入 Font Awesome 圖示 ---
    // 這裡我們直接插入 HTML 字串，包含 i 標籤
    minion.innerHTML = '<i class="fa-solid fa-pizza-slice"></i>';
    
    minion.style.left = pos.x + 'px';
    minion.style.top = pos.y + 'px';

    // 建立血條 (注意：現在要 append 到 minion 裡面，不要蓋掉 icon)
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

    // --- 以下是原本的扣血邏輯 (保持不變) ---
    let hp = 1000;
    const maxHp = 1000;
    let isDead = false;

    function takeDamageLoop() {
        if (isDead || !gameActive) return;
        const nextHitTime = Math.random() * 1100 + 400; 

        setTimeout(() => {
            if (isDead || !gameActive) return;
            const damageChunk = Math.random() * 70 + 50; 
            hp -= damageChunk;
            const pct = (hp / maxHp) * 100;
            hpFill.style.width = Math.max(0, pct) + '%';
            
            // 受擊動畫
            minion.classList.add('hit');
            setTimeout(() => minion.classList.remove('hit'), 200);

            if (hp <= DAMAGE) hpFill.classList.add('executable');

            if (hp <= 0) {
                isDead = true;
                minion.remove();
                showFloatingText(pos.x, pos.y, "Miss...", "gray");
            } else {
                takeDamageLoop();
            }
        }, nextHitTime);
    }

    takeDamageLoop();

    minion.addEventListener('mousedown', () => {
        if (isDead) return;

        if (hp <= DAMAGE) {
            isDead = true;
            score++;
            scoreEl.innerText = score;
            showFloatingText(pos.x, pos.y, "+21g", "gold");
            minion.style.transition = "transform 0.1s";
            minion.style.transform = "scale(0)";
            setTimeout(() => minion.remove(), 100);
            checkWin();
        } else {
            showFloatingText(pos.x, pos.y, "Too Early!", "red");
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
    el.style.pointerEvents = 'none';
    el.style.transition = 'all 0.8s ease-out';
    el.style.zIndex = 100;
    container.appendChild(el);
    requestAnimationFrame(() => {
        el.style.top = (y - 50) + 'px';
        el.style.opacity = 0;
    });
    setTimeout(() => el.remove(), 800);
}

function checkWin() {
    if (score >= TARGET_SCORE) {
        gameActive = false;
        const modal = document.getElementById('victory-modal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

scheduleNextSpawn();