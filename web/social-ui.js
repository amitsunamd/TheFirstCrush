/* The First Crush V4 — social navigation helpers */
(() => {
  const $ = (s) => document.querySelector(s);
  const search = $('#globalSearch');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLocaleLowerCase();
      document.querySelectorAll('#quoteFeed .quote-card, #communityFeed .community-card').forEach(card => {
        card.hidden = !!q && !card.textContent.toLocaleLowerCase().includes(q);
      });
      const title = $('#feedTitle');
      if (title && q) title.textContent = 'Search results';
      else if (title) title.textContent = 'Popular lines';
    });
  }
  document.querySelectorAll('[data-story]').forEach(story => {
    story.addEventListener('click', () => {
      const category = story.dataset.story;
      const target = document.querySelector('[data-category="' + CSS.escape(category) + '"]');
      if (target) target.click();
      document.querySelector('#quoteFeed')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
  $('#quickCreate')?.addEventListener('click', () => {
    document.querySelector('#community')?.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(() => $('#lineInput')?.focus(), 350);
  });
  const navLinks = [...document.querySelectorAll('.bottom-nav a')];
  const syncNav = () => {
    const hash = location.hash || '#home';
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === hash || (hash === '#discover' && a.getAttribute('href') === '#discover')));
  };
  window.addEventListener('hashchange', syncNav);
  syncNav();
  $('#notificationsBtn')?.addEventListener('click', () => {
    const message = 'You are all caught up 💗\nNew likes, comments and connection alerts will appear here when notifications are enabled for your account.';
    if (typeof window.toast === 'function') window.toast(message);
    else alert(message);
  });
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-action="fav"]');
    if (action) action.classList.toggle('favorite');
  });
})();