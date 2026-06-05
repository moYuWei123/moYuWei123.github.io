// Wallpaper Gallery — data-driven, pagination, lazy load
(function () {
  var PER_PAGE = 60;
  var grid = document.getElementById('wallpaperGrid');
  var paginationEl = document.getElementById('wallpaperPagination');
  var totalEl = document.getElementById('wallpaperTotal');
  var data = window.__WALLPAPERS__ || [];

  if (!grid || !data.length) return;

  var currentPage = 1;
  var totalPages = Math.ceil(data.length / PER_PAGE);

  // Lightbox
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxTitle = document.getElementById('lightboxTitle');
  var lightboxDownload = document.getElementById('lightboxDownload');
  var lightboxBg = document.getElementById('lightboxBg');
  var lightboxClose = document.getElementById('lightboxClose');
  var lightboxPrev = document.getElementById('lightboxPrev');
  var lightboxNext = document.getElementById('lightboxNext');
  var lightboxIndex = -1;

  function renderCards(page) {
    var start = (page - 1) * PER_PAGE;
    var end = Math.min(start + PER_PAGE, data.length);
    var html = '';

    for (var i = start; i < end; i++) {
      var item = data[i];
      var title = (item.title || '').replace(/"/g, '&quot;');
      var src = item.url || '';
      html += '<div class="wallpaper-card" data-index="' + i + '" data-src="' + src + '" data-title="' + title + '">';
      html += '<div class="wallpaper-img-wrap">';
      html += '<img src="' + src + '" alt="' + title + '" loading="lazy">';
      html += '<div class="wallpaper-overlay">';
      html += '<div class="wallpaper-overlay-inner">';
      html += '<span class="wallpaper-cat">' + (item.source || '') + '</span>';
      html += '<span class="wallpaper-name">' + title + '</span>';
      html += '</div></div></div></div>';
    }

    grid.innerHTML = html;

    // Bind click events
    var cards = grid.querySelectorAll('.wallpaper-card');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        openLightbox(parseInt(card.dataset.index));
      });
    });

    renderPagination();
  }

  function renderPagination() {
    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

    var html = '';
    html += '<button class="wp-page-btn' + (currentPage === 1 ? ' disabled' : '') + '" data-page="' + (currentPage - 1) + '">上一页</button>';

    var start = Math.max(1, currentPage - 2);
    var end = Math.min(totalPages, currentPage + 2);
    if (start > 1) { html += '<button class="wp-page-num" data-page="1">1</button>'; if (start > 2) html += '<span class="wp-page-dots">…</span>'; }

    for (var p = start; p <= end; p++) {
      html += '<button class="wp-page-num' + (p === currentPage ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
    }

    if (end < totalPages) { if (end < totalPages - 1) html += '<span class="wp-page-dots">…</span>'; html += '<button class="wp-page-num" data-page="' + totalPages + '">' + totalPages + '</button>'; }

    html += '<button class="wp-page-btn' + (currentPage === totalPages ? ' disabled' : '') + '" data-page="' + (currentPage + 1) + '">下一页</button>';
    html += '<span class="wp-page-info">' + data.length + ' 张</span>';
    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll('button[data-page]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = parseInt(btn.dataset.page);
        if (p >= 1 && p <= totalPages && p !== currentPage) showPage(p);
      });
    });
  }

  function showPage(page) {
    currentPage = page;
    renderCards(page);
    if (grid) window.scrollTo({ top: grid.offsetTop - 80, behavior: 'smooth' });
  }

  // Lightbox
  function openLightbox(index) {
    lightboxIndex = index;
    var item = data[index];
    lightboxImg.src = item.url;
    lightboxTitle.textContent = item.title;
    lightboxDownload.href = item.url;
    lightboxDownload.download = (item.title || 'wallpaper').replace(/[<>:"/\\|?*]/g, '') + '.jpg';
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    lightboxPrev.style.display = (lightboxIndex > 0 && lightboxIndex >= (currentPage - 1) * PER_PAGE) ? 'flex' : 'none';
    lightboxNext.style.display = (lightboxIndex < data.length - 1 && lightboxIndex < currentPage * PER_PAGE - 1) ? 'flex' : 'none';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (lightbox) {
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxBg.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', function () {
      if (lightboxIndex > 0) openLightbox(lightboxIndex - 1);
    });
    lightboxNext.addEventListener('click', function () {
      if (lightboxIndex < data.length - 1) openLightbox(lightboxIndex + 1);
    });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) openLightbox(lightboxIndex - 1);
      if (e.key === 'ArrowRight' && lightboxIndex < data.length - 1) openLightbox(lightboxIndex + 1);
    });
  }

  // Init
  showPage(1);
})();
