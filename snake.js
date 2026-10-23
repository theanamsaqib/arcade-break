Arcade.register("snake", {
  title: "SNAKE",
  hint: "Arrows / WASD · Space pause · R restart",

  create(api) {
    const { ctx, W, H } = api;
    const CELL = 20;
    const COLS = W / CELL;
    const ROWS = H / CELL;
    const BASE_SPEED = 130; // ms per move
    const MIN_SPEED = 60;

    const wrapLabel = document.getElementById("wrapLabel");
    const wrapBox = document.getElementById("wrap");
    let wrapWalls = api.load("snakeWrap", "0") === "1";
    wrapBox.checked = wrapWalls;
    wrapLabel.classList.remove("hidden");

    function onWrapChange() {
      wrapWalls = wrapBox.checked;
      api.save("snakeWrap", wrapWalls ? "1" : "0");
      wrapBox.blur(); // keep keyboard focus on the game
      reset();
    }
    wrapBox.addEventListener("change", onWrapChange);

    let snake, dir, queue, food, score, state, timer;
    // state: "ready" | "running" | "paused" | "over"

    function reset() {
      const midY = Math.floor(ROWS / 2);
      snake = [
        { x: 6, y: midY },
        { x: 5, y: midY },
        { x: 4, y: midY },
      ];
      dir = { x: 1, y: 0 };
      queue = [];
      score = 0;
      api.setScore(0);
      placeFood();
      state = "ready";
      stopTimer();
      api.showOverlay("Ready?", "Press any arrow key or WASD to start");
      draw();
    }

    function placeFood() {
      const taken = new Set(snake.map((s) => s.x + "," + s.y));
      const free = [];
      for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
          if (!taken.has(x + "," + y)) free.push({ x, y });
        }
      }
      food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
    }

    function speed() {
      return Math.max(MIN_SPEED, BASE_SPEED - Math.floor(score / 5) * 6);
    }
    function startTimer() {
      stopTimer();
      timer = setTimeout(tick, speed());
    }
    function stopTimer() {
      if (timer) clearTimeout(timer);
      timer = null;
    }

    function start() {
      state = "running";
      api.hideOverlay();
      startTimer();
    }
    function pause() {
      if (state !== "running") return;
      state = "paused";
      stopTimer();
      api.showOverlay("Paused", "Press Space to continue");
    }
    function resume() {
      if (state === "paused") start();
    }

    function gameOver() {
      state = "over";
      stopTimer();
      const isBest = api.saveScore(score);
      api.showOverlay(
        isBest ? "New best! " + score : "Game over",
        "Score " + score + " · Press Space or R to play again"
      );
      draw();
    }

    function tick() {
      if (state !== "running") return;
      if (queue.length) dir = queue.shift();

      const head = snake[0];
      let nx = head.x + dir.x;
      let ny = head.y + dir.y;

      if (wrapWalls) {
        nx = (nx + COLS) % COLS;
        ny = (ny + ROWS) % ROWS;
      } else if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
        return gameOver();
      }

      const eating = food && nx === food.x && ny === food.y;
      const body = eating ? snake : snake.slice(0, -1);
      if (body.some((s) => s.x === nx && s.y === ny)) return gameOver();

      snake.unshift({ x: nx, y: ny });
      if (eating) {
        score += 1;
        api.setScore(score);
        placeFood();
        if (!food) {
          draw();
          return gameOver(); // board full: you win
        }
      } else {
        snake.pop();
      }

      draw();
      startTimer();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? "#0d1217" : "#0b0f13";
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }

      if (food) {
        ctx.fillStyle = "#ff5370";
        ctx.beginPath();
        ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = snake.length - 1; i >= 0; i--) {
        const s = snake[i];
        ctx.fillStyle = i === 0 ? "#3ddc84" : i % 2 ? "#2fb86d" : "#34c775";
        Arcade.roundRect(ctx, s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 5);
        ctx.fill();
      }

      const h = snake[0];
      ctx.fillStyle = "#0b0f13";
      const cx = h.x * CELL + CELL / 2 + (dir.x !== 0 ? 4 * dir.x : 0);
      const cy = h.y * CELL + CELL / 2 + (dir.y !== 0 ? 4 * dir.y : 0);
      const ox = dir.y !== 0 ? 4 : 0;
      const oy = dir.x !== 0 ? 4 : 0;
      ctx.beginPath();
      ctx.arc(cx - ox, cy - oy, 1.8, 0, Math.PI * 2);
      ctx.arc(cx + ox, cy + oy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    const KEYS = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 },
      s: { x: 0, y: 1 },
      a: { x: -1, y: 0 },
      d: { x: 1, y: 0 },
    };

    function turn(next) {
      const last = queue.length ? queue[queue.length - 1] : dir;
      if (next.x === last.x && next.y === last.y) return;
      if (next.x === -last.x && next.y === -last.y) return;
      if (queue.length < 3) queue.push(next);
    }

    function keydown(k) {
      if (KEYS[k]) {
        if (state === "over") return true;
        turn(KEYS[k]);
        if (state === "ready") start();
        else if (state === "paused") resume();
        return true;
      }
      if (k === " " || k === "p") {
        if (state === "running") pause();
        else if (state === "paused") resume();
        else if (state === "over") reset();
        else if (state === "ready") start();
        return true;
      }
      if (k === "r") {
        reset();
        return true;
      }
      return false;
    }

    function destroy() {
      stopTimer();
      wrapBox.removeEventListener("change", onWrapChange);
      wrapLabel.classList.add("hidden");
    }

    return { reset, keydown, pause, destroy };
  },
});
