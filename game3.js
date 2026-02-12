const container = document.getElementById('game-container');
const player = document.getElementById('player');
const rangeCircle = document.getElementById('range-circle');
const boss = document.getElementById('boss');
const bossHpFill = document.getElementById('boss-hp-fill');
const playerHpEl = document.getElementById('player-hp');

// --- 遊戲參數 ---
let gameActive = true;
const PLAYER_RANGE = 250; 
const ATTACK_SPEED = 400; 
let lastAttackTime = 0;
const PLAYER_MOVE_SPEED = 5; // 玩家移動速度 (數值越大跑越快)

// 數值
let bossHp = 2000;
const BOSS_MAX_HP = 2000;
let playerHp = 100;

// 座標系統 (初始在畫面下方)
let playerX = 400;
let playerY = 500;
// 目標位置 (玩家想要去的地方)
let targetX = 400;
let targetY = 500;

let bossX = 400;
let bossY = 80;

let bullets = [];
let enemySkills = [];

// 初始化
rangeCircle.style.width = (PLAYER_RANGE * 2) + 'px';
rangeCircle.style.height = (PLAYER_RANGE * 2) + 'px';
updatePlayerView(); // 先更新一次初始位置

// --- 1. 滑鼠點擊控制 (設定目標點) ---
container.addEventListener('mousedown', (e) => {
    if (!gameActive) return;
    
    // 取得點擊座標 (相對於遊戲容器)
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 限制邊界 (不能點到牆壁外面)
    targetX = Math.max(25, Math.min(clickX, 775));
    targetY = Math.max(25, Math.min(clickY, 575));

    // 生成點擊特效 (Visual Feedback)
    createClickMarker(targetX, targetY);
});

// 產生綠色點擊特效
function createClickMarker(x, y) {
    const marker = document.createElement('div');
    marker.classList.add('click-marker');
    marker.style.left = x + 'px';
    marker.style.top = y + 'px';
    container.appendChild(marker);
    
    // 動畫播完後移除 DOM
    setTimeout(() => marker.remove(), 500);
}

// --- 2. 玩家移動邏輯 (每一幀呼叫) ---
function updatePlayerMovement() {
    // 計算與目標點的距離
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    const dist = Math.hypot(dx, dy);

    // 如果距離大於速度 (還沒走到)，就繼續走
    if (dist > PLAYER_MOVE_SPEED) {
        // 計算移動向量 (Normalize)
        const angle = Math.atan2(dy, dx);
        
        playerX += Math.cos(angle) * PLAYER_MOVE_SPEED;
        playerY += Math.sin(angle) * PLAYER_MOVE_SPEED;

        // 角色轉身面向移動方向 (選用，如果不喜歡一直轉可以拿掉)
        // 加上 +90度 是因為圖示預設角度問題，視情況調整
        player.style.transform = `translate(-50%, -50%) rotate(${angle * (180/Math.PI) + 90}deg)`;
    } else {
        // 距離很近了，直接吸附到目標點，避免抖動
        playerX = targetX;
        playerY = targetY;
    }

    updatePlayerView();
}

function updatePlayerView() {
    player.style.left = playerX + 'px';
    player.style.top = playerY + 'px';
    
    rangeCircle.style.left = playerX + 'px';
    rangeCircle.style.top = playerY + 'px';
}

// --- 3. 自動攻擊邏輯 ---
function checkAutoAttack(timestamp) {
    const dist = Math.hypot(playerX - bossX, playerY - bossY);

    if (dist <= PLAYER_RANGE) {
        rangeCircle.classList.add('active'); // 變紅

        // 攻速冷卻檢查
        if (timestamp - lastAttackTime > ATTACK_SPEED) {
            shootBoss();
            lastAttackTime = timestamp;
        }
    } else {
        rangeCircle.classList.remove('active');
    }
}

function shootBoss() {
    const bullet = document.createElement('div');
    bullet.classList.add('player-bullet');
    container.appendChild(bullet);

    bullets.push({
        el: bullet,
        x: playerX,
        y: playerY,
        targetX: bossX,
        targetY: bossY,
        speed: 15
    });
}

// --- 4. Boss 行為 ---
let bossMoveTimer = 0;
let bossSkillTimer = 0;

function updateBoss() {
    bossMoveTimer++;
    bossX = 400 + Math.sin(bossMoveTimer * 0.02) * 300; 
    
    boss.style.left = bossX + 'px';
    boss.style.top = bossY + 'px';

    bossSkillTimer++;
    // 難度控制：血越少招式越多
    let cooldown = 60;
    if (bossHp < 1000) cooldown = 45;
    if (bossHp < 500) cooldown = 30;

    if (bossSkillTimer > cooldown) { 
        castSkill();
        bossSkillTimer = 0; 
    }
}

function castSkill() {
    const type = Math.random();
    
    if (type < 0.3) {
        createSkillshot(bossX, bossY, playerX, playerY, 'line'); // 預判? 不，先瞄準當前位置
    } else if (type < 0.7) {
        createSkillshot(bossX, bossY, playerX, playerY + 100, 'orb');
        createSkillshot(bossX, bossY, playerX - 150, playerY + 100, 'orb');
        createSkillshot(bossX, bossY, playerX + 150, playerY + 100, 'orb');
    } else {
        createSkillshot(bossX, bossY, playerX, playerY, 'big');
    }
}

function createSkillshot(x, y, tx, ty, type) {
    const el = document.createElement('div');
    el.classList.add('skillshot');
    container.appendChild(el);

    let speed = 5;
    let size = 20;

    if (type === 'line') {
        el.style.width = '10px';
        el.style.height = '40px';
        speed = 9;
    } else if (type === 'orb') {
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        speed = 5;
    } else if (type === 'big') {
        el.style.width = '50px';
        el.style.height = '50px';
        el.style.borderRadius = '50%';
        speed = 3;
    }

    const angle = Math.atan2(ty - y, tx - x);
    
    enemySkills.push({
        el: el,
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type: type,
        radius: size / 2
    });
}

// --- 5. 遊戲主迴圈 ---
function gameLoop(timestamp) {
    if (!gameActive) return;

    // 更新玩家移動 (每幀都要跑，這樣才會平滑移動)
    updatePlayerMovement();

    checkAutoAttack(timestamp);
    updateBoss();

    // 更新子彈
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        const angle = Math.atan2(bossY - b.y, bossX - b.x);
        b.x += Math.cos(angle) * b.speed;
        b.y += Math.sin(angle) * b.speed;
        
        b.el.style.left = b.x + 'px';
        b.el.style.top = b.y + 'px';

        if (Math.hypot(bossX - b.x, bossY - b.y) < 40) {
            b.el.remove();
            bullets.splice(i, 1);
            bossHp -= 20;
            bossHpFill.style.width = (bossHp / BOSS_MAX_HP) * 100 + '%';
            boss.classList.add('hit');
            setTimeout(() => boss.classList.remove('hit'), 100);
            if (bossHp <= 0) gameWin();
        }
    }

    // 更新技能
    for (let i = enemySkills.length - 1; i >= 0; i--) {
        const s = enemySkills[i];
        s.x += s.vx;
        s.y += s.vy;
        
        s.el.style.left = s.x + 'px';
        s.el.style.top = s.y + 'px';
        
        if (s.type === 'line') {
             const angle = Math.atan2(s.vy, s.vx);
             s.el.style.transform = `translate(-50%, -50%) rotate(${angle + Math.PI/2}rad)`;
        } else {
             s.el.style.transform = `translate(-50%, -50%)`;
        }

        if (s.y > 650 || s.x < -50 || s.x > 850) {
            s.el.remove();
            enemySkills.splice(i, 1);
            continue;
        }

        // 碰撞檢測
        if (Math.hypot(playerX - s.x, playerY - s.y) < (15 + s.radius)) {
            s.el.remove();
            enemySkills.splice(i, 1);
            playerHp -= 15;
            playerHpEl.innerText = playerHp;
            player.classList.add('player-hit');
            setTimeout(() => player.classList.remove('player-hit'), 300);
            if (playerHp <= 0) gameOver();
        }
    }

    requestAnimationFrame(gameLoop);
}

function gameWin() {
    gameActive = false;
    const modal = document.getElementById('victory-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function gameOver() {
    gameActive = false;
    alert("走位失誤！Game Over");
    location.reload();
}

requestAnimationFrame(gameLoop);