const container = document.getElementById('game-container');
const playerRotator = document.getElementById('player-rotate-layer'); 
const scoreEl = document.getElementById('score-val');
const ammoEl = document.getElementById('ammo-val');

// --- 遊戲參數 ---
let score = 0;
const TARGET_SCORE = 15; 
let ammo = 30; 
let gameActive = true;

// 畫面中心點 (800x600)
const CENTER_X = 400;
const CENTER_Y = 300;

let arrows = []; 
let enemies = []; 
let mouseX = CENTER_X;
let mouseY = CENTER_Y;

// 1. 玩家瞄準 (純旋轉)
container.addEventListener('mousemove', (e) => {
    if (!gameActive) return;
    const rect = container.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    const angle = Math.atan2(mouseY - CENTER_Y, mouseX - CENTER_X);
    const deg = angle * (180 / Math.PI);
    playerRotator.style.transform = `rotate(${deg + 45}deg)`;
});

// 2. 射擊機制
container.addEventListener('mousedown', () => {
    if (!gameActive || ammo <= 0) return;

    ammo--;
    ammoEl.innerText = ammo;
    
    spawnArrow();

    if (ammo === 0 && score < TARGET_SCORE) {
        setTimeout(() => {
            if (score < TARGET_SCORE) {
                alert("彈藥耗盡！請按 F5 重來");
                location.reload();
            }
        }, 2000); 
    }
});

function spawnArrow() {
    const arrowEl = document.createElement('div');
    arrowEl.classList.add('arrow');
    container.appendChild(arrowEl);

    // 計算發射角度
    const angle = Math.atan2(mouseY - CENTER_Y, mouseX - CENTER_X);
    
    // 設定初始位置
    arrowEl.style.left = CENTER_X + 'px';
    arrowEl.style.top = CENTER_Y + 'px';
    
    arrowEl.style.transform = `translate(-50%, -50%) rotate(${angle * (180/Math.PI)}deg)`;

    arrows.push({
        el: arrowEl,
        x: CENTER_X,
        y: CENTER_Y,
        // --- 修改點：子彈變慢 ---
        // 原本是 20，現在改 12，增加預判難度
        vx: Math.cos(angle) * 12, 
        vy: Math.sin(angle) * 12 
    });
}

// 3. 敵人生成 (LoL 走位版)
function spawnEnemy() {
    if (!gameActive) return;

    const enemyEl = document.createElement('div');
    enemyEl.classList.add('enemy');
    enemyEl.innerHTML = '<i class="fa-solid fa-jet-fighter"></i>'; 
    container.appendChild(enemyEl);

    // --- 隨機位置 (避開玩家) ---
    let startX, startY, dist;
    do {
        startX = Math.random() * 740 + 30; 
        startY = Math.random() * 540 + 30;
        dist = Math.hypot(startX - CENTER_X, startY - CENTER_Y);
    } while (dist < 100); // 至少距離 100px

    enemyEl.style.left = startX + 'px';
    enemyEl.style.top = startY + 'px';

    enemies.push({
        el: enemyEl,
        x: startX,
        y: startY,
        
        // --- AI 參數 ---
        // 初始目標：隨機選一個點走過去
        targetX: Math.random() * 740 + 30,
        targetY: Math.random() * 540 + 30,
        
        speed: Math.random() * 1.5 + 1.5, // 移動速度 (1.5 ~ 3)
        rotation: 0,
        isDead: false
    });
}

// 4. 遊戲迴圈
function gameLoop() {
    if (!gameActive) return;

    // A. 更新箭矢
    for (let i = arrows.length - 1; i >= 0; i--) {
        const arrow = arrows[i];
        arrow.x += arrow.vx;
        arrow.y += arrow.vy;
        
        arrow.el.style.left = arrow.x + 'px';
        arrow.el.style.top = arrow.y + 'px';

        if (arrow.x < -50 || arrow.x > 850 || arrow.y < -50 || arrow.y > 650) {
            arrow.el.remove();
            arrows.splice(i, 1);
        }
    }

    // B. 更新敵人 (LoL 隨機走位)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.isDead) continue;

        // --- AI 決策層 ---
        // 1. 檢查是否到達目標 (誤差 5px 內)
        const distToTarget = Math.hypot(enemy.targetX - enemy.x, enemy.targetY - enemy.y);
        
        // 到達目標 OR 隨機 1% 機率突然改變心意 (Juking)
        if (distToTarget < 5 || Math.random() < 0.01) {
            enemy.targetX = Math.random() * 740 + 30;
            enemy.targetY = Math.random() * 540 + 30;
        }

        // --- 物理移動層 ---
        // 計算朝向目標的角度
        const angle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
        
        // 更新座標 (平滑移動)
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;

        // 更新面向 (讓飛機頭朝向移動方向)
        // +90 是修正 font-awesome 圖示角度
        const facingDeg = angle * (180 / Math.PI) + 90;
        enemy.el.style.transform = `translate(-50%, -50%) rotate(${facingDeg}deg)`;
        enemy.el.style.left = enemy.x + 'px';
        enemy.el.style.top = enemy.y + 'px';

        // C. 碰撞檢測 (箭矢)
        let hit = false;
        for (let j = arrows.length - 1; j >= 0; j--) {
            const arrow = arrows[j];
            const dist = Math.hypot(arrow.x - enemy.x, arrow.y - enemy.y);
            
            if (dist < 30) { 
                arrow.el.remove();
                arrows.splice(j, 1);
                
                enemy.isDead = true;
                enemy.el.classList.add('hit'); 
                setTimeout(() => enemy.el.remove(), 200); 
                
                score++;
                scoreEl.innerText = score;
                showHitText(enemy.x, enemy.y, "NICE!", "#E4002B");

                if (score >= TARGET_SCORE) gameWin();
                break; 
            }
        }
        
        if (enemy.isDead) {
            enemies.splice(i, 1);
            continue;
        }

        // D. 碰撞玩家
        const distToPlayer = Math.hypot(CENTER_X - enemy.x, CENTER_Y - enemy.y);
        if (distToPlayer < 40) {
             enemy.isDead = true;
             enemy.el.remove();
             enemies.splice(i, 1);
             showHitText(CENTER_X, CENTER_Y, "OUCH!", "red");
             // 這裡可以扣分
        }
    }

    requestAnimationFrame(gameLoop);
}

function showHitText(x, y, text, color) {
    const el = document.createElement('div');
    el.innerText = text;
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color;
    el.style.fontWeight = 'bold';
    el.style.zIndex = 100;
    el.style.pointerEvents = 'none';
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

// 生成頻率 (稍微快一點，因為怪不會主動撞你)
setInterval(() => {
    if (enemies.length < 8 && gameActive) spawnEnemy();
}, 800);

gameLoop();