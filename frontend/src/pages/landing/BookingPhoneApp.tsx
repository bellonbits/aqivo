import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  MapPin,
  Lock,
  Mail,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  User,
  X,
  Download,
  Scissors,
  CheckCircle2
} from 'lucide-react'
import { PhoneFrame } from '@/components/PhoneFrame'
import { useReduced } from '@/lib/motion'

export type ScreenId = 'home' | 'salon' | 'service-detail' | 'step1' | 'step2' | 'confirm'

export function BarcodeGraphic({ className = '' }: { className?: string }) {
  // A clean, realistic vector barcode
  const bars = [
    3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1,
    4, 1, 3, 2, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1,
    3, 2, 1, 4, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 1, 2, 4, 2, 1, 3, 1, 4, 2
  ]
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex h-14 w-full items-stretch justify-center gap-[2px] overflow-hidden px-3 py-1 bg-white">
        {bars.map((w, i) => (
          <div
            key={i}
            className="bg-stone-900"
            style={{
              width: `${w * 1.5}px`,
              opacity: i % 2 === 0 ? 1 : 0.85,
            }}
          />
        ))}
      </div>
      <div className="mt-1 font-mono text-[9px] tracking-[0.25em] text-stone-500 font-semibold">
        * 3 0 5 1 6 2 3 B G 3 4 *
      </div>
    </div>
  )
}

interface BookingPhoneProps {
  initialScreen?: ScreenId
  autoPlay?: boolean
  className?: string
  width?: number
}

export function BookingPhoneApp({
  initialScreen = 'home',
  autoPlay = true,
  className = '',
  width = 300,
}: BookingPhoneProps) {
  const [activeScreen, setActiveScreen] = useState<ScreenId>(initialScreen)
  const [selectedExpert, setSelectedExpert] = useState<'anyone' | 'bella' | 'daisy'>('bella')
  const [selectedDate, setSelectedDate] = useState<number>(18)
  const [selectedTime, setSelectedTime] = useState<string>('12:45 PM')
  const [isPaused, setIsPaused] = useState(false)
  const reduced = useReduced()

  const screens: ScreenId[] = ['home', 'salon', 'service-detail', 'step1', 'step2', 'confirm']

  useEffect(() => {
    if (!autoPlay || reduced || isPaused) return
    const interval = setInterval(() => {
      setActiveScreen((curr) => {
        const nextIdx = (screens.indexOf(curr) + 1) % screens.length
        return screens[nextIdx]
      })
    }, 4500)
    return () => clearInterval(interval)
  }, [autoPlay, reduced, isPaused])

  const handleScreenChange = (s: ScreenId) => {
    setIsPaused(true)
    setActiveScreen(s)
  }

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Screen selector chips above or below */}
      <div className="mb-6 sm:mb-8 flex flex-wrap items-center justify-center gap-1.5 px-2">
        {[
          { id: 'home', label: '1. Explore' },
          { id: 'salon', label: '2. Salon' },
          { id: 'service-detail', label: '3. Service' },
          { id: 'step1', label: '4. Date & Specialist' },
          { id: 'step2', label: '5. Client' },
          { id: 'confirm', label: '6. Ticket & Barcode' },
        ].map((item) => {
          const isActive = activeScreen === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleScreenChange(item.id as ScreenId)}
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
        label="Interactive mobile appointment booking application showcase"
      >
        <div
          className="relative h-full w-full bg-[#FAF9FD] text-stone-900 overflow-hidden font-sans select-none flex flex-col"
          onMouseEnter={() => setIsPaused(true)}
        >
          {/* Main screen view */}
          <div className="relative flex-1 overflow-y-auto overflow-x-hidden scrollbar-none pb-12">
            <AnimatePresence mode="wait">
              {/* SCREEN 1: EXPLORE / HOME */}
              {activeScreen === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="p-4 pt-6 text-stone-900"
                >
                  {/* Top Bar with user greeting */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-stone-500">Hello Kelly</p>
                      <h2 className="text-[17px] font-extrabold tracking-tight">Good Morning!</h2>
                    </div>
                    <div className="relative grid size-9 place-items-center rounded-full bg-white shadow-sm ring-1 ring-stone-100">
                      <Bell className="size-4 text-stone-700" />
                      <span className="absolute top-2 right-2 size-2 rounded-full bg-brand ring-2 ring-white" />
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="mt-3.5 flex items-center gap-2 rounded-full bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-stone-100">
                    <Search className="size-3.5 text-stone-400" />
                    <span className="text-[12px] text-stone-400 flex-1">Search services, stylists...</span>
                    <SlidersHorizontal className="size-3.5 text-stone-500" />
                  </div>

                  {/* Service Category Pills */}
                  <div className="mt-3.5 flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    {[
                      { name: 'Haircuts', active: true, icon: Scissors },
                      { name: 'Nail', active: false },
                      { name: 'Facial', active: false },
                      { name: 'Massage', active: false },
                    ].map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => handleScreenChange('salon')}
                        className={`flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                          cat.active
                            ? 'bg-gradient-to-r from-brand to-purple-600 text-white shadow-sm'
                            : 'bg-white text-stone-600 ring-1 ring-stone-100'
                        }`}
                      >
                        {cat.icon && <cat.icon className="size-3" />}
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Special Offers Banner */}
                  <div
                    onClick={() => handleScreenChange('service-detail')}
                    className="mt-3.5 relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-100/90 via-violet-50 to-indigo-100/90 p-3.5 shadow-sm ring-1 ring-purple-200/50 cursor-pointer group"
                  >
                    <div className="flex justify-between items-center relative z-10">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Haircut Promo</span>
                        <h3 className="text-[18px] font-black text-purple-950 leading-tight">20% Off</h3>
                        <p className="text-[10px] text-purple-600 font-medium">Jul 16 - Jul 24</p>
                        <div className="pt-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-[10px] font-bold text-white shadow-sm group-hover:scale-105 transition-transform">
                            Get Offer Now <ChevronRight className="size-3" />
                          </span>
                        </div>
                      </div>
                      <div className="relative size-20 rounded-xl overflow-hidden ring-2 ring-white/80 shadow-sm shrink-0">
                        <img
                          src="/img/barber-cut-sm.webp"
                          alt="Haircut offer"
                          className="size-full object-cover"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pro Care Specialists Carousel */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[13px] font-extrabold text-stone-900">Top Specialists</h3>
                      <button onClick={() => handleScreenChange('step1')} className="text-[11px] font-bold text-brand hover:underline">
                        See all
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        onClick={() => handleScreenChange('step1')}
                        className="cursor-pointer rounded-2xl bg-white p-2.5 text-center shadow-sm ring-1 ring-stone-100 hover:ring-purple-200 transition-all"
                      >
                        <img
                          src="/img/portrait-makeup-sm.webp"
                          alt="Bella Grace"
                          className="mx-auto size-12 rounded-full object-cover ring-2 ring-purple-100"
                        />
                        <p className="mt-1.5 text-[11px] font-extrabold truncate">Bella Grace</p>
                        <p className="text-[9px] text-stone-500">Hair Stylist</p>
                        <div className="mt-1 flex items-center justify-center gap-1 text-[9px] font-semibold text-stone-600">
                          <span>6 yrs exp</span> · <span className="flex items-center text-amber-500 font-bold"><Star className="size-2.5 fill-amber-500 inline mr-0.5" />4.9</span>
                        </div>
                      </div>

                      <div
                        onClick={() => handleScreenChange('step1')}
                        className="cursor-pointer rounded-2xl bg-white p-2.5 text-center shadow-sm ring-1 ring-stone-100 hover:ring-purple-200 transition-all"
                      >
                        <img
                          src="/img/portrait-smile-sm.webp"
                          alt="Daisy Scarlett"
                          className="mx-auto size-12 rounded-full object-cover ring-2 ring-purple-100"
                        />
                        <p className="mt-1.5 text-[11px] font-extrabold truncate">Daisy Scarlett</p>
                        <p className="text-[9px] text-stone-500">Hair Spa</p>
                        <div className="mt-1 flex items-center justify-center gap-1 text-[9px] font-semibold text-stone-600">
                          <span>5 yrs exp</span> · <span className="flex items-center text-amber-500 font-bold"><Star className="size-2.5 fill-amber-500 inline mr-0.5" />4.8</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nearby Salons Spotlight */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[13px] font-extrabold text-stone-900">Featured Studios</h3>
                      <button onClick={() => handleScreenChange('salon')} className="text-[11px] font-bold text-brand">
                        View
                      </button>
                    </div>
                    <div
                      onClick={() => handleScreenChange('salon')}
                      className="cursor-pointer rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-stone-100 flex items-center gap-2.5 hover:ring-purple-200 transition-all"
                    >
                      <img
                        src="/img/salon-dryer-sm.webp"
                        alt="Broadway Beauty Bar"
                        className="size-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] font-extrabold truncate">Broadway Beauty Bar</p>
                          <Heart className="size-3 text-stone-400 hover:fill-red-500 hover:text-red-500" />
                        </div>
                        <p className="text-[9.5px] text-stone-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="size-2.5 text-stone-400 shrink-0" />
                          Nairobi · Westlands
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[9.5px]">
                          <span className="flex items-center text-amber-500 font-bold"><Star className="size-2.5 fill-amber-500 inline mr-0.5" />4.9 (1.2k)</span>
                          <span className="text-stone-400">·</span>
                          <span className="text-emerald-700 font-semibold">10am - 10pm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SCREEN 2: SALON DETAILS & SERVICE MENU */}
              {activeScreen === 'salon' && (
                <motion.div
                  key="salon"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-stone-900"
                >
                  {/* Hero Image Header with actions */}
                  <div className="relative h-36 w-full">
                    <img
                      src="/img/salon-dryer-sm.webp"
                      alt="Broadway Beauty Bar"
                      className="size-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                    <div className="absolute top-4 inset-x-3 flex justify-between items-center text-white">
                      <button
                        onClick={() => handleScreenChange('home')}
                        className="grid size-7 place-items-center rounded-full bg-black/40 backdrop-blur-md"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <div className="flex gap-2">
                        <button className="grid size-7 place-items-center rounded-full bg-black/40 backdrop-blur-md">
                          <Share2 className="size-3.5" />
                        </button>
                        <button className="grid size-7 place-items-center rounded-full bg-black/40 backdrop-blur-md text-red-400">
                          <Heart className="size-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Salon Information Header */}
                  <div className="p-3.5 pb-2">
                    <h2 className="text-[16px] font-black tracking-tight text-stone-900">Broadway Beauty Bar</h2>
                    <p className="flex items-center gap-1 text-[10.5px] text-stone-500 mt-0.5">
                      <MapPin className="size-3 text-stone-400 shrink-0" />
                      266 N. Railroad Street, Hamburg NY
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-stone-600">
                      <span className="flex items-center text-amber-500 font-bold">
                        <Star className="size-3 fill-amber-500 inline mr-0.5" /> 4.9 (1,280)
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="size-2.5 text-stone-400" /> 10am - 10pm
                      </span>
                      <span>·</span>
                      <span className="font-bold text-stone-800">$10 - $220</span>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="mt-3 flex gap-2 border-b border-stone-200/70 pb-1 text-[11px] font-bold text-stone-400 overflow-x-auto scrollbar-none">
                      <span className="text-brand border-b-2 border-brand pb-1">Services</span>
                      <span>Package</span>
                      <span>Specialist</span>
                      <span>Portfolio</span>
                      <span>Shop</span>
                    </div>

                    {/* Service items list */}
                    <div className="mt-3 space-y-2">
                      {[
                        {
                          name: 'Deep Cleansing Facial',
                          rating: '4.5 (1K)',
                          dur: '60 min',
                          price: '$89',
                          img: 'spa-facial-sm.webp',
                        },
                        {
                          name: 'Anti-Aging Treatment',
                          rating: '4.5 (1.3K)',
                          dur: '50 min',
                          price: '$70',
                          img: 'spa-facial-sm.webp',
                        },
                        {
                          name: 'Sleek Tapered Haircut',
                          rating: '4.8 (592)',
                          dur: '30 min',
                          price: '$40',
                          img: 'barber-cut-sm.webp',
                          highlight: true,
                        },
                        {
                          name: 'Soothing Spa Nails',
                          rating: '4.7 (840)',
                          dur: '45 min',
                          price: '$35',
                          img: 'nails-care-sm.webp',
                        },
                      ].map((item) => (
                        <div
                          key={item.name}
                          onClick={() => handleScreenChange('service-detail')}
                          className={`cursor-pointer rounded-2xl bg-white p-2.5 shadow-sm ring-1 flex items-center justify-between gap-2.5 transition-all ${
                            item.highlight ? 'ring-purple-300 bg-purple-50/20' : 'ring-stone-100 hover:ring-purple-200'
                          }`}
                        >
                          <img
                            src={`/img/${item.img}`}
                            alt={item.name}
                            className="size-12 rounded-xl object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11.5px] font-bold text-stone-900 truncate">{item.name}</p>
                            <div className="flex items-center gap-1.5 text-[9.5px] text-stone-500 mt-0.5">
                              <span className="flex items-center text-amber-500 font-semibold">
                                <Star className="size-2.5 fill-amber-500 inline mr-0.5" />
                                {item.rating}
                              </span>
                              <span>·</span>
                              <span>{item.dur}</span>
                            </div>
                            <p className="text-[11px] font-extrabold text-brand mt-0.5">{item.price}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleScreenChange('step1')
                            }}
                            className="grid size-7 place-items-center rounded-full bg-brand text-white shadow-sm shrink-0 hover:scale-105"
                          >
                            +
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SCREEN 3: SERVICE DETAIL MODAL (Sleek Tapered Haircut) */}
              {activeScreen === 'service-detail' && (
                <motion.div
                  key="service-detail"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ duration: 0.3 }}
                  className="p-3.5 pt-5 text-stone-900"
                >
                  <div className="relative rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-stone-100">
                    {/* Image header with close button */}
                    <div className="relative h-40 w-full">
                      <img
                        src="/img/barber-cut-sm.webp"
                        alt="Sleek Tapered Haircut"
                        className="size-full object-cover"
                      />
                      <button
                        onClick={() => handleScreenChange('salon')}
                        className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full bg-white/90 text-stone-700 shadow-sm"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="p-3.5">
                      <h3 className="text-[16px] font-extrabold text-stone-900">Sleek Tapered Haircut</h3>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-semibold">
                          <span className="flex items-center text-amber-500 font-bold">
                            <Star className="size-3 fill-amber-500 inline mr-0.5" /> 4.8 (592)
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-2.5" /> 30 min service
                          </span>
                        </div>
                        <span className="text-[17px] font-black text-brand">$40</span>
                      </div>

                      {/* About section */}
                      <div className="mt-3 border-t border-stone-100 pt-2.5">
                        <h4 className="text-[11px] font-bold text-stone-900">About Service</h4>
                        <p className="mt-1 text-[10px] leading-relaxed text-stone-600">
                          Our Tapered Haircut service offers a sleek, modern haircut with gradually shorter sides and back, blending seamlessly into longer top layers.
                        </p>
                      </div>

                      {/* What's included checklist */}
                      <div className="mt-3 border-t border-stone-100 pt-2.5">
                        <h4 className="text-[11px] font-bold text-stone-900">What's Included?</h4>
                        <ul className="mt-1.5 space-y-1 text-[10px] text-stone-600">
                          <li className="flex items-start gap-1.5">
                            <Sparkles className="size-3 text-brand mt-0.5 shrink-0" />
                            <span>Personalized consultations for haircare</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <Sparkles className="size-3 text-brand mt-0.5 shrink-0" />
                            <span>High-quality products from renowned brands</span>
                          </li>
                        </ul>
                      </div>

                      {/* Book Now Button */}
                      <button
                        onClick={() => handleScreenChange('step1')}
                        className="mt-4 w-full rounded-full bg-gradient-to-r from-brand to-purple-600 py-3 text-center text-[12px] font-extrabold text-white shadow-md hover:brightness-105 active:scale-95 transition-all"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SCREEN 4: STEP 1 - SELECT EXPERTS & DATE & TIME */}
              {activeScreen === 'step1' && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="p-3.5 pt-5 text-stone-900"
                >
                  {/* Top Bar with back & heart */}
                  <div className="flex items-center justify-between pb-2">
                    <button
                      onClick={() => handleScreenChange('service-detail')}
                      className="grid size-7 place-items-center rounded-full bg-white shadow-sm ring-1 ring-stone-200/60"
                    >
                      <ChevronLeft className="size-4 text-stone-700" />
                    </button>
                    <span className="text-[12px] font-extrabold">Appointment Slot</span>
                    <Heart className="size-4 text-stone-400" />
                  </div>

                  {/* Stepper Progress */}
                  <div className="my-2 flex items-center justify-between px-1">
                    {[
                      { step: 'Booking', active: true },
                      { step: 'Personal Info', active: false },
                      { step: 'Checkout', active: false },
                      { step: 'Confirm', active: false },
                    ].map((st, i) => (
                      <div key={st.step} className="flex flex-col items-center">
                        <div
                          className={`size-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                            st.active
                              ? 'bg-brand text-white ring-2 ring-purple-200'
                              : 'bg-stone-200 text-stone-500'
                          }`}
                        >
                          {i + 1}
                        </div>
                        <span className={`text-[8px] mt-0.5 ${st.active ? 'font-bold text-brand' : 'text-stone-400'}`}>
                          {st.step}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Select Experts */}
                  <div className="mt-3">
                    <h3 className="text-[12px] font-extrabold text-stone-900">Select Experts</h3>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {/* Anyone */}
                      <div
                        onClick={() => setSelectedExpert('anyone')}
                        className={`cursor-pointer rounded-2xl p-2 text-center transition-all ${
                          selectedExpert === 'anyone'
                            ? 'bg-purple-50 ring-2 ring-brand'
                            : 'bg-white ring-1 ring-stone-100'
                        }`}
                      >
                        <div className="mx-auto size-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                          <User className="size-5" />
                        </div>
                        <p className="mt-1 text-[10px] font-extrabold truncate">Anyone</p>
                        <p className="text-[8px] text-stone-400">3-8 yrs exp</p>
                      </div>

                      {/* Bella */}
                      <div
                        onClick={() => setSelectedExpert('bella')}
                        className={`relative cursor-pointer rounded-2xl p-2 text-center transition-all ${
                          selectedExpert === 'bella'
                            ? 'bg-purple-50 ring-2 ring-brand'
                            : 'bg-white ring-1 ring-stone-100'
                        }`}
                      >
                        {selectedExpert === 'bella' && (
                          <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-brand text-white">
                            <Check className="size-2.5" />
                          </span>
                        )}
                        <img
                          src="/img/portrait-makeup-sm.webp"
                          alt="Bella"
                          className="mx-auto size-10 rounded-full object-cover"
                        />
                        <p className="mt-1 text-[10px] font-extrabold truncate">Bella</p>
                        <p className="text-[8px] text-stone-400">6 yrs exp</p>
                      </div>

                      {/* Daisy */}
                      <div
                        onClick={() => setSelectedExpert('daisy')}
                        className={`cursor-pointer rounded-2xl p-2 text-center transition-all ${
                          selectedExpert === 'daisy'
                            ? 'bg-purple-50 ring-2 ring-brand'
                            : 'bg-white ring-1 ring-stone-100'
                        }`}
                      >
                        <img
                          src="/img/portrait-smile-sm.webp"
                          alt="Daisy"
                          className="mx-auto size-10 rounded-full object-cover"
                        />
                        <p className="mt-1 text-[10px] font-extrabold truncate">Daisy</p>
                        <p className="text-[8px] text-stone-400">4 yrs exp</p>
                      </div>
                    </div>
                  </div>

                  {/* Date & Time Calendar */}
                  <div className="mt-3.5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-extrabold text-stone-900">July 2024</span>
                      <div className="flex gap-1 text-stone-400">
                        <ChevronLeft className="size-3.5 cursor-pointer" />
                        <ChevronRight className="size-3.5 cursor-pointer" />
                      </div>
                    </div>

                    {/* Day labels */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold text-stone-400 mb-1">
                      <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                    </div>

                    {/* Calendar days sample row */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold">
                      {[15, 16, 17, 18, 19, 20, 21].map((d) => (
                        <button
                          key={d}
                          onClick={() => setSelectedDate(d)}
                          className={`size-7 rounded-full flex items-center justify-center transition-all mx-auto ${
                            selectedDate === d
                              ? 'bg-brand font-bold text-white shadow-sm'
                              : 'text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>

                    {/* Available Time Slots */}
                    <div className="mt-3 pt-2 border-t border-stone-100">
                      <p className="text-[9.5px] font-bold text-stone-500 mb-1.5 flex items-center gap-1">
                        <Clock className="size-3 text-stone-400" /> Available Times
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {['10:00 AM', '11:30 AM', '12:45 PM', '02:30 PM'].map((time) => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`rounded-full px-2.5 py-1 text-[9.5px] font-bold transition-all ${
                              selectedTime === time
                                ? 'bg-purple-100 text-brand ring-1 ring-brand'
                                : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Next Step Button */}
                  <button
                    onClick={() => handleScreenChange('step2')}
                    className="mt-3 w-full rounded-full bg-gradient-to-r from-brand to-purple-600 py-2.5 text-center text-[12px] font-extrabold text-white shadow-md hover:brightness-105 active:scale-95 transition-all"
                  >
                    Next
                  </button>
                </motion.div>
              )}

              {/* SCREEN 5: STEP 2 - PERSONAL INFO */}
              {activeScreen === 'step2' && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="p-3.5 pt-5 text-stone-900"
                >
                  <div className="flex items-center justify-between pb-2">
                    <button
                      onClick={() => handleScreenChange('step1')}
                      className="grid size-7 place-items-center rounded-full bg-white shadow-sm ring-1 ring-stone-200/60"
                    >
                      <ChevronLeft className="size-4 text-stone-700" />
                    </button>
                    <span className="text-[12px] font-extrabold">Client Details</span>
                    <span className="size-7" />
                  </div>

                  <div className="text-center mt-2">
                    <div className="relative mx-auto size-14 rounded-full overflow-hidden ring-2 ring-purple-200">
                      <img
                        src="/img/profile-side-sm.webp"
                        alt="Rakib Kowshar"
                        className="size-full object-cover"
                      />
                    </div>
                    <h3 className="mt-2 text-[14px] font-black text-stone-900">Personal Info</h3>
                    <p className="text-[9px] text-stone-500 max-w-[200px] mx-auto leading-tight">
                      Enter your details to confirm your slot and receive WhatsApp updates.
                    </p>
                  </div>

                  {/* Form fields */}
                  <div className="mt-3.5 space-y-2 text-[10px]">
                    <div className="rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-stone-100 flex items-center gap-2">
                      <User className="size-3 text-stone-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <label className="block text-[8px] text-stone-400 font-semibold">Name *</label>
                        <span className="block font-bold text-stone-800">Rakib Kowshar</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-stone-100 flex items-center gap-2">
                      <Mail className="size-3 text-stone-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <label className="block text-[8px] text-stone-400 font-semibold">Email / WhatsApp *</label>
                        <span className="block font-bold text-stone-800 truncate">hellorakib.rk@gmail.com</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-stone-100 flex items-center gap-2">
                      <Calendar className="size-3 text-stone-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <label className="block text-[8px] text-stone-400 font-semibold">Appointment Date</label>
                        <span className="block font-bold text-stone-800">July 18, 2024 ({selectedTime})</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-stone-100 flex items-center gap-2">
                      <Lock className="size-3 text-stone-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <label className="block text-[8px] text-stone-400 font-semibold">Deposit Status</label>
                        <span className="block font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> M-Pesa Confirmed ($25)
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleScreenChange('confirm')}
                    className="mt-4 w-full rounded-full bg-gradient-to-r from-brand to-purple-600 py-2.5 text-center text-[12px] font-extrabold text-white shadow-md hover:brightness-105 active:scale-95 transition-all"
                  >
                    Confirm & View Pass
                  </button>

                  <p className="mt-2 text-center text-[8.5px] text-stone-400">
                    Already have an account? <span className="font-bold text-brand">Login</span>
                  </p>
                </motion.div>
              )}

              {/* SCREEN 6: CONFIRMATION / BARCODE APPOINTMENT PASS */}
              {activeScreen === 'confirm' && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="p-3.5 pt-5 text-stone-900"
                >
                  <div className="flex items-center justify-between pb-1.5">
                    <button
                      onClick={() => handleScreenChange('step2')}
                      className="grid size-7 place-items-center rounded-full bg-white shadow-sm ring-1 ring-stone-200/60"
                    >
                      <ChevronLeft className="size-4 text-stone-700" />
                    </button>
                    <span className="text-[12px] font-extrabold">Order #30516</span>
                    <Heart className="size-4 text-stone-400" />
                  </div>

                  {/* Card with Barcode & Details */}
                  <div className="rounded-2xl bg-white p-3 shadow-md ring-1 ring-stone-100">
                    {/* Realistic Barcode Graphic */}
                    <div className="border-b border-dashed border-stone-200 pb-2 mb-2">
                      <BarcodeGraphic />
                    </div>

                    {/* Salon identity */}
                    <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                      <div className="grid size-8 place-items-center rounded-full bg-purple-100 text-brand font-black text-xs">
                        H
                      </div>
                      <div>
                        <p className="text-[11.5px] font-extrabold">Heaven Touch Salon & Spa</p>
                        <p className="text-[8.5px] text-stone-400">2 services booked</p>
                      </div>
                    </div>

                    {/* Appointment Info grid */}
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[9px] border-b border-stone-100 pb-2">
                      <div>
                        <span className="text-stone-400">Date</span>
                        <p className="font-bold text-stone-800">July 18, 2024</p>
                      </div>
                      <div>
                        <span className="text-stone-400">Time</span>
                        <p className="font-bold text-stone-800">12:45 PM - 1:25 PM</p>
                      </div>
                      <div>
                        <span className="text-stone-400">Order ID</span>
                        <p className="font-bold text-stone-800">#23BG34</p>
                      </div>
                      <div>
                        <span className="text-stone-400">Status</span>
                        <p className="font-bold text-emerald-600 flex items-center gap-0.5">
                          <CheckCircle2 className="size-2.5" /> Confirmed
                        </p>
                      </div>
                    </div>

                    {/* Services line items */}
                    <div className="mt-2 text-[9px]">
                      <p className="font-bold text-stone-900 mb-1">Service Details</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-stone-700">
                          <div>
                            <span className="font-semibold">Sleek Tapered Haircut</span>
                            <span className="block text-[8px] text-stone-400">Expert: Helen</span>
                          </div>
                          <span className="font-bold">$45.00</span>
                        </div>
                        <div className="flex justify-between text-stone-700">
                          <div>
                            <span className="font-semibold">Pure Glimmer Skincare</span>
                            <span className="block text-[8px] text-stone-400">Expert: Bella</span>
                          </div>
                          <span className="font-bold">$45.00</span>
                        </div>
                      </div>
                    </div>

                    {/* Total details */}
                    <div className="mt-2.5 pt-2 border-t border-stone-100 text-[9px] space-y-0.5">
                      <div className="flex justify-between text-stone-500">
                        <span>Subtotal</span>
                        <span>$90.00</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Promo Discount</span>
                        <span>-$2.50</span>
                      </div>
                      <div className="flex justify-between text-stone-900 font-extrabold text-[10px] pt-1 border-t border-stone-100">
                        <span>Total Due</span>
                        <span className="text-brand">$87.50</span>
                      </div>
                    </div>
                  </div>

                  {/* Download Pass Button */}
                  <button
                    onClick={() => handleScreenChange('home')}
                    className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-full bg-gradient-to-r from-brand to-purple-600 py-2.5 text-center text-[11px] font-extrabold text-white shadow-md hover:brightness-105 active:scale-95 transition-all"
                  >
                    <Download className="size-3" /> Download Order Receipt
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom App Navigation Bar (Home, Booking, Saved, Message, Profile) */}
          <div className="absolute inset-x-0 bottom-0 z-20 flex h-11 items-center justify-around border-t border-stone-100 bg-white/95 px-2 backdrop-blur-md">
            {[
              { id: 'home', label: 'Home', icon: Scissors, screen: 'home' as ScreenId },
              { id: 'booking', label: 'Booking', icon: Calendar, screen: 'step1' as ScreenId },
              { id: 'saved', label: 'Saved', icon: Heart, screen: 'salon' as ScreenId },
              { id: 'ticket', label: 'Pass', icon: CheckCircle2, screen: 'confirm' as ScreenId },
            ].map((tab) => {
              const isCurrent = activeScreen === tab.screen
              return (
                <button
                  key={tab.id}
                  onClick={() => handleScreenChange(tab.screen)}
                  className={`flex flex-col items-center gap-0.5 ${
                    isCurrent ? 'text-brand font-bold' : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  <tab.icon className="size-3.5" />
                  <span className="text-[8px]">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </PhoneFrame>
    </div>
  )
}
