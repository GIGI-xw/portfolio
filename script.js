/* ============================================================
   GiGi 作品集 — 全部交互脚本
   1. 主题切换（亮/暗）
   2. 滚动进度条
   3. 滚动揭示动画
   4. 数字计数动画（滚动到视口时）
   5. 作品分类过滤
   6. 项目案例 Modal（打开 / 关闭 / 上一个 / 下一个 / 键盘）
   7. 复制邮箱 / 微信号（含成功反馈）
   8. 返回顶部（浮动按钮 + 滚动显示）
   9. 自定义光标 + 悬停标签（data-cursor）
  10. 平滑滚动跳转按钮（data-scroll）
  11. 页脚年份
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =============================
     工具
     ============================= */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts || false); }

  /* =============================
     0. 入口互动页（点击进入）
     ============================= */
  (function intro() {
    var introEl = $("[data-intro]");
    var enterBtn = $("[data-intro-enter]");
    if (!introEl || !enterBtn) return;

    // 每次打开都显示入口页（不记忆状态）
    // 锁定主页面滚动
    document.body.classList.add("is-intro-lock");

    function enter(e) {
      if (e) e.preventDefault();
      introEl.classList.add("is-hidden");
      document.body.classList.remove("is-intro-lock");
      // 聚焦到主内容，便于键盘访问
      var main = document.getElementById("top");
      if (main) { main.setAttribute("tabindex", "-1"); main.focus({ preventScroll: true }); }
      // 动画结束后移除节点，避免长期遮挡
      setTimeout(function () { if (introEl && introEl.parentNode) introEl.parentNode.removeChild(introEl); }, 900);
    }

    on(enterBtn, "click", enter);

    // 支持回车 / 空格键进入
    on(document, "keydown", function (e) {
      if (introEl.classList.contains("is-hidden")) return;
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        enter(e);
      }
    });
  })();

  /* =============================
     1. 主题切换
     ============================= */
  (function themeToggle() {
    var root = document.documentElement;
    var btn = $("[data-theme-toggle]");
    var saved = null;
    try { saved = localStorage.getItem("gigi-theme"); } catch (e) {}

    // 初始：优先存储 → 其次跟随系统
    var initial = saved;
    if (!initial) {
      var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      initial = prefersDark ? "dark" : "light";
    }
    root.setAttribute("data-theme", initial);

    function setTheme(t) {
      root.setAttribute("data-theme", t);
      try { localStorage.setItem("gigi-theme", t); } catch (e) {}
    }

    on(btn, "click", function () {
      var now = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      setTheme(now);
    });
  })();

  /* =============================
     2. 滚动进度条
     ============================= */
  (function progressBar() {
    var bar = $("[data-progress]");
    if (!bar) return;
    function update() {
      var h = document.documentElement;
      var total = h.scrollHeight - h.clientHeight;
      var p = total > 0 ? h.scrollTop / total : 0;
      bar.style.width = (p * 100).toFixed(2) + "%";
    }
    on(window, "scroll", update, { passive: true });
    on(window, "resize", update);
    update();
  })();

  /* =============================
     3. 滚动揭示
     ============================= */
  (function reveal() {
    var els = $$("[data-reveal]");
    if (!els.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* =============================
     4. 数字计数动画
     ============================= */
  (function counters() {
    var nums = $$("[data-count]");
    if (!nums.length) return;

    function run(el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      var dur = reduceMotion ? 0 : 1200;
      var start = performance.now();

      function tick(now) {
        var t = Math.min(1, (now - start) / dur);
        // easeOutCubic
        var e = 1 - Math.pow(1 - t, 3);
        var val = Math.round(target * e);
        el.textContent = val.toString();
        if (t < 1) requestAnimationFrame(tick);
      }
      if (dur === 0) {
        el.textContent = target.toString();
      } else {
        requestAnimationFrame(tick);
      }
    }

    if (reduceMotion || !("IntersectionObserver" in window)) {
      nums.forEach(run);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          run(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    nums.forEach(function (el) { io.observe(el); });
  })();

  /* =============================
     5. 作品分类过滤
     ============================= */
  (function filters() {
    var btns = $$(".filter");
    var projects = $$(".project");
    var empty = $("[data-empty]");
    if (!btns.length || !projects.length) return;

    // 为"全部"按钮填入真实项目数量
    var allBtn = btns.find(function (b) { return b.getAttribute("data-filter") === "all"; });
    if (allBtn) {
      var i = allBtn.querySelector("i");
      if (i) i.textContent = "(" + projects.length + ")";
    }

    btns.forEach(function (btn) {
      on(btn, "click", function () {
        var f = btn.getAttribute("data-filter");
        btns.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-selected", active ? "true" : "false");
        });

        var visible = 0;
        projects.forEach(function (p) {
          var cats = (p.getAttribute("data-category") || "").split(/\s+/);
          var match = f === "all" || cats.indexOf(f) !== -1;
          p.classList.toggle("is-hidden", !match);
          if (match) visible++;
        });
        if (empty) empty.hidden = visible > 0;
      });
    });
  })();

  /* =============================
     6. Modal 项目案例弹窗
     ============================= */
  (function modal() {
    var modal = $("[data-modal]");
    if (!modal) return;
    var title = $("[data-modal-title]", modal);
    var yearEl = $("[data-modal-year]", modal);
    var desc = $("[data-modal-desc]", modal);
    var tagsEl = $("[data-modal-tags]", modal);
    var indexEl = $("[data-modal-index]", modal);
    var heroSlot = $("[data-modal-slot]", modal);
    var btnPrev = $("[data-modal-prev]", modal);
    var btnNext = $("[data-modal-next]", modal);
    var bodyEl = document.body;
    var lastFocus = null;

    var projects = $$(".project");
    var idx = 0;
    var open = false;

    function pad(n) { return n < 10 ? "0" + n : "" + n; }

    function render(i) {
      var p = projects[i];
      if (!p) return;
      var h3 = $("h3", p);
      var t = $(".project__year", p);
      var d = $(".project__desc", p);
      var tags = $$(".project__tags li", p);
      var slot = p.getAttribute("data-slot");

      if (title) title.innerHTML = h3 ? h3.innerHTML : "";
      if (yearEl) yearEl.textContent = t ? t.textContent : "";
      if (desc) desc.textContent = d ? d.textContent : "";
      if (tagsEl) {
        tagsEl.innerHTML = "";
        tags.forEach(function (tag) {
          var li = document.createElement("li");
          li.textContent = tag.textContent;
          tagsEl.appendChild(li);
        });
      }
      if (indexEl) indexEl.textContent = pad(i + 1) + " / " + pad(projects.length);

      // hero 区域：复制 slot 占位
      if (heroSlot) {
        heroSlot.innerHTML =
          '<div class="media__placeholder">' +
          '<span class="media__num">' + pad(i + 1) + '</span>' +
          '<span class="media__hint">图片占位 · Slot ' + (slot || (i + 1)) + '</span>' +
          '</div>';
      }

      if (btnPrev) btnPrev.disabled = i <= 0;
      if (btnNext) btnNext.disabled = i >= projects.length - 1;
    }

    function openAt(i) {
      idx = Math.max(0, Math.min(projects.length - 1, i));
      render(idx);
      open = true;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      lastFocus = document.activeElement;
      bodyEl.style.overflow = "hidden";
      var closeBtn = $("[data-modal-close].btn", modal);
      if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 80);
    }
    function close() {
      open = false;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      bodyEl.style.overflow = "";
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    // 点击项目卡片打开
    $$("[data-case]").forEach(function (link) {
      on(link, "click", function (e) {
        e.preventDefault();
        var p = link.closest(".project");
        var i = projects.indexOf(p);
        if (i !== -1) openAt(i);
      });
    });

    // 关闭按钮 + scrim
    $$("[data-modal-close]", modal).forEach(function (el) {
      on(el, "click", close);
    });
    on(btnPrev, "click", function () { if (idx > 0) openAt(idx - 1); });
    on(btnNext, "click", function () { if (idx < projects.length - 1) openAt(idx + 1); });

    // 键盘
    on(document, "keydown", function (e) {
      if (!open) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") { if (idx < projects.length - 1) openAt(idx + 1); }
      else if (e.key === "ArrowLeft")  { if (idx > 0) openAt(idx - 1); }
    });
  })();

  /* =============================
     6.5 项目卡片轮播（每个项目可放多张图，左右滑动切换）
     ============================= */
  (function carousel() {
    var carousels = $$("[data-carousel]");
    if (!carousels.length) return;

    carousels.forEach(function (root) {
      var track = $("[data-carousel-track]", root);
      if (!track) return;
      var slides = $$(".carousel__slide", root);
      if (slides.length <= 1) return;

      var dotsContainer = $("[data-carousel-dots]", root);
      var countEl = $("[data-carousel-count]", root);
      var prevBtn = $("[data-carousel-prev]", root);
      var nextBtn = $("[data-carousel-next]", root);
      var current = 0;
      var total = slides.length;

      // 创建指示点
      var dots = [];
      if (dotsContainer) {
        dotsContainer.innerHTML = "";
        slides.forEach(function (_, i) {
          var dot = document.createElement("button");
          dot.className = "carousel__dot" + (i === 0 ? " is-active" : "");
          dot.type = "button";
          dot.setAttribute("aria-label", "第 " + (i + 1) + " 张");
          dot.setAttribute("data-carousel-dot", i);
          dotsContainer.appendChild(dot);
          dots.push(dot);
        });
      }

      function update() {
        track.style.transform = "translateX(-" + (current * 100) + "%)";
        slides.forEach(function (s, i) {
          s.classList.toggle("is-active", i === current);
        });
        dots.forEach(function (d, i) {
          d.classList.toggle("is-active", i === current);
        });
        if (countEl) countEl.textContent = (current + 1) + " / " + total;
        if (prevBtn) prevBtn.disabled = current <= 0;
        if (nextBtn) nextBtn.disabled = current >= total - 1;
      }

      function go(i) {
        current = Math.max(0, Math.min(total - 1, i));
        update();
      }

      // 按钮切换（阻止冒泡到 .project__link 避免触发案例弹窗）
      if (prevBtn) {
        on(prevBtn, "click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          go(current - 1);
        });
      }
      if (nextBtn) {
        on(nextBtn, "click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          go(current + 1);
        });
      }

      // 点击指示点
      dots.forEach(function (dot, i) {
        on(dot, "click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          go(i);
        });
      });

      // 触摸滑动（手机端）
      var startX = 0, startY = 0, dragging = false, moved = false;
      on(root, "touchstart", function (e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        dragging = true;
        moved = false;
      }, { passive: true });
      on(root, "touchmove", function (e) {
        if (!dragging) return;
        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          moved = true;
        }
      }, { passive: true });
      on(root, "touchend", function (e) {
        if (!dragging) return;
        dragging = false;
        var dx = e.changedTouches[0].clientX - startX;
        var dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) go(current - 1);
          else go(current + 1);
        }
      }, { passive: true });

      // 鼠标拖拽（桌面端）
      var mouseDown = false, mouseStartX = 0, suppressClick = false;
      on(root, "mousedown", function (e) {
        if (e.target.closest(".carousel__btn") || e.target.closest(".carousel__dot")) return;
        mouseDown = true;
        mouseStartX = e.clientX;
        root.classList.add("is-dragging");
      });
      on(document, "mouseup", function (e) {
        if (!mouseDown) return;
        mouseDown = false;
        root.classList.remove("is-dragging");
        var dx = e.clientX - mouseStartX;
        if (Math.abs(dx) > 50) {
          if (dx > 0) go(current - 1);
          else go(current + 1);
          // 拖动切换后阻止接下来的 click 打开案例弹窗
          suppressClick = true;
          setTimeout(function () { suppressClick = false; }, 50);
        }
      });
      // 拖动后阻止 click 冒泡到 .project__link
      on(root, "click", function (e) {
        if (suppressClick) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);

      // 键盘左右（当焦点在轮播内时）
      on(root, "keydown", function (e) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          e.stopPropagation();
          go(current - 1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          e.stopPropagation();
          go(current + 1);
        }
      });

      update();
    });

    // .project__link 现在是 div[role=button]，需要 Enter/Space 触发点击
    // 但要排除点击在轮播按钮/指示点上的情况（已在各按钮上 stopPropagation）
    $$("[data-case]").forEach(function (link) {
      on(link, "keydown", function (e) {
        if (e.key === "Enter" || (e.key === " " && e.target === link)) {
          e.preventDefault();
          link.click();
        }
      });
    });
  })();

  /* =============================
     7. 复制按钮（data-copy）
     ============================= */
  (function copy() {
    $$("[data-copy]").forEach(function (btn) {
      var text = btn.getAttribute("data-copy");
      var label = $(".copy-text", btn);
      on(btn, "click", function () {
        var done = function () {
          btn.classList.add("is-copied");
          setTimeout(function () { btn.classList.remove("is-copied"); }, 1800);
        };
        var fallback = function () {
          try {
            var ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            done();
          } catch (e) {}
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, fallback);
        } else {
          fallback();
        }
      });
    });
  })();

  /* =============================
     8. 返回顶部
     ============================= */
  (function toTop() {
    var btn = $("[data-to-top]");
    if (!btn) return;
    var THRESH = 480;
    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      btn.classList.toggle("is-visible", y > THRESH);
    }
    on(window, "scroll", update, { passive: true });
    on(btn, "click", function () {
      if (reduceMotion) {
        document.documentElement.scrollTop = 0;
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    update();
  })();

  /* =============================
     9. 自定义光标 + 标签
     ============================= */
  (function customCursor() {
    var cursor = $(".cursor");
    if (!cursor) return;
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!canHover) { cursor.style.display = "none"; return; }

    var label = $("[data-cursor-label]", cursor);
    var x = 0, y = 0, tx = 0, ty = 0;

    on(document, "mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      cursor.classList.add("is-active");
    });
    on(document, "mouseleave", function () {
      cursor.classList.remove("is-active");
    });

    // 主循环
    (function loop() {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      cursor.style.left = x + "px";
      cursor.style.top  = y + "px";
      requestAnimationFrame(loop);
    })();

    // hover 态：a / button / [data-case] / .media / .project__link / .social / .filter
    var hoverSel = "a, button, [data-case], [data-eco-showcase], .media, .project__link, .social, .filter, .copy-btn";
    function enter() { cursor.classList.add("is-hover"); }
    function leave() { cursor.classList.remove("is-hover"); }

    function bindHover() {
      $$(hoverSel).forEach(function (el) {
        if (el.__cursorBound) return;
        el.__cursorBound = true;
        on(el, "mouseenter", enter);
        on(el, "mouseleave", leave);
      });
    }
    bindHover();

    // 文字标签：data-cursor
    function updateLabelFromTarget(target) {
      var el = target && target.closest ? target.closest("[data-cursor]") : null;
      if (el) {
        var txt = el.getAttribute("data-cursor") || "";
        if (txt) {
          if (label.textContent !== txt) label.textContent = txt;
          cursor.classList.add("has-label");
          return true;
        }
      }
      cursor.classList.remove("has-label");
      return false;
    }
    on(document, "mouseover", function (e) { updateLabelFromTarget(e.target); });
    on(document, "mouseout", function (e) {
      // 只在移出带标签元素时清理
      var rt = e.relatedTarget;
      var wasLabeled = e.target && e.target.closest && e.target.closest("[data-cursor]");
      var nowLabeled = rt && rt.closest && rt.closest("[data-cursor]");
      if (wasLabeled && !nowLabeled) cursor.classList.remove("has-label");
    });
  })();

  /* =============================
     10. 平滑滚动跳转（data-scroll）
     ============================= */
  (function scrollTo() {
    $$("[data-scroll]").forEach(function (btn) {
      on(btn, "click", function (e) {
        var sel = btn.getAttribute("data-scroll");
        if (!sel) return;
        var el = document.querySelector(sel);
        if (!el) return;
        e.preventDefault();
        if (reduceMotion) {
          el.scrollIntoView();
        } else {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  })();

  /* =============================
     11. 页脚年份
     ============================= */
  (function year() {
    var el = $("[data-year]");
    if (el) el.textContent = new Date().getFullYear().toString();
  })();

  /* =============================
     12. 电商合集细分展示（Eco Showcase）
     ============================= */
  (function ecoShowcase() {
    var panel = $("[data-eco-showcase-panel]");
    if (!panel) return;
    var triggers = $$("[data-eco-showcase]");
    var closeBtns = $$("[data-eco-close]", panel);
    var lastFocus = null;
    var open = false;

    function openPanel(trigger) {
      open = true;
      lastFocus = trigger || document.activeElement;
      panel.classList.add("is-open");
      panel.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      var inner = $(".eco-showcase__inner", panel);
      if (inner) inner.scrollTop = 0;
      var c = $("[data-eco-close]", panel);
      if (c) setTimeout(function () { c.focus(); }, 60);
    }
    function closePanel() {
      open = false;
      panel.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    triggers.forEach(function (t) {
      on(t, "click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openPanel(t);
      });
      on(t, "keydown", function (e) {
        if (e.key === "Enter" || (e.key === " " && e.target === t)) {
          e.preventDefault();
          openPanel(t);
        }
      });
    });

    closeBtns.forEach(function (b) { on(b, "click", closePanel); });

    on(document, "keydown", function (e) {
      if (!open) return;
      if (e.key === "Escape") { e.preventDefault(); closePanel(); }
    });

    // 点击空白背景关闭（点击 inner 空隙）
    on(panel, "click", function (e) {
      if (e.target === panel) closePanel();
    });
  })();

})();
