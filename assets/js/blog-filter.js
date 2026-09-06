(function () {
  "use strict";

  var root = document.querySelector("[data-blog-filters]");
  if (!root) return;

  var cards = Array.prototype.slice.call(document.querySelectorAll(".blog-index-card[data-search]"));
  var empty = document.querySelector("[data-blog-empty]");
  var input = root.querySelector("[data-blog-filter-input]");
  var clearBtn = root.querySelector("[data-blog-filter-clear]");
  var panel = root.querySelector("[data-blog-suggest]");
  if (!input || !panel) return;

  var TAGS = ["開発", "CLI", "エラーレポート", "デザイン", "納品", "広報", "プレス", "AIエージェント"];
  var AUTHORS = ["佐野 凛"];

  function normalize(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, "");
  }

  function apply(query) {
    var q = normalize(query);
    var visible = 0;
    cards.forEach(function (card) {
      var hay = normalize(card.getAttribute("data-search") || "");
      var show = !q || hay.indexOf(q) !== -1;
      card.classList.toggle("is-hidden", !show);
      if (show) visible += 1;
    });
    if (empty) empty.classList.toggle("is-visible", visible === 0);
    if (clearBtn) clearBtn.classList.toggle("is-visible", Boolean(String(query || "").trim()));
  }

  function setQuery(q, pushHash) {
    input.value = q;
    apply(q);
    renderSuggest(q);
    if (pushHash) {
      if (q) history.replaceState(null, "", "#" + encodeURIComponent(q));
      else history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function matchList(list, q) {
    var nq = normalize(q);
    if (!nq) return list.slice();
    return list.filter(function (item) {
      return normalize(item).indexOf(nq) !== -1;
    });
  }

  function renderSuggest(q) {
    var tags = matchList(TAGS, q);
    var authors = matchList(AUTHORS, q);
    var html = "";
    if (tags.length) {
      html += '<p class="blog-suggest-heading">タグ</p><ul class="blog-suggest-list">';
      tags.forEach(function (t) {
        html += '<li><button type="button" class="blog-suggest-item" data-suggest-value="' + t + '">' + t + "</button></li>";
      });
      html += "</ul>";
    }
    if (authors.length) {
      html += '<p class="blog-suggest-heading">筆者</p><ul class="blog-suggest-list">';
      authors.forEach(function (a) {
        html += '<li><button type="button" class="blog-suggest-item" data-suggest-value="' + a + '">' + a + "</button></li>";
      });
      html += "</ul>";
    }
    panel.innerHTML = html;
    panel.hidden = !html || document.activeElement !== input;
  }

  function openSuggest() {
    renderSuggest(input.value);
    panel.hidden = !panel.innerHTML;
  }

  function closeSuggest() {
    panel.hidden = true;
  }

  input.addEventListener("input", function () {
    setQuery(input.value, true);
    openSuggest();
  });
  input.addEventListener("focus", openSuggest);
  input.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closeSuggest();
  });

  panel.addEventListener("mousedown", function (ev) {
    // keep focus on input; mousedown before blur
    ev.preventDefault();
  });
  panel.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-suggest-value]");
    if (!btn) return;
    setQuery(btn.getAttribute("data-suggest-value"), true);
    closeSuggest();
    input.focus();
  });

  document.addEventListener("click", function (ev) {
    if (!root.contains(ev.target)) closeSuggest();
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      setQuery("", true);
      openSuggest();
      input.focus();
    });
  }

  document.querySelectorAll(".blog-index-card .blog-tag").forEach(function (el) {
    el.addEventListener("click", function (ev) {
      ev.preventDefault();
      var v = el.getAttribute("data-tag") || el.textContent.trim();
      setQuery(v, true);
      closeSuggest();
      input.focus();
    });
  });

  var hash = decodeURIComponent((location.hash || "").replace(/^#/, ""));
  if (hash) setQuery(hash, false);
  else apply("");
  closeSuggest();
})();
