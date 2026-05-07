const container = document.getElementById('game-container');
const hpText = document.getElementById('hp-text');
const hpFill = document.getElementById('baron-hp-fill');
const resultText = document.getElementById('result-text');
const levelEl = document.getElementById('level-val');
const bossEl = document.querySelector('.objective-boss'); // 提早抓取避免頻繁消耗效能

// 遊戲參數
let currentLevel = 1;
const MAX_LEVEL = 5;
let gameActive = false; // 按下開始前是 false
let isStealing = false; // 玩家是否正在發射技能

let game4TotalScore = 0; // 紀錄這五小關累積的總分

// 數值設定
let maxHp = 12000;
let currentHp = 12000;

// 玩家傷害 (法洛士蓄力 Q)
const PLAYER_DAMAGE = 1350;

// 敵方打野重擊傷害 (滿等重擊)
let ENEMY_SMITE_DAMAGE = 1200;

// 【關鍵修復】將變數宣告移到初始化函數的前面！
let isTutorialCompleted = false;

// 初始化
resetLevel();

function startGame() {
    const tutorialModal = document.getElementById('tutorial-modal');
    tutorialModal.classList.remove('show');

    setTimeout(() => {
        tutorialModal.style.display = 'none';
        isTutorialCompleted = true;
        // 給玩家 1 秒準備時間
        setTimeout(() => {
            gameActive = true;
            startDamageLoop();
        }, 1000);
    }, 400);
}

// 監聽按鍵 (空白鍵) 與 點擊
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isStealing && gameActive) {
        performSteal();
        e.preventDefault(); // 防止按空白鍵畫面往下捲動
    }
});
container.addEventListener('mousedown', () => {
    if (!isStealing && gameActive) {
        performSteal();
    }
});

function resetLevel() {
    // 每一關難度提升：血量變多
    maxHp = 10000 + (currentLevel * 2000);
    currentHp = maxHp;
    updateHpUI();

    resultText.className = 'result-text'; // 清除結果樣式
    levelEl.innerText = currentLevel;
    isStealing = false;

    // 如果不是第一關（或者教學已關閉），就自動倒數開始
    if (currentLevel > 1 || isTutorialCompleted) {
        setTimeout(() => {
            gameActive = true;
            startDamageLoop();
        }, 1000);
    }
}

function startDamageLoop() {
    if (!gameActive) return;

    // 模擬敵方團隊打巴龍 (Burst Damage Simulation)
    function damageTick() {
        if (!gameActive) return;

        // 隨機扣血量 (隨關卡變痛)
        let damage = (Math.random() * 50 + 20) * (1 + currentLevel * 0.2);

        // 偶爾來個大爆發 (模擬敵方隊友技能全交)
        if (Math.random() < 0.1) damage *= 5;

        currentHp -= Math.floor(damage);
        updateHpUI();

        // --- 敵方打野重擊邏輯 (Enemy Smite AI) ---
        // 敵方打野在血量接近 1200 時準備重擊 (例如 1200 + 隨機亂數)
        let dynamicSmiteThreshold = ENEMY_SMITE_DAMAGE + (Math.random() * 200 - 50);

        if (currentHp <= dynamicSmiteThreshold) {
            // 關卡越高，敵方重擊越不會失誤
            const chanceToSmite = 0.5 + (currentLevel * 0.1);

            if (Math.random() < chanceToSmite) {
                // 敵方重擊成功，但有極短的反應延遲
                setTimeout(() => {
                    if (gameActive) { // 如果在這短暫時間內玩家還沒搶走
                        currentHp = 0;
                        updateHpUI();
                        endGame(false); // 玩家失敗
                    }
                }, Math.random() * 200 + (500 - currentLevel * 100)); // 延遲越來越短
            }
        }

        // 如果被敵方普攻打死了
        if (currentHp <= 0 && gameActive) {
            currentHp = 0;
            updateHpUI();
            endGame(false);
        }

        // 下一次扣血的時間間隔
        let nextTick = Math.random() * 100 + 50;
        if (currentHp > 0) setTimeout(damageTick, nextTick);
    }

    damageTick();
}

function performSteal() {
    if (!gameActive) return;
    isStealing = true; // 防止連點

    // 1. 生成技能特效 (箭矢從下飛上)
    const arrow = document.createElement('div');
    arrow.classList.add('steal-projectile');
    container.appendChild(arrow);

    // 2. 模擬飛行時間 (Travel Time)
    const travelTime = 200;

    arrow.animate([
        { bottom: '-100px' },
        { bottom: '50%' }
    ], {
        duration: travelTime,
        easing: 'linear',
        fill: 'forwards'
    });

    // 3. 傷害判定
    setTimeout(() => {
        arrow.remove();

        if (!gameActive) return;

        currentHp -= PLAYER_DAMAGE;
        showFloatingText(PLAYER_DAMAGE);

        if (currentHp <= 0) {
            currentHp = 0;
            updateHpUI();
            endGame(true); // 搶奪成功！
        } else {
            // 太早放了，傷害不夠
            endGame(false, "TOO EARLY!");
        }
    }, travelTime);
}

function updateHpUI() {
    hpText.innerText = Math.max(0, Math.floor(currentHp));
    const pct = (currentHp / maxHp) * 100;
    hpFill.style.width = pct + '%';

    // 受擊震動
    if (bossEl && !bossEl.classList.contains('shake')) {
        bossEl.classList.add('shake');
        setTimeout(() => bossEl.classList.remove('shake'), 50);
    }
}

function endGame(success, failReason = "STOLEN BY ENEMY") {
    gameActive = false;

    if (success) {
        resultText.innerText = "STOLEN!";
        resultText.className = "result-text success";

        // 極限反應紅利
        let hpBeforeHit = currentHp + PLAYER_DAMAGE;
        let precisionBonus = Math.max(0, 2000 - hpBeforeHit);
        game4TotalScore += (500 + precisionBonus);

        setTimeout(() => {
            if (currentLevel < MAX_LEVEL) {
                currentLevel++;
                resetLevel();
            } else {
                // 第四關全破，進入結算
                let total = parseInt(sessionStorage.getItem('guma_current_score')) || 0;
                let newTotal = total + Math.floor(game4TotalScore);
                sessionStorage.setItem('guma_current_score', newTotal);

                document.getElementById('current-total-score').innerText = newTotal;

                const modal = document.getElementById('victory-modal');
                modal.classList.add('show');
            }
        }, 1500);

    } else {
        resultText.innerText = failReason;
        resultText.className = "result-text fail";

        setTimeout(() => {
            alert("搶奪失敗... 再試一次！");
            resetLevel();
        }, 1000);
    }
}

function showFloatingText(damage) {
    const el = document.createElement('div');
    el.innerText = "-" + damage;
    el.style.position = 'absolute';
    el.style.top = '40%';
    el.style.left = '60%';
    el.style.color = '#fff';
    el.style.fontSize = '2rem';
    el.style.fontWeight = 'bold';
    el.style.textShadow = '0 0 5px red';
    el.style.transition = 'all 0.5s';
    el.style.zIndex = 100;

    container.appendChild(el);
    setTimeout(() => {
        el.style.top = '30%';
        el.style.opacity = 0;
    }, 50);
    setTimeout(() => el.remove(), 550);
}