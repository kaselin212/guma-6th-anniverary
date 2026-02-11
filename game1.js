const container = document.getElementById('game-container');
const scoreEl = document.getElementById('score-val');
let score = 0;
const TARGET_SCORE = 10; // 目標分數

// 設定參數
const DAMAGE = 200; // 你的攻擊力
const SPAWN_RATE = 1500; // 每1.5秒生一隻

function spawnMinion() {
    // 1. 建立 DOM
    const minion = document.createElement('div');
    minion.classList.add('minion');
    
    // 2. 隨機位置 (扣除邊界)
    const x = Math.random() * (740); // 800 - 60
    const y = Math.random() * (440); // 500 - 60
    minion.style.left = x + 'px';
    minion.style.top = y + 'px';

    // 3. 血條結構
    const hpContainer = document.createElement('div');
    hpContainer.classList.add('hp-bar-container');
    const hpFill = document.createElement('div');
    hpFill.classList.add('hp-bar-fill');
    hpContainer.appendChild(hpFill);
    minion.appendChild(hpContainer);
    
    container.appendChild(minion);

    // 4. 小兵數據
    let hp = 1000;
    const maxHp = 1000;
    let isDead = false;

    // 5. 扣血迴圈 (模擬被其他小兵打)
    const decay = setInterval(() => {
        if (isDead) { clearInterval(decay); return; }

        hp -= Math.random() * 8 + 2; // 隨機扣血
        
        // 更新 UI
        const pct = (hp / maxHp) * 100;
        hpFill.style.width = pct + '%';

        // 斬殺線判定
        if (hp <= DAMAGE) {
            hpFill.classList.add('executable');
        }

        // 自然死亡 (漏刀)
        if (hp <= 0) {
            clearInterval(decay);
            minion.remove();
            showFloatingText(x, y, "Miss...", "gray");
        }
    }, 50);

    // 6. 點擊事件 (攻擊)
    minion.addEventListener('mousedown', () => {
        if (isDead) return;

        if (hp <= DAMAGE) {
            // 成功尾刀
            isDead = true;
            clearInterval(decay);
            score++;
            scoreEl.innerText = score;
            showFloatingText(x, y, "+21g", "gold");
            minion.style.transform = "scale(0)"; // 縮小消失動畫
            setTimeout(() => minion.remove(), 200);

            // 檢查是否通關
            checkWin();
        } else {
            // 太早打
            showFloatingText(x, y, "Too Early!", "red");
            // 可以在這裡做懲罰，例如小兵回血或扣分
        }
    });
}

// 浮動文字特效
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
    
    // 讓瀏覽器有時間渲染初始狀態，再加動畫 class
    requestAnimationFrame(() => {
        el.style.top = (y - 50) + 'px'; // 往上飄
        el.style.opacity = 0;
    });

    setTimeout(() => el.remove(), 800);
}

function checkWin() {
    if (score >= TARGET_SCORE) {
        // 1. 停止遊戲 (不讓小兵繼續扣血或生怪)
        // 這裡做一個簡單的處理：把生怪頻率設為極大，或是清除所有 interval
        // 為了簡單起見，我們直接顯示視窗，遊戲背景繼續動也沒關係，反而有動態感
        
        // 2. 獲取 Modal 元素
        const modal = document.getElementById('victory-modal');
        
        // 3. 顯示遮罩 (display: flex)
        modal.style.display = 'flex';
        
        // 4. 延遲一點點加上 show class，觸發 CSS 的淡入動畫 (Fade In)
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // 5. 播放一個音效? (之後可以加)
    }
}

// 開始遊戲迴圈
setInterval(spawnMinion, SPAWN_RATE);