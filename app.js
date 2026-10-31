
import { animate } from "motion";

(() => {
  const TOTAL_FRAMES = 240;
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const loader = document.getElementById("loader");

  const images = new Array(TOTAL_FRAMES + 1);
  let loadedCount = 0;
  let currentFrame = 1;
  let targetFrame = 1;
  let lastDrawnFrame = -1;

  // Animate the loading bar with Motion
  if (loader) {
    animate(
      loader,
      { opacity: [1, 0.85, 1] },
      {
        duration: 1.2,
        repeat: Infinity,
        ease: "easeInOut",
      }
    );
  }

  // Canvas sizing
  let canvasWidth = 0;
  let canvasHeight = 0;
  let dpr = 1;

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = Math.round(window.innerWidth * dpr);
    canvasHeight = Math.round(window.innerHeight * dpr);

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    lastDrawnFrame = -1;
    drawFrame(Math.round(currentFrame));
  }

  function getFrameUrl(index) {
    const pad = String(index).padStart(3, "0");
    return `New%20folder/ezgif-frame-${pad}.jpg`;
  }

  function getAvailableImage(index) {
    if (
      images[index] &&
      images[index].complete &&
      images[index].naturalWidth > 0
    ) {
      return images[index];
    }

    // Find the nearest loaded frame
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = index - offset;

      if (
        prev >= 1 &&
        images[prev] &&
        images[prev].complete &&
        images[prev].naturalWidth > 0
      ) {
        return images[prev];
      }

      const next = index + offset;

      if (
        next <= TOTAL_FRAMES &&
        images[next] &&
        images[next].complete &&
        images[next].naturalWidth > 0
      ) {
        return images[next];
      }
    }

    return images[1] || null;
  }

  function drawFrame(frameIndex) {
    const img = getAvailableImage(frameIndex);
    if (!img) return;

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    if (!iw || !ih || !canvasWidth || !canvasHeight) return;

    const imgRatio = iw / ih;
    const canvasRatio = canvasWidth / canvasHeight;

    let dw, dh, dx, dy;

    if (canvasRatio > imgRatio) {
      dw = canvasWidth;
      dh = canvasWidth / imgRatio;
      dx = 0;
      dy = (canvasHeight - dh) / 2;
    } else {
      dh = canvasHeight;
      dw = canvasHeight * imgRatio;
      dx = (canvasWidth - dw) / 2;
      dy = 0;
    }

    ctx.drawImage(img, dx, dy, dw, dh);
    lastDrawnFrame = frameIndex;
  }

  // Image preloading with concurrency control
  function preloadImages() {
    const firstImg = new Image();

    firstImg.onload = () => {
      images[1] = firstImg;
      loadedCount++;
      drawFrame(1);
      updateLoader();
    };

    firstImg.onerror = () => {
      console.error("Failed to load frame 001:", getFrameUrl(1));
      loadedCount++;
      updateLoader();
    };

    firstImg.src = getFrameUrl(1);

    const queue = [];

    for (let i = 2; i <= TOTAL_FRAMES; i++) {
      queue.push(i);
    }

    const CONCURRENCY = 10;
    let active = 0;

    function next() {
      while (active < CONCURRENCY && queue.length > 0) {
        const frameIdx = queue.shift();
        active++;

        const img = new Image();

        const onComplete = (success) => {
          if (success) {
            images[frameIdx] = img;
          } else {
            console.error(
              `Failed to load frame ${frameIdx}:`,
              getFrameUrl(frameIdx)
            );
          }

          loadedCount++;
          active--;

          updateLoader();

          if (Math.round(currentFrame) === frameIdx) {
            drawFrame(frameIdx);
          }

          next();
        };

        img.onload = () => onComplete(true);
        img.onerror = () => onComplete(false);
        img.src = getFrameUrl(frameIdx);
      }
    }

    next();
  }

  function updateLoader() {
    if (!loader) return;

    const pct = Math.min((loadedCount / TOTAL_FRAMES) * 100, 100);
    loader.style.width = `${pct}%`;

    if (loadedCount >= TOTAL_FRAMES) {
      setTimeout(() => {
        loader.classList.add("hidden");
      }, 300);
    }
  }

  // Smooth momentum scrolling
  let currentScrollY = window.scrollY;
  let targetScrollY = window.scrollY;
  let isWheeling = false;

  window.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();

      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;

      if (maxScroll <= 0) return;

      let delta = e.deltaY;

      if (e.deltaMode === 1) delta *= 38;
      else if (e.deltaMode === 2) delta *= 700;

      targetScrollY = Math.max(
        0,
        Math.min(maxScroll, targetScrollY + delta * 0.95)
      );

      isWheeling = true;
    },
    { passive: false }
  );

  // Support scrollbar dragging and native scrolling
  window.addEventListener(
    "scroll",
    () => {
      if (!isWheeling) {
        targetScrollY = window.scrollY;
        currentScrollY = window.scrollY;
      }
    },
    { passive: true }
  );

  // Keyboard scrolling
  window.addEventListener("keydown", (e) => {
    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;
    const step = window.innerHeight * 0.5;

    if (
      e.key === "ArrowDown" ||
      e.key === "PageDown" ||
      e.key === " "
    ) {
      e.preventDefault();
      targetScrollY = Math.min(maxScroll, targetScrollY + step);
      isWheeling = true;
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      targetScrollY = Math.max(0, targetScrollY - step);
      isWheeling = true;
    } else if (e.key === "Home") {
      e.preventDefault();
      targetScrollY = 0;
      isWheeling = true;
    } else if (e.key === "End") {
      e.preventDefault();
      targetScrollY = maxScroll;
      isWheeling = true;
    }
  });

  // Main animation loop
  function loop() {
    if (isWheeling) {
      currentScrollY += (targetScrollY - currentScrollY) * 0.12;
      window.scrollTo(0, currentScrollY);

      if (Math.abs(targetScrollY - currentScrollY) < 0.5) {
        currentScrollY = targetScrollY;
        isWheeling = false;
        window.scrollTo(0, currentScrollY);
      }
    }

    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;

    const progress =
      maxScroll > 0
        ? Math.max(0, Math.min(1, window.scrollY / maxScroll))
        : 0;

    targetFrame = 1 + progress * (TOTAL_FRAMES - 1);

    const frameDiff = targetFrame - currentFrame;

    if (Math.abs(frameDiff) > 0.001) {
      currentFrame += frameDiff * 0.12;
    } else {
      currentFrame = targetFrame;
    }

    const frameToDraw = Math.round(currentFrame);

    if (frameToDraw !== lastDrawnFrame) {
      drawFrame(frameToDraw);
    }

    requestAnimationFrame(loop);
  }

  // Initialize
  window.addEventListener("resize", resizeCanvas);

  resizeCanvas();
  preloadImages();
  requestAnimationFrame(loop);
})();
