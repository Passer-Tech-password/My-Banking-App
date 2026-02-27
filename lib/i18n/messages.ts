export const locales = [
  "en", "fr", "es", "de", "it", "pt", "ru", "zh", "ja", "ko", 
  "ar", "hi", "bn", "pa", "jv", "ms", "vi", "th", "tr", "nl",
  "pl", "uk", "ro", "el", "sv", "hu", "cs", "id", "tl", "fa", "sw", "he",
  "da", "fi", "no"
] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}

const BASE_MESSAGES = {
    "nav.home": "Home",
    "nav.about": "About Us",
    "nav.services": "Services",
    "nav.contact": "Contact Us",
    "nav.login": "Login",
    "nav.register": "Register Now",
    "nav.language": "Language",

    "hero.getStarted": "Get Started",
    "hero.slide1.title": "Reliable. Zero Service Charge",
    "hero.slide1.subtitle": "Move Your Money In Easy Secured Steps",
    "hero.slide1.description":
      "A premium digital banking experience designed to help you save, spend, and send money with confidence.",
    "hero.slide2.title": "Easy. Fast. Secure",
    "hero.slide2.subtitle": "Secured & Easy Online Payment Solution",
    "hero.slide2.description":
      "Make payments and manage your finances with a secure platform built for speed and simplicity.",
    "hero.slide3.title": "Simple. Transparent. Secure",
    "hero.slide3.subtitle": "Fast & Secure Online Money Transfer",
    "hero.slide3.description":
      "Send money to many countries worldwide with a streamlined experience and strong security.",

    "footer.about":
      "Aurora Bank delivers secure, premium digital banking for individuals and businesses, with tailored solutions and global access to your money.",
    "footer.company": "Our Company",
    "footer.products": "Products",
    "footer.subscribe": "Subscribe",
    "footer.aboutLink": "About Us",
    "footer.contactLink": "Contact Us",
    "footer.privacyLink": "Privacy Policy",
    "footer.careersSoon": "Careers (Coming Soon)",
    "footer.product1": "Online Payments (Coming Soon)",
    "footer.product2": "Mobile Banking (Coming Soon)",
    "footer.product3": "Business Accounts (Coming Soon)",
    "footer.product4": "Savings Accounts (Coming Soon)",
    "footer.subscribeText":
      "Subscribe to our newsletter to get the latest updates and offers.",
    "footer.emailPlaceholder": "Your Email",
    "footer.subscribeButton": "Subscribe",
    "footer.rights": "© 2026 Aurora Bank. All rights reserved.",

    "home.smartBanking": "Smart Banking",
    "home.smartBanking.title": "A Premium Way To Save, Spend & Send Money Online",
    "home.smartBanking.description": "Aurora Bank gives you a sophisticated, fully digital way to manage your money. Open an account, grow your savings, and move funds globally with confidence.",
    "home.card1.title": "Global Cards",
    "home.card1.description": "Cards that work all across the world. Shop online or offline with complete freedom.",
    "home.card2.title": "High Returns",
    "home.card2.description": "Highest Returns on your investments. Grow your wealth with our premium savings accounts.",
    "home.card3.title": "Zero Fees",
    "home.card3.description": "No ATM fees. No minimum balance. No overdrafts. Keep more of your hard-earned money.",
    "home.moreAboutUs": "More About us",
    "home.ourFeature": "Our Feature",
    "home.feature.title": "Payment Services Worldwide",
    "home.feature.description": "We provide a robust infrastructure for seamless global payments. Whether you're sending money to family, funding your business, or paying for services abroad, we help your transfers move quickly and reliably.",
    "home.feature1.title": "Protect Your Card",
    "home.feature1.description": "Your Credit Card is encrypted with anti-fraud detection AI to keep your funds safe.",
    "home.feature2.title": "Send Money",
    "home.feature2.description": "Send money across the globe in just a matter of minutes with low fees.",
    "home.feature3.title": "Online Banking",
    "home.feature3.description": "A new paradigm shift disrupting the old order of Banking with our digital-first approach.",
    "home.security": "Banking Security",
    "home.security.title": "The Safest Way To Transact Your Money Fast",
    "home.security.description": "With Aurora Bank, your money and data are protected by multi-layer security, strong encryption, and continuous fraud monitoring, so you can bank with confidence.",
    "home.security.encryption": "Encryption",
    "home.security.monitoring": "Monitoring",
    "home.security.secure": "Secure",
    "home.security.auth": "Factor Auth",

    "about.title": "About Aurora Bank",
    "about.description": "Aurora Bank is a digital-first bank crafted for discerning clients who expect simplicity, transparency, and security on a global scale.",
    "about.whoWeAre": "Who We Are",
    "about.trustTitle": "A Financial Partner You Can Trust",
    "about.trustText1": "Aurora Bank was founded with a simple mission: to offer modern banking that is accessible yet refined, combining fair pricing with a high‑touch service experience. Your money should work for you, not get lost in fees and complexity.",
    "about.trustText2": "Our specialists pair deep financial expertise with advanced technology to give you intuitive tools, insightful guidance, and responsive support wherever you are in the world.",
    "about.getInTouch": "Get in Touch",
    "about.customerFirst": "Customer First",
    "about.customerFirstText": "We prioritize your needs and goals above all else.",
    "about.globalReach": "Global Reach",
    "about.globalReachText": "Access your funds and support from anywhere on the planet.",
    "about.secure": "Secure & Safe",
    "about.secureText": "Top-tier encryption keeps your assets protected 24/7.",
    "about.stat.transactions": "Transactions",
    "about.stat.countries": "Countries",
    "about.stat.support": "Support",

    "services.title": "Banking Services Designed Around You",
    "services.description": "From everyday banking to major life milestones, Aurora Bank offers tailored credit cards, loans, and financing solutions to help you move confidently.",
    "services.card1.title": "Checking Accounts",
    "services.card1.description": "Enjoy fee-free daily banking with high transaction limits and seamless mobile app access.",
    "services.card2.title": "High-Yield Savings",
    "services.card2.description": "Watch your money grow faster with competitive interest rates and no lock-in periods.",
    "services.card3.title": "Business Solutions",
    "services.card3.description": "Powerful tools for businesses of all sizes, including payroll, invoicing, and expense tracking.",
    "services.card4.title": "Personal Loans",
    "services.card4.description": "Flexible personal loans with low APRs to help you consolidate debt or fund your dreams.",
    "services.card5.title": "Mortgages",
    "services.card5.description": "Home financing made simple. Get pre-approved quickly and find the perfect plan for you.",
    "services.card6.title": "Wealth Management",
    "services.card6.description": "Expert advice and portfolio management to secure your financial future.",
    "services.cta.title": "Ready to get started?",
    "services.cta.description": "Join thousands of satisfied customers who trust Aurora Bank for their financial journey.",
    "services.cta.button": "Open an Account",

    "contact.title": "Contact Us",
    "contact.description": "Have questions? We're here to help. Reach out to our team 24/7.",
    "contact.getInTouch": "Get In Touch",
    "contact.conversationTitle": "Let's Start A Conversation",
    "contact.conversationText": "Whether you have a question about features, pricing, need a demo, or anything else, our team is ready to answer all your questions.",
    "contact.email": "Email Us",
    "contact.phone": "Call Us",
    "contact.office": "Visit Our Office",
    "contact.form.name": "Full Name",
    "contact.form.email": "Email Address",
    "contact.form.message": "Your Message",
    "contact.form.send": "Send Message",
};

const MESSAGES = {
  en: BASE_MESSAGES,
  fr: { ...BASE_MESSAGES, ...{
    "nav.home": "Accueil",
    "nav.about": "À propos",
    "nav.services": "Services",
    "nav.contact": "Contact",
    "nav.login": "Connexion",
    "nav.register": "S’inscrire",
    "nav.language": "Langue",
    // ... existing French translations ...
  }},
  es: { ...BASE_MESSAGES, ...{
    "nav.home": "Inicio",
    "nav.about": "Sobre nosotros",
    "nav.services": "Servicios",
    "nav.contact": "Contacto",
    "nav.login": "Iniciar sesión",
    "nav.register": "Registrarse",
    "nav.language": "Idioma",
    // ... existing Spanish translations ...
  }},
  // Fallback for other languages to English (BASE_MESSAGES) for now, 
  // since generating full translations for 20 languages would be too large for this file.
  de: { ...BASE_MESSAGES, ...{
    "nav.home": "Startseite",
    "nav.about": "Über uns",
    "nav.services": "Dienstleistungen",
    "nav.contact": "Kontakt",
    "nav.login": "Anmelden",
    "nav.register": "Registrieren",
    "nav.language": "Sprache"
  }},
  it: { ...BASE_MESSAGES, ...{
    "nav.home": "Home",
    "nav.about": "Chi siamo",
    "nav.services": "Servizi",
    "nav.contact": "Contatti",
    "nav.login": "Accedi",
    "nav.register": "Registrati",
    "nav.language": "Lingua"
  }},
  pt: { ...BASE_MESSAGES, ...{
    "nav.home": "Início",
    "nav.about": "Sobre nós",
    "nav.services": "Serviços",
    "nav.contact": "Contato",
    "nav.login": "Entrar",
    "nav.register": "Registrar",
    "nav.language": "Idioma"
  }},
  ru: { ...BASE_MESSAGES, ...{
    "nav.home": "Главная",
    "nav.about": "О нас",
    "nav.services": "Услуги",
    "nav.contact": "Контакты",
    "nav.login": "Войти",
    "nav.register": "Регистрация",
    "nav.language": "Язык"
  }},
  zh: { ...BASE_MESSAGES, ...{
    "nav.home": "首页",
    "nav.about": "关于我们",
    "nav.services": "服务",
    "nav.contact": "联系我们",
    "nav.login": "登录",
    "nav.register": "注册",
    "nav.language": "语言"
  }},
  ja: { ...BASE_MESSAGES, ...{
    "nav.home": "ホーム",
    "nav.about": "私たちについて",
    "nav.services": "サービス",
    "nav.contact": "お問い合わせ",
    "nav.login": "ログイン",
    "nav.register": "登録",
    "nav.language": "言語"
  }},
  ko: { ...BASE_MESSAGES, ...{
    "nav.home": "홈",
    "nav.about": "회사 소개",
    "nav.services": "서비스",
    "nav.contact": "문의하기",
    "nav.login": "로그인",
    "nav.register": "회원가입",
    "nav.language": "언어"
  }},
  ar: { ...BASE_MESSAGES, ...{
    "nav.home": "الرئيسية",
    "nav.about": "معلومات عنا",
    "nav.services": "الخدمات",
    "nav.contact": "اتصل بنا",
    "nav.login": "تسجيل الدخول",
    "nav.register": "تسجيل",
    "nav.language": "اللغة"
  }},
  hi: { ...BASE_MESSAGES, ...{
    "nav.home": "होम",
    "nav.about": "हमारे बारे में",
    "nav.services": "सेवाएं",
    "nav.contact": "संपर्क करें",
    "nav.login": "लॉग इन",
    "nav.register": "रजिस्टर करें",
    "nav.language": "भाषा"
  }},
  bn: { ...BASE_MESSAGES, ...{
    "nav.home": "হোম",
    "nav.about": "আমাদের সম্পর্কে",
    "nav.services": "পরিষেবা",
    "nav.contact": "যোগাযোগ",
    "nav.login": "লগ ইন",
    "nav.register": "নিবন্ধন",
    "nav.language": "ভাষা"
  }},
  pa: { ...BASE_MESSAGES, ...{
    "nav.home": "ਘਰ",
    "nav.about": "ਸਾਡੇ ਬਾਰੇ",
    "nav.services": "ਸੇਵਾਵਾਂ",
    "nav.contact": "ਸੰਪਰਕ ਕਰੋ",
    "nav.login": "ਲਾਗ ਇਨ",
    "nav.register": "ਰਜਿਸਟਰ",
    "nav.language": "ਭਾਸ਼ਾ"
  }},
  jv: { ...BASE_MESSAGES, ...{
    "nav.home": "Omah",
    "nav.about": "Babagan Kita",
    "nav.services": "Layanan",
    "nav.contact": "Hubungi Kita",
    "nav.login": "Mlebu",
    "nav.register": "Daftar",
    "nav.language": "Basa"
  }},
  ms: { ...BASE_MESSAGES, ...{
    "nav.home": "Laman Utama",
    "nav.about": "Tentang Kami",
    "nav.services": "Perkhidmatan",
    "nav.contact": "Hubungi Kami",
    "nav.login": "Log Masuk",
    "nav.register": "Daftar",
    "nav.language": "Bahasa"
  }},
  vi: { ...BASE_MESSAGES, ...{
    "nav.home": "Trang chủ",
    "nav.about": "Về chúng tôi",
    "nav.services": "Dịch vụ",
    "nav.contact": "Liên hệ",
    "nav.login": "Đăng nhập",
    "nav.register": "Đăng ký",
    "nav.language": "Ngôn ngữ"
  }},
  th: { ...BASE_MESSAGES, ...{
    "nav.home": "หน้าแรก",
    "nav.about": "เกี่ยวกับเรา",
    "nav.services": "บริการ",
    "nav.contact": "ติดต่อเรา",
    "nav.login": "เข้าสู่ระบบ",
    "nav.register": "ลงทะเบียน",
    "nav.language": "ภาษา"
  }},
  tr: { ...BASE_MESSAGES, ...{
    "nav.home": "Anasayfa",
    "nav.about": "Hakkımızda",
    "nav.services": "Hizmetler",
    "nav.contact": "İletişim",
    "nav.login": "Giriş Yap",
    "nav.register": "Kayıt Ol",
    "nav.language": "Dil"
  }},
  nl: { ...BASE_MESSAGES, ...{
    "nav.home": "Home",
    "nav.about": "Over ons",
    "nav.services": "Diensten",
    "nav.contact": "Contact",
    "nav.login": "Inloggen",
    "nav.register": "Registreren",
    "nav.language": "Taal"
  }},
  pl: { ...BASE_MESSAGES, ...{
    "nav.home": "Strona główna",
    "nav.about": "O nas",
    "nav.services": "Usługi",
    "nav.contact": "Kontakt",
    "nav.login": "Zaloguj się",
    "nav.register": "Zarejestruj się",
    "nav.language": "Język"
  }},
  uk: { ...BASE_MESSAGES, ...{
    "nav.home": "Головна",
    "nav.about": "Про нас",
    "nav.services": "Послуги",
    "nav.contact": "Контакти",
    "nav.login": "Увійти",
    "nav.register": "Реєстрація",
    "nav.language": "Мова"
  }},
  ro: { ...BASE_MESSAGES, ...{
    "nav.home": "Acasă",
    "nav.about": "Despre noi",
    "nav.services": "Servicii",
    "nav.contact": "Contact",
    "nav.login": "Autentificare",
    "nav.register": "Înregistrare",
    "nav.language": "Limbă"
  }},
  el: { ...BASE_MESSAGES, ...{
    "nav.home": "Αρχική",
    "nav.about": "Σχετικά με εμάς",
    "nav.services": "Υπηρεσίες",
    "nav.contact": "Επικοινωνία",
    "nav.login": "Σύνδεση",
    "nav.register": "Εγγραφή",
    "nav.language": "Γλώσσα"
  }},
  sv: { ...BASE_MESSAGES, ...{
    "nav.home": "Hem",
    "nav.about": "Om oss",
    "nav.services": "Tjänster",
    "nav.contact": "Kontakt",
    "nav.login": "Logga in",
    "nav.register": "Registrera dig",
    "nav.language": "Språk"
  }},
  hu: { ...BASE_MESSAGES, ...{
    "nav.home": "Kezdőlap",
    "nav.about": "Rólunk",
    "nav.services": "Szolgáltatások",
    "nav.contact": "Kapcsolat",
    "nav.login": "Bejelentkezés",
    "nav.register": "Regisztráció",
    "nav.language": "Nyelv"
  }},
  cs: { ...BASE_MESSAGES, ...{
    "nav.home": "Domů",
    "nav.about": "O nás",
    "nav.services": "Služby",
    "nav.contact": "Kontakt",
    "nav.login": "Přihlásit se",
    "nav.register": "Registrace",
    "nav.language": "Jazyk"
  }},
  id: { ...BASE_MESSAGES, ...{
    "nav.home": "Beranda",
    "nav.about": "Tentang Kami",
    "nav.services": "Layanan",
    "nav.contact": "Kontak",
    "nav.login": "Masuk",
    "nav.register": "Daftar",
    "nav.language": "Bahasa"
  }},
  tl: { ...BASE_MESSAGES, ...{
    "nav.home": "Home",
    "nav.about": "Tungkol sa Amin",
    "nav.services": "Serbisyo",
    "nav.contact": "Makipag-ugnayan",
    "nav.login": "Mag-login",
    "nav.register": "Magrehistro",
    "nav.language": "Wika"
  }},
  fa: { ...BASE_MESSAGES, ...{
    "nav.home": "خانه",
    "nav.about": "درباره ما",
    "nav.services": "خدمات",
    "nav.contact": "تماس با ما",
    "nav.login": "ورود",
    "nav.register": "ثبت نام",
    "nav.language": "زبان"
  }},
  sw: { ...BASE_MESSAGES, ...{
    "nav.home": "Nyumbani",
    "nav.about": "Kuhusu Sisi",
    "nav.services": "Huduma",
    "nav.contact": "Wasiliana Nasi",
    "nav.login": "Ingia",
    "nav.register": "Jisajili",
    "nav.language": "Lugha"
  }},
  he: { ...BASE_MESSAGES, ...{
    "nav.home": "בית",
    "nav.about": "אודות",
    "nav.services": "שירותים",
    "nav.contact": "צור קשר",
    "nav.login": "התחברות",
    "nav.register": "הרשמה",
    "nav.language": "שפה"
  }},
  da: { ...BASE_MESSAGES, ...{
    "nav.home": "Hjem",
    "nav.about": "Om os",
    "nav.services": "Tjenester",
    "nav.contact": "Kontakt os",
    "nav.login": "Log ind",
    "nav.register": "Tilmeld",
    "nav.language": "Sprog"
  }},
  fi: { ...BASE_MESSAGES, ...{
    "nav.home": "Koti",
    "nav.about": "Meistä",
    "nav.services": "Palvelut",
    "nav.contact": "Ota yhteyttä",
    "nav.login": "Kirjaudu",
    "nav.register": "Rekisteröidy",
    "nav.language": "Kieli"
  }},
  no: { ...BASE_MESSAGES, ...{
    "nav.home": "Hjem",
    "nav.about": "Om oss",
    "nav.services": "Tjenester",
    "nav.contact": "Kontakt oss",
    "nav.login": "Logg inn",
    "nav.register": "Registrer deg",
    "nav.language": "Språk"
  }},
} as const;

export type MessageKey = keyof (typeof MESSAGES)["en"];

export function createTranslator(locale: Locale) {
  const selected = MESSAGES[locale] ?? MESSAGES[defaultLocale];
  return (key: MessageKey) => {
    return selected[key] ?? MESSAGES[defaultLocale][key] ?? key;
  };
}

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  ar: "العربية",
  hi: "हिन्दी",
  bn: "বাংলা",
  pa: "ਪੰਜਾਬੀ",
  jv: "Basa Jawa",
  ms: "Bahasa Melayu",
  vi: "Tiếng Việt",
  th: "ไทย",
  tr: "Türkçe",
  nl: "Nederlands",
  pl: "Polski",
  uk: "Українська",
  ro: "Română",
  el: "Ελληνικά",
  sv: "Svenska",
  hu: "Magyar",
  cs: "Čeština",
  id: "Bahasa Indonesia",
  tl: "Filipino",
  fa: "فارسی",
  sw: "Kiswahili",
  he: "עברית",
  da: "Dansk",
  fi: "Suomi",
  no: "Norsk"
};
