/**
 * LPG Beauty & Clinic - Central Data Store
 * STRICT CONSTRAINT: ZERO EMOJIS! Clean text and numbers only.
 * Currency: Kenyan Shilling (KSh)
 */

window.SalonData = {
  salon: {
    id: "salon-lpg-body",
    name: "Beauty Salon Body LPG",
    rating: 4.9,
    reviewsCount: 1238,
    distance: "2 km",
    address: "249 Kensington St, Bradford BD8 9LN",
    phone: "+44 445 349 867",
    email: "glamroom@gmail.com",
    openToday: "10:00 am - 7:00 pm",
    aboutText: "The Beauty Salon Body LPG is a French salon that aims to bring haute couture to hairdressing. The Glam Room is a mirror of a salon opened in Paris a few years ago and not only proposes hair services but also design and beauty to enhance the client experience. «Parisian appartement» is the inspiration for our atmosphere. The team will take the time and professionalism to make sure you leave The Glam Room with élégance.",
    gallery: [
      { id: 1, src: "assets/gallery_treatment_1.jpg", caption: "Precision facial endermologie treatment" },
      { id: 2, src: "assets/gallery_interior_2.jpg", caption: "Parisian appartement minimalist clinic interior" },
      { id: 3, src: "assets/gallery_treatment_3.jpg", caption: "Full body LPG sculpting session" }
    ],
    schedule: [
      { day: "Monday", hours: "10:00 am - 7:00 pm", active: false },
      { day: "Tuesday", hours: "10:00 am - 7:00 pm", active: true },
      { day: "Wednesday", hours: "10:00 am - 7:00 pm", active: false },
      { day: "Thursday", hours: "10:00 am - 7:00 pm", active: false },
      { day: "Friday", hours: "10:00 am - 7:00 pm", active: false },
      { day: "Saturday", hours: "12:00 am - 5:00 pm", active: false },
      { day: "Sunday", hours: "Closed", active: false }
    ]
  },

  categories: [
    { id: "cat-body", name: "LPG body", count: 6, key: "LPG body" },
    { id: "cat-face", name: "LPG face", count: 6, key: "LPG face" },
    { id: "cat-laser", name: "Laser epilation", count: 8, key: "Laser epilation" }
  ],

  services: [
    // LPG Body Services
    {
      id: "serv-cellulite",
      category: "LPG body",
      name: "Smooth cellulite",
      duration: "1 h 30 min",
      price: 5500,
      formattedPrice: "KSh 5,500",
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. A est sed sodales eget. Bibendum ipsum donec eget convallis enim est.",
      defaultExpanded: true
    },
    {
      id: "serv-tone",
      category: "LPG body",
      name: "Tone the skin",
      duration: "1 h 15 min",
      price: 4200,
      formattedPrice: "KSh 4,200",
      description: "Reactivates natural collagen, elastin, and hyaluronic acid production for visibly firmer contours and restored tone.",
      defaultExpanded: false
    },
    {
      id: "serv-targets-fat",
      category: "LPG body",
      name: "Targets fat",
      duration: "40 min",
      price: 6800,
      formattedPrice: "KSh 6,800",
      description: "Mechanically releases stubborn adipocytes and slims localized deposits resistant to physical diet and exercise.",
      defaultExpanded: false
    },
    {
      id: "serv-lighten-legs",
      category: "LPG body",
      name: "Lighten legs",
      duration: "1 h 20 min",
      price: 5500,
      formattedPrice: "KSh 5,500",
      description: "Stimulates deep venous-lymphatic circulation, rapidly eliminating water retention and providing featherlight comfort.",
      defaultExpanded: false
    },
    {
      id: "serv-wellbeing",
      category: "LPG body",
      name: "Well-being",
      duration: "1 h 20 min",
      price: 6800,
      formattedPrice: "KSh 6,800",
      description: "Harmonizing full-body micro-massage treatment designed to alleviate muscular tension, stress, and fatigue.",
      defaultExpanded: false
    },
    {
      id: "serv-all-body",
      category: "LPG body",
      name: "All body treatments",
      duration: "2 h 30 min",
      price: 10800,
      originalPrice: 13500,
      formattedPrice: "KSh 10,800",
      formattedOriginalPrice: "KSh 13,500",
      description: "Signature all-inclusive head-to-toe LPG session merging lymphatic flushing, targeted lipolysis, and cellular firming.",
      defaultExpanded: false
    },

    // LPG Face Services
    {
      id: "serv-face-glow",
      category: "LPG face",
      name: "Endermolift Flash Glow",
      duration: "30 min",
      price: 3800,
      formattedPrice: "KSh 3,800",
      description: "Rapid radiance booster restoring healthy oxygenation and micro-circulation to dull, tired facial tissue.",
      defaultExpanded: false
    },
    {
      id: "serv-face-chin",
      category: "LPG face",
      name: "Target Double Chin",
      duration: "45 min",
      price: 5200,
      formattedPrice: "KSh 5,200",
      description: "Redefines the jawline and sharpens facial contours through localized submental fat reduction.",
      defaultExpanded: false
    },
    {
      id: "serv-face-cellular",
      category: "LPG face",
      name: "Cellular Rejuvenation",
      duration: "1 h 15 min",
      price: 7500,
      formattedPrice: "KSh 7,500",
      description: "Advanced anti-wrinkle cellular reactivation increasing indigenous hyaluronic acid levels and density.",
      defaultExpanded: false
    },
    {
      id: "serv-face-eye-lip",
      category: "LPG face",
      name: "Eye & Lip Contour Express",
      duration: "35 min",
      price: 4000,
      formattedPrice: "KSh 4,000",
      description: "Specialized delicate applicator targets crow's feet, periorbital puffiness, and marionette lines.",
      defaultExpanded: false
    },
    {
      id: "serv-face-decollete",
      category: "LPG face",
      name: "Decollete & Bust Firming",
      duration: "50 min",
      price: 6200,
      formattedPrice: "KSh 6,200",
      description: "Firms and lifts the fragile skin of the neckline and upper torso with gentle micropulsations.",
      defaultExpanded: false
    },
    {
      id: "serv-face-ultimate",
      category: "LPG face",
      name: "Ultimate LPG Anti-Aging",
      duration: "1 h 30 min",
      price: 9500,
      formattedPrice: "KSh 9,500",
      description: "Premium French facial protocol unifying deep cellular gymnastics, collagen remodeling, and lifting mask.",
      defaultExpanded: false
    },

    // Laser Epilation Services
    {
      id: "serv-laser-legs",
      category: "Laser epilation",
      name: "Full Legs Laser Epilation",
      duration: "1 h",
      price: 8500,
      formattedPrice: "KSh 8,500",
      description: "High-precision diode laser for permanent hair reduction across upper and lower leg zones.",
      defaultExpanded: false
    },
    {
      id: "serv-laser-underarms",
      category: "Laser epilation",
      name: "Underarms Precision Laser",
      duration: "25 min",
      price: 3200,
      formattedPrice: "KSh 3,200",
      description: "Rapid, comfortable session with chilling contact tip for sensitive underarm skin.",
      defaultExpanded: false
    },
    {
      id: "serv-laser-bikini",
      category: "Laser epilation",
      name: "Bikini Line Gentle Laser",
      duration: "40 min",
      price: 4800,
      formattedPrice: "KSh 4,800",
      description: "Smooth, lasting contouring around the bikini area with tailored intensity parameters.",
      defaultExpanded: false
    },
    {
      id: "serv-laser-arms",
      category: "Laser epilation",
      name: "Full Arms Laser Smooth",
      duration: "50 min",
      price: 6000,
      formattedPrice: "KSh 6,000",
      description: "Comprehensive epilation covering hands, forearms, and shoulders.",
      defaultExpanded: false
    },
    {
      id: "serv-laser-face",
      category: "Laser epilation",
      name: "Upper Lip & Chin Laser",
      duration: "20 min",
      price: 2500,
      formattedPrice: "KSh 2,500",
      description: "Delicate facial laser application eradicating fine and stubborn hair safely.",
      defaultExpanded: false
    },
    {
      id: "serv-laser-back",
      category: "Laser epilation",
      name: "Back & Shoulders Laser",
      duration: "1 h 15 min",
      price: 11000,
      formattedPrice: "KSh 11,000",
      description: "Full dorsal coverage utilizing high-frequency gliding laser technology.",
      defaultExpanded: false
    },
    {
      id: "serv-laser-torso",
      category: "Laser epilation",
      name: "Chest & Torso Epilation",
      duration: "55 min",
      price: 9000,
      formattedPrice: "KSh 9,000",
      description: "Even, permanent epilation across chest and abdominal region.",
      defaultExpanded: false
    },
    {
      id: "serv-laser-fullbody",
      category: "Laser epilation",
      name: "Full Body Ultimate Epilation",
      duration: "2 h 30 min",
      price: 24000,
      formattedPrice: "KSh 24,000",
      description: "Complete head-to-toe epilation package offering total smooth freedom.",
      defaultExpanded: false
    }
  ],

  team: [
    {
      id: "team-mandy",
      name: "Mandy Pierce",
      role: "Masseuse",
      rating: "5.0",
      image: "assets/team_mandy.jpg"
    },
    {
      id: "team-eva",
      name: "Eva Grey",
      role: "Masseuse",
      rating: "5.0",
      image: "assets/team_eva.jpg"
    },
    {
      id: "team-denisa",
      name: "Denisa White",
      role: "Masseuse",
      rating: null,
      image: "assets/team_denisa.jpg"
    },
    {
      id: "team-ann",
      name: "Ann Doe",
      role: "Cosmetologist",
      rating: "5.0",
      image: "assets/team_ann.jpg"
    },
    {
      id: "team-mary",
      name: "Mary Sue",
      role: "Cosmetologist",
      rating: "4.9",
      image: "assets/team_mary.jpg"
    },
    {
      id: "team-kate",
      name: "Kate Smith",
      role: "Cosmetologist",
      rating: null,
      initials: "KS"
    }
  ],

  reviewsData: {
    overallRating: "4.9",
    totalCount: 36,
    distribution: [
      { stars: 5, count: 44, percent: 85 },
      { stars: 4, count: 10, percent: 20 },
      { stars: 3, count: 2, percent: 5 },
      { stars: 2, count: 0, percent: 0 },
      { stars: 1, count: 0, percent: 0 }
    ],
    items: [
      {
        id: "rev-1",
        author: "Amanda McQueen",
        date: "Jan 24, 2023",
        stars: 5,
        tags: ["Double chin", "Master Eva"],
        text: "This is not the first time I've visited this salon. I'm always happy with the results. The staff is really friendly, nothing to complain about :)",
        photos: ["assets/review_thumb_1.jpg", "assets/review_thumb_2.jpg"]
      },
      {
        id: "rev-2",
        author: "Samantha Blue",
        date: "Jan 23, 2023",
        stars: 5,
        tags: ["Well-being", "Master Ann"],
        text: "Really friendly and welcoming! Lovely place, I will be back and recommending to local friends. Great value too! Thanks again ladies!",
        photos: []
      },
      {
        id: "rev-3",
        author: "Riri Geller",
        date: "Jan 22, 2023",
        stars: 5,
        tags: [],
        text: "Amazing treatment and excellent quality!",
        photos: []
      },
      {
        id: "rev-4",
        author: "Riri Geller",
        date: "Jan 21, 2023",
        stars: 5,
        tags: ["Tone the skin", "Master Mary"],
        text: "Really lovely, kind and friendly staff, nice and clean interior.",
        photos: []
      },
      {
        id: "rev-5",
        author: "Diana Miller",
        date: "Jan 21, 2023",
        stars: 5,
        tags: [],
        text: "Wonderful experience, friendly team of professionals!",
        photos: []
      }
    ]
  },

  nearbySalons: [
    {
      id: "near-1",
      name: "Melissa and Mary",
      address: "249 Kensington St, Bradford BD8 9LN",
      rating: "4.9",
      reviews: "1238 reviews",
      distance: "2 km",
      image: "assets/nearby_melissa_mary.jpg"
    },
    {
      id: "near-2",
      name: "Red Line LPG",
      address: "Greyhound Dr, Bradford BD7 1NQ",
      rating: "4.8",
      reviews: "765 reviews",
      distance: "1.2 km",
      image: "assets/nearby_red_line.jpg"
    },
    {
      id: "near-3",
      name: "G-Bar Special LPG",
      address: "Hilmore House, 71 Gain Ln, Bradford",
      rating: "4.8",
      reviews: "1567 reviews",
      distance: "2 km",
      image: "assets/nearby_gbar.jpg"
    }
  ],

  // Bookings system matching Image 2
  bookingsState: {
    upcoming: [], // Empty state showing "No upcoming bookings"
    past: [
      {
        id: "bk-101",
        salonName: "Maija Lux Massage",
        address: "Washington St, Bradford BD8 9QW",
        status: "Completed",
        statusClass: "completed",
        fullDateTitle: "Monday, 24 January, 4:00 pm",
        shortDate: "24 Jan, 4:00 pm",
        summaryLine: "2 services • 3 h 45 min",
        items: [
          {
            category: "LPG body",
            name: "Smooth cellulite",
            price: "KSh 5,500",
            duration: "1 h 30 min"
          },
          {
            isWaiting: true,
            title: "Waiting time",
            duration: "15 min"
          },
          {
            category: "LPG body",
            name: "Tone the skin",
            price: "KSh 4,200",
            duration: "1 h 15 min"
          }
        ],
        total: "KSh 9,700",
        review: {
          stars: 5,
          text: "Outstanding LPG contouring and very polite, professional therapist."
        }
      },
      {
        id: "bk-102",
        salonName: "Maija Lux Massage",
        address: "Washington St, Bradford BD8 9QW",
        status: "Cancelled",
        statusClass: "cancelled",
        fullDateTitle: "Monday, 24 January, 4:00 pm",
        shortDate: "24 Jan, 4:00 pm",
        summaryLine: "3 services • 4 h 15 min",
        items: [
          {
            category: "LPG body",
            name: "Targets fat",
            price: "KSh 6,800",
            duration: "40 min"
          },
          {
            category: "LPG body",
            name: "Lighten legs",
            price: "KSh 5,500",
            duration: "1 h 20 min"
          },
          {
            category: "LPG body",
            name: "Well-being",
            price: "KSh 6,800",
            duration: "1 h 20 min"
          }
        ],
        total: "KSh 19,100",
        review: null
      },
      {
        id: "bk-103",
        salonName: "Beauty Salon Body LPG",
        address: "249 Kensington St, Bradford BD8 9LN",
        status: "Completed",
        statusClass: "completed",
        fullDateTitle: "Tuesday, 10 January, 2:00 pm",
        shortDate: "10 Jan, 2:00 pm",
        summaryLine: "1 service • 2 h 30 min",
        items: [
          {
            category: "LPG body",
            name: "All body treatments",
            price: "KSh 10,800",
            duration: "2 h 30 min"
          }
        ],
        total: "KSh 10,800",
        review: {
          stars: 5,
          text: "Incredible full body treatment. Noticeable firmness right away!"
        }
      }
    ]
  }
};
