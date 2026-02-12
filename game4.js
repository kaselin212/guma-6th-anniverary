const container = document.getElementById('game-container');
const hpText = document.getElementById('hp-text');
const hpFill = document.getElementById('baron-hp-fill');
const resultText = document.getElementById('result-text');
const levelEl = document.getElementById('level-val');

// 遊戲參數
let currentLevel = 1;
const MAX_LEVEL = 5;
let gameActive = false; // 按下開始前是 false
let isStealing = false; // 玩家是否正在發射技能

// 數值設定
let maxHp = 12000;
let currentHp = 12000;

// 玩家傷害 (法洛士蓄力 Q)
const PLAYER_DAMAGE = 1500; 

// 敵方打野重擊傷害 (隨關卡提升變準)
let ENEMY_SMITE_DAMAGE = 900; 
let enemyReactionSpeed = 0.8; // 敵方反應速度係數 (越小越快)

// 模擬變速扣血
let damageInterval;

// 初始化
resetLevel();

// 監聽按鍵 (空白鍵) 與 點擊
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isStealing && gameActive) {
        performSteal();
    }
});
container.addEventListener('mousedown', () => {
    if (!isStealing && gameActive) {
        performSteal();
    }
});

function resetLevel() {
    // 每一關難度提升
    // 關卡 1: 簡單，血扣得慢，敵人重擊爛
    // 關卡 5: 地獄，血扣超快，敵人重擊超準
    
    maxHp = 10000 + (currentLevel * 2000);
    currentHp = maxHp;
    updateHpUI();
    
    resultText.className = 'result-text'; // 清除結果樣式
    levelEl.innerText = currentLevel;
    
    isStealing = false;
    
    // 倒數 1 秒後開始掉血
    setTimeout(() => {
        gameActive = true;
        startDamageLoop();
    }, 1000);
}

function startDamageLoop() {
    if (!gameActive) return;

    // 模擬敵方團隊打巴龍 (Burst Damage Simulation)
    // 這裡我們不用固定的 setInterval，而是隨機時間扣隨機血
    // 模擬 "技能冷卻" 和 "集火"
    
    function damageTick() {
        if (!gameActive) return;

        // 隨機扣血量 (隨關卡變痛)
        // 基礎傷害 + 隨機爆發
        let damage = (Math.random() * 50 + 20) * (1 + currentLevel * 0.2);
        
        // 偶爾來個大爆發 (模擬隊友技能全交)
        if (Math.random() < 0.1) damage *= 5; 

        currentHp -= Math.floor(damage);
        updateHpUI();

        // --- 敵方打野重擊邏輯 (Enemy Smite AI) ---
        // 當血量進入敵方斬殺線 (900) 時，敵方打野會嘗試重擊
        // 但他有人類反應延遲 (Reaction Delay)
        if (currentHp <= ENEMY_SMITE_DAMAGE) {
            // 敵方嘗試重擊！
            // 這裡做一個機率判定：關卡越高，敵方越不會失誤
            const chanceToSmite = 0.5 + (currentLevel * 0.1); // 60% ~ 100%
            
            if (Math.random() < chanceToSmite) {
                // 敵方重擊成功 (但他反應需要時間)
                // 我們設定一個極短的延遲，如果你在這期間沒按，你就輸了
                setTimeout(() => {
                    if (gameActive) { // 如果玩家還沒搶到
                        currentHp = 0;
                        updateHpUI();
                        endGame(false); // 失敗
                    }
                }, Math.random() * 200 + (500 - currentLevel * 100)); // 延遲越來越短
            }
        }

        if (currentHp <= 0 && gameActive) {
            currentHp = 0;
            updateHpUI();
            endGame(false); // 被普通攻擊打死 (太慢了)
        }

        // 下一次扣血的時間間隔 (也是隨機的)
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

    // 2. 模擬飛行時間 (Travel Time) - 這是預判的關鍵！
    // 箭矢飛到巴龍身上需要時間 (例如 0.2 秒)
    const travelTime = 200; 

    // 動畫：飛上去
    arrow.animate([
        { bottom: '-100px' },
        { bottom: '50%' } // 飛到巴龍位置
    ], {
        duration: travelTime,
        easing: 'linear',
        fill: 'forwards'
    });

    // 3. 傷害判定 (在飛行時間結束後)
    setTimeout(() => {
        arrow.remove();
        
        if (!gameActive) return; // 如果飛行途中巴龍已經死了

        // 造成傷害
        currentHp -= PLAYER_DAMAGE;
        
        // 產生暴擊數字特效
        showFloatingText(PLAYER_DAMAGE);

        if (currentHp <= 0) {
            currentHp = 0;
            updateHpUI();
            endGame(true); // 搶奪成功！
        } else {
            // 沒搶到 (太早放了，傷害不夠致死)
            // 這裡不直接判輸，因為你可能還有機會(如果你攻速夠快? 但設定是一次機會)
            // 既然是一次機會，那就直接判輸
            endGame(false, "TOO EARLY!"); 
        }
    }, travelTime);
}

function updateHpUI() {
    hpText.innerText = Math.max(0, Math.floor(currentHp));
    const pct = (currentHp / maxHp) * 100;
    hpFill.style.width = pct + '%';
    
    // 受擊震動
    const boss = document.querySelector('.objective-boss');
    if (!boss.classList.contains('shake')) {
        boss.classList.add('shake');
        setTimeout(() => boss.classList.remove('shake'), 50);
    }
}

function endGame(success, failReason = "STOLEN BY ENEMY") {
    gameActive = false;
    
    if (success) {
        resultText.innerText = "STOLEN!";
        resultText.className = "result-text success";
        
        // 成功音效? (腦補)
        
        setTimeout(() => {
            if (currentLevel < MAX_LEVEL) {
                currentLevel++;
                resetLevel();
            } else {
                // 全部通關
                const modal = document.getElementById('victory-modal');
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('show'), 10);
            }
        }, 2000); // 2秒後下一關
        
    } else {
        resultText.innerText = failReason;
        resultText.className = "result-text fail";
        
        // 失敗，重試當前關卡
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
    el.style.left = '60%'; // 稍微偏右顯示
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