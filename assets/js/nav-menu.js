/* 狭い画面: 言語切替を開いたメニューの末尾へ移す。広い画面ではヘッダー先頭に戻す。 */
(function () {
  var header = document.querySelector(".site-header");
  if (!header) return;
  var menu = header.querySelector(".nav-menu");
  var inner = header.querySelector(".header-inner");
  var nav = header.querySelector("#site-nav");
  var lang = header.querySelector(".lang-bar");
  if (!menu || !inner || !nav) return;

  var mq = window.matchMedia("(max-width: 48rem)");

  function placeLang() {
    if (!lang) return;
    if (mq.matches) {
      if (lang.parentNode !== nav) nav.appendChild(lang);
    } else if (lang.parentNode !== header || lang.nextElementSibling !== inner) {
      header.insertBefore(lang, inner);
    }
  }

  placeLang();
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", placeLang);
  } else if (typeof mq.addListener === "function") {
    mq.addListener(placeLang);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !menu.open) return;
    menu.open = false;
    var summary = menu.querySelector(".nav-toggle");
    if (summary) summary.focus();
  });

  document.addEventListener("click", function (e) {
    if (!menu.open || header.contains(e.target)) return;
    menu.open = false;
  });
})();
