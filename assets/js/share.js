/* ブログ記事の共有ボタンのうち JS の要るもの（seo.py が <!-- seo:begin share --> に書き出す）。
   - リンクをコピー
   - Misskey でノート／Mastodon で投稿：サーバー（例 misskey.io・mstdn.jp）を聞いて
     https://<サーバー>/share?text=<タイトル と URL> を開く。サーバーはこのブラウザの localStorage に
     サービスごとに覚え、次からはすぐ開く。「サーバーを変更」で入れ直せる。
   X・LINE・Facebook・はてなブックマークはただのリンクなので JS は要らない。
   JS が動かないときは、ここで扱うボタンを出さない（data-share-js-item は hidden のまま）。外部のスクリプトは読まない。 */
(function () {
  var box = document.querySelector('.blog-share');
  if (!box) return;
  var status = box.querySelector('[data-share-status]');
  var timer;
  function say(msg) {
    if (!status) return;
    status.textContent = msg;
    clearTimeout(timer);
    timer = setTimeout(function () { status.textContent = ''; }, 4000);
  }
  Array.prototype.forEach.call(box.querySelectorAll('[data-share-js-item]'), function (item) {
    item.hidden = false;
  });

  /* ---- リンクをコピー ---- */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  Array.prototype.forEach.call(box.querySelectorAll('[data-share-copy]'), function (btn) {
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-share-copy');
      var done = function () { say('リンクをコピーしました'); };
      var fail = function () {
        if (fallbackCopy(url)) done();
        else say('コピーできませんでした。アドレスバーのURLをコピーしてください');
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(done, fail);
      } else {
        fail();
      }
    });
  });

  /* ---- Misskey・Mastodon ---- */
  var SERVICES = {
    misskey: { name: 'Misskey', example: 'misskey.io', key: 'sanogumi.share.misskey.host' },
    mastodon: { name: 'Mastodon', example: 'mstdn.jp', key: 'sanogumi.share.mastodon.host' }
  };
  var ORDER = ['misskey', 'mastodon'];
  var shareText = (box.getAttribute('data-share-title') || document.title) + '\n' +
    (box.getAttribute('data-share-url') || location.href);

  function load(svc) {
    try { return normalizeHost(localStorage.getItem(SERVICES[svc].key) || ''); } catch (e) { return ''; }
  }
  function save(svc, host) {
    try {
      if (host) localStorage.setItem(SERVICES[svc].key, host);
      else localStorage.removeItem(SERVICES[svc].key);
    } catch (e) { /* 覚えられないブラウザ（プライベートブラウズなど）は毎回聞く */ }
  }

  /* 入力をサーバー名（ホスト名）にそろえる。だめなら ''。
     https:// やパス、前後の空白、@user@ を取り、全角は半角にする。ポートは残す。 */
  function normalizeHost(input) {
    var s = String(input == null ? '' : input)
      .replace(/[\uFF01-\uFF5E]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[\s\u3000]+/g, '');
    s = s.replace(/^[a-z][a-z0-9+.\-]*:\/\//i, '').replace(/^\/\//, '');
    s = s.split(/[\/?#\\]/)[0];
    s = s.slice(s.lastIndexOf('@') + 1);
    s = s.replace(/\.+(?=:|$)/, '');
    if (!s) return '';
    var host;
    try { host = new URL('https://' + s + '/').host; } catch (e) { return ''; }
    var m = /^([a-z0-9.\-]+)(?::(\d{1,5}))?$/.exec(host);
    if (!m || m[1].length > 253) return '';
    var labels = m[1].split('.');
    if (labels.length < 2) return '';
    for (var i = 0; i < labels.length; i++) {
      if (!/^[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?$/.test(labels[i])) return '';
    }
    if (/^\d+$/.test(labels[labels.length - 1])) return ''; /* IP アドレスや数字だけの TLD は受けない */
    return host;
  }
  function shareUrl(host) {
    return 'https://' + host + '/share?text=' + encodeURIComponent(shareText);
  }
  function openShare(svc, host) {
    var w = window.open(shareUrl(host), '_blank');
    if (w) {
      try { w.opener = null; } catch (e) { /* 何もしない */ }
    } else {
      location.href = shareUrl(host); /* 新しいタブが開けないときは、このタブで開く */
    }
  }

  var form = box.querySelector('[data-share-fedi-form]');
  var input = form && form.querySelector('input');
  var label = form && form.querySelector('[data-share-fedi-label]');
  var note = form && form.querySelector('[data-share-fedi-note]');
  var saved = box.querySelector('[data-share-saved]');
  var fediButtons = box.querySelectorAll('[data-share-fedi]');
  var NOTE = note ? note.textContent : '';
  var current = null;
  if (!form || !input) return;

  function setExpanded(svc) {
    Array.prototype.forEach.call(fediButtons, function (b) {
      b.setAttribute('aria-expanded', b.getAttribute('data-share-fedi') === svc ? 'true' : 'false');
    });
  }
  function openForm(svc) {
    current = svc;
    var s = SERVICES[svc];
    label.textContent = s.name + ' のサーバー（例：' + s.example + '）';
    input.placeholder = s.example;
    input.value = load(svc);
    input.removeAttribute('aria-invalid');
    note.textContent = NOTE;
    form.hidden = false;
    setExpanded(svc);
    input.focus();
    if (input.select) input.select();
  }
  function closeForm(focusBack) {
    var svc = current;
    form.hidden = true;
    current = null;
    setExpanded(null);
    if (focusBack && svc) {
      var b = box.querySelector('[data-share-fedi="' + svc + '"]');
      if (b) b.focus();
    }
  }
  function renderSaved() {
    if (!saved) return;
    while (saved.firstChild) saved.removeChild(saved.firstChild);
    var any = false;
    ORDER.forEach(function (svc) {
      var host = load(svc);
      if (!host) return;
      var span = document.createElement('span');
      span.className = 'blog-share-saved-item';
      span.appendChild(document.createTextNode(SERVICES[svc].name + '：' + host + ' '));
      var change = document.createElement('button');
      change.type = 'button';
      change.className = 'blog-share-change';
      change.textContent = 'サーバーを変更';
      change.setAttribute('aria-label', SERVICES[svc].name + ' のサーバーを変更');
      change.addEventListener('click', function () { openForm(svc); });
      span.appendChild(change);
      saved.appendChild(span);
      any = true;
    });
    saved.hidden = !any;
  }

  Array.prototype.forEach.call(fediButtons, function (btn) {
    btn.addEventListener('click', function () {
      var svc = btn.getAttribute('data-share-fedi');
      if (!SERVICES[svc]) return;
      var host = load(svc);
      if (host) {
        closeForm(false);
        openShare(svc, host);
      } else if (current === svc && !form.hidden) {
        input.focus();
      } else {
        openForm(svc);
      }
    });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var svc = current;
    if (!svc) return;
    var raw = input.value;
    if (!raw.replace(/[\s\u3000]+/g, '')) {
      if (load(svc)) {
        save(svc, '');
        renderSaved();
        closeForm(true);
        say(SERVICES[svc].name + ' のサーバーの記録を消しました');
      } else {
        input.setAttribute('aria-invalid', 'true');
        note.textContent = 'サーバーを入れてください（例：' + SERVICES[svc].example + '）';
        input.focus();
      }
      return;
    }
    var host = normalizeHost(raw);
    if (!host) {
      input.setAttribute('aria-invalid', 'true');
      note.textContent = 'サーバーのアドレスとして読めませんでした。「' + SERVICES[svc].example + '」のように入れてください';
      input.focus();
      return;
    }
    save(svc, host);
    renderSaved();
    closeForm(false);
    openShare(svc, host);
  });
  form.querySelector('[data-share-fedi-cancel]').addEventListener('click', function () { closeForm(true); });
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeForm(true); }
  });
  renderSaved();
})();
