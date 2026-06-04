// Wallpaper Gallery Lightbox

(function () {
  var cards = document.querySelectorAll('.wallpaper-card');
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxTitle = document.getElementById('lightboxTitle');
  var lightboxDownload = document.getElementById('lightboxDownload');
  var lightboxBg = document.getElementById('lightboxBg');
  var lightboxClose = document.getElementById('lightboxClose');
  var lightboxPrev = document.getElementById('lightboxPrev');
  var lightboxNext = document.getElementById('lightboxNext');

  if (!cards.length || !lightbox) return;

  var currentIndex = 0;
  var allCards = [];

  // Build array of all cards with their data
  cards.forEach(function (card, i) {
    allCards.push({
      src: card.dataset.src,
      title: card.dataset.title,
      post: card.dataset.post,
      index: i
    });
    card.addEventListener('click', function () {
      openLightbox(i);
    });
  });

  function openLightbox(index) {
    currentIndex = index;
    var item = allCards[index];
    lightboxImg.src = item.src;
    lightboxTitle.textContent = item.title;
    lightboxDownload.href = item.src;
    lightboxDownload.download = item.title + '_wallpaper.jpg';
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateNavButtons();
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function updateNavButtons() {
    lightboxPrev.style.display = currentIndex > 0 ? 'flex' : 'none';
    lightboxNext.style.display = currentIndex < allCards.length - 1 ? 'flex' : 'none';
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxBg.addEventListener('click', closeLightbox);

  lightboxPrev.addEventListener('click', function () {
    if (currentIndex > 0) openLightbox(currentIndex - 1);
  });

  lightboxNext.addEventListener('click', function () {
    if (currentIndex < allCards.length - 1) openLightbox(currentIndex + 1);
  });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && currentIndex > 0) openLightbox(currentIndex - 1);
    if (e.key === 'ArrowRight' && currentIndex < allCards.length - 1) openLightbox(currentIndex + 1);
  });
})();