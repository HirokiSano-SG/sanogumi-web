/* イベント出展ページ上部のタイムライン。下の各カード（正本）から読み取って並べる。
   今日（Asia/Tokyo）を基準に、直近の過去1件＋今後すべてを日付順に表示する。
   描く前に、終了日が今日より前のカードを「過去のイベント」へ移す。 */
(function () {
  var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  moveEndedEvents(today);
  var root = document.getElementById('events-timeline');
  if (!root) return;
  var track = root.querySelector('.etl-track');
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
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
  // 1画面ぶん＝表示幅＋カード間隔（丸ごとのカード n 枚）
  function page() { return track.clientWidth + (parseFloat(getComputedStyle(track).columnGap) || 0); }
  // 動きを減らす設定のときは、すべらせずに一度で動かす
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function how() { return reduceMotion.matches ? 'auto' : 'smooth'; }
  prev.addEventListener('click', function () { track.scrollBy({ left: -page(), behavior: how() }); });
  next.addEventListener('click', function () { track.scrollBy({ left: page(), behavior: how() }); });
  track.addEventListener('scroll', upd, { passive: true });
  window.addEventListener('resize', upd);
  // 初期位置：今日（直前の過去1件が左端に来る位置）
  var first = marker.previousElementSibling || marker;
  var nextCard = marker.nextElementSibling;
  // 狭い画面で過去1件＋今日以降の1枚が収まらないときは、今日の線から始める（過去は ‹／スワイプで）
  if (nextCard && nextCard.offsetLeft + nextCard.offsetWidth - first.offsetLeft > track.clientWidth) first = marker;
  track.scrollLeft = first.offsetLeft - track.offsetLeft;
  upd();

  function isoOk(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || ''); }
  function endOf(card) {
    var end = card.getAttribute('data-end-date');
    var start = card.getAttribute('data-date');
    return isoOk(end) ? end : (isoOk(start) ? start : '');
  }
  function startOf(card) {
    var start = card.getAttribute('data-date');
    return isoOk(start) ? start : endOf(card);
  }
  function dayText(iso) { return String(+iso.slice(8, 10)) + '日'; }
  function rangeText(start, end) {
    if (!end || start === end) return dayText(start);
    if (start.slice(0, 7) === end.slice(0, 7)) return dayText(start) + '–' + dayText(end);
    return dayText(start) + '–' + (+end.slice(5, 7)) + '月' + dayText(end);
  }
  function moveEndedEvents(today) {
    var past = document.querySelector('#past .events-list--past');
    if (!past || !isoOk(today)) return;
    Array.prototype.forEach.call(document.querySelectorAll('article.event-card'), function (card) {
      var end = endOf(card);
      if (end && end < today && card.parentNode !== past) past.appendChild(card);
    });
    var inPast = Array.prototype.filter.call(past.children, function (n) {
      return n.nodeType === 1 && n.matches('article.event-card');
    });
    inPast.sort(function (a, b) {
      var ae = endOf(a), be = endOf(b);
      if (ae !== be) return ae < be ? 1 : -1;
      var as = startOf(a), bs = startOf(b);
      if (as !== bs) return as < bs ? 1 : -1;
      return 0;
    });
    var seen = 0, ordered = true;
    Array.prototype.forEach.call(past.children, function (n) {
      if (n.nodeType === 1 && n.matches('article.event-card')) {
        if (n !== inPast[seen]) ordered = false;
        seen++;
      }
    });
    if (!ordered || seen !== inPast.length) inPast.forEach(function (card) { past.appendChild(card); });
    syncCal(inPast);
  }
  function syncCal(cards) {
    var nav = document.querySelector('#past .events-cal');
    if (!nav) return;
    cards.forEach(function (card) {
      var link = card.querySelector('.event-title a');
      var start = startOf(card);
      var end = endOf(card);
      if (!link || !start) return;
      var href = link.getAttribute('href');
      var title = link.textContent.replace(/\s+/g, ' ').trim();
      var ol = ensureMonths(nav, +start.slice(0, 4));
      var monthLi = ensureMonth(ol, +start.slice(5, 7));
      var ul = monthLi.querySelector('ul');
      var dup = false;
      Array.prototype.forEach.call(ul.querySelectorAll('a'), function (a) {
        if (a.getAttribute('href') === href) dup = true;
      });
      if (dup) return;
      var li = document.createElement('li');
      var time = document.createElement('time');
      time.setAttribute('datetime', start);
      time.textContent = rangeText(start, end);
      li.appendChild(time);
      li.appendChild(document.createTextNode(' '));
      var a = document.createElement('a');
      a.setAttribute('href', href);
      a.textContent = title;
      li.appendChild(a);
      var placed = false;
      for (var i = 0; i < ul.children.length; i++) {
        var t = ul.children[i].querySelector('time');
        var dt = t ? (t.getAttribute('datetime') || '') : '';
        if (dt > start) { ul.insertBefore(li, ul.children[i]); placed = true; break; }
      }
      if (!placed) ul.appendChild(li);
    });
  }
  function ensureMonths(nav, year) {
    var label = year + '年';
    var heads = nav.querySelectorAll('.events-cal-year');
    var head = null;
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].textContent.trim() === label) { head = heads[i]; break; }
    }
    if (!head) {
      head = document.createElement('h3');
      head.className = 'events-cal-year';
      head.textContent = label;
      var olNew = document.createElement('ol');
      olNew.className = 'events-cal-months';
      var placed = false;
      for (var j = 0; j < heads.length; j++) {
        if (parseInt(heads[j].textContent, 10) > year) {
          nav.insertBefore(head, heads[j]);
          nav.insertBefore(olNew, heads[j]);
          placed = true;
          break;
        }
      }
      if (!placed) { nav.appendChild(head); nav.appendChild(olNew); }
      return olNew;
    }
    var ol = head.nextElementSibling;
    if (!ol || !ol.classList || !ol.classList.contains('events-cal-months')) {
      ol = document.createElement('ol');
      ol.className = 'events-cal-months';
      head.parentNode.insertBefore(ol, head.nextSibling);
    }
    return ol;
  }
  function ensureMonth(ol, month) {
    var label = month + '月';
    var months = [];
    for (var i = 0; i < ol.children.length; i++) {
      if (ol.children[i].classList.contains('events-cal-month')) months.push(ol.children[i]);
    }
    for (var k = 0; k < months.length; k++) {
      var lab = months[k].querySelector('.events-cal-label');
      if (lab && lab.textContent.trim() === label) return months[k];
    }
    var li = document.createElement('li');
    li.className = 'events-cal-month';
    var span = document.createElement('span');
    span.className = 'events-cal-label';
    span.textContent = label;
    var ul = document.createElement('ul');
    li.appendChild(span);
    li.appendChild(ul);
    var placed = false;
    for (var m = 0; m < months.length; m++) {
      var lab2 = months[m].querySelector('.events-cal-label');
      if ((lab2 ? parseInt(lab2.textContent, 10) : 0) > month) {
        ol.insertBefore(li, months[m]);
        placed = true;
        break;
      }
    }
    if (!placed) ol.appendChild(li);
    return li;
  }
})();
