(function () {
  var CDN = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
  var loaded = false;
  var loading = false;
  var queue = [];

  function onLoad() {
    loaded = true;
    loading = false;
    queue.forEach(function (fn) { fn(); });
    queue = [];
  }

  function loadLibrary(cb) {
    if (loaded) { cb(); return; }
    queue.push(cb);
    if (loading) return;
    loading = true;
    var s = document.createElement('script');
    s.src = CDN;
    s.onload = onLoad;
    document.head.appendChild(s);
  }

  function fireBlast() {
    var count = 220;
    var origin = { y: 0.6 };

    function burst(ratio, opts) {
      window.confetti(Object.assign({ particleCount: Math.floor(count * ratio), origin: origin }, opts));
    }

    burst(0.25, { spread: 26,  startVelocity: 55 });
    burst(0.20, { spread: 60 });
    burst(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    burst(0.10, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    burst(0.10, { spread: 120, startVelocity: 45 });
  }

  function triggerAutumnLeaves() {
    var end = Date.now() + 5000;
    var colors = ['#D35400', '#E67E22', '#F39C12', '#F1C40F'];
    var leaf1, leaf2;
    try {
      leaf1 = window.confetti.shapeFromText({ text: '🍂', scalar: 2 });
      leaf2 = window.confetti.shapeFromText({ text: '🍁', scalar: 2 });
    } catch (_) {
      fireBlast();
      return;
    }

    (function frame() {
      window.confetti({
        particleCount: 2,
        angle: 90,
        spread: 70,
        startVelocity: 12,
        origin: { x: Math.random(), y: -0.1 },
        colors: colors,
        gravity: 0.5 + Math.random() * 0.3,
        drift: (Math.random() - 0.5) * 3,
        scalar: 1 + Math.random(),
        shapes: [Math.random() < 0.5 ? leaf1 : leaf2],
        ticks: 450
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var confettiBtn = document.getElementById('confettiBtn');
    if (confettiBtn) confettiBtn.addEventListener('click', function () { loadLibrary(fireBlast); });

    var leavesBtn = document.getElementById('leavesBtn');
    if (leavesBtn) leavesBtn.addEventListener('click', function () { loadLibrary(triggerAutumnLeaves); });
  });
})();
