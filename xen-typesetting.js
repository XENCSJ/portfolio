/* Measured Japanese orphan control for ordinary prose on narrow screens.
   Authored .xen-phrase clauses are handled in HTML/CSS. No text is rewritten. */
(() => {
  'use strict';
  const main = document.querySelector('main');
  if (!main) return;
  const mobile = matchMedia('(max-width: 768px)');
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('ja', { granularity: 'word' }) : null;
  let pending = 0;

  function lastLine(textNode) {
    const text = textNode.data;
    const range = document.createRange();
    let top, count = 0, start = text.length;
    for (let i = text.length - 1; i >= 0; i--) {
      if (/\s/.test(text[i])) continue;
      range.setStart(textNode, i);
      range.setEnd(textNode, i + 1);
      const rect = range.getBoundingClientRect();
      if (!rect.height) return null;
      if (top === undefined) top = rect.top;
      if (Math.abs(rect.top - top) > 2) return { count, start };
      count++;
      start = i;
      // Four or more visible characters cannot be a 1–3 character orphan.
      if (count >= 4) return null;
    }
    return null; // A single-line paragraph needs no intervention.
  }

  function protectTail(p) {
    if (p.childElementCount || p.childNodes.length !== 1 ||
        p.firstChild.nodeType !== Node.TEXT_NODE ||
        p.closest('#xen-brand-film,nav,button,[aria-hidden="true"]')) return;
    const node = p.firstChild;
    const text = node.data;
    if (!/[ぁ-んァ-ヶ一-龠]/.test(text) || text.trim().length < 7) return;
    const style = getComputedStyle(p);
    if (parseFloat(style.fontSize) > 22 || style.whiteSpace === 'nowrap' ||
        p.getBoundingClientRect().width < 80) return;
    const line = lastLine(node);
    if (!line) return;
    // Include a preceding word, never just punctuation or a conjugation tail.
    let start = Math.min(line.start - 1, text.trimEnd().length - 6);
    if (segmenter) {
      const words = [...segmenter.segment(text)].filter(s => s.isWordLike && s.index <= start);
      if (words.length) start = words[words.length - 1].index;
    }
    start = Math.max(0, start);
    if (!start) return;
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, text.length);
    const tail = document.createElement('span');
    tail.className = 'xen-prose-tail';
    range.surroundContents(tail);
    // Never trade an orphan for horizontal overflow at large accessibility text sizes.
    if (tail.getBoundingClientRect().width > p.clientWidth) {
      tail.replaceWith(...tail.childNodes);
      p.normalize();
    }
  }

  function update() {
    pending = 0;
    main.querySelectorAll('.xen-prose-tail').forEach(span => {
      const parent = span.parentNode;
      span.replaceWith(...span.childNodes);
      parent.normalize();
    });
    if (mobile.matches) main.querySelectorAll('p').forEach(protectTail);
  }
  function schedule() {
    if (!pending) pending = requestAnimationFrame(update);
  }
  schedule();
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('load', schedule, { once: true });
  document.addEventListener('toggle', schedule, true);
  if (document.fonts) {
    document.fonts.ready.then(schedule);
    document.fonts.addEventListener?.('loadingdone', schedule);
  }
})();
