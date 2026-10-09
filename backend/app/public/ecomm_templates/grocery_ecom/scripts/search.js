/**
 * Grofresh - Instant Search & Discovery Controller
 */

class SearchManager {
  constructor() {
    this.init();
  }

  init() {
    const input = document.getElementById('main-search-input');
    const dropdown = document.getElementById('search-dropdown');
    const clearBtn = document.getElementById('search-clear-btn');

    if (!input || !dropdown) return;

    input.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (clearBtn) clearBtn.style.display = q.length > 0 ? 'block' : 'none';

      if (q.length < 2) {
        dropdown.classList.remove('is-active');
        dropdown.innerHTML = '';
        return;
      }

      const all = [
        ...(window.TODAYS_DEALS || []),
        ...(window.FRESH_FOOD_CATALOG || []),
        ...(window.SPOTLIGHT_PRODUCTS || []),
        ...(window.DAILY_BEST_SELLERS || []),
        ...(window.SEAFOOD_DEALS || []),
        ...(window.MONTHLY_GROCERY_DEAL || [])
      ];

      const matches = all.filter(p => 
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
      ).slice(0, 6);

      if (matches.length === 0) {
        dropdown.innerHTML = `<div class="search-no-results">No fresh groceries found for "${q}"</div>`;
      } else {
        dropdown.innerHTML = `
          <div class="search-results-list">
            ${matches.map(m => `
              <div class="search-result-item" onclick="window.modals.openProductModal('${m.id}'); document.getElementById('search-dropdown').classList.remove('is-active');">
                <img src="${m.image}" alt="${m.name}" class="search-result-thumb" />
                <div class="search-result-info">
                  <span class="search-result-category">${m.category || 'Fresh'}</span>
                  <strong class="search-result-title">${m.name}</strong>
                  <span class="search-result-price">${window.STORE_CONFIG.formatPrice(m.price)} <small style="font-weight:400;color:#64748B;">/ ${m.unit || 'kg'}</small></span>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
      dropdown.classList.add('is-active');
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.style.display = 'none';
        dropdown.classList.remove('is-active');
        input.focus();
      });
    }

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('is-active');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.searchManager = new SearchManager();
});
