/* 関西インディー試遊会の作品カードを、グループの中だけで混ぜる。
   HTML の並び（台帳の順）はそのまま。JS が無いときはその順で出る。 */
(function () {
  function shuffle(items) {
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = items[i];
      items[i] = items[j];
      items[j] = tmp;
    }
    return items;
  }
  var lists = document.querySelectorAll('#games ul.vg');
  for (var n = 0; n < lists.length; n++) {
    var ul = lists[n];
    var cards = shuffle([].slice.call(ul.children));
    for (var i = 0; i < cards.length; i++) ul.appendChild(cards[i]);
  }
})();
