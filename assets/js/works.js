(function () {
  "use strict";

  var root = document.querySelector("[data-works]");
  if (!root) return;

  var src = root.getAttribute("data-works-src") || "works.json";
  var limitAttr = root.getAttribute("data-works-limit");
  var limit = limitAttr ? parseInt(limitAttr, 10) : NaN;
  var homeOnly = root.hasAttribute("data-works-home");

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

    if (!url) return null;
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

    if (work.image) {
      var fig = el("figure", "work-visual");
      var img = el("img");
      img.src = text(work.image);
      img.alt = text(work.imageAlt) || text(work.title);
      img.width = 1920;
      img.height = 1080;
      fig.appendChild(img);
      article.appendChild(fig);
    }
    var title = el("h3", "work-title");
    if (work.page) {
      var titleLink = el("a");
      titleLink.href = text(work.page);
      titleLink.textContent = text(work.title);
      title.appendChild(titleLink);
    } else {
      title.textContent = text(work.title);
    }
    article.appendChild(title);
    if (work.alias) {
      article.appendChild(el("p", "work-alias", text(work.alias)));
    }
    if (work.titleEn) {
      article.appendChild(el("p", "work-title-en", text(work.titleEn)));
    }
    if (work.blurb) {
      article.appendChild(el("p", "work-blurb", text(work.blurb)));
    }

    var top = el("dl", "work-meta");
    addMeta(top, "ジャンル", work.kind);
    if (top.childNodes.length) article.appendChild(top);

    var editions = Array.isArray(work.editions) && work.editions.length
      ? work.editions
      : [{
          price: work.price,
          priceNote: work.priceNote,
          platforms: work.platforms,
          links: work.links
        }];

    editions.forEach(function (ed) {
      if (!ed) return;
      var box = el("div", "work-edition");
      var price = text(ed.price);
      if (price && ed.priceNote) price += "（" + text(ed.priceNote) + "）";
      var dl = el("dl", "work-meta");
      addMeta(dl, "区分", ed.label);
      addMeta(dl, "価格", price);
      addMeta(dl, "対応", ed.platforms);
      if (dl.childNodes.length) box.appendChild(dl);
      if (Array.isArray(ed.links) && ed.links.length) {
        var ul = el("ul", "work-links");
        ed.links.forEach(function (item) {
          var rendered = renderLink(item);
          if (rendered) ul.appendChild(rendered);
        });
        box.appendChild(ul);
      }
      if (box.childNodes.length) article.appendChild(box);
    });

    if (Array.isArray(work.links) && work.links.length && Array.isArray(work.editions) && work.editions.length) {
      var extra = el("ul", "work-links");
      work.links.forEach(function (item) {
        var extraLink = renderLink(item);
        if (extraLink) extra.appendChild(extraLink);
      });
      article.appendChild(extra);
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
      if (homeOnly) {
        works = works.filter(function (work) { return work && work.home; });
      }
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
      showMessage("作品情報を読み込めませんでした。同一オリジンの静的サーバで開いてください。");
    });
})();
