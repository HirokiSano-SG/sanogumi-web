(function () {
  "use strict";

  // ブログ一覧の検索欄。
  // 本文の全文検索は Pagefind（/pagefind/、tools/web-i18n/pagefind.py が作る静的な索引）に任せ、
  // 一覧の HTML にはカードの見出し・タグ・筆者・要約だけを持つ。
  // Pagefind が読めないとき（file:// や索引が無いとき）は、カードに出ている文字だけで絞る。

  var root = document.querySelector("[data-blog-filters]");
  if (!root) return;

  var cards = Array.prototype.slice.call(document.querySelectorAll(".blog-index-card"));
  var empty = document.querySelector("[data-blog-empty]");
  var popular = document.querySelector("[data-blog-popular]");
  var input = root.querySelector("[data-blog-filter-input]");
  var clearBtn = root.querySelector("[data-blog-filter-clear]");
  var panel = root.querySelector("[data-blog-suggest]");
  if (!input || !panel) return;

  var TAGS = ["開発", "CLI", "エラーレポート", "デザイン", "納品", "広報", "プレス", "AIエージェント"];
  var AUTHORS = ["佐野 凛"];
  var PAGEFIND_URL = "/pagefind/pagefind.js";
  var DEBOUNCE_MS = 150;

  function normalize(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, "");
  }

  function pathOf(href) {
    // "/blog/slug/index.html" も "/blog/slug/" も同じ記事として扱う
    var p = String(href || "").replace(/^https?:\/\/[^/]+/, "").split(/[?#]/)[0];
    p = p.replace(/index\.html$/, "");
    if (p.charAt(p.length - 1) !== "/") p += "/";
    return p;
  }

  // カードに出ている文字（見出し・日付・タグ・筆者・要約）。Pagefind と並べて使う
  cards.forEach(function (card) {
    var link = card.querySelector(".blog-index-title a");
    card._path = link ? pathOf(link.getAttribute("href")) : "";
    card._hay = normalize(card.textContent + " " + (card.getAttribute("data-tags") || "") + " " + (card.getAttribute("data-author") || ""));
  });

  // ---- Pagefind ----
  var pagefind = null;        // 読めたら API、読めなければ false
  var pagefindLoading = null;

  function loadPagefind() {
    if (pagefindLoading) return pagefindLoading;
    pagefindLoading = new Promise(function (resolve) {
      var load;
      try {
        // 古いブラウザが import() 自体で構文エラーにならないよう、文字列から作る
        load = new Function("u", "return import(u)");
      } catch (e) {
        pagefind = false;
        resolve(false);
        return;
      }
      load(PAGEFIND_URL).then(function (mod) {
        return mod.init().then(function () {
          pagefind = mod;
          resolve(mod);
        });
      }).catch(function () {
        pagefind = false;
        resolve(false);
      });
    });
    return pagefindLoading;
  }

  // Pagefind に聞いて、当たった記事のパスの集まりを返す。読めなければ null
  function searchPagefind(q) {
    return loadPagefind().then(function (pf) {
      if (!pf) return null;
      return pf.search(q).then(function (res) {
        return Promise.all(res.results.map(function (r) { return r.data(); }));
      }).then(function (datas) {
        var set = {};
        datas.forEach(function (d) { set[pathOf(d.url)] = true; });
        return set;
      }).catch(function () {
        return null;
      });
    });
  }

  // ---- 絞り込み ----
  var seq = 0;

  function show(query, hits) {
    var q = normalize(query);
    var visible = 0;
    cards.forEach(function (card) {
      var ok = !q || card._hay.indexOf(q) !== -1 || (hits && hits[card._path]);
      card.classList.toggle("is-hidden", !ok);
      if (ok) visible += 1;
    });
    if (empty) empty.classList.toggle("is-visible", visible === 0);
    if (popular) popular.classList.toggle("is-hidden", Boolean(q)); // 絞っている間は「人気の記事」を隠す
    if (clearBtn) clearBtn.classList.toggle("is-visible", Boolean(String(query || "").trim()));
  }

  function apply(query) {
    var my = ++seq;
    var q = String(query || "").trim();
    if (!q) {
      show("", null);
      return;
    }
    // Pagefind がまだ無ければ、カードの文字で先に絞っておく（答えが来たら足す）
    if (!pagefind) show(q, null);
    searchPagefind(q).then(function (hits) {
      if (my !== seq) return; // 打ち直されたあとの古い答えは捨てる
      if (hits) show(q, hits);
    });
  }

  var timer = null;
  function applySoon(query) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      apply(query);
    }, DEBOUNCE_MS);
  }

  function setQuery(q, pushHash, now) {
    input.value = q;
    if (now) {
      if (timer) { clearTimeout(timer); timer = null; }
      apply(q);
    } else {
      applySoon(q);
    }
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
    setQuery(input.value, true, false);
    openSuggest();
  });
  input.addEventListener("focus", function () {
    loadPagefind(); // 打ち始める前に索引の本体を読んでおく
    openSuggest();
  });
  input.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closeSuggest();
    if (ev.key === "Enter") {
      ev.preventDefault();
      setQuery(input.value, true, true);
      closeSuggest();
    }
  });

  panel.addEventListener("mousedown", function (ev) {
    // keep focus on input; mousedown before blur
    ev.preventDefault();
  });
  panel.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-suggest-value]");
    if (!btn) return;
    setQuery(btn.getAttribute("data-suggest-value"), true, true);
    closeSuggest();
    input.focus();
  });

  document.addEventListener("click", function (ev) {
    if (!root.contains(ev.target)) closeSuggest();
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      setQuery("", true, true);
      openSuggest();
      input.focus();
    });
  }

  document.querySelectorAll(".blog-index-card .blog-tag").forEach(function (el) {
    el.addEventListener("click", function (ev) {
      ev.preventDefault();
      var v = el.getAttribute("data-tag") || el.textContent.trim();
      setQuery(v, true, true);
      closeSuggest();
      input.focus();
    });
  });

  var hash = decodeURIComponent((location.hash || "").replace(/^#/, ""));
  if (hash) setQuery(hash, false, true);
  else apply("");
  closeSuggest();
})();
