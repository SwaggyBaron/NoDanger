// content.js

(async () => {
    // Загружаем модель
    const model = await cocoSsd.load();
    console.log("Модель загружена!");

    // --- Видео ---
    const videos = document.querySelectorAll("video");
    videos.forEach(video => addVideoOverlay(video, model));

    // --- Картинки ---
    const processedImages = new WeakSet();
    const images = document.querySelectorAll("img");
    images.forEach(img => processImage(img, model, processedImages));

    // Следим за новыми картинками на странице
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

    // --- Функции ---

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
        const interval = 200; // проверка каждые 200мс

        const detectLoop = async (timestamp) => {
            if (!video.paused && !video.ended && timestamp - lastTime > interval) {
                lastTime = timestamp;

                const rect = video.getBoundingClientRect();
                if (rect.bottom > 0 && rect.top < window.innerHeight) { // только видимые
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
})();