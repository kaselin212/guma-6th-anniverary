const container = document.getElementById('game-container');
const player = document.getElementById('player');
const scoreEl = document.getElementById('score-val');
const ammoEl = document.getElementById('ammo-val');

// 遊戲參數
let score = 0;
const TARGET_SCORE = 10;
let ammo = 20; // 只有20發箭，要珍惜！
let gameActive = true;

// 儲存場上的物體
let arrows = []; // 存放所有射出去的箭 { element, x, y }
let enemies = []; // 存放所有敵人 { element, x, y, speed, direction }

// 1. 玩家移動控制 (滑鼠跟隨)
container.addEventListener('mousemove', (e) => {
    if (!gameActive) return;

    // 取得容器相對於視窗的位置
    const rect = container.getBoundingClientRect();
    
    // 計算滑鼠在容器內的 Y 座標
    let y = e.clientY - rect.top;
    
    // 限制不要跑出上下邊界
    y = Math.max(25, Math.min(y, 475));
    
    player.style.top = (y - 25) + 'px'; // -25 是為了讓游標在圖示正中心
});

// 2. 射擊控制 (點擊)
container.addEventListener('mousedown', () => {
    if (!gameActive || ammo <= 0) return;

    ammo--;
    ammoEl.innerText = ammo;
    
    // 播放一個簡單的音效 (可選)
    // createShootSound();

    spawnArrow();

    if (ammo === 0 && score < TARGET_SCORE) {
        // 子彈打完還沒通關...
        setTimeout(() => {
            if (score < TARGET_SCORE) {
                alert("彈藥耗盡！請重新挑戰 (按 F5)"); // 之後可以做漂亮的失敗視窗
                location.reload();
            }
        }, 2000); // 給一點時間讓最後一發箭飛一會兒
    }
});

// 生成箭矢
function spawnArrow() {
    const arrowEl = document.createElement('div');
    arrowEl.classList.add('arrow');
    
    // 箭從玩家的位置發射
    const startY = parseInt(player.style.top) + 22; // +22 微調高度
    const startX = 60; // 玩家右邊一點點

    arrowEl.style.top = startY + 'px';
    arrowEl.style.left = startX + 'px';
    
    container.appendChild(arrowEl);

    // 加入陣列管理
    arrows.push({
        el: arrowEl,
        x: startX,
        y: startY,
        speed: 15 // 箭的飛行速度 (越快越簡單，越慢預判需求越高)
    });
}

// 生成敵人
function spawnEnemy() {
    if (!gameActive) return;

    const enemyEl = document.createElement('div');
    enemyEl.classList.add('enemy');
    enemyEl.innerHTML = '<i class="fa-solid fa-bullseye"></i>'; // 靶心圖示
    
    // 隨機 Y 軸起始位置
    const startY = Math.random() * (450 - 50) + 25;
    const startX = 750; // 最右邊

    enemyEl.style.top = startY + 'px';
    enemyEl.style.left = startX + 'px'; // 這裡我們讓敵人固定X軸，只做上下移動? 或者讓它往左走?
    // 為了強調"預判"，讓敵人做「上下移動」比較像走位。
    
    container.appendChild(enemyEl);

    // 隨機移動速度與方向
    const speed = Math.random() * 2 + 1; // 1 ~ 3
    const direction = Math.random() > 0.5 ? 1 : -1; // 1是往下, -1是往上

    enemies.push({
        el: enemyEl,
        x: startX,
        y: startY,
        dy: speed * direction, // Y軸移動速度
        isDead: false
    });
}

// 3. 核心遊戲迴圈 (每秒跑60次)
function gameLoop() {
    if (!gameActive) return;

    // A. 更新箭矢位置
    for (let i = arrows.length - 1; i >= 0; i--) {
        const arrow = arrows[i];
        arrow.x += arrow.speed;
        arrow.el.style.left = arrow.x + 'px';

        // 超出畫面移除
        if (arrow.x > 800) {
            arrow.el.remove();
            arrows.splice(i, 1);
        }
    }

    // B. 更新敵人位置 (上下移動)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.isDead) continue;

        enemy.y += enemy.dy;

        // 碰到上下邊緣反彈
        if (enemy.y <= 0 || enemy.y >= 450) {
            enemy.dy *= -1; 
        }
        
        enemy.el.style.top = enemy.y + 'px';

        // C. 碰撞檢測 (Collision Detection)
        // 檢查這隻敵人有沒有被任何一支箭射中
        for (let j = arrows.length - 1; j >= 0; j--) {
            const arrow = arrows[j];
            
            // 簡單的矩形碰撞
            // 箭: 40x6, 敵人: 50x50
            if (
                arrow.x < enemy.x + 50 &&
                arrow.x + 40 > enemy.x &&
                arrow.y < enemy.y + 50 &&
                arrow.y + 6 > enemy.y
            ) {
                // --- 命中！ ---
                
                // 1. 移除箭
                arrow.el.remove();
                arrows.splice(j, 1);
                
                // 2. 敵人死亡特效
                enemy.isDead = true;
                enemy.el.classList.add('hit');
                // 播放爆炸動畫後移除元素
                setTimeout(() => {
                    enemy.el.remove();
                    // 從陣列移除需要小心，這裡我們先標記 isDead，稍微晚點移除
                }, 200); 
                
                // 3. 加分
                score++;
                scoreEl.innerText = score;

                // 4. 浮動文字
                showHitText(enemy.x, enemy.y);

                // 5. 檢查通關
                if (score >= TARGET_SCORE) {
                    gameWin();
                }

                break; // 這支箭已經沒了，不用檢查其他敵人
            }
        }
        
        // 清理死掉的敵人 (完全移除)
        if (enemy.isDead) {
            enemies.splice(i, 1);
        }
    }

    requestAnimationFrame(gameLoop);
}

function showHitText(x, y) {
    const el = document.createElement('div');
    el.innerText = "NICE!";
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = "#E4002B";
    el.style.fontWeight = 'bold';
    el.style.fontSize = '20px';
    el.style.transition = 'all 0.5s';
    container.appendChild(el);
    
    setTimeout(() => {
        el.style.top = (y - 30) + 'px';
        el.style.opacity = 0;
    }, 50);
    setTimeout(() => el.remove(), 550);
}

function gameWin() {
    gameActive = false;
    const modal = document.getElementById('victory-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

// 啟動遊戲
// 定時生成敵人
setInterval(() => {
    if (enemies.length < 5) { // 場上最多維持5個敵人
        spawnEnemy();
    }
}, 1000);

gameLoop();