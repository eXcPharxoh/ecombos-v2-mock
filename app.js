(function () {
  "use strict";

  var PACKSHOT =
    "https://uemglyheqrjfpanjsjkh.supabase.co/functions/v1/media-redirect/2b7cf7ba6ce78e.png";
  var STEP_MS = 1200;

  var packshot = document.getElementById("packshot");
  var film = document.getElementById("featured-film");
  var fileInput = document.getElementById("packshot-file");
  var tiles = document.querySelectorAll(".tile");
  var jobBar = document.getElementById("job-bar");
  var jobStatus = document.getElementById("job-status");
  var filmIndex = document.getElementById("film-index");
  var timecode = document.getElementById("timecode");
  var timecodeMobile = document.getElementById("timecode-mobile");
  var skuNodes = document.querySelectorAll(".sku");
  var drawer = document.querySelector(".mobile-drawer");
  var menuBtn = document.querySelector(".menu-toggle");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var objectUrl = null;
  var packshotSrc = PACKSHOT;
  var runToken = 0;
  var clock = 0;
  var clockTimer = null;

  function playWhenVisible(video) {
    if (!video) return;
    function tryPlay() {
      if (reduced) return;
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }
    if (!("IntersectionObserver" in window)) {
      tryPlay();
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) tryPlay();
          else video.pause();
        });
      },
      { rootMargin: "200px 0px", threshold: 0.01 }
    );
    io.observe(video);
  }

  document.querySelectorAll("video.js-autoplay").forEach(playWhenVisible);

  if (menuBtn && drawer) {
    menuBtn.addEventListener("click", function () {
      var open = drawer.hasAttribute("hidden");
      if (open) drawer.removeAttribute("hidden");
      else drawer.setAttribute("hidden", "");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function pad(n) {
    return (n < 10 ? "00:0" : "00:") + n;
  }

  function setClock(sec) {
    clock = sec;
    var label = pad(Math.min(sec, 10)) + " · 4K · 60FPS";
    if (timecode) timecode.textContent = label;
    if (timecodeMobile) timecodeMobile.textContent = pad(Math.min(sec, 10)) + " · 4K";
  }

  function startClock() {
    stopClock();
    setClock(0);
    if (reduced) return;
    clockTimer = window.setInterval(function () {
      setClock(clock + 1);
    }, 1000);
  }

  function stopClock() {
    if (clockTimer) {
      window.clearInterval(clockTimer);
      clockTimer = null;
    }
  }

  function wait(ms, token) {
    return new Promise(function (resolve) {
      window.setTimeout(function () {
        resolve(token === runToken);
      }, reduced ? 80 : ms);
    });
  }

  function syncSku(src) {
    packshotSrc = src;
    if (packshot) {
      packshot.src = src;
      packshot.hidden = false;
    }
    skuNodes.forEach(function (img) {
      img.src = src;
    });
  }

  function resetTiles() {
    tiles.forEach(function (tile) {
      tile.classList.remove("is-ready");
    });
    if (jobBar) jobBar.style.width = "8%";
    if (jobStatus) jobStatus.textContent = "RENDERING WORLDS";
    if (filmIndex) filmIndex.textContent = "FILM 01 / 05";
  }

  function revealTile(i, of) {
    var tile = tiles[i];
    if (tile) tile.classList.add("is-ready");
    var done = i + 2;
    if (filmIndex) filmIndex.textContent = "FILM 0" + done + " / 05";
    if (jobBar) jobBar.style.width = Math.round(((i + 1) / of) * 100) + "%";
    var v = tile && tile.querySelector("video");
    if (v) {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
  }

  function runJob() {
    var token = ++runToken;
    resetTiles();
    startClock();
    return (async function () {
      if (!(await wait(STEP_MS, token))) return;
      revealTile(0, 4);
      if (!(await wait(STEP_MS, token))) return;
      revealTile(1, 4);
      if (!(await wait(STEP_MS, token))) return;
      revealTile(2, 4);
      if (!(await wait(STEP_MS, token))) return;
      revealTile(3, 4);
      if (token !== runToken) return;
      if (jobStatus) jobStatus.textContent = "JOB COMPLETE · AURELIA-2703";
      if (filmIndex) filmIndex.textContent = "FILM 05 / 05";
      stopClock();
      setClock(10);
    })();
  }

  function onFiles(files) {
    var file = files && files[0];
    if (!file || file.type.indexOf("image/") !== 0) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    syncSku(objectUrl);
    runJob();
  }

  document.querySelectorAll("[data-open-file]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (fileInput) fileInput.click();
    });
  });

  document.querySelectorAll("[data-run-job]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      runJob();
    });
  });

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      onFiles(fileInput.files);
      fileInput.value = "";
    });
  }

  if (film) {
    film.addEventListener("click", function (e) {
      if (e.target.closest("a, button, input")) return;
      if (fileInput) fileInput.click();
    });
    film.addEventListener("dragover", function (e) {
      e.preventDefault();
      film.classList.add("is-drop");
    });
    film.addEventListener("dragleave", function (e) {
      if (!film.contains(e.relatedTarget)) film.classList.remove("is-drop");
    });
    film.addEventListener("drop", function (e) {
      e.preventDefault();
      film.classList.remove("is-drop");
      onFiles(e.dataTransfer && e.dataTransfer.files);
    });
  }

  document.querySelectorAll("[data-carousel]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var grid = document.getElementById("template-grid");
      if (!grid) return;
      var dir = btn.getAttribute("data-carousel") === "next" ? 1 : -1;
      grid.scrollBy({ left: dir * Math.min(grid.clientWidth * 0.8, 420), behavior: reduced ? "auto" : "smooth" });
    });
  });

  syncSku(packshotSrc);
  runJob();
})();
