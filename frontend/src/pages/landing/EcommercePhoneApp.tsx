import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart,
  MessageCircle,
  Search,
  ShoppingBag,
  Sparkles,
  X,
  Check,
  ChevronRight,
  ShieldCheck,
  Truck,
  CreditCard,
  Plus,
  Minus,
  Store
} from 'lucide-react'
import { PhoneFrame } from '@/components/PhoneFrame'
import { useReduced } from '@/lib/motion'

export type StoreScreen = 'storefront' | 'product' | 'cart' | 'success'

interface ProductItem {
  id: string
  name: string
  category: string
  price: number
  comparePrice: number
  discount: string
  image: string
  sizes: string[]
  tag?: string
}

const PRODUCTS: ProductItem[] = [
  {
    id: 'p1',
    name: 'Floral Silk Midi Dress',
    category: 'Dresses',
    price: 3500,
    comparePrice: 4400,
    discount: '-20%',
    image: '/img/retail-1-sm.webp',
    sizes: ['XS', 'S', 'M', 'L'],
    tag: 'Trending'
  },
  {
    id: 'p2',
    name: 'Oversized Linen Blazer',
    category: 'Tops',
    price: 4200,
    comparePrice: 5200,
    discount: '-19%',
    image: '/img/retail-2-sm.webp',
    sizes: ['S', 'M', 'L'],
    tag: 'Bestseller'
  },
  {
    id: 'p3',
    name: 'Classic Leather Loafers',
    category: 'Shoes',
    price: 4800,
    comparePrice: 5800,
    discount: '-17%',
    image: '/img/retail-3-sm.webp',
    sizes: ['38', '39', '40', '41']
  },
  {
    id: 'p4',
    name: 'Structured Mini Bag',
    category: 'Bags',
    price: 2900,
    comparePrice: 3600,
    discount: '-19%',
    image: '/img/retail-4-sm.webp',
    sizes: ['One Size']
  }
]

const CATEGORIES = ['All', 'Dresses', 'Tops', 'Shoes', 'Bags']

export function EcommercePhoneApp({
  autoPlay = true,
  className = '',
  width = 300
}: {
  autoPlay?: boolean
  className?: string
  width?: number
}) {
  const [screen, setScreen] = useState<StoreScreen>('storefront')
  const [selectedCat, setSelectedCat] = useState('All')
  const [cartItems, setCartItems] = useState<{ [id: string]: number }>({ p1: 1, p2: 1 })
  const [selectedProduct, setSelectedProduct] = useState<ProductItem>(PRODUCTS[0])
  const [selectedSize, setSelectedSize] = useState('M')
  const [isPaused, setIsPaused] = useState(false)
  const [favs, setFavs] = useState<{ [id: string]: boolean }>({ p1: true })
  const reduced = useReduced()

  const screens: StoreScreen[] = ['storefront', 'product', 'cart', 'success']

  useEffect(() => {
    if (!autoPlay || reduced || isPaused) return
    const timer = setInterval(() => {
      setScreen((curr) => {
        const nextIdx = (screens.indexOf(curr) + 1) % screens.length
        return screens[nextIdx]
      })
    }, 4600)
    return () => clearInterval(timer)
  }, [autoPlay, reduced, isPaused])

  const totalCount = Object.values(cartItems).reduce((a, b) => a + b, 0)
  const subtotal = Object.entries(cartItems).reduce((sum, [id, qty]) => {
    const p = PRODUCTS.find((item) => item.id === id)
    return sum + (p ? p.price * qty : 0)
  }, 0)

  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFavs((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const addToCart = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setCartItems((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }

  const updateQty = (id: string, delta: number) => {
    setCartItems((prev) => {
      const next = (prev[id] || 0) + delta
      if (next <= 0) {
        const copy = { ...prev }
        delete copy[id]
        return copy
      }
      return { ...prev, [id]: next }
    })
  }

  const filteredProducts =
    selectedCat === 'All'
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category.toLowerCase() === selectedCat.toLowerCase())

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Screen selector chips */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5 px-2">
        {[
          { id: 'storefront', label: '1. Storefront' },
          { id: 'product', label: '2. Product Details' },
          { id: 'cart', label: '3. Cart Drawer' },
          { id: 'success', label: '4. Instant Order' }
        ].map((item) => {
          const isActive = screen === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                setIsPaused(true)
                setScreen(item.id as StoreScreen)
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                isActive
                  ? 'bg-brand text-white shadow-sm ring-1 ring-brand'
                  : 'bg-white/80 text-stone-600 hover:bg-white hover:text-stone-900 border border-stone-200/60'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <PhoneFrame
        variant="hand"
        width={width}
        label="Interactive modern ecommerce storefront preview"
      >
        <div
          className="relative h-full w-full bg-[#FCFCFD] text-stone-900 overflow-hidden font-sans select-none flex flex-col"
          onMouseEnter={() => setIsPaused(true)}
        >
          {/* Top Ecommerce Sticky Nav */}
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-100 bg-white/95 px-3 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-stone-900 text-xs font-black text-white">
                2S
              </div>
              <div className="leading-tight">
                <p className="text-[12px] font-bold text-stone-900">Two Sides</p>
                <p className="text-[9px] text-stone-400">Westlands, Nairobi</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScreen('cart')}
                className="relative flex size-8 items-center justify-center rounded-full bg-stone-100 text-stone-800 transition hover:bg-stone-200"
                aria-label="Open cart"
              >
                <ShoppingBag className="size-4" />
                {totalCount > 0 && screen !== 'success' && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-extrabold text-white">
                    {totalCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Dynamic Content Views */}
          <div className="relative flex-1 overflow-y-auto overflow-x-hidden pb-14 scrollbar-none">
            <AnimatePresence mode="wait">
              {/* SCREEN 1: MODERN ECOMMERCE STOREFRONT */}
              {screen === 'storefront' && (
                <motion.div
                  key="storefront"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3.5 p-3"
                >
                  {/* Hero Banner Component */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 p-4 text-white shadow-sm">
                    <div className="relative z-10 max-w-[190px]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        <Sparkles className="size-2.5" /> New Season Drop
                      </span>
                      <h3 className="mt-2 text-base font-extrabold leading-tight">
                        Style for Every Side of You
                      </h3>
                      <p className="mt-1 text-[11px] text-stone-300">
                        Trending designer pieces with same-day express delivery.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(PRODUCTS[0])
                          setScreen('product')
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-stone-900 shadow-sm transition active:scale-95"
                      >
                        Shop Now <ChevronRight className="size-3" />
                      </button>
                    </div>
                    {/* Visual accent circles */}
                    <div className="absolute -right-6 -top-6 size-28 rounded-full bg-emerald-500/10 blur-xl" />
                    <div className="absolute -bottom-8 right-2 size-24 rounded-full bg-purple-500/15 blur-lg" />
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      readOnly
                      placeholder="Search dresses, tops, shoes..."
                      className="w-full rounded-xl border border-stone-200 bg-white py-1.5 pl-8 pr-3 text-[11px] text-stone-800 shadow-2xs outline-none"
                    />
                  </div>

                  {/* Category Chips Rail */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {CATEGORIES.map((cat) => {
                      const isSel = selectedCat === cat
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCat(cat)}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap transition-all ${
                            isSel
                              ? 'bg-stone-900 text-white'
                              : 'bg-white text-stone-600 border border-stone-200/80 hover:bg-stone-50'
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    })}
                  </div>

                  {/* 2-Column Product Grid */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-[13px] font-bold text-stone-900">Featured Catalog</h4>
                      <span className="text-[10px] text-stone-400">4 items</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {filteredProducts.map((p) => {
                        const isFav = favs[p.id]
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedProduct(p)
                              setScreen('product')
                            }}
                            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-stone-200/80 bg-white p-2 shadow-2xs transition hover:border-stone-300"
                          >
                            {/* Media with Badges */}
                            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-stone-100">
                              <img
                                src={p.image}
                                alt={p.name}
                                onError={(e) => {
                                  e.currentTarget.style.visibility = 'hidden'
                                }}
                                className="size-full object-cover transition duration-300 group-hover:scale-105"
                              />
                              {/* Discount Badge */}
                              <span className="absolute left-1.5 top-1.5 rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-xs">
                                {p.discount}
                              </span>

                              {/* Heart Button */}
                              <button
                                type="button"
                                onClick={(e) => toggleFav(p.id, e)}
                                className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-white/85 text-stone-500 shadow-xs backdrop-blur-xs transition hover:text-red-500"
                              >
                                <Heart
                                  className={`size-3.5 ${
                                    isFav ? 'fill-red-500 text-red-500' : ''
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Info */}
                            <div className="mt-2 flex flex-1 flex-col">
                              <p className="line-clamp-1 text-[11px] font-semibold text-stone-900">
                                {p.name}
                              </p>
                              <div className="mt-1 flex items-baseline gap-1.5">
                                <span className="text-[12px] font-extrabold text-stone-900">
                                  KSh {p.price.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-stone-400 line-through">
                                  KSh {p.comparePrice.toLocaleString()}
                                </span>
                              </div>

                              {/* Add to Cart button */}
                              <button
                                type="button"
                                onClick={(e) => addToCart(p.id, e)}
                                className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-stone-900 py-1.5 text-[10px] font-bold text-white shadow-2xs transition active:scale-95 hover:bg-stone-800"
                              >
                                <Plus className="size-3" /> Add to cart
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Trust Guarantees Section */}
                  <div className="rounded-xl border border-stone-200/70 bg-stone-50 p-2.5">
                    <p className="mb-2 text-[11px] font-bold text-stone-900">Why shop with us</p>
                    <div className="space-y-1.5 text-[10px] text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                        <span>100% Secure Checkout & WhatsApp Confirmation</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Truck className="size-3.5 text-blue-600 shrink-0" />
                        <span>Same-day Express Delivery in Nairobi</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="size-3.5 text-amber-600 shrink-0" />
                        <span>Pay via M-Pesa, Card or Cash on Delivery</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SCREEN 2: PRODUCT DETAIL PAGE (PDP) */}
              {screen === 'product' && (
                <motion.div
                  key="product"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3 p-3"
                >
                  <button
                    type="button"
                    onClick={() => setScreen('storefront')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-stone-900"
                  >
                    ← Back to catalog
                  </button>

                  <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="size-full object-cover"
                    />
                    <span className="absolute left-2 top-2 rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {selectedProduct.discount}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-stone-900">
                      {selectedProduct.name}
                    </h3>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-base font-extrabold text-stone-900">
                        KSh {selectedProduct.price.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-stone-400 line-through">
                        KSh {selectedProduct.comparePrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600">
                        Save KSh {(selectedProduct.comparePrice - selectedProduct.price).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Size Selector */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-stone-800">Select Size</span>
                      <span className="text-stone-400">Size Guide</span>
                    </div>
                    <div className="flex gap-1.5">
                      {selectedProduct.sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedSize(s)}
                          className={`flex size-8 items-center justify-center rounded-lg text-[11px] font-bold transition ${
                            selectedSize === s
                              ? 'bg-stone-900 text-white'
                              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Special Note */}
                  <div>
                    <p className="mb-1 text-[11px] font-bold text-stone-800">Order Note</p>
                    <input
                      type="text"
                      readOnly
                      value="Please gift wrap if possible"
                      className="w-full rounded-lg border border-stone-200 bg-white p-2 text-[11px] text-stone-600"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(selectedProduct.id)
                        setScreen('cart')
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95"
                    >
                      <ShoppingBag className="size-3.5" /> Add to Cart · KSh{' '}
                      {selectedProduct.price.toLocaleString()}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* SCREEN 3: SLIDE-UP CART DRAWER */}
              {screen === 'cart' && (
                <motion.div
                  key="cart"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3 p-3"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <h3 className="text-sm font-extrabold text-stone-900">
                      Shopping Bag ({totalCount})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setScreen('storefront')}
                      className="text-stone-400 hover:text-stone-700"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Free Delivery Bar */}
                  <div className="rounded-xl bg-emerald-50 p-2.5 border border-emerald-200/60">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                      <span>✓ Free Express Delivery Unlocked!</span>
                      <span>100%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200">
                      <div className="h-full w-full bg-emerald-600 rounded-full" />
                    </div>
                  </div>

                  {/* Item Lines */}
                  <div className="space-y-2">
                    {Object.entries(cartItems).map(([id, qty]) => {
                      const p = PRODUCTS.find((item) => item.id === id)
                      if (!p) return null
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2.5 rounded-xl border border-stone-200/70 bg-white p-2 shadow-2xs"
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            className="size-12 rounded-lg object-cover bg-stone-100"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-[11px] font-bold text-stone-900">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-stone-400">Size: M</p>
                            <p className="text-[11px] font-extrabold text-stone-900">
                              KSh {(p.price * qty).toLocaleString()}
                            </p>
                          </div>
                          {/* Quantity stepper */}
                          <div className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-1 py-0.5">
                            <button
                              type="button"
                              onClick={() => updateQty(id, -1)}
                              className="text-stone-500 hover:text-stone-900"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="text-[11px] font-bold text-stone-900 w-3 text-center">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(id, 1)}
                              className="text-stone-500 hover:text-stone-900"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Subtotal & Checkout buttons */}
                  <div className="space-y-2 border-t border-stone-100 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500">Subtotal</span>
                      <span className="font-extrabold text-stone-900">
                        KSh {subtotal.toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setScreen('success')}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95"
                    >
                      Proceed to Checkout <ChevronRight className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setScreen('success')}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 hover:bg-emerald-700"
                    >
                      <MessageCircle className="size-3.5" /> Order on WhatsApp
                    </button>
                  </div>
                </motion.div>
              )}

              {/* SCREEN 4: ORDER CONFIRMATION */}
              {screen === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3 p-4 text-center"
                >
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="size-6 stroke-[3]" />
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-stone-900">Order Confirmed!</h3>
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      Order #2S-8491 has been sent to Two Sides Boutique
                    </p>
                  </div>

                  {/* Summary ticket */}
                  <div className="rounded-xl border border-stone-200/80 bg-white p-3 text-left text-[11px] shadow-2xs">
                    <div className="flex justify-between border-b border-stone-100 pb-2">
                      <span className="font-semibold text-stone-500">Customer</span>
                      <span className="font-bold text-stone-900">Grace Mwangi</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-stone-100">
                      <span className="font-semibold text-stone-500">Delivery</span>
                      <span className="font-bold text-stone-900">Express (Westlands)</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-stone-100">
                      <span className="font-semibold text-stone-500">Payment</span>
                      <span className="font-bold text-emerald-600">M-Pesa Verified</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="font-bold text-stone-700">Total Paid</span>
                      <span className="font-black text-stone-900">
                        KSh {subtotal.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp prompt alert */}
                  <div className="flex items-center gap-2 rounded-xl bg-[#E7FBE0] p-2.5 text-left text-[10px] text-emerald-950 border border-emerald-200">
                    <MessageCircle className="size-4 text-emerald-600 shrink-0" />
                    <span>WhatsApp confirmation & tracking updates sent to 0712•••491</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setScreen('storefront')}
                    className="w-full rounded-xl bg-stone-900 py-2 text-xs font-bold text-white shadow-2xs"
                  >
                    Back to Storefront
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom App Navigation Bar */}
          <div className="sticky bottom-0 z-30 flex items-center justify-around border-t border-stone-100 bg-white/95 py-2 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setScreen('storefront')}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${
                screen === 'storefront' ? 'text-stone-900' : 'text-stone-400'
              }`}
            >
              <Store className="size-4" />
              <span>Store</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (Object.keys(cartItems).length === 0) setCartItems({ p1: 1, p2: 1 })
                setScreen('cart')
              }}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${
                screen === 'cart' ? 'text-stone-900' : 'text-stone-400'
              }`}
            >
              <ShoppingBag className="size-4" />
              <span>Bag ({screen === 'success' ? 0 : totalCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setScreen('success')}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${
                screen === 'success' ? 'text-stone-900' : 'text-stone-400'
              }`}
            >
              <Check className="size-4" />
              <span>Orders {screen === 'success' ? '✓' : ''}</span>
            </button>
          </div>
        </div>
      </PhoneFrame>
    </div>
  )
}
