/* Keep a direct YouTube link and an image fallback. Load the player only on request. */
document.querySelectorAll('.video-launch').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const id = link.dataset.videoId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
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
