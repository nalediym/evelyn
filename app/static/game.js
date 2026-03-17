/**
 * Evelyn Dream Engine — Platformer
 *
 * Side-scrolling platformer with Mario vibes.
 * WASD/arrows to move, space/up/W to jump.
 * Collect dream fragments, dodge hazards, reach the portal.
 */

const W = 640;
const H = 480;
const GROUND_Y = H - 40;
const PLAYER_SPEED = 220;
const JUMP_VELOCITY = -420;

let gameData = null;

// ── load game data then boot Phaser ──────────────────────────

async function init() {
  const stored = sessionStorage.getItem("evelyn_game");
  if (stored) {
    gameData = JSON.parse(stored);
    sessionStorage.removeItem("evelyn_game");
  } else {
    const gameId = window.location.pathname.split("/").pop();
    try {
      const res = await fetch(`/api/games/${gameId}/generate`, { method: "POST" });
      if (res.ok) gameData = await res.json();
    } catch (e) {
      console.error("Failed to load game:", e);
    }
  }

  if (!gameData || !gameData.scenes || !gameData.scenes.length) {
    document.getElementById("game-title").textContent = "Dream not found";
    document.getElementById("scene-description").textContent =
      "This dream hasn't been generated yet. Go back and enter through the portal.";
    return;
  }

  document.getElementById("game-title").textContent = gameData.title;
  const meta = [];
  if (gameData.genre) meta.push(gameData.genre);
  if (gameData.mood) meta.push(gameData.mood.join(" / "));
  if (gameData.player_name) meta.push(`dreamed for ${gameData.player_name}`);
  document.getElementById("game-meta").textContent = meta.join(" \u2022 ");

  new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: "game-canvas",
    backgroundColor: "#0a0a0f",
    physics: {
      default: "arcade",
      arcade: { gravity: { y: 900 }, debug: false },
    },
    scene: [PlatformerScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    },
  });
}

// ── textures ─────────────────────────────────────────────────

function makeTextures(scene) {
  // Player - a chunky little character
  const pg = scene.add.graphics();
  // Body
  pg.fillStyle(0xa78bfa);
  pg.fillRoundedRect(4, 8, 24, 24, 4);
  // Head
  pg.fillStyle(0xc4b5fd);
  pg.fillRoundedRect(6, 0, 20, 14, 6);
  // Eyes
  pg.fillStyle(0xffffff);
  pg.fillCircle(14, 6, 3);
  pg.fillCircle(22, 6, 3);
  pg.fillStyle(0x1a1a2e);
  pg.fillCircle(15, 6, 1.5);
  pg.fillCircle(23, 6, 1.5);
  // Feet
  pg.fillStyle(0x7c5cbf);
  pg.fillRoundedRect(4, 30, 10, 6, 2);
  pg.fillRoundedRect(18, 30, 10, 6, 2);
  pg.generateTexture("player", 32, 36);
  pg.destroy();

  // Coin / collectible
  const cg = scene.add.graphics();
  cg.fillStyle(0xf4a261);
  cg.fillCircle(10, 10, 10);
  cg.fillStyle(0xffffff, 0.5);
  cg.fillCircle(8, 7, 3);
  cg.generateTexture("coin", 20, 20);
  cg.destroy();

  // Platform block
  const bg = scene.add.graphics();
  bg.fillStyle(0x3a3a5c);
  bg.fillRoundedRect(0, 0, 32, 32, 3);
  bg.lineStyle(1, 0x5a5a8c, 0.5);
  bg.strokeRoundedRect(0, 0, 32, 32, 3);
  bg.fillStyle(0x4a4a6c, 0.3);
  bg.fillRect(2, 2, 28, 2);
  bg.generateTexture("block", 32, 32);
  bg.destroy();

  // Ground block
  const gg = scene.add.graphics();
  gg.fillStyle(0x2a4a3a);
  gg.fillRect(0, 0, 32, 32);
  gg.fillStyle(0x3a6a4a);
  gg.fillRect(0, 0, 32, 6);
  gg.lineStyle(1, 0x1a3a2a, 0.3);
  gg.strokeRect(0, 0, 32, 32);
  gg.generateTexture("ground", 32, 32);
  gg.destroy();

  // Hazard (spiky)
  const hg = scene.add.graphics();
  hg.fillStyle(0xe76f51);
  hg.beginPath();
  hg.moveTo(0, 20);
  hg.lineTo(6, 4);
  hg.lineTo(12, 20);
  hg.lineTo(18, 2);
  hg.lineTo(24, 20);
  hg.closePath();
  hg.fillPath();
  hg.generateTexture("hazard", 24, 20);
  hg.destroy();

  // Portal
  const portalG = scene.add.graphics();
  portalG.lineStyle(3, 0xa78bfa, 0.8);
  portalG.strokeCircle(20, 24, 18);
  portalG.lineStyle(2, 0xc4b5fd, 0.5);
  portalG.strokeCircle(20, 24, 10);
  portalG.fillStyle(0xa78bfa, 0.25);
  portalG.fillCircle(20, 24, 8);
  portalG.generateTexture("portal", 40, 48);
  portalG.destroy();

  // Enemy - a little walking blob
  const eg = scene.add.graphics();
  eg.fillStyle(0xe76f51);
  eg.fillRoundedRect(2, 6, 20, 18, 6);
  eg.fillStyle(0xffffff);
  eg.fillCircle(9, 12, 3);
  eg.fillCircle(17, 12, 3);
  eg.fillStyle(0x1a1a2e);
  eg.fillCircle(10, 12, 1.5);
  eg.fillCircle(18, 12, 1.5);
  eg.fillStyle(0xc04a31);
  eg.fillRoundedRect(2, 22, 8, 4, 2);
  eg.fillRoundedRect(14, 22, 8, 4, 2);
  eg.generateTexture("enemy", 24, 28);
  eg.destroy();
}

// ── main scene ───────────────────────────────────────────────

class PlatformerScene extends Phaser.Scene {
  constructor() {
    super({ key: "PlatformerScene" });
    this.sceneIndex = 0;
    this.score = 0;
    this.lives = 3;
    this.transitioning = false;
    this.facingRight = true;
  }

  create() {
    makeTextures(this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    // Score + lives display
    this.scoreText = this.add
      .text(16, 12, "0", {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#f4a261",
      })
      .setDepth(100)
      .setScrollFactor(0);

    this.livesText = this.add
      .text(W - 16, 12, "\u2665 \u2665 \u2665", {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "18px",
        color: "#e76f51",
      })
      .setOrigin(1, 0)
      .setDepth(100)
      .setScrollFactor(0);

    this.sceneLabel = this.add
      .text(W / 2, 12, "", {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "12px",
        color: "rgba(255,255,255,0.4)",
      })
      .setOrigin(0.5, 0)
      .setDepth(100)
      .setScrollFactor(0);

    this.loadLevel(0);
  }

  loadLevel(index) {
    if (index >= gameData.scenes.length) {
      this.showWin();
      return;
    }

    this.sceneIndex = index;
    this.transitioning = true;

    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => {
      this.buildLevel(gameData.scenes[index]);
      this.cameras.main.fadeIn(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        this.transitioning = false;
      });
    });
  }

  buildLevel(sceneData) {
    // Clear old level objects
    if (this.levelGroup) this.levelGroup.destroy(true);
    this.levelGroup = this.add.group();

    // Background
    const bgColor = Phaser.Display.Color.HexStringToColor(
      sceneData.background_color || "#12121a"
    );
    this.cameras.main.setBackgroundColor(bgColor.color);

    // Scene name watermark
    const watermark = this.add
      .text(W / 2, H / 2 - 60, sceneData.name, {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "48px",
        fontStyle: "bold",
        color: "rgba(255,255,255,0.04)",
      })
      .setOrigin(0.5);
    this.levelGroup.add(watermark);

    // Dream dust
    this.spawnDust(sceneData);

    // Ground
    this.groundGroup = this.physics.add.staticGroup();
    for (let x = 0; x < W; x += 32) {
      const g = this.groundGroup.create(x + 16, GROUND_Y + 16, "ground");
      g.refreshBody();
      this.levelGroup.add(g);
    }
    // Bottom fill
    for (let x = 0; x < W; x += 32) {
      const g2 = this.add.image(x + 16, GROUND_Y + 48, "ground");
      this.levelGroup.add(g2);
    }

    // Platforms
    this.platformGroup = this.physics.add.staticGroup();
    const platforms = sceneData.platforms || this.generatePlatforms(sceneData);
    platforms.forEach((p) => {
      for (let j = 0; j < p.width; j++) {
        const block = this.platformGroup.create(
          p.x + j * 32 + 16,
          p.y + 16,
          "block"
        );
        block.refreshBody();
        this.levelGroup.add(block);
      }
    });

    // Collectibles
    this.coinGroup = this.physics.add.group();
    const collectibles = sceneData.objects || [];
    collectibles.forEach((obj) => {
      const cx = Phaser.Math.Clamp(obj.x, 30, W - 30);
      const cy = Phaser.Math.Clamp(obj.y, 30, GROUND_Y - 30);
      const coin = this.coinGroup.create(cx, cy, "coin");
      coin.body.setAllowGravity(false);
      coin.setData("objData", obj);
      this.levelGroup.add(coin);

      // Bob up and down
      this.tweens.add({
        targets: coin,
        y: cy - 8,
        duration: 800 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });

    // Enemies
    this.enemyGroup = this.physics.add.group();
    const enemies = sceneData.enemies || this.generateEnemies(sceneData);
    enemies.forEach((e) => {
      const enemy = this.enemyGroup.create(e.x, e.y, "enemy");
      enemy.body.setCollideWorldBounds(false);
      enemy.body.setBounce(0);
      enemy.setData("patrolLeft", e.x - (e.range || 60));
      enemy.setData("patrolRight", e.x + (e.range || 60));
      enemy.setData("speed", e.speed || 60);
      enemy.body.setVelocityX(e.speed || 60);
      this.levelGroup.add(enemy);
    });

    // Portal (end of level)
    this.portal = this.physics.add.sprite(W - 60, GROUND_Y - 30, "portal");
    this.portal.body.setAllowGravity(false);
    this.portal.body.setImmovable(true);
    this.levelGroup.add(this.portal);

    this.tweens.add({
      targets: this.portal,
      angle: 360,
      duration: 3000,
      repeat: -1,
      ease: "Linear",
    });
    this.tweens.add({
      targets: this.portal,
      scale: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Player
    if (this.player) this.player.destroy();
    this.player = this.physics.add.sprite(50, GROUND_Y - 40, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);
    this.player.body.setSize(20, 32);
    this.player.body.setOffset(6, 4);
    this.player.setDepth(50);

    // Collisions
    this.physics.add.collider(this.player, this.groundGroup);
    this.physics.add.collider(this.player, this.platformGroup);
    this.physics.add.collider(this.enemyGroup, this.groundGroup);
    this.physics.add.collider(this.enemyGroup, this.platformGroup);

    // Overlaps
    this.physics.add.overlap(this.player, this.coinGroup, this.collectCoin, null, this);
    this.physics.add.overlap(this.player, this.portal, this.reachPortal, null, this);
    this.physics.add.overlap(this.player, this.enemyGroup, this.hitEnemy, null, this);

    // Update HUD
    this.sceneLabel.setText(
      `${sceneData.name} (${this.sceneIndex + 1}/${gameData.scenes.length})`
    );
    document.getElementById("scene-description").textContent = sceneData.description;
    document.getElementById("interaction-text").textContent = "";
  }

  generatePlatforms(sceneData) {
    const seed = sceneData.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = mulberry32(seed);
    const platforms = [];
    const count = 4 + Math.floor(rng() * 3);

    for (let i = 0; i < count; i++) {
      platforms.push({
        x: 60 + rng() * (W - 200),
        y: 120 + rng() * (GROUND_Y - 200),
        width: 2 + Math.floor(rng() * 4),
      });
    }
    return platforms;
  }

  generateEnemies(sceneData) {
    const seed =
      sceneData.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + 999;
    const rng = mulberry32(seed);
    const enemies = [];
    const count = 1 + Math.floor(rng() * 2);

    for (let i = 0; i < count; i++) {
      enemies.push({
        x: 200 + rng() * (W - 300),
        y: GROUND_Y - 24,
        range: 40 + rng() * 80,
        speed: 40 + rng() * 50,
      });
    }
    return enemies;
  }

  spawnDust(sceneData) {
    const seed = sceneData.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = mulberry32(seed);

    for (let i = 0; i < 25; i++) {
      const x = rng() * W;
      const y = rng() * (GROUND_Y - 40);
      const r = rng() * 2 + 0.5;
      const alpha = rng() * 0.3 + 0.05;
      const dot = this.add.circle(x, y, r, 0xffffff, alpha);
      this.levelGroup.add(dot);

      this.tweens.add({
        targets: dot,
        y: y - 20 - rng() * 30,
        alpha: 0,
        duration: 3000 + rng() * 4000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  collectCoin(player, coin) {
    const data = coin.getData("objData");
    if (data) {
      document.getElementById("interaction-text").textContent = data.interaction;
    }

    this.score += 100;
    this.scoreText.setText(this.score.toString());

    // Pop effect
    const pop = this.add
      .text(coin.x, coin.y - 10, "+100", {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#f4a261",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: pop,
      y: pop.y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => pop.destroy(),
    });

    coin.destroy();
    this.cameras.main.flash(100, 244, 162, 97, false);
  }

  hitEnemy(player, enemy) {
    // If player is falling onto enemy, destroy enemy (Mario stomp)
    if (player.body.velocity.y > 0 && player.y < enemy.y - 10) {
      this.score += 200;
      this.scoreText.setText(this.score.toString());

      // Bounce player up
      player.setVelocityY(JUMP_VELOCITY * 0.6);

      // Pop effect
      const pop = this.add
        .text(enemy.x, enemy.y - 10, "+200", {
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "14px",
          fontStyle: "bold",
          color: "#e76f51",
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: pop,
        y: pop.y - 30,
        alpha: 0,
        duration: 600,
        onComplete: () => pop.destroy(),
      });

      // Squish enemy
      this.tweens.add({
        targets: enemy,
        scaleY: 0,
        scaleX: 1.5,
        duration: 150,
        onComplete: () => enemy.destroy(),
      });
    } else {
      // Player takes damage
      this.takeDamage();
    }
  }

  takeDamage() {
    if (this.player.getData("invincible")) return;

    this.lives--;
    this.livesText.setText("\u2665 ".repeat(this.lives).trim());

    if (this.lives <= 0) {
      this.showGameOver();
      return;
    }

    // Invincibility frames
    this.player.setData("invincible", true);
    this.player.setVelocityY(JUMP_VELOCITY * 0.5);

    // Flash player
    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 10,
      onComplete: () => {
        this.player.setAlpha(1);
        this.player.setData("invincible", false);
      },
    });

    this.cameras.main.shake(200, 0.01);
    this.cameras.main.flash(200, 231, 111, 81, false);
  }

  reachPortal(player, portal) {
    if (this.transitioning) return;

    // Next level!
    this.score += 500;
    this.scoreText.setText(this.score.toString());

    const pop = this.add
      .text(portal.x, portal.y - 20, "CLEAR!", {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#a78bfa",
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.tweens.add({
      targets: pop,
      y: pop.y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => pop.destroy(),
    });

    this.loadLevel(this.sceneIndex + 1);
  }

  showWin() {
    this.transitioning = true;
    if (this.player) {
      this.player.setVelocity(0, 0);
      this.player.body.enable = false;
    }

    const overlay = this.add
      .rectangle(W / 2, H / 2, W, H, 0x0a0a0f, 0)
      .setDepth(200);
    this.tweens.add({ targets: overlay, alpha: 0.9, duration: 800 });

    const title = this.add
      .text(W / 2, H / 2 - 50, "You woke up.", {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "36px",
        fontStyle: "bold",
        color: "#a78bfa",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(201);

    const scoreLabel = this.add
      .text(W / 2, H / 2, `Score: ${this.score}`, {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "20px",
        color: "#f4a261",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(201);

    const sub = this.add
      .text(
        W / 2,
        H / 2 + 40,
        `This dream was made for ${gameData.player_name || "you"}.\nNo one else will ever play it this way.`,
        {
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          color: "#8888a0",
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(201);

    this.tweens.add({
      targets: title, alpha: 1, y: H / 2 - 60,
      duration: 600, delay: 400, ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: scoreLabel, alpha: 1, duration: 600, delay: 800,
    });
    this.tweens.add({
      targets: sub, alpha: 1, duration: 600, delay: 1200,
    });

    document.getElementById("scene-description").textContent =
      "The dream ends. But it was yours, and yours alone.";
  }

  showGameOver() {
    this.transitioning = true;
    this.player.setVelocity(0, 0);
    this.player.body.enable = false;

    const overlay = this.add
      .rectangle(W / 2, H / 2, W, H, 0x0a0a0f, 0)
      .setDepth(200);
    this.tweens.add({ targets: overlay, alpha: 0.9, duration: 600 });

    const title = this.add
      .text(W / 2, H / 2 - 20, "The dream collapsed.", {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "28px",
        fontStyle: "bold",
        color: "#e76f51",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(201);

    const sub = this.add
      .text(W / 2, H / 2 + 20, "Click to dream again.", {
        fontFamily: "'Inter', sans-serif",
        fontSize: "14px",
        color: "#8888a0",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(201);

    this.tweens.add({
      targets: title, alpha: 1, duration: 600, delay: 300,
    });
    this.tweens.add({
      targets: sub, alpha: 1, duration: 600, delay: 700,
    });

    this.time.delayedCall(1000, () => {
      this.input.once("pointerdown", () => {
        this.score = 0;
        this.lives = 3;
        this.livesText.setText("\u2665 \u2665 \u2665");
        this.scoreText.setText("0");
        this.transitioning = false;
        this.loadLevel(0);
      });
    });
  }

  update() {
    if (!this.player || this.transitioning || !this.player.body) return;

    // Movement
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      this.player.setVelocityX(-PLAYER_SPEED);
      if (this.facingRight) {
        this.player.setFlipX(true);
        this.facingRight = false;
      }
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      this.player.setVelocityX(PLAYER_SPEED);
      if (!this.facingRight) {
        this.player.setFlipX(false);
        this.facingRight = true;
      }
    } else {
      this.player.setVelocityX(0);
    }

    // Jump
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const jumpPressed =
      this.cursors.up.isDown || this.wasd.up.isDown || this.wasd.space.isDown;

    if (jumpPressed && onGround) {
      this.player.setVelocityY(JUMP_VELOCITY);
    }

    // Squash & stretch
    if (!onGround) {
      const vy = this.player.body.velocity.y;
      if (vy < -100) {
        this.player.setScale(0.9, 1.1); // stretch up
      } else if (vy > 100) {
        this.player.setScale(1.1, 0.9); // squash down
      }
    } else {
      this.player.setScale(1, 1);
    }

    // Enemy patrol
    this.enemyGroup.children.iterate((enemy) => {
      if (!enemy || !enemy.body) return;
      const left = enemy.getData("patrolLeft");
      const right = enemy.getData("patrolRight");
      const speed = enemy.getData("speed");

      if (enemy.x <= left) {
        enemy.body.setVelocityX(speed);
        enemy.setFlipX(false);
      } else if (enemy.x >= right) {
        enemy.body.setVelocityX(-speed);
        enemy.setFlipX(true);
      }
    });

    // Fall off screen = death
    if (this.player.y > H + 50) {
      this.takeDamage();
      this.player.setPosition(50, GROUND_Y - 40);
      this.player.setVelocity(0, 0);
    }
  }
}

// ── seeded RNG ───────────────────────────────────────────────

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── boot ─────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", init);
