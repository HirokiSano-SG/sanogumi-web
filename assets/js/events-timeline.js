/* イベント出展ページ上部のタイムライン。下の各カード（正本）から読み取って並べる。
   今日（Asia/Tokyo）を基準に、直近の過去1件＋今後すべてを日付順に表示する。 */
(function () {
  var root = document.getElementById('events-timeline');
  if (!root) return;
  var track = root.querySelector('.etl-track');
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  // 今週＝月〜日（JST）。週末（日曜）の日付
  var tp = today.split('-'), tdu = new Date(Date.UTC(+tp[0], +tp[1] - 1, +tp[2]));
  var weekEnd = new Date(tdu.getTime() + ((7 - tdu.getUTCDay()) % 7) * 864e5).toISOString().slice(0, 10);
  var seen = {}, items = [];
  document.querySelectorAll('article.event-card[data-date]').forEach(function (a) {
    var link = a.querySelector('.event-title a');
    if (!link) return;
    var key = a.dataset.date + link.getAttribute('href');
    if (seen[key]) return; seen[key] = 1;
    var meta = {};
    a.querySelectorAll('.event-meta dt').forEach(function (dt) {
      var dd = dt.nextElementSibling; while (dd && dd.tagName !== 'DD') dd = dd.nextElementSibling; if (dd) meta[dt.textContent.trim()] = (dd.dataset.short || dd.textContent).trim();
    });
    var dateP = a.querySelector('.event-date');
    var dtext = dateP ? dateP.textContent : '';
    var wd = (dtext.match(/（([^）]+)）/) || [])[1];
    var tm = (dtext.match(/\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}/) || [])[0];
    var venue = meta['会場'] ? meta['会場'].split(/[（〒]/)[0].trim() : '';
    var works = meta['出展作品'] ? meta['出展作品'].replace(/（ブース[^）]*）/, '').trim() : '';
    items.push({ date: a.dataset.date, end: a.dataset.endDate || a.dataset.date, href: link.getAttribute('href'), title: link.textContent.trim(),
      fig: a.querySelector('.event-eyecatch'), wd: wd, time: tm ? tm.replace(/\s/g, '') : '', venue: venue, works: works });
  });
  items.sort(function (x, y) { return x.date < y.date ? -1 : x.date > y.date ? 1 : 0; });
  // 終了は「終了日（data-end-date、無ければ開始日）の翌日から」。当日（JST）は開催中
  var past = items.filter(function (i) { return i.end < today; });
  past.sort(function (x, y) { return x.end < y.end ? -1 : x.end > y.end ? 1 : 0; });
  var shown = past.slice(-1).concat(items.filter(function (i) { return i.end >= today; }));
  if (!shown.length) { root.hidden = true; return; }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function dLabel(iso, wd) { var p = iso.split('-'); return +p[1] + '/' + +p[2] + (wd ? '（' + wd + '）' : ''); }
  function todayMarker() {
    var p = today.split('-'), w = WD[new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay()];
    var m = el('li', 'etl-today'); m.setAttribute('aria-label', '今日 ' + dLabel(today, w));
    m.appendChild(el('span', 'etl-today-label', '今日 ' + dLabel(today, w)));
    return m;
  }
  var marker = null;
  shown.forEach(function (it) {
    if (!marker && it.end >= today) { marker = todayMarker(); track.appendChild(marker); }
    var isPast = it.end < today, isNow = !isPast && it.date <= today, isWeek = !isPast && !isNow && it.date <= weekEnd;
    var li = el('li', 'etl-item' + (isPast ? ' is-past' : '') + (isNow ? ' is-now' : '') + (isWeek ? ' is-week' : ''));
    var a = el('a', 'etl-card'); a.href = it.href;
    var vis = el('div', 'etl-visual');
    var img = it.fig && it.fig.querySelector('img');
    if (img) {
      var im = img.cloneNode(); im.loading = 'lazy'; im.removeAttribute('class');
      if (it.fig.classList.contains('event-eyecatch--logo')) vis.classList.add('etl-visual--logo');
      vis.appendChild(im);
    } else {
      vis.classList.add('etl-visual--none'); vis.appendChild(el('span', null, it.title));
    }
    a.appendChild(vis);
    var body = el('div', 'etl-body');
    var d = el('p', 'etl-date');
    var t = el('time', null, it.date.replace(/-/g, '.') + (it.wd ? '（' + it.wd + '）' : '') + (it.end !== it.date ? '–' + it.end.slice(5).replace('-', '.') : '')); t.dateTime = it.date; d.appendChild(t);
    if (isPast) d.appendChild(el('span', 'etl-badge', '終了'));
    if (isWeek) d.appendChild(el('span', 'etl-badge etl-badge--week', '今週'));
    if (isNow) d.appendChild(el('span', 'etl-badge etl-badge--now', it.end === today ? '本日開催' : '開催中'));
    if (it.time) d.appendChild(el('span', 'etl-time', it.time));
    body.appendChild(d);
    body.appendChild(el('p', 'etl-title', it.title));
    if (it.works) body.appendChild(el('p', 'etl-works', it.works));
    if (it.venue) body.appendChild(el('p', 'etl-venue', it.venue));
    a.appendChild(body); li.appendChild(a); track.appendChild(li);
  });
  if (!marker) { marker = todayMarker(); track.appendChild(marker); }
  if (!shown.some(function (i) { return i.end >= today; })) {
    var none = el('li', 'etl-item etl-empty'); none.appendChild(el('p', null, '今後の出展予定は決まり次第このページでお知らせします。'));
    track.appendChild(none);
  }

  var prev = root.querySelector('.etl-prev'), next = root.querySelector('.etl-next');
  function upd() {
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  }
  prev.addEventListener('click', function () { track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' }); });
  next.addEventListener('click', function () { track.scrollBy({ left: track.clientWidth, behavior: 'smooth' }); });
  track.addEventListener('scroll', upd, { passive: true });
  window.addEventListener('resize', upd);
  // 初期位置：今日（直前の過去1件が左端に来る位置）
  var first = marker.previousElementSibling || marker;
  var nextCard = marker.nextElementSibling;
  // 狭い画面で過去1件＋今日以降の1枚が収まらないときは、今日の線から始める（過去は ‹／スワイプで）
  if (nextCard && nextCard.offsetLeft + nextCard.offsetWidth - first.offsetLeft > track.clientWidth) first = marker;
  track.scrollLeft = first.offsetLeft - track.offsetLeft;
  upd();
})();
