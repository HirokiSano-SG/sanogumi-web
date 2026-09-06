(function () {
  "use strict";

  var root = document.querySelector("[data-blog-filters]");
  if (!root) return;

  var cards = Array.prototype.slice.call(document.querySelectorAll(".blog-index-card[data-search]"));
  var empty = document.querySelector("[data-blog-empty]");
  var input = root.querySelector("[data-blog-filter-input]");
  var clearBtn = root.querySelector("[data-blog-filter-clear]");
  if (!input) return;

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
    if (pushHash) {
      if (q) history.replaceState(null, "", "#" + encodeURIComponent(q));
      else history.replaceState(null, "", location.pathname + location.search);
    }
  }

  input.addEventListener("input", function () {
    setQuery(input.value, true);
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      setQuery("", true);
      input.focus();
    });
  }

  document.querySelectorAll(".blog-index-card .blog-tag").forEach(function (el) {
    el.addEventListener("click", function (ev) {
      ev.preventDefault();
      var v = el.getAttribute("data-tag") || el.textContent.trim();
      setQuery(v, true);
      input.focus();
    });
  });

  var hash = decodeURIComponent((location.hash || "").replace(/^#/, ""));
  if (hash) setQuery(hash, false);
  else apply("");
})();
