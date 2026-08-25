(function () {
  "use strict";

  var packshot = document.getElementById("packshot");
  var film = document.getElementById("featured-film");
  var fileInput = document.getElementById("packshot-file");
  var objectUrl = null;
  var drawer = document.querySelector(".mobile-drawer");
  var menuBtn = document.querySelector(".menu-toggle");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function playWhenVisible(video) {
    if (!video) return;
    var delay = Number(video.getAttribute("data-delay") || 0);
    var timer;
    function tryPlay() {
      if (reduced) return;
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }
    if (!("IntersectionObserver" in window)) {
      if (!video.getAttribute("src") && video.dataset.src) video.src = video.dataset.src;
      tryPlay();
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (timer) window.clearTimeout(timer);
            timer = window.setTimeout(tryPlay, delay);
          } else {
            video.pause();
          }
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

  function applyPackshot(file) {
    if (!file || file.type.indexOf("image/") !== 0 || !packshot) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    packshot.src = objectUrl;
    packshot.hidden = false;
  }

  if (film) {
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
      applyPackshot(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      applyPackshot(fileInput.files && fileInput.files[0]);
      fileInput.value = "";
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
})();
