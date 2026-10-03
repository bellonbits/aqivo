export interface User { id: string; email: string; full_name: string; phone: string | null; platform_role: 'SUPER_ADMIN' | 'ADMIN' | null; locale: string }
export interface Membership { business_id: string; business_name: string; slug: string; role: string }
export interface Me { user: User; memberships: Membership[]; impersonating: boolean; impersonated_business_id: string | null }

export interface Business {
  id: string; name: string; slug: string; industry: string; category: string; description: string; tagline: string
  phone: string | null; whatsapp: string | null; email: string | null; country_code: string; currency: string; locale: string; timezone: string
  city: string; address: string; latitude: string | null; longitude: string | null
  opening_hours: Record<string, { open: string; close: string } | null>; blocked_dates: string[]
  slot_interval_minutes: number; booking_lead_hours: number; logo_url: string | null; primary_color: string; secondary_color: string
  social_links: Record<string, string>; whatsapp_greeting: string; whatsapp_default_message: string
  status: string; is_demo: boolean; referral_code: string | null; onboarding_completed: boolean; created_at: string
}
export interface Urls { profile: string; booking: string; review: string; whatsapp: string | null; subdomain: string; short: string }
export interface SubscriptionInfo { status: string; plan_key: string; plan_name: string; trial_ends_at: string | null; current_period_end: string | null; cancel_at_period_end: boolean; grace_ends_at: string | null; data_retained_until: string | null }
export interface BusinessSummary {
  business: Business; role: string; permissions_all: boolean; urls: Urls
  plan: { key: string; name: string; features: string[] }
  subscription: SubscriptionInfo | null
  website: { status: string | null; has_unpublished_changes: boolean }
  impersonating: boolean
}
export interface Service { id: string; name: string; description: string; price: string; currency: string; duration_minutes: number; category_id: string | null; image_url: string | null; position: number; is_active: boolean }
export interface GalleryImage { id: string; url: string; thumb_url: string | null; caption: string; position: number }
export interface Section { id: string; page_id: string | null; type: string; position: number; enabled: boolean; settings: Record<string, unknown>; styles: Record<string, string> }
export interface FieldDef { key: string; kind: 'text' | 'textarea' | 'image' | 'url' | 'number' | 'select' | 'bool' | 'button' | 'list'; label: string; max: number; options: string[]; min: number; default: unknown; help: string; max_items: number; show_if: [string, string] | null; item?: FieldDef[] }
export interface SectionDef { type: string; label: string; group: string; description: string; icon: string; fields: FieldDef[]; available: boolean; needs: string | null }
export interface Registry { types: SectionDef[]; presets: { key: string; label: string; type: string; settings: Record<string, unknown>; group: string; description: string; icon: string }[]; groups: string[]; style_options: Record<string, string[]> }
export interface Product {
  id: string; name: string; slug: string; short_description: string; description: string; price: string; compare_at_price: string | null; cost_price: string | null; currency: string
  category_id: string | null; images: string[]; video_url: string | null; sku: string | null; barcode: string | null; tags: string[]; is_digital: boolean; track_stock: boolean
  stock_qty: number; low_stock_threshold: number; weight_grams: number | null; status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'; featured: boolean; position: number; seo_title: string | null; seo_description: string | null
  options: unknown[]; variant_count: number; total_stock: number | null
}
export interface Category { id: string; name: string; slug: string | null; description: string; image_url: string | null; parent_id: string | null; position: number; is_visible: boolean; seo_title: string | null; seo_description: string | null }
export interface MediaAsset { id: string; folder: string; name: string; url: string; large_url: string | null; thumb_url: string | null; width: number | null; height: number | null; size_bytes: number }
export interface Website {
  id: string; status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED'; published_at: string | null; has_unpublished_changes: boolean
  seo_title: string | null; seo_description: string | null; template: { key: string; name: string; layout: string; theme: Record<string, string> }; sections: Section[]
  pages: SitePage[]; navigation: NavItem[]; navigation_custom: boolean
  theme_overrides: Record<string, string>; settings: Record<string, boolean | string>; style_options: { fonts: string[]; hero_layouts: string[]; radii: string[] }
}
export interface Template { key: string; name: string; industry: string; layout?: string; description: string; features: string[]; theme: Record<string, string>; preview_url: string }
export interface Lead { id: string; name: string; phone: string | null; email: string | null; message: string; source: string; service_id: string | null; service_name: string | null; status: string; created_at: string }
export interface Customer {
  id: string; name: string; phone: string | null; email: string | null; birthday: string | null; notes: string; source: string; whatsapp_opt_out: boolean
  last_contacted_at: string | null; created_at: string; total_bookings: number; completed_bookings: number; total_spent: string; last_visit: string | null; next_booking: string | null; favourite_service: string | null
  total_orders: number; acquisition_source: string | null; acquisition_campaign: string | null
}
export interface Booking {
  id: string; customer_id: string | null; staff_id: string | null; customer_name: string; customer_phone: string | null; starts_at: string; ends_at: string
  status: string; source: string; total_amount: string; currency: string; notes: string; review_requested_at: string | null
  items: { service_id: string | null; name: string; price: string; duration_minutes: number }[]
}
export interface Review { id: string; author_name: string; rating: number; comment: string; verified: boolean; is_published: boolean; response: string | null; responded_at: string | null; created_at: string }
export interface Payment { id: string; amount: string; currency: string; method: string; provider: string; provider_reference: string | null; status: string; note: string; paid_at: string | null; created_at: string; customer_id: string | null }
export interface Invoice { id: string; number: string; customer_name: string; customer_phone: string | null; currency: string; subtotal: string; discount: string; tax: string; total: string; payment_status: string; issued_on: string; due_on: string | null; notes: string; items: { description: string; quantity: number; unit_price: string; line_total: string }[] }
export interface Campaign { id: string; name: string; kind: string; status: string; message_template: string; audience: Record<string, unknown>; created_by_ai: boolean; sent_at: string | null; created_at: string; recipient_count: number; sent_count: number
  slug?: string | null; objective?: string | null; offer_text?: string; discount_code?: string | null; target_type?: string | null; target_ref?: string | null; channels?: string[]; content?: Record<string, { text: string; link: string; label: string; source: string }>; starts_on?: string | null; ends_on?: string | null }
export interface Staff { id: string; name: string; phone: string | null; working_hours: Record<string, unknown>; is_active: boolean; service_ids: string[] }
export interface Plan { key: string; name: string; description: string; price: string | null; currency: string; prices: Record<string, string>; features: string[]; highlights: string[]; billing_interval_days: number }
export interface Page<T> { items: T[]; total: number; limit: number; offset: number }
export interface CountryConfig { code: string; name: string; currency: string; dial_code: string; timezone: string; payment_providers: string[] }

export interface AnalyticsSummary {
  period: string; has_data: boolean; visitors: number; website_visitors: number; profile_views: number; whatsapp_clicks: number; phone_clicks: number; directions_clicks: number; qr_scans: number
  leads: number; booking_requests: number; completed_bookings: number; lead_conversion_rate: number | null; reviews: number; average_rating: number | null
  revenue: string; currency: string; returning_customers: number; new_customers: number
  leads_by_source?: { source: string; count: number }[]; top_services?: { service: string; bookings: number; leads: number; whatsapp_clicks: number }[]
}
export interface ChecklistItem { key: string; label: string; done: boolean; fix: string; locked?: boolean }
export interface NextAction { key: string; text: string; href: string; count?: number }
export interface Overview { summary: AnalyticsSummary; checklist: { items: ChecklistItem[]; completion: number }; actions: NextAction[]; leads_new: number; inactive_45?: number }
export interface Health { overall: number | null; components: Record<string, { score: number | null; basis: string }>; note: string; recommendations: NextAction[] }
export interface AiAction { type: string; label: string; requires_confirmation: boolean; payload: Record<string, unknown> }
export interface AiAnswer { answer: string; data: { label: string; value: string | number }[]; actions: AiAction[]; draft?: string; source: string; suggestions?: string[] }

export interface IndustryConfig { key: string; label: string; blurb: string; categories: string[]; template: string; item_word: string; photo: string; suggestions: { name: string; price: number; minutes: number }[] }

export interface SitePage { id: string; slug: string; title: string; is_home: boolean; enabled: boolean; position: number; seo_title: string | null; seo_description: string | null; published: boolean }
export interface NavItem { id?: string; label: string; type: 'page' | 'products' | 'services' | 'category' | 'collection' | 'booking' | 'contact' | 'search' | 'url'; ref?: string | null; url?: string | null; children?: NavItem[] }
export interface Variant { id: string; product_id: string; title: string; options: Record<string, string>; sku: string | null; price: string | null; compare_at_price: string | null; stock_qty: number; image_url: string | null; is_active: boolean; position: number }
export interface StockRow { product_id: string; variant_id: string | null; name: string; variant: string | null; sku: string | null; stock: number; threshold: number; image: string | null; status: string }
export interface Movement { id: string; product_name: string; delta: number; qty_after: number; reason: string; note: string; order_id: string | null; created_at: string }
export interface OrderItem { id: string; kind: string; name: string; variant_title: string | null; image_url: string | null; unit_price: string; quantity: number; line_total: string }
export interface Order {
  id: string; number: number; token: string; customer_id: string | null; customer_name: string; customer_phone: string | null; customer_email: string | null
  delivery_method: 'PICKUP' | 'DELIVERY'; delivery_zone: string | null; address: string; notes: string; status: string; payment_method: string; payment_status: string; currency: string
  subtotal: string; discount: string; delivery_fee: string; tax: string; total: string; discount_code: string | null; source: string | null; channel: string; created_at: string
  items: OrderItem[]; events: { id: string; kind: string; status: string | null; message: string; created_at: string }[]; payment_reference: string | null; payment_provider?: string | null; scheduled_for?: string | null
  courier_name?: string | null; courier_phone?: string | null; tracking_url?: string | null
}
export interface Discount { id: string; code: string; description: string; type: 'PERCENT' | 'FIXED' | 'FREE_DELIVERY'; value: string; min_order: string | null; product_ids: string[]; category_ids: string[]; starts_at: string | null; ends_at: string | null; usage_limit: number | null; used_count: number; once_per_customer: boolean; is_active: boolean }
export interface StoreSettings {
  tax_rate: number; tax_inclusive: boolean; min_order: number | null; require_email: boolean
  fulfilment: { pickup: boolean; delivery: boolean }
  delivery: { flat_fee: number; free_over: number | null; zones: { name: string; fee: number }[]; estimate: string }
  payments: Record<string, boolean>; mpesa_number: string; mpesa_kind: 'TILL' | 'PAYBILL' | 'SEND'; bank_details: string; pickup_note: string; thank_you: string
  online_gateway?: string | null; wa_order_updates?: boolean
}

export interface SourceRow { source: string; visitors: number; whatsapp_clicks: number; leads: number; bookings: number; orders: number; customers: number; revenue: number; conversion: number | null }
export interface CampaignRow { campaign: string; name: string; visitors: number; whatsapp_clicks: number; leads: number; bookings: number; orders: number; customers: number; revenue: number; conversion: number | null }
export interface FunnelStep { key: string; label: string; count: number; pct_of_visitors: number | null }
export interface ProductPerf { id: string; name: string; views: number; viewers: number; added_to_bag: number; units: number; revenue: number; conversion: number | null }
export interface QrCode { id: string; name: string; target_type: string; target_ref: string | null; headline: string; campaign: string; scans: number; url: string; created_at: string }
export interface LinkTargets { channels: { key: string; label: string }[]; base: string; products: { id: string; name: string }[]; services: { id: string; name: string }[]; categories: { id: string; name: string }[]; collections: { id: string; name: string }[]; pages: { id: string; name: string }[] }
export interface PlanItem { key: string; priority: number; title: string; detail: string; stats: { label: string; value: string | number }[]; opportunity: { label: string; value: string } | null; action: AiAction | null }
export interface TimelineEvent { at: string; kind: string; title: string; detail: string; ref: string | null }
