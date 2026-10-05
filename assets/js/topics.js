(function () {
  "use strict";

  var root = document.querySelector("[data-topics]");
  if (!root) return;
  if (root.hasAttribute("data-prerendered")) return;

  var src = root.getAttribute("data-topics-src") || "/assets/data/topics.json";
  var limitAttr = root.getAttribute("data-topics-limit");
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

  function renderCard(topic) {
    var article = el("article", "card topics-card");
    var link = el("a", "topics-card-link");
    link.href = text(topic.url) || "#";

    var visual = el("div", "topics-visual");
    if (topic.image) {
      var img = el("img");
      img.src = text(topic.image);
      img.alt = text(topic.imageAlt) || text(topic.title);
      img.width = 1200;
      img.height = 630;
      img.loading = "lazy";
      visual.appendChild(img);
    }
    link.appendChild(visual);

    var body = el("div", "topics-body");
    if (topic.date) {
      var dateP = el("p", "topics-date");
      var time = el("time");
      time.setAttribute("datetime", text(topic.date));
      time.textContent = text(topic.dateLabel) || text(topic.date);
      dateP.appendChild(time);
      body.appendChild(dateP);
    }
    body.appendChild(el("h3", "topics-title", text(topic.title)));
    link.appendChild(body);
    article.appendChild(link);
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
      var topics = data && Array.isArray(data.topics) ? data.topics : [];
      var items = Number.isFinite(limit) && limit > 0 ? topics.slice(0, limit) : topics;
      if (!items.length) {
        showMessage("現在、掲載中のお知らせはありません。");
        return;
      }
      var list = el("div", "topics-list");
      items.forEach(function (topic) {
        list.appendChild(renderCard(topic || {}));
      });
      root.replaceChildren(list);
    })
    .catch(function () {
      showMessage("お知らせを読み込めませんでした。同一オリジンの静的サーバで開いてください。");
    });
})();
