(() => {
  const section = document.querySelector('#project-progress');
  if (!section) return;
  const stages = {
    research: 'Ізденіс', teamwork: 'Бірлескен жұмыс',
    sharing: 'Таныстыру', feedback: 'Кері байланыс'
  };
  // Unavailable originals are omitted, not replaced with invented photographs.
  const photos = (window.QalamProjectPhotos || []).filter(photo =>
    typeof photo.src === 'string' && photo.src && stages[photo.stage]
  );
  if (!photos.length) return;

  const album = section.querySelector('.project-album');
  const grid = section.querySelector('.project-photo-grid');
  const count = section.querySelector('[data-project-count]');
  const filters = [...section.querySelectorAll('[data-project-filter]')];
  let visiblePhotos = photos;
  let currentIndex = 0;
  let opener = null;

  const dialog = document.createElement('dialog');
  dialog.className = 'project-lightbox';
  dialog.setAttribute('aria-labelledby', 'project-lightbox-title');
  dialog.setAttribute('aria-describedby', 'project-lightbox-description');
  dialog.innerHTML = `
    <div class="project-lightbox-header">
      <span class="project-lightbox-count" aria-live="polite"></span>
      <button type="button" class="project-lightbox-close" autofocus>Жабу ×</button>
    </div>
    <figure class="project-lightbox-figure">
      <div class="project-lightbox-image-wrap">
        <img class="project-lightbox-image" alt="">
        <p class="project-photo-error" role="status" hidden>Сурет жүктелмеді. Келесі суретті ашып көріңіз.</p>
      </div>
      <figcaption class="project-lightbox-caption">
        <h3 id="project-lightbox-title"></h3>
        <p id="project-lightbox-description"></p>
      </figcaption>
    </figure>
    <div class="project-lightbox-controls">
      <button type="button" data-project-previous aria-label="Алдыңғы сурет">← Алдыңғы</button>
      <span>← → пернелерімен ауыстыру</span>
      <button type="button" data-project-next aria-label="Келесі сурет">Келесі →</button>
    </div>`;
  document.body.append(dialog);
  const fullImage = dialog.querySelector('img');
  const errorMessage = dialog.querySelector('.project-photo-error');

  function showPhoto(index) {
    currentIndex = (index + visiblePhotos.length) % visiblePhotos.length;
    const photo = visiblePhotos[currentIndex];
    fullImage.hidden = false;
    errorMessage.hidden = true;
    fullImage.alt = photo.alt;
    fullImage.src = photo.src;
    dialog.querySelector('#project-lightbox-title').textContent = photo.title;
    dialog.querySelector('#project-lightbox-description').textContent = photo.caption;
    dialog.querySelector('.project-lightbox-count').textContent = `${currentIndex + 1} / ${visiblePhotos.length} · ${stages[photo.stage]}`;
    dialog.querySelector('.project-lightbox-controls').hidden = visiblePhotos.length < 2;
  }

  function openPhoto(photo, button) {
    opener = button;
    showPhoto(visiblePhotos.indexOf(photo));
    dialog.showModal();
    document.body.classList.add('project-photo-viewing');
  }

  function render(stage = 'all') {
    visiblePhotos = photos.filter(photo => stage === 'all' || photo.stage === stage);
    grid.replaceChildren();
    for (const photo of visiblePhotos) {
      const figure = document.createElement('figure');
      figure.className = 'project-photo-card';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-photo-open';
      button.setAttribute('aria-label', `${photo.title}: суретті үлкейту`);
      button.setAttribute('aria-haspopup', 'dialog');
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = photo.alt;
      img.width = 960;
      img.height = 1280;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.style.objectPosition = photo.position || 'center';
      const number = document.createElement('span');
      number.className = 'project-photo-number';
      number.textContent = String(photos.indexOf(photo) + 1).padStart(2, '0');
      number.setAttribute('aria-hidden', 'true');
      const expand = document.createElement('span');
      expand.className = 'project-photo-expand';
      expand.textContent = '↗';
      expand.setAttribute('aria-hidden', 'true');
      button.append(img, number, expand);
      button.addEventListener('click', () => openPhoto(photo, button));
      const caption = document.createElement('figcaption');
      const label = document.createElement('span');
      label.className = 'project-photo-stage';
      label.textContent = stages[photo.stage];
      const title = document.createElement('h4');
      title.textContent = photo.title;
      const description = document.createElement('p');
      description.textContent = photo.caption;
      caption.append(label, title, description);
      figure.append(button, caption);
      grid.append(figure);
    }
    count.textContent = `${visiblePhotos.length} фотосурет`;
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.projectFilter === stage)));
  }

  filters.forEach(button => {
    const stage = button.dataset.projectFilter;
    button.hidden = stage !== 'all' && !photos.some(photo => photo.stage === stage);
    button.addEventListener('click', () => render(stage));
  });
  dialog.querySelector('.project-lightbox-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-project-previous]').addEventListener('click', () => showPhoto(currentIndex - 1));
  dialog.querySelector('[data-project-next]').addEventListener('click', () => showPhoto(currentIndex + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      showPhoto(currentIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('project-photo-viewing');
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  fullImage.addEventListener('error', () => {
    fullImage.hidden = true;
    errorMessage.hidden = false;
  });
  window.addEventListener('hashchange', () => { if (dialog.open) dialog.close(); });
  render();
  album.hidden = false;
})();
