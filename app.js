// ==========================================================================
// ООО «Экософт» — Единое ядро сайта в дизайн-системе Stitch
// Project: projects/7382805293749152585 (Nordic Clean Pet Care)
// Поддержка всех 8 страниц, каталога 30+8 товаров, калькуляторов и корзины без регистрации
// ==========================================================================

(function () {
  const CART_KEY = 'ecosoft_stitch_cart_v1';
  const FAV_KEY = 'ecosoft_stitch_fav_v1';

  // Утилита форматирования цены (с неразрывными пробелами, чтобы знак ₽ никогда не переносился на новую строку)
  function formatPrice(num) {
    return Math.round(Number(num) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + '\u00A0₽';
  }

  // Поиск товара по ID (в рознице или оптовом прайсе)
  function findItemById(id) {
    if (!window.ECOSOFT_DATA) return null;
    const retail = (window.ECOSOFT_DATA.products || []).find(p => p.id === id);
    if (retail) return { ...retail, isBulk: false };
    const bulk = (window.ECOSOFT_DATA.bulkProducts || []).find(b => b.id === id);
    if (bulk) {
      return {
        id: bulk.id,
        sku: bulk.sku,
        name: bulk.name,
        subtitle: bulk.standard,
        brand: 'Экософт Опт',
        category: bulk.category,
        categoryLabel: 'Крупная фасовка / Мешок',
        volumeL: bulk.bagWeightKg,
        weightKg: bulk.bagWeightKg,
        price: bulk.pricePerBag,
        oldPrice: Math.round(bulk.pricePerBag * 1.15),
        image: bulk.image,
        badge: `Мешок ${bulk.bagWeightKg} кг`,
        rating: 5.0,
        reviewsCount: 48,
        shortDesc: bulk.application,
        isBulk: true
      };
    }
    return null;
  }

  // Глобальный менеджер корзины без регистрации
  const EcoCart = {
    getItems() {
      try {
        const raw = localStorage.getItem(CART_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
      // По умолчанию добавим 2 хита, если корзина ещё ни разу не инициализировалась, чтобы страница checkout сразу выглядела живой
      const seeded = localStorage.getItem(CART_KEY + '_seeded');
      if (!seeded && window.ECOSOFT_DATA) {
        localStorage.setItem(CART_KEY + '_seeded', '1');
        const initial = [
          { id: 'naisy-premium-4-5', qty: 2 },
          { id: 'ecosoft-silikagel-20', qty: 1 }
        ];
        localStorage.setItem(CART_KEY, JSON.stringify(initial));
        return initial;
      }
      return [];
    },
    saveItems(items) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      this.updateHeaderBadges();
      if (typeof window.renderCheckoutPage === 'function') {
        window.renderCheckoutPage();
      }
      this.renderDrawerItems();
    },
    add(id, qty = 1) {
      const product = findItemById(id);
      if (!product) return;
      const items = this.getItems();
      const existing = items.find(i => i.id === id);
      if (existing) {
        existing.qty += qty;
      } else {
        items.push({ id, qty });
      }
      this.saveItems(items);
      showToast(`Добавлено в корзину: «${product.name}» (${qty} шт.)`);
    },
    updateQty(id, delta) {
      let items = this.getItems();
      const target = items.find(i => i.id === id);
      if (!target) return;
      target.qty += delta;
      if (target.qty <= 0) {
        items = items.filter(i => i.id !== id);
      }
      this.saveItems(items);
    },
    remove(id) {
      const items = this.getItems().filter(i => i.id !== id);
      this.saveItems(items);
    },
    clear() {
      this.saveItems([]);
    },
    getDetailedItems() {
      return this.getItems()
        .map(entry => {
          const item = findItemById(entry.id);
          if (!item) return null;
          return {
            ...item,
            qty: entry.qty,
            lineTotal: item.price * entry.qty,
            lineOldTotal: (item.oldPrice || Math.round(item.price * 1.18)) * entry.qty
          };
        })
        .filter(Boolean);
    },
    getSummary() {
      const detailed = this.getDetailedItems();
      const totalQty = detailed.reduce((acc, i) => acc + i.qty, 0);
      const totalPrice = detailed.reduce((acc, i) => acc + i.lineTotal, 0);
      const totalOldPrice = detailed.reduce((acc, i) => acc + i.lineOldTotal, 0);
      const totalWeightKg = detailed.reduce((acc, i) => acc + (i.weightKg || 2) * i.qty, 0);
      return {
        detailed,
        totalQty,
        totalPrice,
        totalOldPrice,
        discount: Math.max(0, totalOldPrice - totalPrice),
        totalWeightKg: Math.round(totalWeightKg * 10) / 10
      };
    },
    updateHeaderBadges() {
      const { totalQty, totalPrice } = this.getSummary();
      const countEls = document.querySelectorAll('[data-cart-count]');
      const totalEls = document.querySelectorAll('[data-cart-total]');
      const checkoutBtn = document.querySelector('[data-cart-checkout-btn]');
      const cartCluster = document.getElementById('eco-header-cart-cluster');

      countEls.forEach(el => {
        el.textContent = totalQty;
        el.classList.toggle('hidden', totalQty === 0);
      });
      totalEls.forEach(el => {
        el.textContent = totalQty > 0 ? formatPrice(totalPrice) : 'Корзина';
      });
      if (checkoutBtn) {
        if (totalQty === 0) {
          checkoutBtn.className = 'hidden px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-container text-pure-white font-bold text-[12px] shadow-xs transition-all items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95';
        } else {
          checkoutBtn.className = 'hidden sm:inline-flex px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-container text-pure-white font-bold text-[12px] shadow-xs transition-all items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95';
        }
      }
      if (cartCluster) {
        if (totalQty === 0) {
          cartCluster.classList.remove('p-1', 'border', 'border-mint-subtle', 'shadow-xs');
        } else {
          cartCluster.classList.add('p-1', 'border', 'border-mint-subtle', 'shadow-xs');
        }
      }
    },
    openDrawer() {
      const drawer = document.getElementById('eco-cart-drawer');
      if (!drawer) return;
      this.renderDrawerItems();
      drawer.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    },
    closeDrawer() {
      const drawer = document.getElementById('eco-cart-drawer');
      if (!drawer) return;
      drawer.classList.add('hidden');
      document.body.style.overflow = '';
    },
    renderDrawerItems() {
      const container = document.getElementById('eco-drawer-items');
      const footerEl = document.getElementById('eco-drawer-footer');
      const totalEl = document.getElementById('eco-drawer-total');
      const weightEl = document.getElementById('eco-drawer-weight');
      if (!container) return;
      const summary = this.getSummary();
      if (totalEl) totalEl.textContent = formatPrice(summary.totalPrice);
      if (weightEl) weightEl.textContent = `${summary.totalWeightKg} кг`;

      if (summary.detailed.length === 0) {
        if (footerEl) footerEl.classList.add('hidden');
        container.innerHTML = `
          <div class="py-10 px-4 text-center flex flex-col items-center justify-center h-full gap-4">
            <div class="w-20 h-20 rounded-full bg-mint-surface text-primary flex items-center justify-center shadow-inner">
              <span class="material-symbols-outlined text-[38px]">shopping_bag</span>
            </div>
            <div>
              <p class="text-[20px] text-on-surface font-extrabold">Ваша корзина пока пуста</p>
              <p class="text-[13px] text-on-surface-variant max-w-xs mt-1.5 leading-relaxed">
                Добавьте наполнители в каталоге или выберите популярную позицию ниже — заказ оформляется быстро и без регистрации.
              </p>
            </div>
            <div class="w-full bg-mint-surface/70 rounded-2xl p-3.5 text-left flex flex-col gap-2 mt-1">
              <span class="text-[11px] font-bold uppercase tracking-wider text-primary">Быстрое добавление хитов:</span>
              <div class="flex items-center justify-between gap-2 bg-pure-white p-2.5 rounded-xl shadow-xs">
                <div class="flex items-center gap-2.5 min-w-0">
                  <img src="image/neysi_premium_0.jpg" alt="" class="w-10 h-10 object-contain shrink-0"/>
                  <div class="truncate">
                    <div class="text-[12px] font-bold text-on-surface truncate">Найси Премиум 4,5 л</div>
                    <div class="text-[11px] text-primary font-extrabold">295\u00A0₽</div>
                  </div>
                </div>
                <button onclick="window.EcoCart.add('naisy-premium-4-5', 1)" class="px-3 py-1.5 rounded-full bg-primary text-pure-white text-[11px] font-bold shrink-0">+ В корзину</button>
              </div>
              <div class="flex items-center justify-between gap-2 bg-pure-white p-2.5 rounded-xl shadow-xs">
                <div class="flex items-center gap-2.5 min-w-0">
                  <img src="image/ecosoft_premium_new_20kg.jpg" alt="" class="w-10 h-10 object-contain shrink-0"/>
                  <div class="truncate">
                    <div class="text-[12px] font-bold text-on-surface truncate">Экософт Силикагель 20 л</div>
                    <div class="text-[11px] text-primary font-extrabold">850\u00A0₽</div>
                  </div>
                </div>
                <button onclick="window.EcoCart.add('ecosoft-silikagel-20', 1)" class="px-3 py-1.5 rounded-full bg-primary text-pure-white text-[11px] font-bold shrink-0">+ В корзину</button>
              </div>
            </div>
            <a href="catalog.html" class="w-full py-3.5 rounded-full bg-primary hover:bg-primary-container text-on-primary text-[14px] font-bold shadow-md transition-all">
              Перейти в каталог продукции
            </a>
          </div>
        `;
        return;
      }

      if (footerEl) footerEl.classList.remove('hidden');

      container.innerHTML = summary.detailed.map(item => `
        <div class="flex gap-3 p-3 rounded-xl bg-mint-surface/60 hover:bg-mint-surface transition-colors">
          <a href="product.html?id=${item.id}" class="w-16 h-16 rounded-lg bg-pure-white p-1.5 flex items-center justify-center shrink-0">
            <img src="${item.image}" alt="${item.name}" class="max-h-full max-w-full object-contain"/>
          </a>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <a href="product.html?id=${item.id}" class="font-label-md font-bold text-on-surface hover:text-primary truncate block">${item.name}</a>
              <button onclick="window.EcoCart.remove('${item.id}')" class="text-outline hover:text-error p-0.5" title="Удалить">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <p class="text-[12px] text-on-surface-variant">${item.isBulk ? `Мешок ${item.weightKg} кг` : `${item.volumeL} л (${item.weightKg} кг)`} • ${formatPrice(item.price)}/шт</p>
            <div class="flex items-center justify-between mt-2">
              <div class="inline-flex items-center bg-pure-white rounded-full p-0.5 shadow-xs">
                <button onclick="window.EcoCart.updateQty('${item.id}', -1)" class="w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface font-bold">−</button>
                <span class="px-2.5 text-[13px] font-bold">${item.qty}</span>
                <button onclick="window.EcoCart.updateQty('${item.id}', 1)" class="w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface font-bold">+</button>
              </div>
              <span class="font-headline-sm font-extrabold text-primary text-[15px]">${formatPrice(item.lineTotal)}</span>
            </div>
          </div>
        </div>
      `).join('');
    },
    openQuickBuy(id) {
      const item = findItemById(id) || findItemById('naisy-premium-4-5');
      const modal = document.getElementById('eco-quickbuy-modal');
      if (!modal || !item) return;
      document.getElementById('qb-product-id').value = item.id;
      document.getElementById('qb-product-img').src = item.image;
      document.getElementById('qb-product-name').textContent = item.name;
      document.getElementById('qb-product-price').textContent = `${formatPrice(item.price)} • ${item.isBulk ? item.weightKg + ' кг' : item.volumeL + ' л (' + item.weightKg + ' кг)'}`;
      modal.classList.remove('hidden');
    },
    closeQuickBuy() {
      const modal = document.getElementById('eco-quickbuy-modal');
      if (modal) modal.classList.add('hidden');
    }
  };

  window.EcoCart = EcoCart;
  window.formatPrice = formatPrice;
  window.findItemById = findItemById;

  // Уведомления Toast
  function showToast(message) {
    let container = document.getElementById('eco-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'eco-toast-container';
      container.className = 'fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'bg-slate-dark text-pure-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium transition-all duration-300';
    toast.innerHTML = `
      <span class="material-symbols-outlined text-primary-fixed text-[20px]">check_circle</span>
      <span class="flex-1">${message}</span>
      <a href="checkout.html" class="text-primary-fixed underline font-bold text-xs shrink-0">Оформить</a>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
  window.showToast = showToast;

  // Избранное
  function toggleFavorite(btn, id) {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      let favs = raw ? JSON.parse(raw) : [];
      if (favs.includes(id)) {
        favs = favs.filter(x => x !== id);
        btn.classList.remove('text-tertiary');
        btn.classList.add('text-outline');
        showToast('Удалено из избранного');
      } else {
        favs.push(id);
        btn.classList.add('text-tertiary');
        btn.classList.remove('text-outline');
        showToast('Добавлено в избранное');
      }
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
      document.querySelectorAll('[data-fav-count]').forEach(el => {
        el.textContent = favs.length;
      });
    } catch (e) {}
  }
  window.toggleFavorite = toggleFavorite;

  // Определение текущей страницы
  function getCurrentPage() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    return path === '' ? 'index.html' : path;
  }

  // Единая шапка в стиле Stitch (Nordic Clean Pet Care) с навигацией по всем 8 страницам
  function renderSharedHeader() {
    const headerHost = document.getElementById('site-header');
    if (!headerHost) return;
    const current = getCurrentPage();
    const { totalQty, totalPrice } = EcoCart.getSummary();

    const navLinks = [
      { href: 'index.html', label: 'Главная' },
      { href: 'catalog.html', label: 'Каталог продукции' },
      { href: 'industrial.html', label: 'Силикагель' },
      { href: 'stm.html', label: 'СТМ / Private Label' },
      { href: 'b2b.html', label: 'Партнёрам B2B' },
      { href: 'about.html', label: 'О производителе' }
    ];

    headerHost.innerHTML = `
      <!-- Main Sticky Stitch Header -->
      <header class="sticky top-0 z-50 w-full bg-pure-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(2,130,117,0.08)]">
        <div class="max-w-[1360px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-2 lg:gap-3 xl:gap-4">
          <!-- Brand Logo -->
          <a class="flex items-center gap-2.5 sm:gap-3 shrink-0 group" href="index.html">
            <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary text-pure-white flex items-center justify-center shadow-sm group-hover:bg-primary-container transition-colors shrink-0">
              <span class="material-symbols-outlined text-[24px] sm:text-[26px]">pets</span>
            </div>
            <div class="flex flex-col shrink-0">
              <span class="font-bold text-[18px] sm:text-[19px] tracking-tight text-primary leading-none">Экософт</span>
              <span class="text-[10px] sm:text-[11px] font-medium text-outline mt-1">Производитель наполнителей</span>
            </div>
          </a>

          <!-- Navigation Links (All Core Pages) -->
          <nav class="hidden lg:flex items-center gap-2 xl:gap-3.5 2xl:gap-5 text-[12px] xl:text-[13px] 2xl:text-[14px] font-semibold text-on-surface">
            ${navLinks.map(link => {
              const isActive = current === link.href || (current === 'product.html' && link.href === 'catalog.html');
              return `<a href="${link.href}" class="${isActive ? 'text-primary font-bold underline decoration-2 underline-offset-8' : 'hover:text-primary transition-colors'} whitespace-nowrap">${link.label}</a>`;
            }).join('')}
          </nav>

          <!-- Action Cluster (Unified Cart Pill & Mobile Menu) -->
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <!-- Unified Cart Pill: On mobile shows compact icon + count badge; on sm+ adds price and Direct Checkout button -->
            <div id="eco-header-cart-cluster" class="flex items-center rounded-full bg-mint-surface ${totalQty > 0 ? 'p-1 border border-mint-subtle shadow-xs' : 'p-0.5'} transition-all shrink-0">
              <button onclick="window.EcoCart.openDrawer()" class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-mint-subtle text-primary font-bold text-[12.5px] transition-all whitespace-nowrap shrink-0" type="button" title="Открыть корзину">
                <span class="material-symbols-outlined text-[19px]">shopping_bag</span>
                <span class="hidden sm:inline whitespace-nowrap" data-cart-total>${totalQty > 0 ? formatPrice(totalPrice) : 'Корзина'}</span>
                <span class="${totalQty > 0 ? '' : 'hidden'} min-w-[20px] h-5 px-1 rounded-full bg-primary text-pure-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs" data-cart-count>${totalQty}</span>
              </button>

              <a data-cart-checkout-btn href="checkout.html" class="${totalQty > 0 ? 'hidden sm:inline-flex' : 'hidden'} px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-container text-pure-white font-bold text-[12px] shadow-xs transition-all items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95" title="Оформить заказ без регистрации">
                <span>Оформить</span>
                <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
              </a>
            </div>

            <!-- Mobile Menu Trigger -->
            <button onclick="document.getElementById('eco-mobile-nav').classList.toggle('hidden')" class="lg:hidden w-10 h-10 rounded-full bg-surface-container-low text-on-surface hover:text-primary flex items-center justify-center shrink-0 active:scale-95 transition-all" type="button" aria-label="Меню навигации">
              <span class="material-symbols-outlined text-[24px]">menu</span>
            </button>
          </div>
        </div>

        <!-- Modern Mobile Navigation Drawer -->
        <div id="eco-mobile-nav" class="hidden lg:hidden bg-pure-white border-t border-mint-subtle/80 px-4 py-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div class="flex flex-col gap-1.5">
            ${navLinks.map(l => {
              const isActive = current === l.href || (current === 'product.html' && l.href === 'catalog.html');
              return `
                <a href="${l.href}" class="flex items-center justify-between px-4 py-3 rounded-xl font-bold text-[14px] ${isActive ? 'bg-mint-surface text-primary border border-primary/20' : 'text-on-surface hover:bg-surface-container-low'} transition-colors">
                  <span>${l.label}</span>
                  <span class="material-symbols-outlined text-[18px] ${isActive ? 'text-primary' : 'text-outline'}">chevron_right</span>
                </a>
              `;
            }).join('')}
            
            <div class="pt-3 mt-1.5 border-t border-outline-variant/20 flex flex-col gap-2">
              <a href="checkout.html" class="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-container text-pure-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95">
                <span class="material-symbols-outlined text-[19px]">shopping_cart_checkout</span>
                <span>Оформить заказ (${totalQty > 0 ? formatPrice(totalPrice) : 'Корзина'})</span>
              </a>
              <div class="flex items-center justify-between px-2 pt-1 text-[11px] text-outline font-semibold">
                <span>г. Люберцы, Московская обл.</span>
                <span>Отдел сбыта: Пн–Пт 9–18</span>
              </div>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  // Анимированная сцена внизу каждой страницы (волны + гуляющий кот + пузырьки силикагеля) + Футер Stitch
  function renderSharedFooterAndAnimation() {
    const footerHost = document.getElementById('site-footer');
    if (!footerHost) return;

    footerHost.innerHTML = `
      <!-- Анимированная сцена внизу страницы (Nordic Clean Waves + Rising Crystals) -->
      <div class="eco-animated-footer-scene">
        <!-- Rising Silica Crystal Bubbles -->
        <div class="eco-crystal-bubble" style="left: 8%; width: 14px; height: 14px; animation-delay: 0s;"></div>
        <div class="eco-crystal-bubble" style="left: 18%; width: 20px; height: 20px; animation-delay: 1.5s;"></div>
        <div class="eco-crystal-bubble" style="left: 32%; width: 12px; height: 12px; animation-delay: 2.8s;"></div>
        <div class="eco-crystal-bubble" style="left: 48%; width: 18px; height: 18px; animation-delay: 0.7s;"></div>
        <div class="eco-crystal-bubble" style="left: 64%; width: 22px; height: 22px; animation-delay: 2.1s;"></div>
        <div class="eco-crystal-bubble" style="left: 78%; width: 15px; height: 15px; animation-delay: 3.4s;"></div>
        <div class="eco-crystal-bubble" style="left: 91%; width: 16px; height: 16px; animation-delay: 1.1s;"></div>

        <!-- 3 Layered Animated Nordic Mint Waves -->
        <svg class="eco-wave-layer eco-wave-back" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path fill="#C8E5E1" d="M0,40 C240,90 480,0 720,40 C960,80 1200,10 1440,40 L1440,100 L0,100 Z"></path>
        </svg>
        <svg class="eco-wave-layer eco-wave-mid" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path fill="#a3dbd4" d="M0,55 C300,10 600,90 900,45 C1150,15 1300,75 1440,55 L1440,100 L0,100 Z"></path>
        </svg>
        <svg class="eco-wave-layer eco-wave-front" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path fill="#e2f8fc" d="M0,65 C360,95 720,25 1080,65 C1260,85 1380,45 1440,65 L1440,100 L0,100 Z"></path>
        </svg>
      </div>

      <!-- Stitch Nordic Clean Pet Care Footer -->
      <footer class="w-full bg-surface-container-low pt-12 pb-8 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div class="max-w-[1320px] mx-auto px-4 md:px-6 lg:px-8 flex flex-col gap-10">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
            <!-- Col 1: Brand & Heritage -->
            <div class="md:col-span-5 flex flex-col gap-4 pr-0 lg:pr-8">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary text-pure-white flex items-center justify-center font-bold shadow-xs">
                  <span class="material-symbols-outlined">pets</span>
                </div>
                <div>
                  <span class="font-bold text-[18px] text-primary block leading-none">ООО «Экософт»</span>
                  <span class="text-[12px] text-on-surface-variant">ИП с 1998 г. (ТМ «Мурзик») • ООО с 2003 г.</span>
                </div>
              </div>
              <p class="text-[13px] text-on-surface-variant leading-relaxed">
                140004, Московская обл., г. Люберцы, Октябрьский проспект, д. 411. Производитель наполнителей под брендами <strong>«Мурзик»</strong> (первый в России силикагель с 1998 г.), <strong>«Найси»</strong>, <strong>«Снежок»</strong> и <strong>«Экософт»</strong> (в белых мешках для маркетплейсов), а также всех видов силикагелей, трепела, диатомита и древесных пеллет 6 мм в крупной фасовке.
              </p>
            </div>

            <!-- Col 2: Разделы сайта -->
            <div class="md:col-span-3 flex flex-col gap-2.5 lg:pl-4">
              <h4 class="font-bold text-[15px] text-on-surface mb-1">Разделы сайта</h4>
              <ul class="flex flex-col gap-1.5 text-[13px] text-on-surface-variant">
                <li><a class="hover:text-primary transition-colors" href="index.html">Главная</a></li>
                <li><a class="hover:text-primary transition-colors" href="catalog.html">Каталог продукции</a></li>
                <li><a class="hover:text-primary transition-colors" href="industrial.html">Силикагель</a></li>
                <li><a class="hover:text-primary transition-colors" href="stm.html">СТМ / Private Label</a></li>
                <li><a class="hover:text-primary transition-colors" href="b2b.html">Партнёрам B2B</a></li>
                <li><a class="hover:text-primary transition-colors" href="about.html">О производителе</a></li>
                <li><a class="hover:text-primary font-bold text-primary transition-colors flex items-center gap-1.5 pt-0.5" href="checkout.html"><span class="material-symbols-outlined text-[16px]">shopping_bag</span>Моя Корзина</a></li>
              </ul>
            </div>

            <!-- Col 3: Контакты производителя -->
            <div class="md:col-span-4 flex flex-col gap-2.5">
              <h4 class="font-bold text-[15px] text-on-surface mb-1">Отдел сбыта и склад</h4>
              <div class="flex flex-col gap-1 text-[13px] text-on-surface-variant">
                <a class="font-bold text-[15px] text-on-surface hover:text-primary transition-colors" href="tel:+79775298525">+7 (977) 529-85-25</a>
                <a class="font-bold text-[15px] text-on-surface hover:text-primary transition-colors" href="tel:+79261160897">+7 (926) 116-08-97</a>
                <a class="font-bold text-[15px] text-on-surface hover:text-primary transition-colors" href="tel:+79255672880">+7 (925) 567-28-80</a>
                <a class="hover:text-primary transition-colors font-semibold pt-0.5" href="mailto:ekosoft1@yandex.ru">ekosoft1@yandex.ru • www.murzik.biz</a>
                <p class="text-[12px] text-outline mt-1">ИНН 5027097091 / ОГРН 1035005025648<br/>Поставки по всей России и странам ЕАС</p>
                <div class="flex flex-wrap gap-1.5 mt-2">
                  <a href="https://www.wildberries.ru/seller/44163" target="_blank" rel="noopener" class="px-3 py-1 rounded-full bg-[#CB11AB] text-pure-white text-[11px] font-bold hover:opacity-90 transition-opacity shadow-2xs">Wildberries (WB)</a>
                  <a href="https://www.ozon.ru/seller/ekosoft/" target="_blank" rel="noopener" class="px-3 py-1 rounded-full bg-primary text-pure-white text-[11px] font-bold shadow-2xs">Ozon Магазин</a>
                  <a href="https://zoozavr.ru/catalog/index/name/cat_fillers/brand/26333/" target="_blank" rel="noopener" class="px-3 py-1 rounded-full bg-[#0073E6] text-pure-white text-[11px] font-bold hover:opacity-90 transition-opacity shadow-2xs">Детский мир (Зоозавр)</a>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-6 border-t border-outline-variant/25 text-right text-[12px] text-outline">
            <p>© 1998–2026 ООО «Экософт» (murzik.biz). Все права защищены.</p>
          </div>
        </div>
      </footer>

      <!-- Slide-over Cart Drawer (Работает на всех страницах без перезагрузки) -->
      <div id="eco-cart-drawer" class="hidden fixed inset-0 z-[90]">
        <div class="absolute inset-0 eco-drawer-backdrop" onclick="window.EcoCart.closeDrawer()"></div>
        <div class="absolute top-0 right-0 h-full w-full max-w-md bg-pure-white shadow-2xl flex flex-col justify-between p-6 z-10">
          <div class="flex items-center justify-between pb-4 border-b border-outline-variant/30">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">shopping_bag</span>
              <h3 class="font-bold text-[18px] text-on-surface">Корзина заказа</h3>
              <span class="px-2 py-0.5 rounded-full bg-mint-subtle text-primary text-[11px] font-bold">Без регистрации</span>
            </div>
            <button onclick="window.EcoCart.closeDrawer()" class="p-1.5 rounded-full hover:bg-surface-container-low text-outline">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div id="eco-drawer-items" class="flex-1 overflow-y-auto py-4 flex flex-col gap-3"></div>

          <div id="eco-drawer-footer" class="pt-4 border-t border-outline-variant/30 flex flex-col gap-3">
            <div class="flex items-center justify-between text-[13px] text-on-surface-variant">
              <span>Расчётный вес заказа:</span>
              <strong id="eco-drawer-weight" class="text-on-surface">0 кг</strong>
            </div>
            <div class="flex items-baseline justify-between">
              <span class="font-semibold text-on-surface">Итого к оплате:</span>
              <span id="eco-drawer-total" class="font-extrabold text-[22px] text-primary">0 ₽</span>
            </div>
            <div class="grid grid-cols-1 gap-2">
              <a href="checkout.html" class="w-full py-3.5 rounded-full bg-primary hover:bg-primary-container text-pure-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-md transition-all">
                <span>Перейти к оформлению (без регистрации)</span>
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
              </a>
              <button onclick="window.EcoCart.closeDrawer()" class="w-full py-2.5 rounded-full bg-mint-surface hover:bg-mint-subtle text-primary font-semibold text-[13px] transition-colors">
                Продолжить покупки
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick 1-Click Buy Modal (Без регистрации) -->
      <div id="eco-quickbuy-modal" class="hidden fixed inset-0 z-[95] flex items-center justify-center p-4">
        <div class="absolute inset-0 eco-drawer-backdrop" onclick="window.EcoCart.closeQuickBuy()"></div>
        <div class="relative bg-pure-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <span class="px-3 py-1 rounded-full bg-mint-subtle text-primary text-[11px] font-bold uppercase tracking-wider">Быстрый заказ в 1 клик</span>
            <button onclick="window.EcoCart.closeQuickBuy()" class="p-1 rounded-full hover:bg-surface-container-low text-outline">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="flex items-center gap-3 p-3 rounded-xl bg-mint-surface">
            <img id="qb-product-img" src="image/brand_card_naisy.jpg" alt="" class="w-14 h-14 object-contain bg-gradient-to-b from-[#eaf6f2] to-[#e2f3ee] rounded-lg p-1 mix-blend-multiply drop-shadow-xs"/>
            <div>
              <h4 id="qb-product-name" class="font-bold text-on-surface text-[15px]">Найси Премиум</h4>
              <p id="qb-product-price" class="text-primary font-extrabold text-[14px]">295 ₽</p>
            </div>
          </div>
          <form onsubmit="window.submitQuickBuy(event)" class="flex flex-col gap-3">
            <input type="hidden" id="qb-product-id" value="naisy-premium-4-5"/>
            <div>
              <label class="text-[12px] font-semibold text-on-surface-variant block mb-1">Ваше имя *</label>
              <input required type="text" id="qb-name" placeholder="Иван Петров" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-[14px] outline-none focus:ring-2 focus:ring-primary"/>
            </div>
            <div>
              <label class="text-[12px] font-semibold text-on-surface-variant block mb-1">Телефон для подтверждения *</label>
              <input required type="tel" id="qb-phone" placeholder="+7 (999) 000-00-00" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-[14px] outline-none focus:ring-2 focus:ring-primary"/>
            </div>
            <div>
              <label class="text-[12px] font-semibold text-on-surface-variant block mb-1">Количество упаковок</label>
              <input required type="number" min="1" value="2" id="qb-qty" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-[14px] outline-none focus:ring-2 focus:ring-primary"/>
            </div>
            <button type="submit" class="w-full py-3.5 rounded-full bg-primary hover:bg-primary-container text-pure-white font-bold text-[14px] shadow-md mt-1">
              Подтвердить заказ без регистрации
            </button>
          </form>
        </div>
      </div>
    `;
  }

  window.submitQuickBuy = function (e) {
    e.preventDefault();
    const id = document.getElementById('qb-product-id').value;
    const qty = parseInt(document.getElementById('qb-qty').value, 10) || 1;
    const name = document.getElementById('qb-name').value;
    const item = findItemById(id);
    EcoCart.closeQuickBuy();
    showToast(`Заказ #ECO-${Math.floor(10000 + Math.random() * 89999)} на имя ${name} (${item ? item.name : ''} × ${qty} шт.) принят!`);
  };

  // Генератор карточки товара в точном дизайне Stitch (Nordic Clean Pet Care)
  function createStitchProductCard(p) {
    const perLiter = p.volumeL ? Math.round(p.price / p.volumeL) : Math.round(p.price / (p.weightKg || 1));
    
    // Брендовый стиль бейджа
    let brandBadgeClass = 'bg-mint-subtle/80 text-primary border border-primary/20';
    if (p.brand === 'Найси') {
      brandBadgeClass = 'bg-secondary-container/50 text-on-secondary-container border border-secondary/20';
    } else if (p.brand === 'Мурзик') {
      brandBadgeClass = 'bg-amber-100 text-amber-900 border border-amber-300/60';
    } else if (p.brand === 'Снежок') {
      brandBadgeClass = 'bg-sky-100 text-sky-900 border border-sky-300/60';
    }

    return `
      <div class="bg-pure-white rounded-3xl p-5 sm:p-6 border border-mint-subtle/70 shadow-[0_4px_20px_rgba(0,103,92,0.05)] hover:shadow-[0_16px_36px_rgba(0,103,92,0.11)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative">
        <div>
          <!-- Top Badges & Favorite -->
          <div class="flex items-center justify-between mb-3 z-10 relative">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${brandBadgeClass}">
                ${p.brand}
              </span>
              <span class="px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant text-[11px] font-semibold border border-outline-variant/30">
                ${p.volumeL} л • ${p.weightKg} кг
              </span>
            </div>
            <button onclick="window.toggleFavorite(this, '${p.id}')" aria-label="В избранное" class="w-8 h-8 rounded-full hover:bg-surface-container-low text-outline hover:text-tertiary transition-colors flex items-center justify-center shrink-0" type="button">
              <span class="material-symbols-outlined text-[20px]">favorite</span>
            </button>
          </div>

          <!-- Product Packaging Image Viewport (Единый чистый скандинавский студийный фон как у 4 брендов, упаковка не меняется) -->
          <a href="product.html?id=${p.id}" class="w-full h-56 flex items-center justify-center p-3.5 bg-gradient-to-b from-[#eaf6f2] via-[#f7fcfb] to-[#e2f3ee] rounded-2xl border border-mint-subtle/70 group-hover:border-primary/40 group-hover:shadow-md transition-all duration-300 block relative overflow-hidden">
            <img alt="${p.name}" class="max-h-full max-w-full object-contain mix-blend-multiply drop-shadow-[0_10px_14px_rgba(0,80,70,0.18)] group-hover:scale-105 transition-transform duration-300 mx-auto block" src="${p.image}" loading="lazy"/>
          </a>

          <!-- Rating & SKU Bar -->
          <div class="flex items-center justify-between gap-1.5 mt-3.5 text-[12px]">
            <div class="flex items-center gap-1.5">
              <div class="flex text-warm-amber">
                <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">star</span>
              </div>
              <span class="font-bold text-on-surface">${p.rating || '4.9'}</span>
              <span class="text-outline text-[11px]">(${p.reviewsCount || 120})</span>
            </div>
            <span class="text-[11px] font-semibold text-outline">Арт: ${p.sku}</span>
          </div>

          <!-- Title & Description with normalized heights for card grid alignment -->
          <a href="product.html?id=${p.id}" class="block mt-2">
            <h3 class="text-[17px] font-extrabold text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-2 min-h-[44px]">
              ${p.name}
            </h3>
          </a>
          <p class="text-[13px] text-on-surface-variant mt-1 leading-snug line-clamp-2 min-h-[38px]">
            ${p.subtitle || p.shortDesc}
          </p>
        </div>

        <!-- Price & Action CTA -->
        <div class="mt-4 pt-3.5 border-t border-outline-variant/20 flex flex-col gap-3">
          <div class="flex items-baseline justify-between">
            <div class="flex items-baseline gap-2">
              <span class="text-[23px] font-extrabold text-on-surface tracking-tight">${formatPrice(p.price)}</span>
              ${p.oldPrice ? `<span class="text-[12px] text-outline line-through font-medium">${formatPrice(p.oldPrice)}</span>` : ''}
            </div>
            <span class="px-2 py-0.5 rounded-md bg-mint-subtle/50 text-primary font-bold text-[11px]">${perLiter} ₽/л</span>
          </div>
          <div class="flex gap-2">
            <button onclick="window.EcoCart.add('${p.id}', 1)" class="flex-1 py-2.5 rounded-full bg-primary hover:bg-primary-container text-pure-white text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]" type="button">
              <span class="material-symbols-outlined text-[18px]">shopping_bag</span>
              <span>В корзину</span>
            </button>
            <button onclick="window.EcoCart.openQuickBuy('${p.id}')" class="px-3.5 py-2.5 rounded-full bg-mint-surface hover:bg-mint-subtle text-primary text-[12px] font-bold transition-colors shrink-0" type="button" title="Заказ в 1 клик без регистрации">
              <span>В 1 клик</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
  window.createStitchProductCard = createStitchProductCard;

  // Инициализация при загрузке DOM
  document.addEventListener('DOMContentLoaded', () => {
    renderSharedHeader();
    renderSharedFooterAndAnimation();
    EcoCart.updateHeaderBadges();
  });
})();
