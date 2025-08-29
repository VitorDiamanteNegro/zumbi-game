// Elementos do DOM
const gameStartScreen = document.getElementById('gameStartScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const powerSelectionScreen = document.getElementById('powerSelectionScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const gameCanvas = document.getElementById('gameCanvas');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('level');
const zombiesCountDisplay = document.getElementById('zombiesCount');
const finalScoreDisplay = document.getElementById('finalScore');
const finalLevelDisplay = document.getElementById('finalLevel');
const levelReachedDisplay = document.getElementById('levelReached');
const powerOptions = document.querySelectorAll('.power-option');
const powerInfo = document.getElementById('powerInfo');
const fireLevelDisplay = document.getElementById('fire-level');
const lightningLevelDisplay = document.getElementById('lightning-level');
const freezeLevelDisplay = document.getElementById('freeze-level');

// Contexto do canvas
const ctx = gameCanvas.getContext('2d');

// Ajustar canvas para tela cheia
function resizeCanvas() {
    gameCanvas.width = window.innerWidth;
    gameCanvas.height = window.innerHeight;
}

// Variáveis do jogo
let score = 0;
let lives = 3;
let level = 1;
let zombies = [];
let bullets = [];
let specialAttacks = [];
let gameInterval;
let zombieSpawnInterval;
let lastTime = 0;
let isGameOver = false;
let worldOffset = { x: 0, y: 0 };
let keys = {};
let player = null;
let mapSize = 5000;
let zombiesKilledThisLevel = 0;
let zombiesNeededForNextLevel = 10;
let freezeTime = 0;

// Sistema de poderes acumulativos
let powers = {
    fire: { level: 0, damage: 1, radius: 100 },
    lightning: { level: 0, chains: 1, maxChains: 3 },
    freeze: { level: 0, duration: 5, cooldown: 0 }
};

// Classes do jogo
class Player {
    constructor() {
        this.x = mapSize / 2;
        this.y = mapSize / 2;
        this.width = 32;
        this.height = 48;
        this.speed = 5;
        this.color = '#3498db';
        this.direction = 0;
        this.lastShotTime = 0;
        this.shootCooldown = 200;
        this.lastFreezeTime = 0;
        this.freezeCooldown = 30000; // 30 segundos de cooldown para congelamento
    }
    
    update() {
        // Movimento
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            this.y -= this.speed;
            this.direction = 3;
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            this.y += this.speed;
            this.direction = 0;
        }
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            this.x -= this.speed;
            this.direction = 1;
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            this.x += this.speed;
            this.direction = 2;
        }
        
        // Limites do mapa
        this.x = Math.max(0, Math.min(mapSize - this.width, this.x));
        this.y = Math.max(0, Math.min(mapSize - this.height, this.y));
        
        // Atualizar offset da câmera
        worldOffset.x = this.x - gameCanvas.width / 2 + this.width / 2;
        worldOffset.y = this.y - gameCanvas.height / 2 + this.height / 2;
        
        // Atualizar cooldown do congelamento
        if (powers.freeze.level > 0 && Date.now() - this.lastFreezeTime > this.freezeCooldown) {
            powers.freeze.cooldown = 0;
        } else if (powers.freeze.cooldown > 0) {
            powers.freeze.cooldown = Math.max(0, this.freezeCooldown - (Date.now() - this.lastFreezeTime));
        }
    }
    
    draw() {
        const screenX = this.x - worldOffset.x;
        const screenY = this.y - worldOffset.y;
        
        // Desenhar personagem pixelizado
        ctx.fillStyle = '#21618C';
        ctx.fillRect(screenX + 8, screenY + 32, 5, 16);
        ctx.fillRect(screenX + 19, screenY + 32, 5, 16);
        
        ctx.fillStyle = '#3498DB';
        ctx.fillRect(screenX + 6, screenY + 16, 20, 16);
        ctx.fillRect(screenX + 10, screenY + 6, 12, 12);
        
        ctx.fillStyle = '#21618C';
        if (this.direction === 1) {
            ctx.fillRect(screenX, screenY + 16, 6, 5);
            ctx.fillRect(screenX + 26, screenY + 20, 6, 5);
        } else if (this.direction === 2) {
            ctx.fillRect(screenX, screenY + 20, 6, 5);
            ctx.fillRect(screenX + 26, screenY + 16, 6, 5);
        } else {
            ctx.fillRect(screenX, screenY + 20, 6, 5);
            ctx.fillRect(screenX + 26, screenY + 20, 6, 5);
        }
        
        if (Date.now() - this.lastShotTime < 100) {
            ctx.fillStyle = '#777';
            if (this.direction === 1) {
                ctx.fillRect(screenX - 8, screenY + 18, 8, 3);
            } else if (this.direction === 2) {
                ctx.fillRect(screenX + 32, screenY + 18, 8, 3);
            } else if (this.direction === 3) {
                ctx.fillRect(screenX + 12, screenY - 8, 3, 8);
            } else {
                ctx.fillRect(screenX + 15, screenY + 48, 3, 8);
            }
        }
        
        ctx.fillStyle = '#FFF';
        ctx.fillRect(screenX + 12, screenY + 10, 2, 2);
        ctx.fillRect(screenX + 18, screenY + 10, 2, 2);
        
        if (this.direction === 0) {
            ctx.fillRect(screenX + 14, screenY + 16, 4, 1);
        } else if (this.direction === 3) {
            ctx.fillRect(screenX + 14, screenY + 14, 4, 1);
        } else {
            ctx.fillRect(screenX + 14, screenY + 15, 4, 1);
        }
        
        // Desenhar indicador de poderes ativos
        this.drawActivePowers(screenX, screenY);
    }
    
    drawActivePowers(x, y) {
        // Desenhar ícones de poderes ativos acima do personagem
        let powerCount = 0;
        
        if (powers.fire.level > 0) {
            ctx.fillStyle = '#ff5500';
            ctx.beginPath();
            ctx.arc(x + this.width/2, y - 15 - (powerCount * 8), 4, 0, Math.PI * 2);
            ctx.fill();
            powerCount++;
        }
        
        if (powers.lightning.level > 0) {
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(x + this.width/2, y - 15 - (powerCount * 8), 4, 0, Math.PI * 2);
            ctx.fill();
            powerCount++;
        }
        
        if (powers.freeze.level > 0) {
            ctx.fillStyle = '#00aaff';
            ctx.beginPath();
            ctx.arc(x + this.width/2, y - 15 - (powerCount * 8), 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    useFreezePower() {
        if (powers.freeze.level > 0 && powers.freeze.cooldown === 0) {
            // Congelar todos os zumbis
            for (const zombie of zombies) {
                zombie.isFrozen = true;
                zombie.frozenTime = 0;
                zombie.color = '#00aaff';
            }
            
            this.lastFreezeTime = Date.now();
            powers.freeze.cooldown = this.freezeCooldown;
            
            // Efeito visual de congelamento
            this.createFreezeEffect();
            
            return true;
        }
        return false;
    }
    
    createFreezeEffect() {
        // Criar efeito visual de congelamento
        const effect = {
            x: this.x,
            y: this.y,
            radius: 0,
            maxRadius: 500,
            color: '#00aaff',
            alpha: 0.5,
            update: function() {
                this.radius += 20;
                this.alpha -= 0.02;
                return this.radius < this.maxRadius && this.alpha > 0;
            },
            draw: function() {
                const screenX = this.x - worldOffset.x;
                const screenY = this.y - worldOffset.y;
                
                ctx.globalAlpha = this.alpha;
                ctx.beginPath();
                ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        };
        
        // Adicionar efeito à lista de efeitos especiais
        specialAttacks.push(effect);
    }
}

class Zombie {
    constructor() {
        this.width = 30;
        this.height = 30;
        
        let side = Math.floor(Math.random() * 4);
        let spawnX, spawnY;
        
        switch(side) {
            case 0: spawnX = Math.random() * mapSize; spawnY = -this.height; break;
            case 1: spawnX = mapSize; spawnY = Math.random() * mapSize; break;
            case 2: spawnX = Math.random() * mapSize; spawnY = mapSize; break;
            case 3: spawnX = -this.width; spawnY = Math.random() * mapSize; break;
        }
        
        this.x = spawnX;
        this.y = spawnY;
        this.speed = 1 + Math.random() * 1.5 + (level * 0.2);
        this.color = `hsl(${Math.random() * 60}, 100%, 30%)`;
        this.isFrozen = false;
        this.frozenTime = 0;
        this.health = 1 + Math.floor(level / 3); // Zumbis ficam mais fortes a cada 3 níveis
    }
    
    update() {
        if (this.isFrozen) {
            this.frozenTime++;
            if (this.frozenTime > 300) {
                this.isFrozen = false;
                this.frozenTime = 0;
                this.color = `hsl(${Math.random() * 60}, 100%, 30%)`;
            }
            return;
        }
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
        
        if (
            this.x < player.x + player.width &&
            this.x + this.width > player.x &&
            this.y < player.y + player.height &&
            this.y + this.height > player.y
        ) {
            lives--;
            livesDisplay.textContent = lives;
            zombies.splice(zombies.indexOf(this), 1);
            zombiesCountDisplay.textContent = zombies.length;
            
            if (lives <= 0) {
                endGame();
            }
        }
    }
    
    draw() {
        const screenX = this.x - worldOffset.x;
        const screenY = this.y - worldOffset.y;
        
        if (
            screenX + this.width > 0 && 
            screenX < gameCanvas.width &&
            screenY + this.height > 0 && 
            screenY < gameCanvas.height
        ) {
            ctx.fillStyle = this.isFrozen ? '#00aaff' : this.color;
            ctx.fillRect(screenX, screenY, this.width, this.height);
            
            ctx.fillStyle = this.isFrozen ? '#ffffff' : '#000';
            ctx.fillRect(screenX + 5, screenY + 7, 5, 5);
            ctx.fillRect(screenX + 20, screenY + 7, 5, 5);
            ctx.fillRect(screenX + 10, screenY + 20, 10, 3);
            
            // Barra de vida para zumbis com mais de 1 de saúde
            if (this.health > 1) {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(screenX, screenY - 5, this.width, 3);
                
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(screenX, screenY - 5, (this.width * (this.health / (1 + Math.floor(level / 3)))), 3);
            }
        }
    }
    
    takeDamage(amount = 1) {
        this.health -= amount;
        return this.health <= 0;
    }
}

class Bullet {
    constructor(x, y, targetX, targetY, powerType = null) {
        this.x = x;
        this.y = y;
        
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.dx = (dx / dist) * 10;
        this.dy = (dy / dist) * 10;
        this.powerType = powerType;
        this.distance = 0;
        this.maxDistance = 300;
        
        // Configurações baseadas no poder
        if (powerType === 'fire') {
            this.radius = 8;
            this.color = '#ff5500';
            this.damage = powers.fire.damage;
            this.explosionRadius = powers.fire.radius;
        } else if (powerType === 'lightning') {
            this.radius = 6;
            this.color = '#ffff00';
            this.chains = powers.lightning.chains;
            this.chainHits = 0;
            this.chainTargets = [];
        } else {
            this.radius = 5;
            this.color = '#ffff00';
        }
    }
    
    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.distance += Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        
        if (this.distance > this.maxDistance) {
            return true;
        }
        
        for (let i = zombies.length - 1; i >= 0; i--) {
            const zombie = zombies[i];
            if (
                this.x > zombie.x &&
                this.x < zombie.x + zombie.width &&
                this.y > zombie.y &&
                this.y < zombie.y + zombie.height
            ) {
                if (this.powerType) {
                    this.handleSpecialPower(zombie, i);
                } else {
                    if (zombie.takeDamage()) {
                        zombies.splice(i, 1);
                        score += 10;
                        zombiesKilledThisLevel++;
                    }
                }
                
                scoreDisplay.textContent = score;
                zombiesCountDisplay.textContent = zombies.length;
                
                if (zombiesKilledThisLevel >= zombiesNeededForNextLevel) {
                    levelUp();
                }
                
                if (!this.powerType || this.powerType === 'fire') {
                    return true;
                }
                
                if (this.powerType === 'lightning') {
                    this.chainHits++;
                    this.chainTargets.push(zombie);
                    
                    if (this.chainHits >= this.chains) {
                        return true;
                    }
                    
                    // Encontrar próximo alvo para a corrente
                    let nextZombie = null;
                    let minDist = Infinity;
                    
                    for (const otherZombie of zombies) {
                        if (!this.chainTargets.includes(otherZombie)) {
                            const dist = Math.sqrt(
                                Math.pow(otherZombie.x - zombie.x, 2) + 
                                Math.pow(otherZombie.y - zombie.y, 2)
                            );
                            
                            if (dist < minDist) {
                                minDist = dist;
                                nextZombie = otherZombie;
                            }
                        }
                    }
                    
                    if (nextZombie) {
                        // Redirecionar para o próximo zumbi
                        const dx = nextZombie.x - this.x;
                        const dy = nextZombie.y - this.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        this.dx = (dx / dist) * 10;
                        this.dy = (dy / dist) * 10;
                    } else {
                        return true;
                    }
                }
                
                break;
            }
        }
        
        return false;
    }
    
    handleSpecialPower(zombie, index) {
        switch(this.powerType) {
            case 'fire':
                // Explosão de fogo
                for (let j = zombies.length - 1; j >= 0; j--) {
                    const otherZombie = zombies[j];
                    const dist = Math.sqrt(
                        Math.pow(otherZombie.x - zombie.x, 2) + 
                        Math.pow(otherZombie.y - zombie.y, 2)
                    );
                    
                    if (dist < this.explosionRadius) {
                        if (otherZombie.takeDamage(this.damage)) {
                            zombies.splice(j, 1);
                            score += 10;
                            zombiesKilledThisLevel++;
                        }
                    }
                }
                
                // Efeito visual de explosão
                this.createExplosionEffect();
                return true;
                
            case 'lightning':
                if (zombie.takeDamage()) {
                    zombies.splice(index, 1);
                    score += 10;
                    zombiesKilledThisLevel++;
                }
                break;
        }
    }
    
    createExplosionEffect() {
        const effect = {
            x: this.x,
            y: this.y,
            radius: 0,
            maxRadius: this.explosionRadius,
            color: '#ff5500',
            alpha: 0.7,
            update: function() {
                this.radius += 10;
                this.alpha -= 0.05;
                return this.radius < this.maxRadius && this.alpha > 0;
            },
            draw: function() {
                const screenX = this.x - worldOffset.x;
                const screenY = this.y - worldOffset.y;
                
                ctx.globalAlpha = this.alpha;
                ctx.beginPath();
                ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        };
        
        specialAttacks.push(effect);
    }
    
    draw() {
        const screenX = this.x - worldOffset.x;
        const screenY = this.y - worldOffset.y;
        
        if (
            screenX + this.radius > 0 && 
            screenX - this.radius < gameCanvas.width &&
            screenY + this.radius > 0 && 
            screenY - this.radius < gameCanvas.height
        ) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            if (this.powerType === 'fire') {
                ctx.fillStyle = 'rgba(255, 150, 0, 0.5)';
                ctx.beginPath();
                ctx.arc(screenX, screenY, this.radius + 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.powerType === 'lightning') {
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(screenX, screenY, this.radius + 2, 0, Math.PI * 2);
                ctx.stroke();
                
                // Desenhar efeito de raio
                if (this.chainTargets.length > 0) {
                    const lastTarget = this.chainTargets[this.chainTargets.length - 1];
                    const targetX = lastTarget.x + lastTarget.width/2 - worldOffset.x;
                    const targetY = lastTarget.y + lastTarget.height/2 - worldOffset.y;
                    
                    ctx.beginPath();
                    ctx.moveTo(screenX, screenY);
                    ctx.lineTo(targetX, targetY);
                    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
        }
    }
}

// Funções do jogo
function startGame() {
    gameStartScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    powerSelectionScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    score = 0;
    lives = 3;
    level = 1;
    zombies = [];
    bullets = [];
    specialAttacks = [];
    isGameOver = false;
    worldOffset = { x: 0, y: 0 };
    zombiesKilledThisLevel = 0;
    zombiesNeededForNextLevel = 10;
    freezeTime = 0;
    
    // Resetar poderes
    powers = {
        fire: { level: 0, damage: 1, radius: 100 },
        lightning: { level: 0, chains: 1, maxChains: 3 },
        freeze: { level: 0, duration: 5, cooldown: 0 }
    };
    
    player = new Player();
    
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    levelDisplay.textContent = level;
    zombiesCountDisplay.textContent = zombies.length;
    updatePowerInfo();
    updatePowerLevels();
    
    lastTime = performance.now();
    gameInterval = requestAnimationFrame(gameLoop);
    zombieSpawnInterval = setInterval(spawnZombie, 1000);
}

function endGame() {
    isGameOver = true;
    cancelAnimationFrame(gameInterval);
    clearInterval(zombieSpawnInterval);
    
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    finalScoreDisplay.textContent = score;
    finalLevelDisplay.textContent = level;
}

function spawnZombie() {
    if (isGameOver) return;
    
    const zombiesToSpawn = Math.min(level, 10);
    
    for (let i = 0; i < zombiesToSpawn; i++) {
        zombies.push(new Zombie());
    }
    
    zombiesCountDisplay.textContent = zombies.length;
}

function shoot(event) {
    if (isGameOver) return;
    
    const rect = gameCanvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left + worldOffset.x;
    const mouseY = event.clientY - rect.top + worldOffset.y;
    
    const dx = mouseX - (player.x + player.width/2);
    const dy = mouseY - (player.y + player.height/2);
    
    if (Math.abs(dx) > Math.abs(dy)) {
        player.direction = dx > 0 ? 2 : 1;
    } else {
        player.direction = dy > 0 ? 0 : 3;
    }
    
    player.lastShotTime = Date.now();
    
    // Verificar se é para usar poder de congelamento (botão direito)
    if (event.button === 2 && player.useFreezePower()) {
        updatePowerInfo();
        return;
    }
    
    // Escolher aleatoriamente qual poder usar baseado nos níveis
    let powerToUse = null;
    const powerChances = [];
    
    if (powers.fire.level > 0) {
        powerChances.push({ power: 'fire', chance: powers.fire.level * 0.2 });
    }
    
    if (powers.lightning.level > 0) {
        powerChances.push({ power: 'lightning', chance: powers.lightning.level * 0.2 });
    }
    
    if (powerChances.length > 0) {
        const totalChance = powerChances.reduce((sum, p) => sum + p.chance, 0);
        const random = Math.random() * totalChance;
        
        let accumulated = 0;
        for (const power of powerChances) {
            accumulated += power.chance;
            if (random <= accumulated) {
                powerToUse = power.power;
                break;
            }
        }
    }
    
    bullets.push(new Bullet(
        player.x + player.width / 2, 
        player.y + player.height / 2,
        mouseX,
        mouseY,
        powerToUse
    ));
}

function levelUp() {
    level++;
    zombiesKilledThisLevel = 0;
    zombiesNeededForNextLevel = 10 + (level * 2);
    levelDisplay.textContent = level;
    
    if (level % 5 === 0) {
        showPowerSelection();
    }
}

function showPowerSelection() {
    cancelAnimationFrame(gameInterval);
    clearInterval(zombieSpawnInterval);
    
    levelReachedDisplay.textContent = level;
    powerSelectionScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
}

function selectPower(powerType) {
    // Aumentar nível do poder selecionado
    powers[powerType].level++;
    
    // Melhorar atributos do poder baseado no nível
    switch(powerType) {
        case 'fire':
            powers.fire.damage = 1 + Math.floor(powers.fire.level / 2);
            powers.fire.radius = 100 + (powers.fire.level * 20);
            break;
        case 'lightning':
            powers.lightning.chains = Math.min(1 + powers.lightning.level, powers.lightning.maxChains);
            break;
        case 'freeze':
            powers.freeze.duration = 5 + (powers.freeze.level * 2);
            break;
    }
    
    updatePowerLevels();
    updatePowerInfo();
    powerSelectionScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    lastTime = performance.now();
    gameInterval = requestAnimationFrame(gameLoop);
    zombieSpawnInterval = setInterval(spawnZombie, 1000);
}

function updatePowerInfo() {
    let powerText = "PODER: ";
    const activePowers = [];
    
    if (powers.fire.level > 0) {
        activePowers.push(`Fogo Nv.${powers.fire.level}`);
    }
    
    if (powers.lightning.level > 0) {
        activePowers.push(`Raio Nv.${powers.lightning.level}`);
    }
    
    if (powers.freeze.level > 0) {
        const cooldownText = powers.freeze.cooldown > 0 ? 
            ` (Recarregando: ${Math.ceil(powers.freeze.cooldown / 1000)}s)` : 
            " (Pronto)";
        activePowers.push(`Congelamento Nv.${powers.freeze.level}${cooldownText}`);
    }
    
    if (activePowers.length > 0) {
        powerText += activePowers.join(" | ");
    } else {
        powerText += "NENHUM";
    }
    
    powerInfo.textContent = powerText;
}

function updatePowerLevels() {
    fireLevelDisplay.textContent = powers.fire.level;
    lightningLevelDisplay.textContent = powers.lightning.level;
    freezeLevelDisplay.textContent = powers.freeze.level;
}

function gameLoop(timestamp) {
    if (isGameOver) return;
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // Desenhar grade de fundo
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    const gridSize = 100;
    const startX = -worldOffset.x % gridSize;
    const startY = -worldOffset.y % gridSize;
    
    for (let x = startX; x < gameCanvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, gameCanvas.height);
        ctx.stroke();
    }
    
    for (let y = startY; y < gameCanvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(gameCanvas.width, y);
        ctx.stroke();
    }
    
    // Atualizar e desenhar jogador
    player.update();
    player.draw();
    
    // Atualizar e desenhar zumbis
    for (let i = zombies.length - 1; i >= 0; i--) {
        zombies[i].update();
        zombies[i].draw();
    }
    
    // Atualizar e desenhar balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        const shouldRemove = bullets[i].update();
        if (shouldRemove) {
            bullets.splice(i, 1);
        } else {
            bullets[i].draw();
        }
    }
    
    // Atualizar e desenhar efeitos especiais
    for (let i = specialAttacks.length - 1; i >= 0; i--) {
        const shouldRemove = !specialAttacks[i].update();
        if (shouldRemove) {
            specialAttacks.splice(i, 1);
        } else {
            specialAttacks[i].draw();
        }
    }
    
    // Atualizar cooldown do congelamento
    if (powers.freeze.level > 0 && powers.freeze.cooldown > 0) {
        powers.freeze.cooldown = Math.max(0, player.freezeCooldown - (Date.now() - player.lastFreezeTime));
        updatePowerInfo();
    }
    
    gameInterval = requestAnimationFrame(gameLoop);
}

// Event listeners
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
gameCanvas.addEventListener('click', shoot);
gameCanvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Prevenir menu de contexto
    shoot(e);
});

// Controles de teclado
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // Tecla Q para poder de congelamento
    if (e.key === 'q' || e.key === 'Q') {
        if (player.useFreezePower()) {
            updatePowerInfo();
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Seleção de poderes
powerOptions.forEach(option => {
    option.addEventListener('click', () => {
        selectPower(option.dataset.power);
    });
});

// Redimensionar canvas
window.addEventListener('resize', resizeCanvas);

// Inicializar
resizeCanvas();

// Desenhar indicador de poderes ativos na tela
function drawActivePowersHUD() {
    const container = document.createElement('div');
    container.className = 'active-powers';
    container.innerHTML = `
        <div class="power-indicator">
            <div class="power-icon fire-icon"></div>
            <span>Fogo: Nv.${powers.fire.level}</span>
            <div class="power-level-badge">${powers.fire.level}</div>
        </div>
        <div class="power-indicator">
            <div class="power-icon lightning-icon"></div>
            <span>Raio: Nv.${powers.lightning.level}</span>
            <div class="power-level-badge">${powers.lightning.level}</div>
        </div>
        <div class="power-indicator">
            <div class="power-icon freeze-icon"></div>
            <span>Congelamento: Nv.${powers.freeze.level}</span>
            <div class="power-level-badge">${powers.freeze.level}</div>
        </div>
    `;
    
    // Remover HUD anterior se existir
    const oldHUD = document.querySelector('.active-powers');
    if (oldHUD) {
        oldHUD.remove();
    }
    
    document.body.appendChild(container);
}

// Atualizar HUD de poderes
setInterval(drawActivePowersHUD, 1000);