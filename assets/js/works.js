(function () {
  "use strict";

  var root = document.querySelector("[data-works]");
  if (!root) return;

  var src = root.getAttribute("data-works-src") || "works.json";
  var limitAttr = root.getAttribute("data-works-limit");
  var limit = limitAttr ? parseInt(limitAttr, 10) : NaN;

  function text(value) {
    return value == null ? "" : String(value);
  }

  function el(tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = content;
    return node;
  }

  function addMeta(dl, label, value) {
    if (!text(value)) return;
    dl.appendChild(el("dt", null, label));
    dl.appendChild(el("dd", null, value));
  }

  function renderLink(item) {
    var li = el("li");
    var label = text(item && item.label);
    var url = text(item && item.url);
    var status = text(item && item.status);
    var labelNode;

    if (url) {
      labelNode = el("a");
      labelNode.href = url;
      labelNode.textContent = label || url;
      if (/^https?:\/\//i.test(url)) {
        labelNode.rel = "noopener noreferrer";
      }
    } else {
      labelNode = document.createTextNode(label);
    }

    li.appendChild(labelNode);
    if (status) {
      li.appendChild(document.createTextNode(" "));
      li.appendChild(el("span", "status-note", "（" + status + "）"));
    }
    return li;
  }

  function renderCard(work) {
    var article = el("article", "card work-card");
    if (work.id) article.id = text(work.id);

    article.appendChild(el("h3", "work-title", text(work.title)));
    if (work.titleEn) {
      article.appendChild(el("p", "work-title-en", text(work.titleEn)));
    }

    var dl = el("dl", "work-meta");
    addMeta(dl, "ジャンル", work.kind);
    addMeta(dl, text(work.priceNote) || "価格", work.price);
    addMeta(dl, "対応", work.platforms);
    addMeta(dl, "販売元", work.publisher);
    if (dl.childNodes.length) article.appendChild(dl);

    if (Array.isArray(work.links) && work.links.length) {
      var ul = el("ul", "work-links");
      work.links.forEach(function (item) {
        ul.appendChild(renderLink(item));
      });
      article.appendChild(ul);
    }

    return article;
  }

  function showMessage(message) {
    root.replaceChildren(el("p", "works-status", message));
  }

  showMessage("読み込み中…");

  fetch(src, { credentials: "same-origin" })
    .then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then(function (data) {
      var works = data && Array.isArray(data.works) ? data.works : [];
      var items = Number.isFinite(limit) && limit > 0 ? works.slice(0, limit) : works;
      if (!items.length) {
        showMessage("現在、掲載中の作品はありません。");
        return;
      }
      var list = el("div", "works-list");
      items.forEach(function (work) {
        list.appendChild(renderCard(work || {}));
      });
      root.replaceChildren(list);
    })
    .catch(function () {
      showMessage("作品情報を読み込めませんでした。");
    });
})();
