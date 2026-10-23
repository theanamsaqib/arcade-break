(() => {
  const W = 360;
  const H = 360;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const board = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const titleEl = document.getElementById("gameTitle");
  const hintEl = document.getElementById("hint");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlaySub = document.getElementById("overlaySub");
  const tabs = Array.from(document.querySelectorAll(".tab"));

  // localStorage works fine inside extension popups
  function load(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (e) {}
  }

  function makeApi(id) {
    const bestKey = id + "Best";
    let best = parseInt(load(bestKey, "0"), 10) || 0;
    bestEl.textContent = best;
    scoreEl.textContent = 0;

    return {
      canvas, ctx, W, H, load, save,
      setScore(n) { scoreEl.textContent = n; },
      // returns true when the score beat the old best
      saveScore(score) {
        if (score > best) {
          best = score;
          bestEl.textContent = best;
          save(bestKey, best);
          return true;
        }
        return false;
      },
      showOverlay(title, sub) {
        overlayTitle.textContent = title;
        overlaySub.textContent = sub;
        overlay.classList.remove("hidden");
      },
      hideOverlay() { overlay.classList.add("hidden"); },
      canvasX(e) {
        const r = canvas.getBoundingClientRect();
        return (e.clientX - r.left) * (W / r.width);
      },
    };
  }

  let current = null;

  function switchTo(id) {
    if (!Arcade.games[id]) id = Arcade.order[0];
    if (current) current.destroy();

    const def = Arcade.games[id];
    save("arcadeLast", id);
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.game === id));
    titleEl.textContent = def.title;
    hintEl.textContent = def.hint;
    overlay.classList.add("hidden");

    current = def.create(makeApi(id));
    current.reset();
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      switchTo(tab.dataset.game);
      tab.blur(); // so Space doesn't "press" the tab button
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    const idx = parseInt(k, 10);
    if (idx >= 1 && idx <= Arcade.order.length) {
      e.preventDefault();
      switchTo(Arcade.order[idx - 1]);
      return;
    }
    if (current && current.keydown && current.keydown(k, e)) e.preventDefault();
  });

  document.addEventListener("keyup", (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (current && current.keyup) current.keyup(k, e);
  });

  board.addEventListener("mousedown", (e) => {
    if (current && current.mousedown) current.mousedown(e);
  });
  board.addEventListener("mousemove", (e) => {
    if (current && current.mousemove) current.mousemove(e);
  });

  // auto-pause if the popup loses focus
  window.addEventListener("blur", () => {
    if (current && current.pause) current.pause();
  });

  switchTo(load("arcadeLast", "snake"));
})();
