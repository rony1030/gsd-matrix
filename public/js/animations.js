// animations.js — GSD Matrix
// Intersection Observer para efectos de scroll tipo Cabin CMS

document.addEventListener('DOMContentLoaded', () => {

  // 1. Navbar scroll effect
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  }, { passive: true });

  // 2. Hero background zoom on load
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) {
    setTimeout(() => heroBg.classList.add('loaded'), 100);
  }

  // 3. Rotating hero text
  const words = document.querySelectorAll('.rotating-word');
  if (words.length > 0) {
    let current = 0;
    words[0].classList.add('active');

    setInterval(() => {
      words[current].classList.remove('active');
      words[current].classList.add('exit');
      setTimeout(() => words[current].classList.remove('exit'), 600);

      current = (current + 1) % words.length;
      words[current].classList.add('active');
    }, 3000);
  }

  // 4. Intersection Observer — reveal on scroll
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
    revealObserver.observe(el);
  });

  // 5. Stats counter animation
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        const duration = 1800;
        const start = performance.now();

        const tick = (now) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // easeOutQuart
          const ease = 1 - Math.pow(1 - progress, 4);
          el.textContent = Math.floor(ease * target);
          if (progress < 1) requestAnimationFrame(tick);
          else el.textContent = target;
        };

        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.counter-num').forEach(el => {
    counterObserver.observe(el);
  });

  // 6. Mobile hamburger menu
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      if (mobileMenu.style.display === 'block') {
        mobileMenu.style.display = 'none';
        mobileMenu.classList.remove('open');
      } else {
        mobileMenu.style.display = 'block';
        setTimeout(() => mobileMenu.classList.add('open'), 10);
      }
    });
  }

  // 7. Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // 8. Contact form AJAX
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('.btn-submit');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" class="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Enviando...';
      btn.disabled = true;

      try {
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData);
        const res = await fetch('/contacto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.ok) {
          contactForm.style.display = 'none';
          document.querySelector('.form-success').style.display = 'block';
        } else {
          throw new Error('Error del servidor');
        }
      } catch {
        btn.innerHTML = originalText;
        btn.disabled = false;
        alert('Hubo un error. Por favor intente de nuevo.');
      }
    });
  }

  // 9. SEO preview live update (admin)
  const metaTitle = document.getElementById('meta_title');
  const metaDesc = document.getElementById('meta_description');

  if (metaTitle) {
    metaTitle.addEventListener('input', () => {
      const val = metaTitle.value;
      const preview = document.getElementById('seo-title-preview');
      const counter = document.getElementById('meta-title-count');
      if (preview) preview.textContent = val || 'Título del artículo';
      if (counter) {
        counter.textContent = val.length + '/60';
        counter.className = 'char-counter' + (val.length > 60 ? ' error' : val.length > 50 ? ' warn' : '');
      }
    });
  }

  if (metaDesc) {
    metaDesc.addEventListener('input', () => {
      const val = metaDesc.value;
      const preview = document.getElementById('seo-desc-preview');
      const counter = document.getElementById('meta-desc-count');
      if (preview) preview.textContent = val || 'Descripción del artículo para motores de búsqueda...';
      if (counter) {
        counter.textContent = val.length + '/155';
        counter.className = 'char-counter' + (val.length > 155 ? ' error' : val.length > 140 ? ' warn' : '');
      }
    });
  }

  // 10. Slug auto-generation
  const titleInput = document.getElementById('titulo');
  const slugInput = document.getElementById('slug');
  if (titleInput && slugInput && !slugInput.dataset.manual) {
    titleInput.addEventListener('input', () => {
      slugInput.value = titleInput.value
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    });
    slugInput.addEventListener('input', () => { slugInput.dataset.manual = 'true'; });
  }

  // 11. CSS spin animation for loading
  const style = document.createElement('style');
  style.textContent = `.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);

  // 12. Image upload preview (admin)
  const imgInput = document.getElementById('imagenes');
  if (imgInput) {
    imgInput.addEventListener('change', () => {
      const grid = document.getElementById('img-preview-grid');
      if (!grid) return;
      grid.innerHTML = '';
      [...imgInput.files].slice(0, 5).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const div = document.createElement('div');
          div.className = 'img-preview-item';
          div.innerHTML = `<img src="${e.target.result}" alt="preview">`;
          grid.appendChild(div);
        };
        reader.readAsDataURL(file);
      });
    });
  }
});
