(function () {
  "use strict";

  var root = document.querySelector("[data-creators]");
  if (!root) return;

  var src = root.getAttribute("data-creators-src") || "creators.json";
  var mode = root.getAttribute("data-creators-mode") || "list";
  var onlyId = root.getAttribute("data-creator-id") || "";
  var assetBase = root.getAttribute("data-asset-base") || "";
  var STORAGE_KEY = "sanogumi-creators-r18";
  var dialog = null;
  var opener = null;
  var adultMount = null;
  var adultData = null;

  function text(value) {
    return value == null ? "" : String(value);
  }

  function el(tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = content;
    return node;
  }

  function isExternal(url) {
    return /^https?:\/\//i.test(url);
  }

  function asset(path) {
    var p = text(path);
    if (!p || isExternal(p) || p.charAt(0) === "/" || p.charAt(0) === ".") return p;
    return assetBase + p;
  }

  function linkify(node, url) {
    if (!url) return node;
    node.href = url;
    if (isExternal(url)) node.rel = "noopener noreferrer";
    return node;
  }

  function placeholder(title) {
    return el("div", "tile-ph", text(title) || "画像なし");
  }

  function renderVisual(work) {
    var vis = el("div", "tile-visual");
    var srcImg = text(work && work.image);
    if (!srcImg) {
      vis.appendChild(placeholder(work && work.title));
      return vis;
    }
    var img = el("img");
    img.src = asset(srcImg);
    img.alt = text(work.imageAlt) || text(work.title);
    img.width = 640;
    img.height = 640;
    img.addEventListener("error", function () {
      vis.replaceChildren(placeholder(work && work.title));
    });
    vis.appendChild(img);
    return vis;
  }

  function formatMembers(members) {
    if (!Array.isArray(members) || !members.length) return "";
    return members.map(function (m) {
      var name = text(m && m.name);
      var role = text(m && m.role);
      if (name && role) return name + "（" + role + "）";
      return name || role;
    }).filter(Boolean).join("、");
  }

  function formatThanks(thanks) {
    if (!Array.isArray(thanks) || !thanks.length) return "";
    return thanks.map(function (t) {
      var name = text(t && t.name);
      var note = text(t && t.note);
      if (name && note) return name + "（" + note + "）";
      return name;
    }).filter(Boolean).join("、");
  }

  function ctaFor(work) {
    if (work && work.cta) return text(work.cta);
    if (work && work.page) return "作品の案内を見る";
    var u = text(work && work.url);
    if (/unityroom\.com/i.test(u)) return "ブラウザで遊ぶ";
    if (/dlsite\.com/i.test(u)) return "ストアで見る";
    if (u) return "開く";
    return "";
  }

  function publicLinks(work) {
    if (Array.isArray(work && work.links) && work.links.length) {
      return work.links.filter(function (item) {
        return item && text(item.url) && !item.hidden && item.status !== "準備中";
      });
    }
    var u = text(work && work.url);
    if (!u) return [];
    return [{ label: ctaFor(work) || "開く", url: u }];
  }

  function renderTileLinks(work) {
    var items = publicLinks(work);
    if (!items.length) return null;
    var ul = el("ul", "tile-links");
    items.forEach(function (item) {
      var li = el("li");
      var a = el("a");
      linkify(a, text(item.url));
      a.textContent = text(item.label) || text(item.url);
      li.appendChild(a);
      ul.appendChild(li);
    });
    return ul;
  }

  function renderTile(work, featured) {
    var tile = el("article", "tile");
    var play = text(work && work.url);
    var hasImage = !!text(work && work.image);
    if (hasImage) {
      var vis = renderVisual(work);
      if (play) {
        var wrap = el("a", "tile-visual-link");
        linkify(wrap, play);
        wrap.appendChild(vis);
        tile.appendChild(wrap);
      } else {
        tile.appendChild(vis);
      }
    }

    var body = el("div", "tile-body");
    body.appendChild(el("h4", "tile-title", text(work.title)));
    if (featured && work.alias) {
      body.appendChild(el("p", "tile-alias", text(work.alias)));
    }
    if (featured && work.titleEn) {
      body.appendChild(el("p", "tile-title-en", text(work.titleEn)));
    }
    var kindBits = [];
    if (work.kind) kindBits.push(text(work.kind));
    if (work.note) kindBits.push(text(work.note));
    if (work.status && kindBits.indexOf(text(work.status)) === -1) {
      kindBits.push(text(work.status));
    }
    if (work.jam) kindBits.push(text(work.jam));
    if (kindBits.length) {
      body.appendChild(el("p", "tile-kind", kindBits.join(" ／ ")));
    }
    if (work.blurb) {
      body.appendChild(el("p", "tile-kind", text(work.blurb)));
    }
    if (work.credit) {
      body.appendChild(el("p", "tile-credits", "クレジット: " + text(work.credit)));
    }
    var credits = formatMembers(work.members);
    if (credits) {
      body.appendChild(el("p", "tile-credits", "クレジット: " + credits));
    }
    var thanks = formatThanks(work.specialThanks);
    if (thanks) {
      body.appendChild(el("p", "tile-credits", "スペシャルサンクス: " + thanks));
    }
    var linkList = renderTileLinks(work);
    if (linkList) body.appendChild(linkList);
    tile.appendChild(body);
    return tile;
  }

  function renderPlain(work) {
    var article = el("article", "card work-card plain-card");
    var href = text(work && work.page) || text(work && work.url);
    var title = el("h4", "work-title");
    if (href) {
      var a = el("a");
      linkify(a, href);
      a.textContent = text(work.title);
      title.appendChild(a);
    } else {
      title.textContent = text(work.title);
    }
    article.appendChild(title);
    if (work.blurb) {
      article.appendChild(el("p", "work-blurb", text(work.blurb)));
    }
    var linkList = renderTileLinks(work);
    if (linkList) article.appendChild(linkList);
    if (work.credit) {
      var dl = el("dl", "work-meta");
      dl.appendChild(el("dt", null, "クレジット"));
      dl.appendChild(el("dd", null, text(work.credit)));
      article.appendChild(dl);
    }
    return article;
  }

  function confirmed() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setConfirmed() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {}
  }

  function adultList(data) {
    var ul = el("ul", "adult-list");
    (data.works || []).forEach(function (item) {
      var li = el("li");
      var a = el("a");
      linkify(a, text(item.url));
      a.textContent = text(item.title);
      li.appendChild(a);
      var extra = [];
      if (item.note) extra.push(text(item.note));
      if (item.date) extra.push(text(item.date));
      if (extra.length) {
        li.appendChild(document.createTextNode("（" + extra.join("、") + "）"));
      }
      ul.appendChild(li);
    });
    return ul;
  }

  function renderAdultUnlocked(data) {
    var box = el("div", "adult-panel");
    var meta = [];
    if (data.circle) meta.push("サークル " + text(data.circle));
    if (data.credit) meta.push(text(data.credit));
    if (data.note) meta.push(text(data.note));
    if (meta.length) box.appendChild(el("p", null, meta.join("。") + "。"));
    box.appendChild(adultList(data));
    return box;
  }

  function focusables(node) {
    return Array.prototype.slice.call(
      node.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])')
    ).filter(function (n) {
      return !n.hidden && n.offsetParent !== null;
    });
  }

  function showGate() {
    var data = adultData;
    dialog.replaceChildren();
    dialog.setAttribute("aria-labelledby", "r18-title");
    dialog.setAttribute("aria-describedby", "r18-desc");
    dialog.appendChild(el("h2", null, text(data.gateTitle)));
    dialog.lastChild.id = "r18-title";
    dialog.appendChild(el("p", null, text(data.gate)));
    dialog.lastChild.id = "r18-desc";
    var actions = el("div", "r18-dialog-actions");
    var yes = el("button", "btn btn-seal", text(data.confirmLabel));
    yes.type = "button";
    yes.addEventListener("click", function () {
      setConfirmed();
      revealAdultOnPage();
      showPayload();
    });
    var no = el("button", "btn", text(data.backLabel));
    no.type = "button";
    no.addEventListener("click", closeDialog);
    actions.appendChild(yes);
    actions.appendChild(no);
    dialog.appendChild(actions);
    yes.focus();
  }

  function showPayload() {
    var data = adultData;
    dialog.replaceChildren();
    dialog.setAttribute("aria-labelledby", "r18-title");
    dialog.removeAttribute("aria-describedby");
    dialog.appendChild(el("h2", null, text(data.label) || "成人向け"));
    dialog.lastChild.id = "r18-title";
    var meta = [];
    if (data.circle) meta.push("サークル " + text(data.circle));
    if (data.credit) meta.push(text(data.credit));
    if (data.note) meta.push(text(data.note));
    if (meta.length) dialog.appendChild(el("p", null, meta.join("。") + "。"));
    dialog.appendChild(adultList(data));
    var actions = el("div", "r18-dialog-actions");
    var back = el("button", "btn", text(data.backLabel));
    back.type = "button";
    back.addEventListener("click", closeDialog);
    actions.appendChild(back);
    dialog.appendChild(actions);
    var first = dialog.querySelector("a[href]") || back;
    first.focus();
  }

  function openDialog() {
    if (!dialog || !adultData) return;
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    if (confirmed()) showPayload();
    else showGate();
  }

  function closeDialog() {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
    var target = opener && document.contains(opener) ? opener : (adultMount && adultMount.querySelector("a, button"));
    if (target && typeof target.focus === "function") target.focus();
  }

  function revealAdultOnPage() {
    if (!adultMount || !adultData) return;
    adultMount.replaceChildren(renderAdultUnlocked(adultData));
  }

  function renderAdultSection(data) {
    adultData = data;
    var wrap = el("div");
    adultMount = el("div");
    if (confirmed()) {
      adultMount.appendChild(renderAdultUnlocked(data));
    } else {
      var actions = el("div", "adult-actions");
      var btn = el("button", "btn", text(data.openLabel));
      btn.type = "button";
      btn.setAttribute("aria-haspopup", "dialog");
      btn.addEventListener("click", function () {
        opener = btn;
        openDialog();
      });
      actions.appendChild(btn);
      adultMount.appendChild(actions);
    }
    wrap.appendChild(adultMount);

    dialog = el("dialog", "r18-dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.addEventListener("cancel", function (ev) {
      ev.preventDefault();
      closeDialog();
    });
    dialog.addEventListener("keydown", function (ev) {
      if (ev.key !== "Tab" || !dialog.open) return;
      var list = focusables(dialog);
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    });
    wrap.appendChild(dialog);
    return wrap;
  }

  function renderListCard(person) {
    var card = el("article", "creator-card");
    var href = asset(text(person.page));
    var icon = el("div", "creator-card-icon");
    if (person.avatar) {
      var img = el("img");
      img.src = asset(person.avatar);
      img.alt = text(person.name);
      img.width = 112;
      img.height = 112;
      if (href) {
        var wrap = el("a");
        linkify(wrap, href);
        wrap.appendChild(img);
        icon.appendChild(wrap);
      } else {
        icon.appendChild(img);
      }
    }
    card.appendChild(icon);
    var body = el("div", "creator-card-body");
    var name = el("h2", "creator-card-name");
    if (href) {
      var na = el("a");
      linkify(na, href);
      na.textContent = text(person.name);
      name.appendChild(na);
    } else {
      name.textContent = text(person.name);
    }
    body.appendChild(name);
    if (person.role) body.appendChild(el("p", "creator-role", text(person.role)));
    if (person.blurb) body.appendChild(el("p", "creator-card-blurb", text(person.blurb)));
    var items = Array.isArray(person.listLinks) ? person.listLinks : [];
    if (items.length) {
      var ul = el("ul", "tile-links");
      items.forEach(function (item) {
        if (!item || !text(item.url)) return;
        var li = el("li");
        var a = el("a");
        linkify(a, asset(text(item.url)));
        a.textContent = text(item.label) || text(item.url);
        li.appendChild(a);
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }
    card.appendChild(body);
    return card;
  }

  function renderPerson(person) {
    var section = el("section", "creator-person");
    if (person.id) section.id = text(person.id);
    section.setAttribute("aria-labelledby", text(person.id) + "-name");
    var head = el("header", "creator-head");
    if (person.avatar) {
      var av = el("img", "creator-avatar");
      av.src = asset(person.avatar);
      av.alt = text(person.name);
      av.width = 112;
      av.height = 112;
      head.appendChild(av);
    }
    var ident = el("div", "creator-ident");
    var h2 = el("h2", null, text(person.name));
    h2.id = text(person.id) + "-name";
    ident.appendChild(h2);
    if (person.kaban) ident.appendChild(el("p", "creator-kaban", text(person.kaban)));
    if (person.role) ident.appendChild(el("p", "creator-role", text(person.role)));
    if (person.blurb) ident.appendChild(el("p", null, text(person.blurb)));
    if (Array.isArray(person.skills) && person.skills.length) {
      ident.appendChild(el("p", "creator-skills", person.skills.join(" ／ ")));
    }
    var extras = el("p", "creator-links");
    if (person.x) {
      var xa = el("a");
      linkify(xa, text(person.x));
      xa.textContent = person.xHandle ? "@" + text(person.xHandle) : "X";
      extras.appendChild(xa);
    }
    if (person.site) {
      if (extras.childNodes.length) extras.appendChild(document.createTextNode(" ／ "));
      var sa = el("a");
      linkify(sa, text(person.site));
      sa.textContent = text(person.siteLabel) || "公式HP";
      extras.appendChild(sa);
    }
    if (extras.childNodes.length) ident.appendChild(extras);
    var back = el("p", "more");
    var ba = el("a");
    ba.href = asset("creators.html");
    ba.textContent = "所属クリエイター一覧";
    back.appendChild(ba);
    ident.appendChild(back);
    head.appendChild(ident);
    section.appendChild(head);

    if (Array.isArray(person.featured) && person.featured.length) {
      section.appendChild(el("h3", null, "代表作"));
      var feat = el("div", "tile-grid tile-grid--featured");
      person.featured.forEach(function (work) {
        feat.appendChild(renderTile(work, true));
      });
      section.appendChild(feat);
    }

    if (Array.isArray(person.works) && person.works.length) {
      section.appendChild(el("h3", null, "他作品"));
      var grid = el("div", "tile-grid");
      person.works.forEach(function (work) {
        grid.appendChild(renderTile(work, false));
      });
      section.appendChild(grid);
    }

    if (person.adult && Array.isArray(person.adult.works) && person.adult.works.length) {
      section.appendChild(el("h3", null, text(person.adult.label) || "成人向け"));
      section.appendChild(renderAdultSection(person.adult));
    }

    return section;
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
      var creators = data && Array.isArray(data.creators) ? data.creators : [];
      if (!creators.length) {
        showMessage("現在、掲載中の所属クリエイターはいません。");
        return;
      }
      if (mode === "detail") {
        var match = null;
        creators.forEach(function (person) {
          if (person && text(person.id) === text(onlyId)) match = person;
        });
        if (!match) {
          showMessage("このクリエイターのページはありません。");
          return;
        }
        root.replaceChildren(renderPerson(match));
        return;
      }
      var list = el("div", "creator-list");
      creators.forEach(function (person) {
        list.appendChild(renderListCard(person || {}));
      });
      root.replaceChildren(list);
    })
    .catch(function () {
      showMessage("所属クリエイターの情報を読み込めませんでした。同一オリジンの静的サーバで開いてください。");
    });
})();
