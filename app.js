(function () {
  "use strict";

  var PACKSHOT =
    "https://uemglyheqrjfpanjsjkh.supabase.co/functions/v1/media-redirect/2b7cf7ba6ce78e.png";
  var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

  var FIGS = [
    { id: "0.1", name: "PACKSHOT" },
    { id: "0.2", name: "ANGLES" },
    { id: "0.3", name: "FILM" },
    { id: "0.4", name: "MOTION" },
    { id: "0.5", name: "TYPE" },
  ];

  var stage = document.getElementById("stage");
  var poster = document.getElementById("poster");
  var lcp = document.getElementById("lcp");
  var grid = document.getElementById("grid");
  var film = document.getElementById("film");
  var reel = document.getElementById("reel");
  var typeStill = document.getElementById("type-still");
  var motionBadge = document.getElementById("motion-badge");
  var figIndex = document.getElementById("fig-index");
  var figName = document.getElementById("fig-name");
  var figSteps = document.querySelectorAll("#fig-steps li");
  var fileInput = document.getElementById("file");
  var knotCanvas = document.getElementById("knot");
  var skuThumbs = document.querySelectorAll(".sku");
  var skuNodeThumbs = document.querySelectorAll(".sku-thumb");

  var packshotSrc = PACKSHOT;
  var objectUrl = null;
  var runToken = 0;
  var running = false;
  var layers = [lcp, grid, film, reel, typeStill];

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function wait(ms, token) {
    return new Promise(function (resolve) {
      window.setTimeout(function () {
        resolve(token === runToken);
      }, ms);
    });
  }

  function setFig(i) {
    figIndex.textContent = "FIG " + FIGS[i].id;
    figName.textContent = FIGS[i].name;
    stage.dataset.fig = FIGS[i].id;
    if (motionBadge) motionBadge.hidden = FIGS[i].id !== "0.4";
    figSteps.forEach(function (dot, idx) {
      dot.classList.toggle("is-on", idx === i);
    });
  }

  function show(el) {
    layers.forEach(function (layer) {
      layer.classList.toggle("is-on", layer === el);
    });
    if (el !== reel) {
      reel.pause();
    }
  }

  function syncSku(src) {
    lcp.src = src;
    skuThumbs.forEach(function (img) {
      img.src = src;
    });
    skuNodeThumbs.forEach(function (img) {
      img.src = src;
    });
  }

  syncSku(packshotSrc);

  function stopReel() {
    reel.pause();
    try {
      reel.currentTime = 0;
    } catch (e) {
      /* ignore unready media */
    }
  }

  function playReel() {
    reel.preload = "auto";
    try {
      reel.currentTime = 0;
    } catch (e) {
      /* ignore */
    }
    var play = reel.play();
    if (play && play.catch) play.catch(function () {});
  }

  function waitForReel(token) {
    var min = reducedMotion() ? 400 : 5200;
    var max = reducedMotion() ? 800 : 9000;
    var started = Date.now();
    return new Promise(function (resolve) {
      var done = false;
      var poll;
      function finish() {
        if (done) return;
        done = true;
        if (poll) window.clearInterval(poll);
        reel.removeEventListener("ended", onEnded);
        reel.removeEventListener("error", onEnded);
        resolve(token === runToken);
      }
      function onEnded() {
        var remain = Math.max(0, min - (Date.now() - started));
        window.setTimeout(finish, remain);
      }
      reel.addEventListener("ended", onEnded);
      reel.addEventListener("error", onEnded);
      poll = window.setInterval(function () {
        if (token !== runToken) {
          window.clearInterval(poll);
          finish();
        }
      }, 100);
      window.setTimeout(function () {
        window.clearInterval(poll);
        finish();
      }, max);
    });
  }

  function runChoreography() {
    var token = ++runToken;
    running = true;
    stopReel();
    return (async function () {
      show(lcp);
      setFig(0);
      if (!(await wait(reducedMotion() ? 240 : 1200, token))) return;

      show(grid);
      setFig(1);
      if (!(await wait(reducedMotion() ? 320 : 2400, token))) return;

      show(film);
      setFig(2);
      if (!(await wait(reducedMotion() ? 320 : 2400, token))) return;

      show(reel);
      setFig(3);
      playReel();
      if (!(await waitForReel(token))) return;

      show(typeStill);
      setFig(4);
      stopReel();
      running = false;
    })().catch(function () {
      running = false;
    });
  }

  function onFiles(files) {
    var file = files && files[0];
    if (!file || file.type.indexOf("image/") !== 0) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    packshotSrc = objectUrl;
    syncSku(packshotSrc);
    runChoreography();
  }

  document.querySelectorAll("[data-open-file]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      fileInput.click();
    });
  });

  document.querySelectorAll("[data-run-aurelia]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      runChoreography();
    });
  });

  fileInput.addEventListener("change", function () {
    onFiles(fileInput.files);
    fileInput.value = "";
  });

  stage.addEventListener("click", function (e) {
    if (e.target.closest("a, button")) return;
    if (running) return;
    runChoreography();
  });

  stage.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      runChoreography();
    }
  });

  window.addEventListener("dragover", function (e) {
    e.preventDefault();
    if (stage.contains(e.target) || e.target === stage) {
      stage.classList.add("is-drop");
    }
  });

  window.addEventListener("dragleave", function (e) {
    if (!stage.contains(e.relatedTarget)) stage.classList.remove("is-drop");
  });

  window.addEventListener("drop", function (e) {
    e.preventDefault();
    stage.classList.remove("is-drop");
    if (stage.contains(e.target) || e.target === stage) {
      onFiles(e.dataTransfer.files);
    }
  });

  /* —— Three.js: idle, offscreen pause, skip reduced motion —— */
  var threeState = {
    renderer: null,
    raf: false,
    visible: true,
    pageHidden: false,
  };

  function shouldAnimateKnot() {
    return threeState.renderer && threeState.visible && !threeState.pageHidden && !reducedMotion();
  }

  function initKnot(THREE) {
    if (!knotCanvas || threeState.renderer) return;

    var renderer = new THREE.WebGLRenderer({
      canvas: knotCanvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x0e1116, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0, 0.12, 5.6);

    var knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.55, 0.42, 180, 28),
      new THREE.MeshStandardMaterial({
        color: 0xc4a35a,
        metalness: 1,
        roughness: 0.22,
        envMapIntensity: 1.2,
      })
    );
    scene.add(knot);

    scene.add(new THREE.AmbientLight(0x2a2418, 0.55));

    var key = new THREE.DirectionalLight(0xfff4dc, 1.35);
    key.position.set(-3.2, 2.4, 4);
    scene.add(key);

    var rim = new THREE.PointLight(0xe9ff3a, 3.4, 18, 2);
    rim.position.set(3.4, 0.6, -2.4);
    scene.add(rim);

    var fill = new THREE.PointLight(0x8a6a2a, 1.1, 12);
    fill.position.set(-2.2, -1.8, 2);
    scene.add(fill);

    function resize() {
      var w = knotCanvas.clientWidth || 1;
      var h = knotCanvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    var t = 0;
    function frame(now) {
      if (!shouldAnimateKnot()) {
        threeState.raf = false;
        return;
      }
      t = now * 0.00018;
      knot.rotation.x = 0.42 + Math.sin(t) * 0.08;
      knot.rotation.y = t * 1.15;
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }

    function play() {
      if (threeState.raf || !shouldAnimateKnot()) return;
      threeState.raf = true;
      requestAnimationFrame(frame);
    }

    threeState.renderer = renderer;
    threeState.play = play;
    threeState.resize = resize;

    resize();
    window.addEventListener("resize", resize, { passive: true });
    play();
  }

  function scheduleThree() {
    if (reducedMotion()) return;
    var start = function () {
      import(THREE_URL)
        .then(function (THREE) {
          try {
            initKnot(THREE);
          } catch (e) {
            /* WebGL unavailable — poster still stands */
          }
        })
        .catch(function () {});
    };
    if ("requestIdleCallback" in window) {
      requestIdleCallback(start, { timeout: 1400 });
    } else {
      window.setTimeout(start, 700);
    }
  }

  if (knotCanvas && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        threeState.visible = entries.some(function (e) {
          return e.isIntersecting;
        });
        if (threeState.visible && threeState.play) threeState.play();
      },
      { threshold: 0.08 }
    );
    io.observe(stage);
  }

  document.addEventListener("visibilitychange", function () {
    threeState.pageHidden = document.hidden;
    if (!document.hidden && threeState.play) threeState.play();
    if (document.hidden) reel.pause();
  });

  scheduleThree();
})();
