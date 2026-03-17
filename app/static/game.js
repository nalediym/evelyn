/**
 * Evelyn Dream Renderer
 *
 * Renders a personalized game from AI-generated scene data.
 * No Phaser needed for MVP — pure canvas + DOM for the
 * point-and-click dream experience.
 */

const CANVAS_W = 640;
const CANVAS_H = 460;

let gameData = null;
let currentScene = null;
let canvas, ctx;

// ── init ─────────────────────────────────────────────────────

async function init() {
  // Try sessionStorage first (came from connect flow)
  const stored = sessionStorage.getItem("evelyn_game");
  if (stored) {
    gameData = JSON.parse(stored);
    sessionStorage.removeItem("evelyn_game");
  } else {
    // Fallback: generate on the fly
    const gameId = window.location.pathname.split("/").pop();
    try {
      const res = await fetch(`/api/games/${gameId}/generate`, { method: "POST" });
      if (res.ok) {
        gameData = await res.json();
      }
    } catch (e) {
      console.error("Failed to load game:", e);
    }
  }

  if (!gameData || !gameData.scenes || gameData.scenes.length === 0) {
    document.getElementById("game-title").textContent = "Dream not found";
    document.getElementById("scene-description").textContent =
      "This dream hasn't been generated yet. Go back and enter through the portal.";
    return;
  }

  // Set up canvas
  const container = document.getElementById("game-canvas");
  canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  canvas.style.width = "100%";
  canvas.style.maxWidth = CANVAS_W + "px";
  canvas.style.height = "auto";
  canvas.style.borderRadius = "12px";
  canvas.style.cursor = "pointer";
  container.appendChild(canvas);
  ctx = canvas.getContext("2d");

  canvas.addEventListener("click", onCanvasClick);

  // Set header
  document.getElementById("game-title").textContent = gameData.title;
  const meta = [];
  if (gameData.genre) meta.push(gameData.genre);
  if (gameData.mood) meta.push(gameData.mood.join(" / "));
  if (gameData.player_name) meta.push(`dreamed for ${gameData.player_name}`);
  document.getElementById("game-meta").textContent = meta.join(" \u2022 ");

  // Start
  loadScene(gameData.start_scene || gameData.scenes[0].id);
}

// ── scene rendering ──────────────────────────────────────────

function getScene(id) {
  return gameData.scenes.find((s) => s.id === id);
}

function loadScene(sceneId) {
  const scene = getScene(sceneId);
  if (!scene) return;
  currentScene = scene;

  // Clear interaction text
  document.getElementById("interaction-text").textContent = "";

  // Draw scene
  drawScene(scene);

  // Update description
  document.getElementById("scene-description").textContent = scene.description;

  // Update nav buttons
  const nav = document.getElementById("game-nav");
  nav.innerHTML = "";

  scene.exits.forEach((exit) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = exit.label;
    btn.addEventListener("click", () => {
      if (exit.to === gameData.win_scene && currentScene.id !== gameData.win_scene) {
        loadScene(exit.to);
        showWin();
      } else {
        loadScene(exit.to);
      }
    });
    nav.appendChild(btn);
  });

  // Check win
  if (sceneId === gameData.win_scene) {
    showWin();
  }
}

function drawScene(scene) {
  // Background
  ctx.fillStyle = scene.background_color || "#12121a";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Ambient particles (dream dust)
  drawDreamParticles(scene);

  // Scene name
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "bold 48px 'IBM Plex Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(scene.name, CANVAS_W / 2, CANVAS_H / 2 - 40);

  // Objects
  scene.objects.forEach((obj) => {
    drawObject(obj);
  });

  // Exits as subtle indicators
  scene.exits.forEach((exit, i) => {
    drawExit(exit, i);
  });
}

function drawDreamParticles(scene) {
  const seed = scene.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = mulberry32(seed);

  for (let i = 0; i < 30; i++) {
    const x = rng() * CANVAS_W;
    const y = rng() * CANVAS_H;
    const r = rng() * 3 + 1;
    const alpha = rng() * 0.3 + 0.05;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }
}

function drawObject(obj) {
  const x = obj.x;
  const y = obj.y;
  const color = obj.color || "#a78bfa";

  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;

  // Shape (diamond)
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x + 14, y);
  ctx.lineTo(x, y + 18);
  ctx.lineTo(x - 14, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.shadowBlur = 0;

  // Label
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "12px 'IBM Plex Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(obj.name, x, y + 36);
}

function drawExit(exit, index) {
  const isForward = exit.direction === "forward";
  const x = isForward ? CANVAS_W - 40 : 40;
  const y = CANVAS_H / 2;

  ctx.fillStyle = "rgba(167, 139, 250, 0.3)";
  ctx.beginPath();
  if (isForward) {
    ctx.moveTo(x - 10, y - 15);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x - 10, y + 15);
  } else {
    ctx.moveTo(x + 10, y - 15);
    ctx.lineTo(x - 10, y);
    ctx.lineTo(x + 10, y + 15);
  }
  ctx.closePath();
  ctx.fill();
}

// ── interaction ──────────────────────────────────────────────

function onCanvasClick(e) {
  if (!currentScene) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  // Check object clicks
  for (const obj of currentScene.objects) {
    const dx = mx - obj.x;
    const dy = my - obj.y;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
      document.getElementById("interaction-text").textContent = obj.interaction;

      // Flash the object
      flashObject(obj);
      return;
    }
  }

  // Check exit clicks
  for (const exit of currentScene.exits) {
    const isForward = exit.direction === "forward";
    const ex = isForward ? CANVAS_W - 40 : 40;
    const ey = CANVAS_H / 2;
    if (Math.abs(mx - ex) < 30 && Math.abs(my - ey) < 30) {
      loadScene(exit.to);
      return;
    }
  }
}

function flashObject(obj) {
  const original = obj.color;
  obj.color = "#ffffff";
  drawScene(currentScene);
  setTimeout(() => {
    obj.color = original;
    drawScene(currentScene);
  }, 150);
}

// ── win state ────────────────────────────────────────────────

function showWin() {
  setTimeout(() => {
    const container = document.getElementById("game-canvas");

    const overlay = document.createElement("div");
    overlay.className = "win-overlay";
    overlay.innerHTML = `
      <h2>You woke up.</h2>
      <p style="color: var(--muted); font-family: var(--font-sans)">
        This dream was made for ${gameData.player_name || "you"}.
        No one else will ever see it this way.
      </p>
      <a href="/" class="btn primary">Back to reality</a>
    `;
    container.style.position = "relative";
    container.appendChild(overlay);
  }, 500);
}

// ── seeded RNG for deterministic particles ───────────────────

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── go ───────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", init);
