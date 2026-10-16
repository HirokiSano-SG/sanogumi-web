/* 公式表記のコピーボタン（/events/kansai-indie-shiyukai-1/ など）。
   data-copy-target の要素の文字をコピーする。JS が無いときはボタンを出さない（文字は選んでコピーできる）。 */
(function () {
  function textOf(el) { return el.value !== undefined ? el.value : el.textContent.trim(); }
  function fallback(el, text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (!ok) { // それでもだめなら選んだ状態にして、手でコピーしてもらう
      var r = document.createRange(); r.selectNodeContents(el);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    return ok;
  }
  function done(btn, ok) {
    var label = btn.getAttribute('data-label') || btn.textContent;
    btn.setAttribute('data-label', label);
    btn.textContent = ok ? 'コピーしました' : '選択しました（コピーしてください）';
    btn.classList.add('is-done');
    var st = document.getElementById('ot-status');
    if (st) st.textContent = ok ? 'コピーしました' : '';
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { btn.textContent = label; btn.classList.remove('is-done'); }, 2000);
  }
  document.querySelectorAll('[data-copy-target]').forEach(function (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var el = document.getElementById(btn.getAttribute('data-copy-target'));
      if (!el) return;
      var text = textOf(el);
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(btn, true); }, function () { done(btn, fallback(el, text)); });
      } else {
        done(btn, fallback(el, text));
      }
    });
  });
})();
