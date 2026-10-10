/**
 * FootWear - Search & Filter Controller
 * Handles header live auto-suggest and catalog filter pills.
 */

class SearchManager {
  constructor() {
    this.currentFilters = {
      brand: 'all',
      priceRange: 'all',
      size: 'all',
      type: 'all',
      sortBy: 'popular'
    };

    this.allProducts = [
      ...(window.CATALOG_PRODUCTS || []),
      ...(window.BEST_DEALS || [])
    ];

    this.init();
  }

  init() {
    this.bindHeaderSearch();
    this.bindFilterPills();
  }

  bindHeaderSearch() {
    const input = document.getElementById('main-search-input');
    const dropdown = document.getElementById('search-dropdown');
    const clearBtn = document.getElementById('search-clear-btn');

    if (!input || !dropdown) return;

    input.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (clearBtn) clearBtn.style.display = query.length > 0 ? 'block' : 'none';

      if (query.length < 2) {
        dropdown.classList.remove('is-active');
        dropdown.innerHTML = '';
        return;
      }

      const results = this.searchItems(query);
      this.renderSuggestions(results, dropdown);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.style.display = 'none';
        dropdown.classList.remove('is-active');
        dropdown.innerHTML = '';
        input.focus();
      });
    }

    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('is-active');
      }
    });
  }

  searchItems(query) {
    const all = [...(window.CATALOG_PRODUCTS || []), ...(window.BEST_DEALS || [])];
    const unique = [];
    const seenIds = new Set();

    all.forEach(p => {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        const match = 
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          (p.category && p.category.toLowerCase().includes(query));
        if (match) unique.push(p);
      }
    });

    return unique.slice(0, 6);
  }

  renderSuggestions(results, dropdown) {
    if (results.length === 0) {
      dropdown.innerHTML = `
        <div class="search-no-results">
          <p>No sneaker drops found matching your search.</p>
        </div>
      `;
      dropdown.classList.add('is-active');
      return;
    }

    dropdown.innerHTML = `
      <div class="search-results-header">
        <span>Suggested Drops (${results.length})</span>
      </div>
      <div class="search-results-list">
        ${results.map(item => `
          <div class="search-result-item" onclick="window.modals.openProductModal('${item.id}'); document.getElementById('search-dropdown').classList.remove('is-active');">
            <img src="${item.image}" alt="${item.name}" class="search-result-thumb" />
            <div class="search-result-info">
              <span class="search-result-brand">${item.brand}</span>
              <strong class="search-result-title">${item.name}</strong>
              <div class="search-result-meta">
                <span class="search-result-price">${window.STORE_CONFIG.formatPrice(item.price)}</span>
                <span class="search-result-rating">★ ${item.rating}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    dropdown.classList.add('is-active');
  }

  bindFilterPills() {
    // Brand dropdown trigger
    const brandFilterSelect = document.getElementById('filter-brand-select');
    if (brandFilterSelect) {
      brandFilterSelect.addEventListener('change', (e) => {
        this.currentFilters.brand = e.target.value;
        this.applyCatalogFilters();
      });
    }

    // Price range selector
    const priceFilterSelect = document.getElementById('filter-price-select');
    if (priceFilterSelect) {
      priceFilterSelect.addEventListener('change', (e) => {
        this.currentFilters.priceRange = e.target.value;
        this.applyCatalogFilters();
      });
    }

    // Size filter selector
    const sizeFilterSelect = document.getElementById('filter-size-select');
    if (sizeFilterSelect) {
      sizeFilterSelect.addEventListener('change', (e) => {
        this.currentFilters.size = e.target.value;
        this.applyCatalogFilters();
      });
    }

    // Type filter selector
    const typeFilterSelect = document.getElementById('filter-type-select');
    if (typeFilterSelect) {
      typeFilterSelect.addEventListener('change', (e) => {
        this.currentFilters.type = e.target.value;
        this.applyCatalogFilters();
      });
    }

    // Sort order selector
    const sortFilterSelect = document.getElementById('filter-sort-select');
    if (sortFilterSelect) {
      sortFilterSelect.addEventListener('change', (e) => {
        this.currentFilters.sortBy = e.target.value;
        this.applyCatalogFilters();
      });
    }
  }

  applyCatalogFilters() {
    if (!window.app) return;
    let list = [...(window.CATALOG_PRODUCTS || [])];

    // Filter by Brand
    if (this.currentFilters.brand !== 'all') {
      list = list.filter(p => p.brand.toLowerCase() === this.currentFilters.brand.toLowerCase());
    }

    // Filter by Price Range
    if (this.currentFilters.priceRange === 'under-1500k') {
      list = list.filter(p => p.price < 1500000);
    } else if (this.currentFilters.priceRange === '1500k-2500k') {
      list = list.filter(p => p.price >= 1500000 && p.price <= 2500000);
    } else if (this.currentFilters.priceRange === 'over-2500k') {
      list = list.filter(p => p.price > 2500000);
    }

    // Filter by Size
    if (this.currentFilters.size !== 'all') {
      const sNum = parseInt(this.currentFilters.size, 10);
      list = list.filter(p => p.sizes && p.sizes.includes(sNum));
    }

    // Filter by Type
    if (this.currentFilters.type !== 'all') {
      list = list.filter(p => p.category && p.category.toLowerCase() === this.currentFilters.type.toLowerCase());
    }

    // Sort
    if (this.currentFilters.sortBy === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (this.currentFilters.sortBy === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (this.currentFilters.sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else {
      // Popular (sold count)
      list.sort((a, b) => b.soldCount - a.soldCount);
    }

    window.app.renderFilteredCatalog(list);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.searchManager = new SearchManager();
});
