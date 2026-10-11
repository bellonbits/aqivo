/* ============================================================
   Aqivo Commerce & Food Delivery Web Engine
   Full responsive website (Desktop & Mobile, Ksh Currency, No Emojis)
   Handles KFC-style product cards, dedicated product & service detail page,
   reactive cart drawer, quantity steppers, Lipa Na M-Pesa STK prompt,
   and celebratory modal.
   ============================================================ */

(function () {
  'use strict';

  window.createWebStorefront = function (config) {
    var storeName = (config.store && config.store.name) || 'Store';
    var storageKey = 'aqivo_cart_' + storeName.replace(/\s+/g, '_').toLowerCase();

    function loadCartFromStorage() {
      try {
        var s = localStorage.getItem(storageKey);
        if (s) {
          var arr = JSON.parse(s);
          if (Array.isArray(arr) && arr.length > 0) return arr;
        }
      } catch (e) {}
      return (config.initialCart || []).slice();
    }

    var state = {
      store: config.store,
      currencySymbol: 'Ksh',
      cart: loadCartFromStorage(),
      promoCode: config.defaultPromo || '',
      promoApplied: !!(config.defaultPromo && config.defaultDiscount),
      promoDiscount: config.defaultDiscount || 0,
      deliveryFee: config.deliveryFee !== undefined ? config.deliveryFee : 150,
      taxFee: config.taxFee !== undefined ? config.taxFee : 50,
      selectedPayment: 'mpesa',
      selectedLocation: 'Kilimani, Nairobi',
      activeCategory: 'all',
      activeDetailItem: null,
      detailQty: 1,
      selectedOption: '',
      pdpQty: 1,
      pdpSelectedOption1: '',
      pdpSelectedOption2: '',
      pdpExtraPrice: 0
    };

    function saveCartToStorage() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state.cart));
      } catch (e) {}
    }

    function fmt(val) {
      return Number(val).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function getSubtotal() {
      return state.cart.reduce(function (sum, item) {
        return sum + (item.price * item.qty);
      }, 0);
    }

    function getTotal() {
      var sub = getSubtotal();
      var disc = state.promoApplied ? state.promoDiscount : 0;
      var total = sub - disc + state.deliveryFee + state.taxFee;
      return total > 0 ? total : 0;
    }

    function showToast(msg) {
      var toast = document.getElementById('app-toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('active');
      setTimeout(function () {
        toast.classList.remove('active');
      }, 2400);
    }

    function updateCartUI() {
      saveCartToStorage();
      var totalQty = state.cart.reduce(function (a, b) { return a + b.qty; }, 0);
      var badge = document.getElementById('nav-cart-badge');
      if (badge) {
        badge.textContent = totalQty;
        badge.style.display = totalQty > 0 ? '' : 'none';
      }

      var cartCountLabel = document.getElementById('cart-drawer-count');
      if (cartCountLabel) cartCountLabel.textContent = totalQty + (totalQty === 1 ? ' item' : ' items');

      var container = document.getElementById('cart-items-container');
      if (!container) return;

      if (state.cart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 48px 16px; color:#71717A;">' +
          '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="1.5" style="margin-bottom:12px;"><circle cx="9" cy="21" r="1.5"/><circle cx="20" cy="21" r="1.5"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>' +
          '<h4 style="font-size:16px; font-weight:800; color:#18181B; margin-bottom:4px;">Your cart is empty</h4>' +
          '<p style="font-size:13px;">Add some items to start your order.</p>' +
          '</div>';
        
        var summaryBox = document.getElementById('cart-summary-box');
        if (summaryBox) summaryBox.style.display = 'none';
        var checkoutBtn = document.getElementById('cart-checkout-btn');
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
      }

      var summaryBox = document.getElementById('cart-summary-box');
      if (summaryBox) summaryBox.style.display = 'block';
      var checkoutBtn = document.getElementById('cart-checkout-btn');
      if (checkoutBtn) checkoutBtn.disabled = false;

      var html = '';
      state.cart.forEach(function (item, index) {
        var optStr = item.option ? ' <span style="font-size:11px; color:#71717A;">(' + item.option + ')</span>' : '';
        html += '<div class="cart-drawer-item">';
        html += '  <img src="' + item.image + '" alt="' + item.name + '" class="cart-drawer-thumb">';
        html += '  <div class="cart-drawer-info">';
        html += '    <h4 class="cart-drawer-item-title">' + item.name + optStr + '</h4>';
        html += '    <div class="cart-drawer-item-price">' + state.currencySymbol + ' ' + fmt(item.price) + '</div>';
        html += '    <div class="cart-stepper">';
        html += '      <button class="cart-stepper-btn" onclick="window.StoreApp.updateQty(' + index + ', -1)">−</button>';
        html += '      <span class="cart-stepper-count">' + (item.qty < 10 ? '0' + item.qty : item.qty) + '</span>';
        html += '      <button class="cart-stepper-btn plus" onclick="window.StoreApp.updateQty(' + index + ', 1)">+</button>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
      });
      container.innerHTML = html;

      // Summary lines
      var subVal = document.getElementById('cart-subtotal-val');
      if (subVal) subVal.textContent = state.currencySymbol + ' ' + fmt(getSubtotal());
      
      var discLine = document.getElementById('cart-discount-line');
      var discVal = document.getElementById('cart-discount-val');
      if (discLine && discVal) {
        if (state.promoApplied) {
          discLine.style.display = 'flex';
          discVal.textContent = '-' + state.currencySymbol + ' ' + fmt(state.promoDiscount);
        } else {
          discLine.style.display = 'none';
        }
      }

      var totalVal = document.getElementById('cart-total-val');
      if (totalVal) totalVal.textContent = state.currencySymbol + ' ' + fmt(getTotal());

      var ctaBtn = document.getElementById('cart-checkout-btn');
      if (ctaBtn) ctaBtn.textContent = 'Checkout (' + state.currencySymbol + ' ' + fmt(getTotal()) + ')';

      var chkDisp = document.getElementById('checkout-total-display');
      if (chkDisp) chkDisp.textContent = state.currencySymbol + ' ' + fmt(getTotal());
    }

    function addToCart(prodId, opt, qty) {
      var prods = (state.store && state.store.products) || (window.StoreApp && window.StoreApp.store && window.StoreApp.store.products) || (window.__BZ && window.__BZ.items) || [];
      var prod = prods.find(function (p) { return p.id === prodId; });
      if (!prod) return;
      var quantity = qty || 1;
      var option = opt || '';
      var existing = state.cart.find(function (it) { return it.id === prodId && it.option === option; });
      if (existing) {
        existing.qty += quantity;
      } else {
        state.cart.push({
          id: prod.id,
          name: prod.name,
          price: prod.price,
          image: prod.image,
          option: option,
          qty: quantity
        });
      }
      showToast('Added ' + (quantity > 1 ? quantity + 'x ' : '') + prod.name + ' (' + state.currencySymbol + ' ' + fmt(prod.price * quantity) + ')');
      updateCartUI();
    }

    function updateQty(index, delta) {
      if (!state.cart[index]) return;
      state.cart[index].qty += delta;
      if (state.cart[index].qty <= 0) {
        state.cart.splice(index, 1);
      }
      updateCartUI();
    }

    function openCart() {
      var overlay = document.getElementById('cart-drawer-overlay');
      if (overlay) overlay.classList.add('active');
      updateCartUI();
    }

    function closeCart() {
      var overlay = document.getElementById('cart-drawer-overlay');
      if (overlay) overlay.classList.remove('active');
    }

    function applyPromo() {
      var input = document.getElementById('cart-promo-input');
      var code = input ? input.value.trim().toUpperCase() : state.promoCode;
      state.promoCode = code || 'BREW20';
      state.promoApplied = true;
      state.promoDiscount = 200;
      updateCartUI();
      showToast('Promo code confirmed! (' + state.currencySymbol + ' ' + fmt(state.promoDiscount) + ' discount)');
    }

    function setFulfilment(type) {
      state.fulfilment = type || 'delivery';
      var delBtn = document.getElementById('toggle-delivery');
      var pickBtn = document.getElementById('toggle-pickup');
      var addrGroup = document.getElementById('delivery-address-group');
      var pickInfo = document.getElementById('pickup-location-info');

      if (state.fulfilment === 'delivery') {
        if (delBtn) delBtn.classList.add('active');
        if (pickBtn) pickBtn.classList.remove('active');
        if (addrGroup) addrGroup.style.display = 'flex';
        if (pickInfo) pickInfo.style.display = 'none';
      } else {
        if (delBtn) delBtn.classList.remove('active');
        if (pickBtn) pickBtn.classList.add('active');
        if (addrGroup) addrGroup.style.display = 'none';
        if (pickInfo) pickInfo.style.display = 'block';
      }
      updateCheckoutSummary();
    }

    function setPaymentPreference(chipEl, method) {
      state.selectedPaymentMethod = method;
      var allChips = document.querySelectorAll('.checkout-pay-chip');
      allChips.forEach(function (c) { c.classList.remove('active'); });
      if (chipEl) chipEl.classList.add('active');

      var customGroup = document.getElementById('custom-payment-group');
      if (customGroup) {
        if (method === 'Other') {
          customGroup.style.display = 'flex';
          var customInput = document.getElementById('checkout-custom-payment');
          if (customInput) customInput.focus();
        } else {
          customGroup.style.display = 'none';
        }
      }
    }

    function updateCheckoutSummary() {
      var sub = getSubtotal();
      var disc = state.promoApplied ? state.promoDiscount : 0;
      var delFee = state.fulfilment === 'delivery' ? (state.deliveryFee || 0) : 0;
      var total = Math.max(0, sub - disc + delFee + (state.taxFee || 0));

      var subVal = document.getElementById('checkout-subtotal-val');
      if (subVal) subVal.textContent = state.currencySymbol + ' ' + fmt(sub);

      var discRow = document.getElementById('checkout-discount-row');
      var discVal = document.getElementById('checkout-discount-val');
      if (discRow && discVal) {
        if (state.promoApplied && disc > 0) {
          discRow.style.display = 'flex';
          discVal.textContent = '-' + state.currencySymbol + ' ' + fmt(disc);
        } else {
          discRow.style.display = 'none';
        }
      }

      var delVal = document.getElementById('checkout-delivery-val');
      if (delVal) {
        delVal.textContent = state.fulfilment === 'delivery'
          ? state.currencySymbol + ' ' + fmt(state.deliveryFee || 150) + ' (Seller confirms)'
          : 'Free (Store Pickup)';
      }

      var totalVal = document.getElementById('checkout-total-val');
      if (totalVal) totalVal.textContent = state.currencySymbol + ' ' + fmt(total);

      var submitTotal = document.getElementById('checkout-submit-total');
      if (submitTotal) submitTotal.textContent = state.currencySymbol + ' ' + fmt(total);

      var chkDisp = document.getElementById('checkout-total-display');
      if (chkDisp) chkDisp.textContent = state.currencySymbol + ' ' + fmt(total);

      // Render items preview list
      var previewBox = document.getElementById('checkout-items-preview');
      if (previewBox) {
        if (state.cart.length === 0) {
          previewBox.innerHTML = '<div style="color:#71717A; font-size:12px; text-align:center; padding:10px;">Your cart is empty</div>';
        } else {
          var pHtml = '';
          state.cart.forEach(function (it) {
            var optStr = it.option ? ' <span style="font-size:11px; color:#71717A;">(' + it.option + ')</span>' : '';
            pHtml += '<div class="checkout-preview-item">';
            pHtml += '  <span class="checkout-preview-name">' + it.name + optStr + ' ×' + it.qty + '</span>';
            pHtml += '  <span class="checkout-preview-price">' + state.currencySymbol + ' ' + fmt(it.price * it.qty) + '</span>';
            pHtml += '</div>';
          });
          previewBox.innerHTML = pHtml;
        }
      }
    }

    function openCheckout() {
      if (state.cart.length === 0) {
        showToast('Your cart is empty. Add products to proceed to checkout.');
        return;
      }
      closeCart();
      var backdrop = document.getElementById('checkout-modal-backdrop');
      if (backdrop) backdrop.classList.add('active');
      setFulfilment(state.fulfilment || 'delivery');
      updateCheckoutSummary();
    }

    function closeCheckout() {
      var backdrop = document.getElementById('checkout-modal-backdrop');
      if (backdrop) backdrop.classList.remove('active');
    }

    function selectPayment(method) {
      // Backwards compatibility alias
      setPaymentPreference(null, method);
    }

    function submitWebsiteOrder() {
      var nameInput = document.getElementById('checkout-name');
      var phoneInput = document.getElementById('checkout-phone');
      var addrInput = document.getElementById('checkout-address');
      var customPayInput = document.getElementById('checkout-custom-payment');
      var payInstInput = document.getElementById('checkout-pay-instructions');
      var notesInput = document.getElementById('checkout-notes');

      var custName = nameInput ? nameInput.value.trim() : '';
      var custPhone = phoneInput ? phoneInput.value.trim() : '';
      var custAddress = addrInput ? addrInput.value.trim() : '';

      if (!custName) {
        showToast('Please enter your full name');
        if (nameInput) nameInput.focus();
        return;
      }
      if (!custPhone) {
        showToast('Please enter your phone number');
        if (phoneInput) phoneInput.focus();
        return;
      }
      if (state.fulfilment === 'delivery' && !custAddress) {
        showToast('Please enter your delivery destination address');
        if (addrInput) addrInput.focus();
        return;
      }

      var chosenMethod = state.selectedPaymentMethod || 'M-Pesa';
      if (chosenMethod === 'Other') {
        var typedMethod = customPayInput ? customPayInput.value.trim() : '';
        chosenMethod = typedMethod || 'Other / Custom method';
      }

      var payInstructions = payInstInput ? payInstInput.value.trim() : '';
      var orderNotes = notesInput ? notesInput.value.trim() : '';

      var sub = getSubtotal();
      var disc = state.promoApplied ? state.promoDiscount : 0;
      var delFee = state.fulfilment === 'delivery' ? (state.deliveryFee || 0) : 0;
      var total = Math.max(0, sub - disc + delFee + (state.taxFee || 0));

      var branding = getStoreBranding();
      var receiptNo = generateReceiptNumber();

      var order = {
        orderId: receiptNo,
        receiptNo: receiptNo,
        store: branding.name,
        storeTagline: branding.tagline,
        storeContact: branding.contact,
        storePhone: branding.phone,
        storeBrandColor: branding.color,
        storeIconType: branding.iconType,
        storeIconBg: branding.iconBg,
        createdAt: new Date().toISOString(),
        dateFormatted: formatDateStandard(new Date()),
        customer: {
          name: custName,
          phone: custPhone
        },
        fulfilment: state.fulfilment || 'delivery',
        address: state.fulfilment === 'delivery' ? custAddress : 'Store / Studio Pickup',
        items: JSON.parse(JSON.stringify(state.cart)),
        subtotal: sub,
        discount: disc,
        deliveryFee: delFee,
        deliveryFeeText: state.fulfilment === 'delivery' ? (delFee > 0 ? state.currencySymbol + ' ' + fmt(delFee) : 'To be confirmed') : 'Free Pickup',
        total: total,
        currencySymbol: state.currencySymbol || 'Ksh',
        paymentMethod: chosenMethod,
        paymentInstructions: payInstructions,
        notes: orderNotes,
        orderStatus: 'Order confirmed',
        paymentStatus: 'Awaiting payment confirmation',
        status: 'Unpaid' // Can later be updated to 'Payment reported', 'Paid', 'Refunded'
      };

      // Save into Aqivo's order management in localStorage
      try {
        var rawOrders = localStorage.getItem('aqivo_orders');
        var ordersList = rawOrders ? JSON.parse(rawOrders) : [];
        ordersList.unshift(order);
        localStorage.setItem('aqivo_orders', JSON.stringify(ordersList));
      } catch (e) {}

      state.lastOrder = order;

      // Clear cart
      state.cart = [];
      saveCartToStorage();
      updateCartUI();

      // Close checkout modal
      closeCheckout();

      // Update Order Confirmation Modal with actual order details
      var refEl = document.getElementById('order-success-ref');
      if (refEl) refEl.textContent = 'Receipt No. ' + order.receiptNo;

      var nameEl = document.getElementById('order-success-name');
      if (nameEl) nameEl.textContent = order.customer.name;

      var phoneEl = document.getElementById('order-success-phone');
      if (phoneEl) phoneEl.textContent = order.customer.phone;

      var fulEl = document.getElementById('order-success-fulfilment');
      if (fulEl) {
        fulEl.textContent = order.fulfilment === 'delivery' ? 'Delivery (' + order.address + ')' : 'Store / Studio Pickup';
      }

      var payEl = document.getElementById('order-success-payment');
      if (payEl) payEl.textContent = order.paymentMethod;

      var totalEl = document.getElementById('order-success-total');
      if (totalEl) totalEl.textContent = state.currencySymbol + ' ' + fmt(order.total) + '*';

      var statusBadge = document.getElementById('order-status-badge');
      if (statusBadge) {
        statusBadge.className = 'order-status-badge unpaid';
        statusBadge.textContent = 'Status: Unpaid (Awaiting payment confirmation)';
      }

      var reportBtn = document.getElementById('btn-report-payment');
      if (reportBtn) {
        reportBtn.disabled = false;
        reportBtn.textContent = 'I have paid (Report Payment)';
      }

      // Pre-render receipt card into receipt modal
      var receiptContainer = document.getElementById('receipt-modal-container');
      if (receiptContainer) {
        receiptContainer.innerHTML = renderReceiptHTML(order);
      }

      var receiptLinkEl = document.getElementById('order-success-receipt-link');
      if (receiptLinkEl) {
        receiptLinkEl.href = getReceiptPageUrl(order);
      }

      var successModal = document.getElementById('order-success-modal');
      if (successModal) successModal.classList.add('active');

      showToast('Receipt ' + order.receiptNo + ' generated & order saved!');
    }

    function payNow() {
      // Alias to website checkout submit for backward compatibility
      submitWebsiteOrder();
    }

    function fallbackCopyText(text) {
      var textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        showToast('Payment & order details copied to clipboard!');
      } catch (err) {
        showToast('Copied to clipboard');
      }
      document.body.removeChild(textArea);
    }

    function copyPaymentDetails() {
      var o = state.lastOrder;
      var storeName = (state.store && state.store.name) || 'Store';
      var textToCopy = '';

      if (o) {
        textToCopy = storeName + ' Order ' + o.orderId + '\n' +
          'Customer: ' + o.customer.name + ' (' + o.customer.phone + ')\n' +
          'Fulfilment: ' + (o.fulfilment === 'delivery' ? 'Delivery to ' + o.address : 'Store Pickup') + '\n' +
          'Preferred Payment: ' + o.paymentMethod + '\n' +
          (o.paymentInstructions ? 'Payment Instructions: ' + o.paymentInstructions + '\n' : '') +
          'Estimated Total: ' + state.currencySymbol + ' ' + fmt(o.total) + '\n' +
          'Status: ' + o.status;
      } else {
        textToCopy = storeName + ' — Payment Preference: ' + (state.selectedPaymentMethod || 'M-Pesa') + ' (' + state.currencySymbol + ' ' + fmt(getTotal()) + ')';
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(function () {
          showToast('Payment & order details copied to clipboard!');
        }).catch(function () {
          fallbackCopyText(textToCopy);
        });
      } else {
        fallbackCopyText(textToCopy);
      }
    }

    function reportPaymentMade() {
      if (state.lastOrder) {
        state.lastOrder.status = 'Payment reported';
        state.lastOrder.paymentStatus = 'Payment reported (Customer notified seller)';
        try {
          var rawOrders = localStorage.getItem('aqivo_orders');
          if (rawOrders) {
            var ordersList = JSON.parse(rawOrders);
            var found = ordersList.find(function (item) { return item.orderId === state.lastOrder.orderId || item.receiptNo === state.lastOrder.receiptNo; });
            if (found) {
              found.status = 'Payment reported';
              found.paymentStatus = 'Payment reported (Customer notified seller)';
              localStorage.setItem('aqivo_orders', JSON.stringify(ordersList));
            }
          }
        } catch (e) {}
      }

      var badge = document.getElementById('order-status-badge');
      if (badge) {
        badge.className = 'order-status-badge payment-reported';
        badge.textContent = 'Status: Payment Reported (Awaiting Seller Verification)';
      }

      var btn = document.getElementById('btn-report-payment');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Payment Reported ✓';
      }

      // Update live in receipt DOM if mounted
      var statusEl = document.getElementById('receipt-payment-status-text');
      if (statusEl) {
        statusEl.textContent = 'Payment status: Payment reported (Customer notified seller)';
      }
      var pill = document.getElementById('receipt-status-pill');
      if (pill) {
        pill.className = 'receipt-status-pill payment-reported';
      }
      syncReceiptChipUI('Payment reported (Customer notified seller)');

      showToast('Payment reported! The seller will verify your payment directly.');
    }

    function chatOrderOnWhatsApp() {
      var o = state.lastOrder;
      var phone = (state.store && state.store.whatsappPhone) || '254711456789';
      var storeName = (state.store && state.store.name) || 'Store';

      if (!o) {
        var fallbackMsg = 'Hello! I would like to inquire about my order from ' + storeName + '.';
        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(fallbackMsg), '_blank');
        return;
      }

      var itemsList = o.items.map(function (it) {
        return '• ' + it.name + (it.option ? ' (' + it.option + ')' : '') + ' x' + it.qty + ' (KSh ' + fmt(it.price * it.qty) + ')';
      }).join('\n');

      var receiptUrl = getReceiptPageUrl(o);
      var msg = 'Hello! I\'d like to confirm my order from ' + storeName + '.\n\n' +
        'Order Ref: ' + o.orderId + '\n' +
        'Receipt: ' + receiptUrl + '\n' +
        'Customer: ' + o.customer.name + ' (' + o.customer.phone + ')\n' +
        'Fulfilment: ' + (o.fulfilment === 'delivery' ? 'Delivery to ' + o.address : 'Store Pickup') + '\n\n' +
        'Items:\n' + itemsList + '\n\n' +
        'Estimated Total: KSh ' + fmt(o.total) + '\n' +
        'Preferred Payment: ' + o.paymentMethod +
        (o.paymentInstructions ? ' (' + o.paymentInstructions + ')' : '') + '\n\n' +
        'Please confirm availability, delivery or pickup options, total cost and payment instructions.';

      window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
    }

    function orderPdpOnWhatsApp() {
      var prod = state.activeDetailItem || (state.store && state.store.products && state.store.products[0]);
      if (!prod) return;

      var storeName = (state.store && state.store.name) || 'Store';
      var phone = (state.store && state.store.whatsappPhone) || '254711456789';

      var variant = [state.pdpSelectedOption1, state.pdpSelectedOption2].filter(Boolean).join(' • ');
      var unitPrice = prod.price + (state.pdpExtraPrice || 0);
      var qty = state.pdpQty || 1;
      var totalPrice = unitPrice * qty;
      var prodLink = window.location.href;

      var msg = 'Hello! I\'d like to order from ' + storeName + '.\n\n' +
        'Product: ' + prod.name + '\n' +
        (variant ? 'Selected variant: ' + variant + '\n' : '') +
        'Quantity: ' + qty + '\n' +
        'Price: KSh ' + fmt(totalPrice) + '\n' +
        'Product link: ' + prodLink + '\n\n' +
        'Please confirm availability, delivery or pickup options, total cost and payment instructions.';

      window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
    }

    function orderCartOnWhatsApp() {
      if (state.cart.length === 0) {
        showToast('Your cart is empty. Add products to order via WhatsApp.');
        return;
      }

      var storeName = (state.store && state.store.name) || 'Store';
      var phone = (state.store && state.store.whatsappPhone) || '254711456789';

      var itemsList = state.cart.map(function (it) {
        var optStr = it.option ? ' (' + it.option + ')' : '';
        return '• ' + it.name + optStr + ' ×' + it.qty + ' — KSh ' + fmt(it.price * it.qty);
      }).join('\n');

      var subtotal = getSubtotal();
      var cartLink = window.location.origin + window.location.pathname;

      var msg = 'Hello! I\'d like to order from ' + storeName + '.\n\n' +
        'Cart Items:\n' + itemsList + '\n\n' +
        'Estimated Subtotal: KSh ' + fmt(subtotal) + '\n' +
        'Store link: ' + cartLink + '\n\n' +
        'Please confirm availability, delivery or pickup options, total cost and payment instructions.';

      window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
    }

    function orderModalOnWhatsApp() {
      var prod = state.activeDetailItem;
      if (!prod) return;

      var storeName = (state.store && state.store.name) || 'Store';
      var phone = (state.store && state.store.whatsappPhone) || '254711456789';

      var variant = state.selectedOption || '';
      var qty = state.detailQty || 1;
      var totalPrice = prod.price * qty;
      var prodLink = window.location.origin + window.location.pathname + '?id=' + prod.id;

      var msg = 'Hello! I\'d like to order from ' + storeName + '.\n\n' +
        'Product: ' + prod.name + '\n' +
        (variant ? 'Selected variant: ' + variant + '\n' : '') +
        'Quantity: ' + qty + '\n' +
        'Price: KSh ' + fmt(totalPrice) + '\n' +
        'Product link: ' + prodLink + '\n\n' +
        'Please confirm availability, delivery or pickup options, total cost and payment instructions.';

      window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
    }

    function closeSuccess() {
      var successModal = document.getElementById('order-success-modal');
      if (successModal) successModal.classList.remove('active');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function getStoreBranding() {
      var s = state.store || {};
      var storeName = s.name || 'Two Sides Boutique';
      var lower = storeName.toLowerCase();

      if (lower.indexOf('two sides') !== -1 || lower.indexOf('boutique') !== -1) {
        return {
          name: 'TWO SIDES BOUTIQUE',
          tagline: 'Fashion for every side of you',
          contact: 'Nairobi, Kenya · 0722 987 654',
          phone: s.whatsappPhone || '254722987654',
          color: '#059669',
          iconBg: '#E6F9F0',
          iconType: 'bag'
        };
      } else if (lower.indexOf('mavuno') !== -1 || lower.indexOf('fresh') !== -1) {
        return {
          name: 'MAVUNO FRESH',
          tagline: 'Farm-fresh organic Kenyan produce',
          contact: 'Nairobi, Kenya · 0711 456 789',
          phone: s.whatsappPhone || '254711456789',
          color: '#16A34A',
          iconBg: '#E6F9F0',
          iconType: 'leaf'
        };
      } else if (lower.indexOf('brew') !== -1 || lower.indexOf('bite') !== -1) {
        return {
          name: 'BREW & BITES',
          tagline: 'Artisan Coffee & Flame Fried Kitchen',
          contact: 'Kilimani, Nairobi · 0733 123 456',
          phone: s.whatsappPhone || '254733123456',
          color: '#D97706',
          iconBg: '#FEF3C7',
          iconType: 'food'
        };
      } else if (lower.indexOf('zuri') !== -1 || lower.indexOf('beauty') !== -1) {
        return {
          name: 'ZURI BEAUTY STUDIO',
          tagline: 'Luxe Braids & Holistic Beauty Care',
          contact: 'Rose Avenue, Kilimani · 0744 567 890',
          phone: s.whatsappPhone || '254744567890',
          color: '#9333EA',
          iconBg: '#F3E8FF',
          iconType: 'beauty'
        };
      }

      return {
        name: storeName.toUpperCase(),
        tagline: s.tagline || 'Online Storefront',
        contact: s.contact || 'Nairobi, Kenya · ' + (s.whatsappPhone || '0700 000 000'),
        phone: s.whatsappPhone || '254700000000',
        color: '#059669',
        iconBg: '#E6F9F0',
        iconType: 'bag'
      };
    }

    function getBrandingIconSVG(type, color) {
      if (type === 'leaf') {
        return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>';
      } else if (type === 'food') {
        return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>';
      } else if (type === 'beauty') {
        return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
      }
      return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
    }

    function generateReceiptNumber() {
      var now = new Date();
      var y = now.getFullYear();
      var m = String(now.getMonth() + 1).padStart(2, '0');
      var d = String(now.getDate()).padStart(2, '0');
      var dateKey = '' + y + m + d;
      var seqKey = 'aqivo_receipt_seq_' + dateKey;
      var seq = parseInt(localStorage.getItem(seqKey) || '0', 10) + 1;
      localStorage.setItem(seqKey, String(seq));
      var seqStr = String(seq).padStart(3, '0');
      return 'AQ-' + dateKey + '-' + seqStr;
    }

    function formatDateStandard(date) {
      if (!date) date = new Date();
      if (typeof date === 'string') date = new Date(date);
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
    }

    function getSampleOrderForStore() {
      var branding = getStoreBranding();
      var firstProd = (state.store && state.store.products && state.store.products[0]) || {
        name: 'Classic handbag',
        price: 2500
      };

      return {
        orderId: 'AQ-20261010-001',
        receiptNo: 'AQ-20261010-001',
        store: branding.name,
        storeTagline: branding.tagline,
        storeContact: branding.contact,
        storePhone: branding.phone,
        storeBrandColor: branding.color,
        storeIconType: branding.iconType,
        storeIconBg: branding.iconBg,
        createdAt: '2026-10-10T14:30:00.000Z',
        dateFormatted: '10 Oct 2026',
        customer: {
          name: 'Grace Muthoni',
          phone: '0722 000 000'
        },
        fulfilment: 'delivery',
        address: 'Nairobi, Kenya',
        items: [
          {
            name: firstProd.name,
            price: firstProd.price,
            qty: 1
          }
        ],
        subtotal: firstProd.price,
        discount: 0,
        deliveryFee: 0,
        deliveryFeeText: 'To be confirmed',
        total: firstProd.price,
        currencySymbol: state.currencySymbol || 'Ksh',
        paymentMethod: 'M-Pesa',
        paymentInstructions: '',
        notes: '',
        orderStatus: 'Order confirmed',
        paymentStatus: 'Awaiting payment confirmation',
        status: 'Unpaid'
      };
    }

    function renderReceiptHTML(o) {
      if (!o) {
        o = state.lastOrder || getSampleOrderForStore();
      }

      var branding = o.storeBrandColor ? {
        name: o.store,
        tagline: o.storeTagline,
        contact: o.storeContact,
        color: o.storeBrandColor,
        iconBg: o.storeIconBg,
        iconType: o.storeIconType
      } : getStoreBranding();

      var iconSVG = getBrandingIconSVG(branding.iconType, branding.color);
      var currency = o.currencySymbol || 'Ksh';

      var itemsHtml = (o.items && o.items.length > 0 ? o.items : [
        { name: 'Store Item', price: o.subtotal || o.total || 2500, qty: 1 }
      ]).map(function (it) {
        var optStr = it.option ? ' (' + it.option + ')' : '';
        var unitPriceStr = currency + ' ' + fmt(it.price);
        var lineTotalStr = currency + ' ' + fmt(it.price * it.qty);
        return '<div class="receipt-item-row">' +
          '<div class="receipt-item-left">' +
            '<div class="receipt-item-name">' + escapeHtml(it.name) + '</div>' +
            '<div class="receipt-item-sub">Qty: ' + it.qty + ' × ' + unitPriceStr + optStr + '</div>' +
          '</div>' +
          '<div class="receipt-item-right">' +
            '<span class="receipt-item-total">' + lineTotalStr + '</span>' +
          '</div>' +
        '</div>';
      }).join('');

      var deliveryFeeDisplay = o.deliveryFeeText || (o.fulfilment === 'delivery' ? 'To be confirmed' : 'Free Pickup');
      var statusPillClass = 'receipt-status-pill';
      if (o.paymentStatus === 'Paid' || o.paymentStatus === 'Paid (Confirmed by seller)') {
        statusPillClass += ' paid';
      } else if (o.paymentStatus && o.paymentStatus.indexOf('reported') !== -1) {
        statusPillClass += ' payment-reported';
      }

      var html = '<div class="aqivo-receipt-card" id="aqivo-receipt-card">' +
        '<div class="receipt-brand-icon-wrap">' +
          '<div class="receipt-brand-icon" style="background:' + branding.iconBg + ';">' +
            iconSVG +
          '</div>' +
        '</div>' +

        '<div class="receipt-store-header">' +
          '<h1 class="receipt-store-name">' + escapeHtml(branding.name) + '</h1>' +
          '<p class="receipt-store-tagline">' + escapeHtml(branding.tagline) + '</p>' +
          '<p class="receipt-store-contact">' + escapeHtml(branding.contact) + '</p>' +
        '</div>' +

        '<div class="receipt-divider"></div>' +

        '<div class="receipt-title-block">' +
          '<h2 class="receipt-title">ORDER RECEIPT</h2>' +
          '<div class="receipt-number">Receipt No. ' + escapeHtml(o.receiptNo || o.orderId) + '</div>' +
          '<div class="receipt-status-pill-wrap">' +
            '<span class="' + statusPillClass + '" id="receipt-status-pill">' + escapeHtml(o.orderStatus || 'Order confirmed') + '</span>' +
          '</div>' +
        '</div>' +

        '<div class="receipt-meta-grid">' +
          '<div class="receipt-meta-row">' +
            '<span class="receipt-meta-label">Order date</span>' +
            '<span class="receipt-meta-val">' + escapeHtml(o.dateFormatted || formatDateStandard(o.createdAt)) + '</span>' +
          '</div>' +
          '<div class="receipt-meta-row">' +
            '<span class="receipt-meta-label">Customer</span>' +
            '<span class="receipt-meta-val">' + escapeHtml(o.customer ? o.customer.name : 'Customer name') + '</span>' +
          '</div>' +
          '<div class="receipt-meta-row">' +
            '<span class="receipt-meta-label">Order type</span>' +
            '<span class="receipt-meta-val">' + (o.fulfilment === 'delivery' ? 'Delivery' : 'Store Pickup') + '</span>' +
          '</div>' +
          (o.fulfilment === 'delivery' && o.address ? (
            '<div class="receipt-meta-row">' +
              '<span class="receipt-meta-label">Destination</span>' +
              '<span class="receipt-meta-val">' + escapeHtml(o.address) + '</span>' +
            '</div>'
          ) : '') +
        '</div>' +

        '<div class="receipt-divider"></div>' +

        '<div class="receipt-section-header">Order items</div>' +
        '<div class="receipt-items-list">' +
          itemsHtml +
        '</div>' +

        '<div class="receipt-divider"></div>' +

        '<div class="receipt-breakdown-list">' +
          '<div class="receipt-breakdown-row">' +
            '<span class="receipt-breakdown-label">Subtotal</span>' +
            '<span class="receipt-breakdown-val">' + currency + ' ' + fmt(o.subtotal || o.total) + '</span>' +
          '</div>' +
          (o.discount > 0 ? (
            '<div class="receipt-breakdown-row" style="color:var(--accent-coral);">' +
              '<span class="receipt-breakdown-label">Discount</span>' +
              '<span class="receipt-breakdown-val">-' + currency + ' ' + fmt(o.discount) + '</span>' +
            '</div>'
          ) : '') +
          '<div class="receipt-breakdown-row">' +
            '<span class="receipt-breakdown-label">Delivery fee</span>' +
            '<span class="receipt-breakdown-val">' + escapeHtml(deliveryFeeDisplay) + '</span>' +
          '</div>' +
        '</div>' +

        '<div class="receipt-divider"></div>' +

        '<div class="receipt-total-row">' +
          '<span class="receipt-total-label">Order total</span>' +
          '<span class="receipt-total-val">' + currency + ' ' + fmt(o.total) + '*</span>' +
        '</div>' +

        '<div class="receipt-payment-box">' +
          '<div class="receipt-payment-method" id="receipt-payment-method-text">Payment method: ' + escapeHtml(o.paymentMethod || 'M-Pesa') + '</div>' +
          '<div class="receipt-payment-status" id="receipt-payment-status-text">Payment status: ' + escapeHtml(o.paymentStatus || 'Awaiting payment confirmation') + '</div>' +
        '</div>' +

        '<div class="receipt-thankyou-note">Thank you for shopping with us.</div>' +

        '<div class="receipt-divider"></div>' +

        '<div class="receipt-aqivo-footer">' +
          '<div class="receipt-powered-by">Powered by Aqivo</div>' +
          '<div class="receipt-slogan">Your business. Your store. Your brand.</div>' +
          '<div class="receipt-disclaimer">*Illustrative example. Final total depends on confirmed delivery charges.</div>' +
        '</div>' +
      '</div>';

      return html;
    }

    function openReceiptModal(order) {
      var o = order || state.lastOrder;
      if (!o) {
        try {
          var raw = localStorage.getItem('aqivo_orders');
          if (raw) {
            var list = JSON.parse(raw);
            if (list.length > 0) o = list[0];
          }
        } catch (e) {}
      }
      if (!o) {
        o = getSampleOrderForStore();
      }
      state.activeReceiptOrder = o;

      var container = document.getElementById('receipt-modal-container');
      if (container) {
        container.innerHTML = renderReceiptHTML(o);
      }

      // Sync active chip
      syncReceiptChipUI(o.paymentStatus);

      var fullPageBtn = document.getElementById('receipt-fullpage-btn');
      if (fullPageBtn) {
        fullPageBtn.href = getReceiptPageUrl(o);
      }

      var modal = document.getElementById('receipt-modal-backdrop');
      if (modal) modal.classList.add('active');
    }

    function closeReceiptModal() {
      var modal = document.getElementById('receipt-modal-backdrop');
      if (modal) modal.classList.remove('active');
    }

    function getReceiptPageUrl(order) {
      var o = order || state.activeReceiptOrder || state.lastOrder;
      var receiptNo = o ? (o.receiptNo || o.orderId) : '';
      var path = window.location.pathname || '';
      var origin = window.location.origin || '';
      
      // If already on receipt.html
      if (path.indexOf('receipt.html') !== -1) {
        return origin + path + (receiptNo ? '?orderId=' + encodeURIComponent(receiptNo) : '');
      }
      
      // If in a subfolder like /twosidesboutique/ or root
      var dir = path.substring(0, path.lastIndexOf('/') + 1);
      return origin + dir + 'receipt.html' + (receiptNo ? '?orderId=' + encodeURIComponent(receiptNo) : '');
    }

    function openReceiptPage(order, newTab) {
      var url = getReceiptPageUrl(order);
      if (newTab) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    }

    function goToReceiptPage(e, order) {
      if (e && e.preventDefault) e.preventDefault();
      openReceiptPage(order, false);
    }

    function printReceipt() {
      window.print();
    }

    function shareReceiptWhatsApp(order) {
      var o = order || state.activeReceiptOrder || state.lastOrder || getSampleOrderForStore();
      var phone = (o.storePhone) || (state.store && state.store.whatsappPhone) || '254711456789';
      var storeName = o.store || (state.store && state.store.name) || 'Store';
      var receiptNo = o.receiptNo || o.orderId;
      var receiptUrl = getReceiptPageUrl(o);

      var msg = '*' + storeName.toUpperCase() + '*\n' +
        'Order Receipt: ' + receiptNo + '\n' +
        'Order Date: ' + (o.dateFormatted || formatDateStandard(o.createdAt)) + '\n' +
        'Customer: ' + (o.customer ? o.customer.name : 'Valued Customer') + '\n' +
        'Fulfilment: ' + (o.fulfilment === 'delivery' ? 'Delivery to ' + (o.address || 'Nairobi') : 'Store Pickup') + '\n\n' +
        'Order Total: ' + (o.currencySymbol || 'Ksh') + ' ' + fmt(o.total) + ' (Delivery fee to be confirmed)\n' +
        'Payment Method: ' + (o.paymentMethod || 'M-Pesa') + '\n' +
        'Payment Status: ' + (o.paymentStatus || 'Awaiting payment confirmation') + '\n\n' +
        'View Official Receipt: ' + receiptUrl + '\n\n' +
        'Powered by Aqivo — Your business. Your store. Your brand.';

      window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
    }

    function copyReceiptLink(order) {
      var o = order || state.activeReceiptOrder || state.lastOrder || getSampleOrderForStore();
      var storeName = o.store || (state.store && state.store.name) || 'Store';
      var receiptNo = o.receiptNo || o.orderId;
      var receiptUrl = getReceiptPageUrl(o);

      var textToCopy = storeName + ' — Receipt No. ' + receiptNo + '\n' +
        'Total: ' + (o.currencySymbol || 'Ksh') + ' ' + fmt(o.total) + '\n' +
        'Payment Method: ' + (o.paymentMethod || 'M-Pesa') + '\n' +
        'Payment Status: ' + (o.paymentStatus || 'Awaiting payment confirmation') + '\n' +
        'Receipt URL: ' + receiptUrl;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(function () {
          showToast('Receipt link & details copied to clipboard!');
        }).catch(function () {
          fallbackCopyText(textToCopy);
        });
      } else {
        fallbackCopyText(textToCopy);
      }
    }

    function syncReceiptChipUI(status) {
      var chipAwaiting = document.getElementById('chip-status-awaiting');
      var chipReported = document.getElementById('chip-status-reported');
      var chipPaid = document.getElementById('chip-status-paid');
      if (!chipAwaiting || !chipReported || !chipPaid) return;

      chipAwaiting.classList.remove('active');
      chipReported.classList.remove('active');
      chipPaid.classList.remove('active');

      if (status === 'Paid' || status === 'Paid (Confirmed by seller)') {
        chipPaid.classList.add('active');
      } else if (status && status.indexOf('reported') !== -1) {
        chipReported.classList.add('active');
      } else {
        chipAwaiting.classList.add('active');
      }
    }

    function updateReceiptPaymentStatus(newStatus) {
      var o = state.activeReceiptOrder || state.lastOrder;
      if (!o) return;

      o.paymentStatus = newStatus;
      if (newStatus === 'Paid (Confirmed by seller)') {
        o.status = 'Paid';
      } else if (newStatus.indexOf('reported') !== -1) {
        o.status = 'Payment reported';
      } else {
        o.status = 'Unpaid';
      }

      // Update in localStorage
      try {
        var rawOrders = localStorage.getItem('aqivo_orders');
        if (rawOrders) {
          var ordersList = JSON.parse(rawOrders);
          var found = ordersList.find(function (item) { return item.orderId === o.orderId || item.receiptNo === o.receiptNo; });
          if (found) {
            found.paymentStatus = newStatus;
            found.status = o.status;
            localStorage.setItem('aqivo_orders', JSON.stringify(ordersList));
          }
        }
      } catch (e) {}

      // Update live in receipt DOM
      var statusEl = document.getElementById('receipt-payment-status-text');
      if (statusEl) {
        statusEl.textContent = 'Payment status: ' + newStatus;
      }

      var pill = document.getElementById('receipt-status-pill');
      if (pill) {
        pill.className = 'receipt-status-pill';
        if (newStatus === 'Paid (Confirmed by seller)') {
          pill.classList.add('paid');
        } else if (newStatus.indexOf('reported') !== -1) {
          pill.classList.add('payment-reported');
        }
      }

      syncReceiptChipUI(newStatus);
      showToast('Receipt updated: ' + newStatus);
    }

    function trackOrder() {
      closeSuccess();
      showToast('Order saved! The seller will contact you directly to confirm delivery.');
    }

    function changeLocation() {
      var estates = ['Kilimani, Nairobi', 'Westlands, Nairobi', 'Lavington, Nairobi', 'Karen, Nairobi', 'Kileleshwa, Nairobi'];
      var currIdx = estates.indexOf(state.selectedLocation);
      var nextIdx = (currIdx + 1) % estates.length;
      state.selectedLocation = estates[nextIdx];
      
      var lbl = document.getElementById('nav-location-label');
      if (lbl) lbl.textContent = state.selectedLocation;
      showToast('Delivery location set to: ' + state.selectedLocation);
    }

    function filterCategory(cat) {
      state.activeCategory = cat;
      var buttons = document.querySelectorAll('.cat-chip-btn');
      buttons.forEach(function (btn) {
        if (btn.getAttribute('data-cat') === cat) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      var sections = document.querySelectorAll('.catalog-section');
      sections.forEach(function (sec) {
        var secCat = sec.getAttribute('data-section-cat');
        if (cat === 'all' || secCat === cat) {
          sec.style.display = 'block';
        } else {
          sec.style.display = 'none';
        }
      });
    }

    function searchMenu(query) {
      var q = (query || '').toLowerCase().trim();
      var searchBars = document.querySelectorAll('.nav-search-bar');
      searchBars.forEach(function (bar) {
        if (q) bar.classList.add('has-query');
        else bar.classList.remove('has-query');
      });

      var cards = document.querySelectorAll('.menu-card');
      var matchCount = 0;
      cards.forEach(function (card) {
        var attrName = (card.getAttribute('data-prod-name') || '').toLowerCase();
        var titleEl = card.querySelector('.menu-card-title, h3, h4');
        var titleText = titleEl ? titleEl.textContent.toLowerCase() : '';
        if (!q || attrName.indexOf(q) > -1 || titleText.indexOf(q) > -1) {
          card.style.display = 'flex';
          matchCount++;
        } else {
          card.style.display = 'none';
        }
      });

      // Update visibility of catalog sections
      var sections = document.querySelectorAll('.catalog-section');
      sections.forEach(function (sec) {
        if (!q) {
          sec.style.display = '';
        } else {
          var visibleCard = sec.querySelector('.menu-card[style*="display: flex"], .menu-card:not([style*="display: none"])');
          sec.style.display = visibleCard ? '' : 'none';
        }
      });

      // Empty search state feedback
      var emptyEl = document.getElementById('search-empty-state');
      if (q && matchCount === 0 && cards.length > 0) {
        if (!emptyEl) {
          emptyEl = document.createElement('div');
          emptyEl.id = 'search-empty-state';
          emptyEl.style.cssText = 'text-align:center; padding:48px 20px; color:#71717A; grid-column: 1/-1; width:100%;';
          var mainContent = document.querySelector('.main-page-content') || document.querySelector('main');
          if (mainContent) mainContent.appendChild(emptyEl);
        }
        if (emptyEl) {
          emptyEl.style.display = 'block';
          emptyEl.innerHTML = '<div style="font-size:32px; margin-bottom:10px;">🔍</div>' +
            '<h3 style="font-size:18px; font-weight:800; color:#18181B; margin-bottom:6px;">No products found for "' + q + '"</h3>' +
            '<p style="font-size:13.5px; color:#71717A; margin-bottom:16px;">Try checking your spelling or searching for another item.</p>' +
            '<button onclick="window.StoreApp.clearSearch()" style="background:#18181B; color:#fff; border:none; padding:8px 18px; border-radius:9999px; font-weight:700; font-size:13px; cursor:pointer;">Clear Search</button>';
        }
      } else if (emptyEl) {
        emptyEl.style.display = 'none';
      }
    }

    function clearSearch() {
      var inputs = document.querySelectorAll('.nav-search-bar input');
      inputs.forEach(function (inp) {
        inp.value = '';
      });
      searchMenu('');
      var firstInput = document.querySelector('.nav-search-bar input');
      if (firstInput) firstInput.focus();
    }

    function goToSearch(query) {
      var q = (query || '').trim();
      if (!q) return;
      window.location.href = 'index.html?q=' + encodeURIComponent(q);
    }

    function startTimer() {
      var countdownEl = document.getElementById('offers-countdown');
      if (!countdownEl) return;
      var seconds = 4 * 3600 + 45 * 60 + 10;
      setInterval(function () {
        seconds--;
        if (seconds <= 0) seconds = 5 * 3600;
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        var pad = function (n) { return n < 10 ? '0' + n : n; };
        countdownEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' + pad(h) + ':' + pad(m) + ':' + pad(s);
      }, 1000);
    }

    /* Product / Service Description generator */
    function getProductDescription(prod) {
      if (prod && (prod.desc || prod.description)) return prod.desc || prod.description;
      var name = (prod.name || '').toLowerCase();
      if (name.indexOf('streetwise 3 meal') > -1) {
        return 'Signature KFC-style meal featuring 3 pieces of golden, crunchy fried chicken seasoned with our 11 secret herbs and spices, a large portion of crisp spiced fries, and a chilled 350ml beverage.';
      } else if (name.indexOf('streetwise 3') > -1) {
        return 'Three succulent pieces of fresh Kenyan bone-in chicken fried to crispy golden perfection, accompanied by a generous serving of hot crispy chips.';
      } else if (name.indexOf('colonel rice') > -1) {
        return 'Two pieces of crispy fried chicken served alongside fragrant turmeric-seasoned spiced rice and rich savory gravy reduction.';
      } else if (name.indexOf('chipotle') > -1) {
        return 'Six pieces of prime crunchy chicken wings dunked generously in our chef-crafted smoky maple chili glaze, topped with toasted sesame seeds and fresh scallions.';
      } else if (name.indexOf('wings bucket') > -1) {
        return 'Ten plump, crunchy wings bathed in rich hickory smoke barbecue sauce. Perfect for sharing with friends or family gatherings.';
      } else if (name.indexOf('drumsticks') > -1) {
        return 'Four plump, juicy chicken drumsticks marinated in habanero peri-peri and citrus spice, fried to golden fiery perfection.';
      } else if (name.indexOf('wings') > -1) {
        return 'Six pieces of prime chicken wings seasoned with crunchy golden breading and fried fresh to order. Served with garlic dip.';
      } else if (name.indexOf('pizza') > -1) {
        return 'Handcrafted stone-baked artisan pizza made with 48-hour fermented sourdough, San Marzano tomato reduction, fresh mozzarella, and savory toppings.';
      } else if (name.indexOf('burger') > -1) {
        return 'Two smash-seared Kenyan prime beef patties, melted sharp cheddar, caramelized onions, house pickles, and secret burger sauce on a toasted brioche bun.';
      } else if (name.indexOf('cold brew') > -1) {
        return 'Single-origin Kenyan AA Arabica beans steeped cold for 18 hours, resulting in rich dark notes of blackcurrant, dark chocolate, and crisp refreshing clarity.';
      } else if (name.indexOf('wrap dress') > -1) {
        return 'Handcrafted from coastal Kenyan Kikoi woven cotton, featuring an adjustable draped tie waist, flattering deep V-neckline, and side pockets tailored in our Kilimani atelier.';
      } else if (name.indexOf('silk slip') > -1) {
        return 'Bias-cut 100% pure mulberry silk dress designed to drape naturally over the body. Features French seams and delicate adjustable straps.';
      } else if (name.indexOf('tote bag') > -1) {
        return 'Hand-stitched from full-grain vegetable-tanned Kenyan leather, fitted with solid brass hardware, suede lining, and reinforced carry handles.';
      } else if (name.indexOf('linen') > -1) {
        return 'Crafted from 100% pre-washed breathable European flax linen. Soft on skin, moisture-wicking, and naturally tailored for warm Nairobi afternoons.';
      } else if (name.indexOf('avocado') > -1) {
        return 'Export-grade Hass avocados grown organically in the volcanic soils of Murang’a. Creamy, nutrient-rich, picked fresh daily.';
      } else if (name.indexOf('box') > -1) {
        return 'Carefully selected weekly farm harvest containing spinach, sukuma wiki, carrots, bell peppers, courgettes, and red onions packed in biodegradable boxes.';
      } else if (name.indexOf('braid') > -1) {
        return 'Specialist knotless tension-free braids installed by senior stylists. Lightweight, neat parts, bohemian wavy curl ends, and finished with botanical tea tree scalp oil.';
      } else if (name.indexOf('manicure') > -1) {
        return 'Full Russian cuticle care, nail strengthening base, precision gel sculpting, and high-shine LED cured topcoat lasting up to 3 weeks.';
      } else if (name.indexOf('facial') > -1) {
        return 'Deep pore steam cleanse, ultrasonic exfoliation, hyaluronic acid moisture infusion, and relaxing jade roller lymphatic drainage massage.';
      } else if (name.indexOf('oil') > -1 || name.indexOf('butter') > -1) {
        return 'Pure cold-pressed Kenyan botanical beauty formula, rich in essential fatty acids and antioxidants for glowing skin and nourished hair.';
      }
      return 'Freshly prepared and curated with premium ingredients and craftsmanship. Guaranteed highest quality standards with fast Nairobi delivery.';
    }

    /* Modal Quick-view detail */
    function ensureDetailModalInDOM() {
      var modal = document.getElementById('product-detail-backdrop');
      if (modal) return modal;

      var div = document.createElement('div');
      div.id = 'product-detail-backdrop';
      div.className = 'product-detail-backdrop';
      div.onclick = function (e) {
        if (e.target === div) closeProductDetail();
      };

      div.innerHTML =
        '<div class="product-detail-dialog" role="dialog" aria-modal="true">' +
        '  <button class="product-detail-close-btn" onclick="window.StoreApp.closeProductDetail()" aria-label="Close">' +
        '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '  </button>' +
        '  <div class="product-detail-body">' +
        '    <div class="product-detail-media-col">' +
        '      <div class="product-detail-img-box">' +
        '        <span class="product-detail-badge" id="detail-modal-badge">Popular</span>' +
        '        <img id="detail-modal-img" src="" alt="Product Image" />' +
        '      </div>' +
        '    </div>' +
        '    <div class="product-detail-content-col">' +
        '      <h2 class="product-detail-title" id="detail-modal-title"></h2>' +
        '      <div class="product-detail-price" id="detail-modal-price"></div>' +
        '      <p class="product-detail-desc" id="detail-modal-desc"></p>' +
        '      <div class="product-detail-tags-row" id="detail-modal-tags"></div>' +
        '      <div class="product-detail-options-group" id="detail-modal-options-wrap" style="display:none;">' +
        '        <label class="product-detail-opt-label" id="detail-modal-options-title">Select Option:</label>' +
        '        <div class="product-detail-opt-row" id="detail-modal-options-row"></div>' +
        '      </div>' +
        '      <div class="product-detail-actions-row">' +
        '        <div class="product-detail-stepper">' +
        '          <button class="cart-stepper-btn" onclick="window.StoreApp.updateDetailQty(-1)">−</button>' +
        '          <span class="cart-stepper-count" id="detail-modal-qty">01</span>' +
        '          <button class="cart-stepper-btn plus" onclick="window.StoreApp.updateDetailQty(1)">+</button>' +
        '        </div>' +
        '        <button class="product-detail-cta-btn" id="detail-modal-add-btn" onclick="window.StoreApp.addDetailToCart()">' +
        '          Add to Bag' +
        '        </button>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      document.body.appendChild(div);
      return div;
    }

    function openProductDetail(prodId) {
      var prods = (state.store && state.store.products) || (window.StoreApp && window.StoreApp.store && window.StoreApp.store.products) || (window.__BZ && window.__BZ.items) || [];
      var prod = prods.find(function (p) { return p.id === prodId; });
      if (!prod) return;

      state.activeDetailItem = prod;
      state.detailQty = 1;

      var backdrop = ensureDetailModalInDOM();

      var imgEl = document.getElementById('detail-modal-img');
      if (imgEl) {
        imgEl.src = prod.image;
        imgEl.alt = prod.name;
      }

      var badgeEl = document.getElementById('detail-modal-badge');
      if (badgeEl) {
        var cardEl = document.querySelector('.menu-card[data-prod-name="' + prod.name + '"]');
        var hasPopular = cardEl && cardEl.querySelector('.card-popular-badge');
        badgeEl.style.display = hasPopular ? 'inline-block' : 'none';
      }

      var titleEl = document.getElementById('detail-modal-title');
      if (titleEl) titleEl.textContent = prod.name;

      var priceEl = document.getElementById('detail-modal-price');
      if (priceEl) priceEl.textContent = state.currencySymbol + ' ' + fmt(prod.price);

      var descEl = document.getElementById('detail-modal-desc');
      if (descEl) descEl.textContent = getProductDescription(prod);

      var tagsWrap = document.getElementById('detail-modal-tags');
      if (tagsWrap) {
        tagsWrap.innerHTML = '<span class="product-detail-tag-pill">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
          '15–20 Mins Delivery</span>' +
          '<span class="product-detail-tag-pill">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
          'Fresh Prep</span>';
      }

      updateDetailQtyUI();
      backdrop.classList.add('active');
    }

    function closeProductDetail() {
      var backdrop = document.getElementById('product-detail-backdrop');
      if (backdrop) backdrop.classList.remove('active');
    }

    function updateDetailQty(delta) {
      state.detailQty = Math.max(1, state.detailQty + delta);
      updateDetailQtyUI();
    }

    function updateDetailQtyUI() {
      var qtyEl = document.getElementById('detail-modal-qty');
      if (qtyEl) {
        qtyEl.textContent = state.detailQty < 10 ? '0' + state.detailQty : state.detailQty;
      }

      var addBtn = document.getElementById('detail-modal-add-btn');
      if (addBtn && state.activeDetailItem) {
        var total = state.activeDetailItem.price * state.detailQty;
        addBtn.textContent = 'Add to Bag — ' + state.currencySymbol + ' ' + fmt(total);
      }
    }

    function selectDetailOption(btn, optName) {
      state.selectedOption = optName;
      var buttons = document.querySelectorAll('.product-detail-opt-btn');
      buttons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    }

    function addDetailToCart() {
      if (!state.activeDetailItem) return;
      addToCart(state.activeDetailItem.id, state.selectedOption, state.detailQty);
      closeProductDetail();
    }

    /* ========================================================
       Dedicated Product / Services Detail Page (PDP) Wiring
       ======================================================== */
    function initPDP() {
      var pdpContainer = document.getElementById('pdp-page-container');
      if (!pdpContainer) return;

      var urlParams = new URLSearchParams(window.location.search);
      var prodId = urlParams.get('id');
      var prod = state.store.products.find(function (p) { return p.id === prodId; }) || state.store.products[0];
      if (!prod) return;

      state.activeDetailItem = prod;
      state.pdpQty = 1;
      state.pdpExtraPrice = 0;

      // Breadcrumb & Title
      var crumbTitle = document.getElementById('pdp-crumb-title');
      if (crumbTitle) crumbTitle.textContent = prod.name;

      var titleEl = document.getElementById('pdp-item-title');
      if (titleEl) titleEl.textContent = prod.name;

      // Image & Thumbnails
      var heroImg = document.getElementById('pdp-hero-img');
      if (heroImg) {
        heroImg.src = prod.image;
        heroImg.alt = prod.name;
      }

      var thumb0 = document.getElementById('pdp-thumb-0');
      if (thumb0) {
        var timg = thumb0.querySelector('img');
        if (timg) timg.src = prod.image;
      }

      // Base Price
      function updatePdpPriceUI() {
        var unitPrice = prod.price + state.pdpExtraPrice;
        var totalPrice = unitPrice * state.pdpQty;

        var priceBold = document.getElementById('pdp-price-bold');
        if (priceBold) priceBold.textContent = state.currencySymbol + ' ' + fmt(unitPrice);

        var qtyVal = document.getElementById('pdp-qty-val');
        if (qtyVal) qtyVal.textContent = state.pdpQty < 10 ? '0' + state.pdpQty : state.pdpQty;

        var addBtn = document.getElementById('pdp-add-bag-btn');
        if (addBtn) addBtn.textContent = 'Add to Bag — ' + state.currencySymbol + ' ' + fmt(totalPrice);

        var mobPrice = document.getElementById('pdp-mobile-price');
        if (mobPrice) mobPrice.textContent = state.currencySymbol + ' ' + fmt(totalPrice);

        var mobAddBtn = document.getElementById('pdp-mobile-add-btn');
        if (mobAddBtn) mobAddBtn.textContent = 'Add to Bag (' + (state.pdpQty < 10 ? '0' + state.pdpQty : state.pdpQty) + ')';
      }

      updatePdpPriceUI();

      // Description
      var descEl = document.getElementById('pdp-description-text');
      if (descEl) descEl.textContent = getProductDescription(prod);

      // Accordion click handlers
      var accordions = document.querySelectorAll('.pdp-accordion-item');
      accordions.forEach(function (acc) {
        var header = acc.querySelector('.pdp-accordion-header');
        if (header) {
          header.onclick = function () {
            acc.classList.toggle('open');
          };
        }
      });
    }

    function updatePdpQty(delta) {
      state.pdpQty = Math.max(1, state.pdpQty + delta);
      var prod = state.activeDetailItem;
      if (!prod) return;
      var unitPrice = prod.price + state.pdpExtraPrice;
      var totalPrice = unitPrice * state.pdpQty;

      var qtyVal = document.getElementById('pdp-qty-val');
      if (qtyVal) qtyVal.textContent = state.pdpQty < 10 ? '0' + state.pdpQty : state.pdpQty;

      var addBtn = document.getElementById('pdp-add-bag-btn');
      if (addBtn) addBtn.textContent = 'Add to Bag — ' + state.currencySymbol + ' ' + fmt(totalPrice);

      var mobPrice = document.getElementById('pdp-mobile-price');
      if (mobPrice) mobPrice.textContent = state.currencySymbol + ' ' + fmt(totalPrice);

      var mobAddBtn = document.getElementById('pdp-mobile-add-btn');
      if (mobAddBtn) mobAddBtn.textContent = 'Add to Bag (' + (state.pdpQty < 10 ? '0' + state.pdpQty : state.pdpQty) + ')';
    }

    function selectPdpOption(btn, optGroup, optName, extraCost) {
      var parent = btn.parentElement;
      if (parent) {
        var all = parent.querySelectorAll('.pdp-chip-btn');
        all.forEach(function (b) { b.classList.remove('active'); });
      }
      btn.classList.add('active');

      if (optGroup === 1) {
        state.pdpSelectedOption1 = optName;
        state.pdpExtraPrice = Number(extraCost || 0);
      } else {
        state.pdpSelectedOption2 = optName;
      }

      updatePdpQty(0);
    }

    function addPdpToCart() {
      if (!state.activeDetailItem) return;
      var optSummary = [state.pdpSelectedOption1, state.pdpSelectedOption2].filter(Boolean).join(' • ');
      var unitPrice = state.activeDetailItem.price + state.pdpExtraPrice;

      // Custom cart entry with extra options if selected
      var existing = state.cart.find(function (it) { 
        return it.id === state.activeDetailItem.id && it.option === optSummary; 
      });

      if (existing) {
        existing.qty += state.pdpQty;
      } else {
        state.cart.push({
          id: state.activeDetailItem.id,
          name: state.activeDetailItem.name,
          price: unitPrice,
          image: state.activeDetailItem.image,
          option: optSummary,
          qty: state.pdpQty
        });
      }

      showToast('Added ' + state.pdpQty + 'x ' + state.activeDetailItem.name + ' to Bag');
      updateCartUI();
      openCart();
    }

    function buyNowPdpMpesa() {
      addPdpToCart();
      setTimeout(function () {
        openCheckout();
        selectPayment('mpesa');
      }, 300);
    }

    function changePdpImage(src, thumbEl) {
      var hero = document.getElementById('pdp-hero-img');
      if (hero) hero.src = src;
      var thumbs = document.querySelectorAll('.pdp-thumb-item');
      thumbs.forEach(function (t) { t.classList.remove('active'); });
      if (thumbEl) thumbEl.classList.add('active');
    }

    window.StoreApp = {
      state: state,
      store: state.store,
      setStore: function (s) { state.store = s; },
      addToCart: addToCart,
      updateQty: updateQty,
      openCart: openCart,
      closeCart: closeCart,
      applyPromo: applyPromo,
      openCheckout: openCheckout,
      closeCheckout: closeCheckout,
      setFulfilment: setFulfilment,
      setPaymentPreference: setPaymentPreference,
      updateCheckoutSummary: updateCheckoutSummary,
      submitWebsiteOrder: submitWebsiteOrder,
      selectPayment: selectPayment,
      payNow: payNow,
      chatOrderOnWhatsApp: chatOrderOnWhatsApp,
      copyPaymentDetails: copyPaymentDetails,
      reportPaymentMade: reportPaymentMade,
      orderPdpOnWhatsApp: orderPdpOnWhatsApp,
      orderCartOnWhatsApp: orderCartOnWhatsApp,
      orderModalOnWhatsApp: orderModalOnWhatsApp,
      closeSuccess: closeSuccess,
      trackOrder: trackOrder,
      changeLocation: changeLocation,
      filterCategory: filterCategory,
      searchMenu: searchMenu,
      clearSearch: clearSearch,
      goToSearch: goToSearch,
      openProductDetail: openProductDetail,
      closeProductDetail: closeProductDetail,
      updateDetailQty: updateDetailQty,
      selectDetailOption: selectDetailOption,
      addDetailToCart: addDetailToCart,
      updatePdpQty: updatePdpQty,
      addPdpToCart: addPdpToCart,
      buyNowPdpMpesa: buyNowPdpMpesa,
      changePdpImage: changePdpImage,
      openReceiptModal: openReceiptModal,
      closeReceiptModal: closeReceiptModal,
      printReceipt: printReceipt,
      shareReceiptWhatsApp: shareReceiptWhatsApp,
      copyReceiptLink: copyReceiptLink,
      updateReceiptPaymentStatus: updateReceiptPaymentStatus,
      renderReceiptHTML: renderReceiptHTML,
      getStoreBranding: getStoreBranding,
      generateReceiptNumber: generateReceiptNumber,
      getReceiptPageUrl: getReceiptPageUrl,
      openReceiptPage: openReceiptPage,
      goToReceiptPage: goToReceiptPage
    };

    updateCartUI();
    startTimer();
    initPDP();

    // Check for query param search
    var urlParams = new URLSearchParams(window.location.search);
    var searchParam = urlParams.get('q') || urlParams.get('search');
    if (searchParam) {
      var searchInput = document.querySelector('.nav-search-bar input');
      if (searchInput) {
        searchInput.value = searchParam;
      }
      searchMenu(searchParam);
    }

    // Listen to cross-page storage updates
    window.addEventListener('storage', function (e) {
      if (e.key === storageKey) {
        state.cart = loadCartFromStorage();
        updateCartUI();
      }
    });
  };
})();
