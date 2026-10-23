Arcade.register("bird", {
  title: "SKY BIRD",
  hint: "Space / ↑ / click to flap · R restart",

  create(api) {
    const { ctx, W, H } = api;

    const GROUND = 28;
    const R = 12;
    const BX = 90;
    const GAP = 120;
    const PW = 54;
    const SPEED = 130;
    const GRAV = 1000;
    const FLAP = -330;
    const SPAWN = 1.55;

    // fixed star field for the night sky
    const stars = [];
    for (let i = 0; i < 28; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * (H - GROUND - 40), s: Math.random() < 0.3 ? 2 : 1 });
    }

    let bird, pipes, score, state, t, spawnT, groundX, overAt, raf, last;
    // state: "ready" | "running" | "paused" | "over"

    function reset() {
      bird = { y: H / 2, vy: 0 };
      pipes = [];
      score = 0;
      t = 0;
      spawnT = 0.6;
      groundX = 0;
      overAt = 0;
      state = "ready";
      api.setScore(0);
      api.showOverlay("Sky Bird", "Space, ↑ or click to flap");
    }

    function flap() {
      if (state === "ready") {
        api.hideOverlay();
        state = "running";
        bird.vy = FLAP;
      } else if (state === "running") {
        bird.vy = FLAP;
      } else if (state === "paused") {
        resume();
      } else if (state === "over") {
        if (performance.now() - overAt > 400) reset();
      }
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

    function die() {
      state = "over";
      overAt = performance.now();
      const isBest = api.saveScore(score);
      api.showOverlay(
        isBest ? "New best! " + score : "Game over",
        "Score " + score + " · Press Space to try again"
      );
    }

    function update(dt) {
      if (state === "paused") return;
      t += dt;

      if (state === "over") {
        if (bird.y + R < H - GROUND) {
          bird.vy += GRAV * dt;
          bird.y = Math.min(bird.y + bird.vy * dt, H - GROUND - R);
        }
        return;
      }

      groundX = (groundX + SPEED * dt) % 16;

      if (state === "ready") {
        bird.y = H / 2 + Math.sin(t * 4) * 6;
        return;
      }

      // physics
      bird.vy += GRAV * dt;
      bird.y += bird.vy * dt;
      if (bird.y - R < 0) {
        bird.y = R;
        if (bird.vy < 0) bird.vy = 0;
      }

      // pipes
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = SPAWN;
        const lo = 50 + GAP / 2;
        const hi = H - GROUND - 50 - GAP / 2;
        pipes.push({ x: W, gapY: lo + Math.random() * (hi - lo), scored: false });
      }
      for (const p of pipes) p.x -= SPEED * dt;
      while (pipes.length && pipes[0].x + PW < -10) pipes.shift();

      // score + collisions
      const hr = R - 2; // a little forgiving
      for (const p of pipes) {
        if (!p.scored && p.x + PW < BX - R) {
          p.scored = true;
          score += 1;
          api.setScore(score);
        }
        if (BX + hr > p.x && BX - hr < p.x + PW) {
          if (bird.y - hr < p.gapY - GAP / 2 || bird.y + hr > p.gapY + GAP / 2) {
            return die();
          }
        }
      }
      if (bird.y + hr >= H - GROUND) {
        bird.y = H - GROUND - R;
        return die();
      }
    }

    function drawPipe(p) {
      const topH = p.gapY - GAP / 2;
      const botY = p.gapY + GAP / 2;
      const botH = H - GROUND - botY;
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#14532d";
      ctx.fillStyle = "#2fb86d";
      ctx.fillRect(p.x, 0, PW, topH);
      ctx.strokeRect(p.x, -2, PW, topH + 2);
      ctx.fillRect(p.x, botY, PW, botH);
      ctx.strokeRect(p.x, botY, PW, botH);
      ctx.fillStyle = "#3ddc84";
      ctx.fillRect(p.x - 4, topH - 14, PW + 8, 14);
      ctx.strokeRect(p.x - 4, topH - 14, PW + 8, 14);
      ctx.fillRect(p.x - 4, botY, PW + 8, 14);
      ctx.strokeRect(p.x - 4, botY, PW + 8, 14);
    }

    function drawBird() {
      ctx.save();
      ctx.translate(BX, bird.y);
      ctx.rotate(Math.max(-0.45, Math.min(1.1, bird.vy / 520)));
      // body
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      // wing (flaps while alive)
      const flapY = state === "over" ? 2 : Math.sin(t * 18) * 3;
      ctx.fillStyle = "#e9a93b";
      ctx.beginPath();
      ctx.ellipse(-3, 3 + flapY, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // beak
      ctx.fillStyle = "#ff7a45";
      ctx.beginPath();
      ctx.moveTo(R - 2, -1);
      ctx.lineTo(R + 8, 2);
      ctx.lineTo(R - 2, 6);
      ctx.closePath();
      ctx.fill();
      // eye
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(5, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0b0f13";
      ctx.beginPath();
      ctx.arc(6.5, -4, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0e1a33");
      g.addColorStop(1, "#2d4a7a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (const s of stars) ctx.fillRect(s.x, s.y, s.s, s.s);

      for (const p of pipes) drawPipe(p);

      // ground
      ctx.fillStyle = "#2a3441";
      ctx.fillRect(0, H - GROUND, W, GROUND);
      ctx.fillStyle = "#3ddc84";
      ctx.fillRect(0, H - GROUND, W, 4);
      ctx.fillStyle = "#34414f";
      for (let x = -groundX; x < W; x += 16) ctx.fillRect(x, H - GROUND + 10, 8, 6);

      drawBird();

      if (state !== "ready") {
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#0b0f13";
        ctx.strokeText(String(score), W / 2, 56);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(String(score), W / 2, 56);
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

    function keydown(k) {
      if (k === " " || k === "ArrowUp" || k === "w") { flap(); return true; }
      if (k === "p") {
        if (state === "running") pause();
        else if (state === "paused") resume();
        return true;
      }
      if (k === "r") { reset(); return true; }
      return false;
    }

    function mousedown() {
      flap();
    }

    reset();
    raf = requestAnimationFrame(loop);

    return {
      reset,
      keydown,
      mousedown,
      pause,
      destroy() { cancelAnimationFrame(raf); },
    };
  },
});
