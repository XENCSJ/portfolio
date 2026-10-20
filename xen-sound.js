/* Progressive enhancement: every player, name and destination is in the HTML. */
(() => {
  document.querySelectorAll('.sound-service-logo img').forEach(image => {
    const fallback = () => {
      image.hidden = true;
      image.closest('.sound-service-logo').hidden = true;
      image.closest('.sound-service').classList.add('sound-service-text');
    };
    image.addEventListener('error', fallback, {once:true});
    if (image.complete && !image.naturalWidth) fallback();
  });
})();
