/* eslint-env browser */
/* global document, requestAnimationFrame */
const yearEl = document.getElementById('year');
if (yearEl) {
  const year = new Date().getFullYear();
  yearEl.textContent = `© ${year} Student Manager Demo`;
}

document.querySelectorAll('.pill').forEach((pill, index) => {
  pill.style.transitionDelay = `${index * 60}ms`;
  pill.style.opacity = '0';
  requestAnimationFrame(() => {
    pill.style.opacity = '1';
  });
});
