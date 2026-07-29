const slogans = [
  "A search bar is not a pro feature.",
  "We don't paywall seeing who owes you money.",
  "No Pro tier. No ads. No nagging. Just splitting bills.",
  "Free forever, not free for your first two expenses.",
  "Your friends' receipts shouldn't come with a subscription.",
  "Open source, so you don't have to take our word for it.",
  "Unlimited expenses because why not?"
];

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const sloganEl = document.getElementById('slogan');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (sloganEl && !prefersReducedMotion && slogans.length > 1) {
  let index = 0;
  setInterval(() => {
    sloganEl.classList.add('is-fading');
    setTimeout(() => {
      index = (index + 1) % slogans.length;
      sloganEl.textContent = slogans[index];
      sloganEl.classList.remove('is-fading');
    }, 400);
  }, 4000);
}
