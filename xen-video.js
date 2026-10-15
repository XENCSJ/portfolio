/* Keep a direct YouTube link and an image fallback. Load the player only on request. */
document.querySelectorAll('.video-launch').forEach((link) => {
  const thumbnail = link.querySelector('img');
  const id = link.dataset.videoId;
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;

  // Both sources are 16:9. hqdefault embeds black bars in a 4:3 image.
  // Some videos return a small placeholder instead of a max-resolution image.
  if (thumbnail) {
    const fallback = 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg';
    const checkThumbnail = () => {
      if (thumbnail.src !== fallback &&
          (!thumbnail.naturalWidth || thumbnail.naturalWidth <= 120 ||
           Math.abs(thumbnail.naturalWidth / thumbnail.naturalHeight - 16 / 9) > 0.02)) {
        thumbnail.src = fallback;
      }
    };
    thumbnail.addEventListener('load', checkThumbnail);
    thumbnail.addEventListener('error', checkThumbnail);
    if (thumbnail.complete) checkThumbnail();
  }

  link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1';
    frame.title = link.closest('.work')?.querySelector('h3')?.textContent || 'XEN YouTube作品';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    link.parentElement.replaceChildren(frame);
    frame.focus();
  });
});
