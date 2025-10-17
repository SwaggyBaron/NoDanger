// content.js
// Предполагаем, что tf.min.js и coco-ssd.min.js уже подключены через content_scripts в manifest.json

(async () => {
  // Загружаем модель
  const model = await cocoSsd.load();
  console.log("Модель загружена!");

  // --- Обработка видео ---
  const videos = document.querySelectorAll("video");
  videos.forEach(video => addVideoOverlay(video, model));

  // --- Обработка картинок ---
  const processedImages = new WeakSet(); // чтобы не обрабатывать одни и те же картинки дважды
  const images = document.querySelectorAll("img");
  images.forEach(img => processImage(img, model, processedImages));

  // Наблюдаем за добавлением новых картинок на страницу
  const imgObserver = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.tagName === "IMG" && !processedImages.has(node)) {
          processImage(node, model, processedImages);
        }
      });
    });
  });
  imgObserver.observe(document.body, { childList: true, subtree: true });
})();

// --- Функции для видео ---
function addVideoOverlay(video, model) {
  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = 9999;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const updateCanvas = () => {
    const rect = video.getBoundingClientRect();
    canvas.style.left = rect.left + "px";
    canvas.style.top = rect.top + "px";
    canvas.width = rect.width;
    canvas.height = rect.height;
  };

  window.addEventListener("scroll", updateCanvas);
  window.addEventListener("resize", updateCanvas);
  const observer = new ResizeObserver(updateCanvas);
  observer.observe(video);

  updateCanvas();

  let lastTime = 0;
  const interval = 200; // проверка каждые 200 мс

  const detectLoop = async (timestamp) => {
    if (!video.paused && !video.ended && timestamp - lastTime > interval) {
      lastTime = timestamp;

      const rect = video.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) { // только видимые видео
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const predictions = await model.detect(canvas);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        predictions.forEach(pred => {
          if (pred.class === "spider" && pred.score > 0.6) {
            const [x, y, w, h] = pred.bbox;
            ctx.fillStyle = "black";
            ctx.fillRect(x, y, w, h);
          }
        });
      }
    }
    requestAnimationFrame(detectLoop);
  };
  requestAnimationFrame(detectLoop);
}

// --- Функции для картинок ---
async function processImage(img, model, processedImages) {
  if (!img.complete || img.naturalWidth === 0) return;
  processedImages.add(img);

  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = 9999;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const updateCanvas = () => {
    const rect = img.getBoundingClientRect();
    canvas.style.left = rect.left + "px";
    canvas.style.top = rect.top + "px";
    canvas.width = rect.width;
    canvas.height = rect.height;
  };

  window.addEventListener("scroll", updateCanvas);
  window.addEventListener("resize", updateCanvas);
  const observer = new ResizeObserver(updateCanvas);
  observer.observe(img);

  updateCanvas();

  const temp = document.createElement("canvas");
  temp.width = img.naturalWidth;
  temp.height = img.naturalHeight;
  const tempCtx = temp.getContext("2d");
  tempCtx.drawImage(img, 0, 0);

  const predictions = await model.detect(temp);
  predictions.forEach(pred => {
    if (pred.class === "spider" && pred.score > 0.6) {
      const [x, y, w, h] = pred.bbox;
      ctx.fillStyle = "black";
      ctx.fillRect(x, y, w, h);
    }
  });
}