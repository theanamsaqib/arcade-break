Arcade.register("breakout", {
  title: "BREAKOUT",
  hint: "← → / A D / mouse · Space launch & pause · R restart",

  create(api) {
    const { ctx, W, H } = api;

    const COLS = 8;
    const ROWS = 6;
    const BW = 39;
    const BH = 14;
    const GAP = 4;
    const LEFT = 10;
    const TOP = 44;
    const PW = 64;
    const PH = 10;
    const PY = H - 24;
    const R = 6;
    const COLORS = ["#ff5370", "#ff9e64", "#ffd166", "#3ddc84", "#4cc9f0", "#a78bfa"];
    const BASE_SPEED = 240; // px per second
    const MAX_SPEED = 430;
    const PADDLE_SPEED = 420;

    let bricks, bricksLeft, paddleX, ball, speed, lives, score, level, state, raf, last;
    const keys = { left: false, right: false };
    // state: "ready" (ball on paddle) | "running" | "paused" | "over"

    function buildBricks() {
      bricks = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          bricks.push({
            x: LEFT + c * (BW + GAP),
            y: TOP + r * (BH + GAP),
            row: r,
            alive: true,
          });
        }
      }
      bricksLeft = bricks.length;
    }

    function resetBall() {
      state = "ready";
      ball = { x: paddleX + PW / 2, y: PY - R - 1, vx: 0, vy: 0 };
    }

    function reset() {
      score = 0;
      lives = 3;
      level = 1;
      speed = BASE_SPEED;
      paddleX = (W - PW) / 2;
      keys.left = keys.right = false;
      api.setScore(0);
      buildBricks();
      resetBall();
      api.showOverlay("Breakout", "Space or click to launch · move with ← → or mouse");
    }

    function launch() {
      if (state !== "ready") return;
      api.hideOverlay();
      const a = ((Math.random() * 50 - 25) * Math.PI) / 180;
      ball.vx = speed * Math.sin(a);
      ball.vy = -speed * Math.cos(a);
      state = "running";
    }

    function pause() {
      if (state !== "running") return;
      state = "paused";
      api.showOverlay("Paused", "Press Space to continue");
    }
    function resume() {
      if (state !== "paused") return;
      state = "running";
      api.hideOverlay();
    }

    function gameOver() {
      state = "over";
      const isBest = api.saveScore(score);
      api.showOverlay(
        isBest ? "New best! " + score : "Game over",
        "Score " + score + " · Press Space or R to play again"
      );
    }

    function loseLife() {
      lives -= 1;
      if (lives <= 0) gameOver();
      else resetBall();
    }

    function nextLevel() {
      level += 1;
      speed = Math.min(MAX_SPEED, BASE_SPEED + (level - 1) * 25);
      buildBricks();
      resetBall();
    }

    function setSpeed(s) {
      const mag = Math.hypot(ball.vx, ball.vy) || 1;
      ball.vx = (ball.vx / mag) * s;
      ball.vy = (ball.vy / mag) * s;
    }

    function clamp(v, lo, hi) {
      return Math.max(lo, Math.min(hi, v));
    }

    function moveBall(h) {
      const px = ball.x;
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;

      // walls
      if (ball.x - R < 0) { ball.x = R; ball.vx = Math.abs(ball.vx); }
      if (ball.x + R > W) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - R < 0) { ball.y = R; ball.vy = Math.abs(ball.vy); }

      // paddle
      if (
        ball.vy > 0 &&
        ball.y + R >= PY &&
        ball.y - R < PY + PH &&
        ball.x >= paddleX - R &&
        ball.x <= paddleX + PW + R
      ) {
        const hit = clamp((ball.x - (paddleX + PW / 2)) / (PW / 2), -1, 1);
        const a = hit * (60 * Math.PI) / 180;
        ball.vx = speed * Math.sin(a);
        ball.vy = -speed * Math.cos(a);
        ball.y = PY - R;
      }

      // bottom
      if (ball.y - R > H) {
        loseLife();
        return;
      }

      // bricks (one per step)
      for (const b of bricks) {
        if (!b.alive) continue;
        const cx = clamp(ball.x, b.x, b.x + BW);
        const cy = clamp(ball.y, b.y, b.y + BH);
        const dx = ball.x - cx;
        const dy = ball.y - cy;
        if (dx * dx + dy * dy < R * R) {
          b.alive = false;
          bricksLeft -= 1;
          score += 10;
          api.setScore(score);
          if (px + R > b.x && px - R < b.x + BW) ball.vy = -ball.vy;
          else ball.vx = -ball.vx;
          speed = Math.min(MAX_SPEED, speed + 2);
          setSpeed(speed);
          if (bricksLeft === 0) nextLevel();
          break;
        }
      }
    }

    function update(dt) {
      if (state === "paused" || state === "over") return;

      paddleX = clamp(
        paddleX + ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) * PADDLE_SPEED * dt,
        0,
        W - PW
      );

      if (state === "ready") {
        ball.x = paddleX + PW / 2;
        ball.y = PY - R - 1;
        return;
      }

      const steps = Math.max(1, Math.ceil((speed * dt) / 4));
      const h = dt / steps;
      for (let i = 0; i < steps && state === "running"; i++) moveBall(h);
    }

    function draw() {
      ctx.fillStyle = "#0b0f13";
      ctx.fillRect(0, 0, W, H);

      for (const b of bricks) {
        if (!b.alive) continue;
        ctx.fillStyle = COLORS[b.row % COLORS.length];
        Arcade.roundRect(ctx, b.x, b.y, BW, BH, 3);
        ctx.fill();
      }

      ctx.fillStyle = "#e6edf3";
      Arcade.roundRect(ctx, paddleX, PY, PW, PH, 5);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, R, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "bold 12px monospace";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#9aa4ae";
      ctx.textAlign = "left";
      ctx.fillText("LIVES " + "●".repeat(Math.max(0, lives)), 10, 20);
      ctx.textAlign = "right";
      ctx.fillText("LEVEL " + level, W - 10, 20);

      if (state === "ready") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#7d8590";
        ctx.fillText("SPACE to launch", W / 2, PY - 34);
      }
    }

    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (last == null) last = ts;
      const dt = Math.max(0, Math.min((ts - last) / 1000, 0.033));
      last = ts;
      update(dt);
      draw();
    }

    function action() {
      if (state === "ready") launch();
      else if (state === "running") pause();
      else if (state === "paused") resume();
      else if (state === "over") reset();
    }

    function keydown(k) {
      if (k === "ArrowLeft" || k === "a") { keys.left = true; return true; }
      if (k === "ArrowRight" || k === "d") { keys.right = true; return true; }
      if (k === " " || k === "p") { action(); return true; }
      if (k === "ArrowUp" || k === "w") { if (state === "ready") launch(); return true; }
      if (k === "r") { reset(); return true; }
      return false;
    }

    function keyup(k) {
      if (k === "ArrowLeft" || k === "a") keys.left = false;
      if (k === "ArrowRight" || k === "d") keys.right = false;
    }

    function mousemove(e) {
      if (state === "paused" || state === "over") return;
      paddleX = clamp(api.canvasX(e) - PW / 2, 0, W - PW);
    }

    function mousedown() {
      if (state === "running") return; // clicking mid-game shouldn't pause
      action();
    }

    reset();
    raf = requestAnimationFrame(loop);

    return {
      reset,
      keydown,
      keyup,
      mousemove,
      mousedown,
      pause,
      destroy() { cancelAnimationFrame(raf); },
    };
  },
});
