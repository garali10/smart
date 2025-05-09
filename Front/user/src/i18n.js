import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Embedded translations
const resources = {
  en: {
    translation: {
      "navigation": {
        "home": "Home",
        "about": "About",
        "services": "Services",
        "jobs": "Jobs",
        "myApplications": "My Applications",
        "favorites": "Favorites",
        "mbtiTest": "MBTI Test",
        "contact": "Contact",
        "login": "Login",
        "logout": "Logout",
        "notifications": "Notifications",
        "noNotifications": "No new notifications",
        "searchPlaceholder": "Search for country or language..."
      },
      "favorites": {
        "title": "My Favorites",
        "count": "{{count}}",
        "clearAll": "Clear all favorites",
        "empty": "No Favorite Jobs Yet",
        "emptyDesc": "Browse job opportunities and click the heart icon to add them to your favorites.",
        "exploreJobs": "Explore Jobs"
      },
      "auth": {
        "pleaseLogin": "Please Login",
        "loginRequired": "You need to be logged in to view your favorite jobs."
      },
      "common": {
        "loading": "Loading",
        "error": "Error",
        "success": "Success",
        "cancel": "Cancel",
        "confirm": "Confirm",
        "save": "Save",
        "delete": "Delete"
      },
      "contact": {
        "title": "GET IN TOUCH",
        "paragraph": "Get in touch with us to learn more about our services or to inquire about job opportunities.",
        "name": "Name",
        "email": "Email",
        "message": "Message",
        "send": "SEND MESSAGE",
        "contactInfo": "Contact Info",
        "address": "Address",
        "phone": "Phone"
      },
      "team": {
        "title": "MEET THE TEAM",
        "description": "Our team of professionals is dedicated to helping you find the perfect job opportunity."
      },
      "features": {
        "title": "FEATURES",
        "description": "We offer a variety of features to help you in your job search journey."
      },
      "services": {
        "title": "OUR SERVICES",
        "description": "We provide comprehensive recruitment and job placement services to help candidates and employers."
      },
      "about": {
        "title": "ABOUT US",
        "paragraph": "We are a leading recruitment agency specializing in connecting talented professionals with top employers.",
        "whyChooseUs": "Why Choose Us?",
        "reasonsTitle": "Here are some reasons to choose our services:"
      },
      "welcome": {
        "title": "WELCOME TO",
        "subtitle": "ESPRIT SMART HIRE",
        "description": "Here you can find the best jobs for you.",
        "learnMore": "LEARN MORE"
      },
      "jobs": {
        "title": "JOB OPPORTUNITIES",
        "description": "Explore our latest job openings and find your perfect role",
        "loading": "Loading...",
        "error": "Failed to load job listings",
        "noJobs": "No jobs available at the moment"
      }
    }
  },
  fr: {
    translation: {
      "navigation": {
        "home": "Accueil",
        "about": "À propos",
        "services": "Services",
        "jobs": "Emplois",
        "myApplications": "Mes candidatures",
        "favorites": "Favoris",
        "mbtiTest": "Test MBTI",
        "contact": "Contact",
        "login": "Connexion",
        "logout": "Déconnexion",
        "notifications": "Notifications",
        "noNotifications": "Pas de nouvelles notifications",
        "searchPlaceholder": "Rechercher un pays ou une langue..."
      },
      "favorites": {
        "title": "Mes Favoris",
        "count": "{{count}}",
        "clearAll": "Supprimer tous les favoris",
        "empty": "Pas encore d'emplois favoris",
        "emptyDesc": "Parcourez les offres d'emploi et cliquez sur l'icône cœur pour les ajouter à vos favoris.",
        "exploreJobs": "Explorer les emplois"
      },
      "auth": {
        "pleaseLogin": "Veuillez vous connecter",
        "loginRequired": "Vous devez être connecté pour voir vos emplois favoris."
      },
      "common": {
        "loading": "Chargement",
        "error": "Erreur",
        "success": "Succès",
        "cancel": "Annuler",
        "confirm": "Confirmer",
        "save": "Enregistrer",
        "delete": "Supprimer"
      },
      "contact": {
        "title": "CONTACTEZ-NOUS",
        "paragraph": "Contactez-nous pour en savoir plus sur nos services ou pour vous renseigner sur les opportunités d'emploi.",
        "name": "Nom",
        "email": "Email",
        "message": "Message",
        "send": "ENVOYER LE MESSAGE",
        "contactInfo": "Coordonnées",
        "address": "Adresse",
        "phone": "Téléphone"
      },
      "team": {
        "title": "NOTRE ÉQUIPE",
        "description": "Notre équipe de professionnels est dédiée à vous aider à trouver l'opportunité d'emploi parfaite."
      },
      "features": {
        "title": "FONCTIONNALITÉS",
        "description": "Nous offrons une variété de fonctionnalités pour vous aider dans votre recherche d'emploi."
      },
      "services": {
        "title": "NOS SERVICES",
        "description": "Nous fournissons des services complets de recrutement et de placement pour aider les candidats et les employeurs."
      },
      "about": {
        "title": "À PROPOS DE NOUS",
        "paragraph": "Nous sommes une agence de recrutement de premier plan spécialisée dans la mise en relation de professionnels talentueux avec des employeurs de premier plan.",
        "whyChooseUs": "Pourquoi Nous Choisir?",
        "reasonsTitle": "Voici quelques raisons de choisir nos services:"
      },
      "welcome": {
        "title": "BIENVENUE À",
        "subtitle": "ESPRIT SMART HIRE",
        "description": "Ici, vous pouvez trouver les meilleurs emplois pour vous.",
        "learnMore": "EN SAVOIR PLUS"
      },
      "jobs": {
        "title": "OPPORTUNITÉS D'EMPLOI",
        "description": "Explorez nos dernières offres d'emploi et trouvez votre rôle parfait",
        "loading": "Chargement...",
        "error": "Échec du chargement des annonces",
        "noJobs": "Aucun emploi disponible pour le moment"
      }
    }
  },
  ar: {
    translation: {
      "navigation": {
        "home": "الرئيسية",
        "about": "من نحن",
        "services": "خدماتنا",
        "jobs": "الوظائف",
        "myApplications": "طلباتي",
        "favorites": "المفضلة",
        "mbtiTest": "اختبار MBTI",
        "contact": "اتصل بنا",
        "login": "تسجيل الدخول",
        "logout": "تسجيل الخروج",
        "notifications": "الإشعارات",
        "noNotifications": "لا توجد إشعارات جديدة",
        "searchPlaceholder": "البحث عن بلد أو لغة..."
      },
      "favorites": {
        "title": "المفضلة",
        "count": "{{count}}",
        "clearAll": "حذف كل المفضلة",
        "empty": "لا توجد وظائف مفضلة بعد",
        "emptyDesc": "تصفح فرص العمل واضغط على أيقونة القلب لإضافتها إلى المفضلة.",
        "exploreJobs": "استكشاف الوظائف"
      },
      "auth": {
        "pleaseLogin": "الرجاء تسجيل الدخول",
        "loginRequired": "يجب تسجيل الدخول لعرض الوظائف المفضلة."
      },
      "common": {
        "loading": "جاري التحميل",
        "error": "خطأ",
        "success": "تم بنجاح",
        "cancel": "إلغاء",
        "confirm": "تأكيد",
        "save": "حفظ",
        "delete": "حذف"
      },
      "contact": {
        "title": "تواصل معنا",
        "paragraph": "تواصل معنا لمعرفة المزيد عن خدماتنا أو للاستفسار عن فرص العمل.",
        "name": "الاسم",
        "email": "البريد الإلكتروني",
        "message": "الرسالة",
        "send": "إرسال الرسالة",
        "contactInfo": "معلومات الاتصال",
        "address": "العنوان",
        "phone": "الهاتف"
      },
      "team": {
        "title": "تعرف على الفريق",
        "description": "فريقنا من المحترفين مكرس لمساعدتك في العثور على فرصة العمل المثالية."
      },
      "features": {
        "title": "المميزات",
        "description": "نقدم مجموعة متنوعة من الميزات لمساعدتك في رحلة البحث عن وظيفة."
      },
      "services": {
        "title": "خدماتنا",
        "description": "نقدم خدمات شاملة للتوظيف والتنسيب لمساعدة المرشحين وأصحاب العمل."
      },
      "about": {
        "title": "من نحن",
        "paragraph": "نحن وكالة توظيف رائدة متخصصة في ربط المهنيين الموهوبين بأفضل أصحاب العمل.",
        "whyChooseUs": "لماذا تختارنا؟",
        "reasonsTitle": "فيما يلي بعض الأسباب لاختيار خدماتنا:"
      },
      "welcome": {
        "title": "مرحبا بكم في",
        "subtitle": "إسبري سمارت هاير",
        "description": "هنا يمكنك العثور على أفضل الوظائف المناسبة لك.",
        "learnMore": "تعرف على المزيد"
      },
      "jobs": {
        "title": "فرص العمل",
        "description": "استكشف أحدث فرص العمل وأبحث عن الوظيفة المناسبة لك",
        "loading": "جاري التحميل...",
        "error": "فشل تحميل إعلانات الوظيفة",
        "noJobs": "لا توجد فرص عمل متاحة في الوقت الحالي"
      }
    }
  }
};

// Set document direction based on language
const setDocumentDirection = (language) => {
  if (language === 'ar') {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    document.body.classList.add('rtl-layout');
  } else {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = language;
    document.body.classList.remove('rtl-layout');
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    
    // React i18next special options
    react: {
      useSuspense: true,
    }
  });

// Set initial direction
setDocumentDirection(i18n.language);

// Listen for language changes
i18n.on('languageChanged', (lng) => {
  setDocumentDirection(lng);
});

export default i18n; 