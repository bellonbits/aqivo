from fastapi import APIRouter

from app.api.v1 import admin, auth, businesses, catalog, catalog_ai, commerce, connections, crm, growth, media, misc, money, products, public, public_account, public_shop, seo, webhooks, websites

api_router = APIRouter(prefix="/api/v1")
for r in (auth.router, businesses.router, websites.router, websites.templates_router, catalog.services_router, catalog.gallery_router, catalog.staff_router,
          catalog.testimonials_router, products.router, products.categories_router, products.collections_router, media.router, commerce.variants_router, commerce.inventory_router, commerce.orders_router,
          commerce.discounts_router, commerce.store_router, crm.customers_router, crm.leads_router, crm.bookings_router, crm.reviews_router, money.payments_router, money.invoices_router,
          money.subs_router, growth.analytics_router, growth.marketing_router, growth.ai_router, catalog_ai.router, growth.notif_router, misc.domains_router, misc.support_router,
          public.router, public_shop.router, public_account.router, seo.router, seo.integrations_router, connections.router, connections.wa_router, webhooks.router, admin.router):
    api_router.include_router(r)
