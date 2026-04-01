const fs = require('fs');

const arPath = 'public/i18n/ar.json';
const enPath = 'public/i18n/en.json';

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const adminAr = {
  "HOME": "الرئيسية",
  "REFRESH_PROMPT": {
    "TITLE": "هل تريد إعادة تهيئة البيانات؟",
    "CONTENT": "سيتم تحديث جميع المشاريع والبيانات التجريبية.",
    "OK": "تأكيد",
    "CANCEL": "إلغاء"
  },
  "MENU": {
    "MUSHAFS": "المصاحف",
    "TAFSIRS": "التفاسير",
    "TRANSLATIONS": "الترجمات",
    "PUBLISHERS": "الناشرون والمصادر",
    "AUDIO": "الصوتيات"
  },
  "PUBLISHER_ADD": {
    "TITLE": "إضافة ناشر جديد",
    "NAME_EN_LABEL": "اسم الناشر بالإنجليزي (name_en) *",
    "NAME_AR_LABEL": "اسم الناشر بالعربي (name_ar) *",
    "COUNTRY": "الدولة",
    "FOUNDATION_YEAR": "سنة التأسيس",
    "WEBSITE": "الموقع الإلكتروني",
    "EMAIL": "البريد الإلكتروني",
    "ADDRESS": "العنوان",
    "ICON_URL": "رابط الأيقونة (URL)",
    "DESCRIPTION": "الوصف",
    "CANCEL": "إلغاء",
    "SAVE": "حفظ الناشر",
    "SUCCESS": "تمت إضافة الناشر بنجاح",
    "ERROR": "عذراً، حدث خطأ أثناء إضافة الناشر"
  },
  "PUBLISHER_BANNER": {
    "TITLE": "الناشرون والمصادر",
    "DESCRIPTION": "إدارة الجهات والمؤسسات التي نحصل منها على المحتوى القرآني"
  },
  "PUBLISHER_STATS": {
    "TOTAL_PUBLISHERS": "إجمالي الناشرين",
    "ACTIVE_PUBLISHERS": "ناشرون نشطون",
    "TOTAL_COUNTRIES": "إجمالي الدول"
  }
};

const adminEn = {
  "HOME": "Home",
  "REFRESH_PROMPT": {
    "TITLE": "Do you want to reset data?",
    "CONTENT": "All projects and experimental data will be updated.",
    "OK": "Confirm",
    "CANCEL": "Cancel"
  },
  "MENU": {
    "MUSHAFS": "Mushafs",
    "TAFSIRS": "Tafsirs",
    "TRANSLATIONS": "Translations",
    "PUBLISHERS": "Publishers & Sources",
    "AUDIO": "Audio"
  },
  "PUBLISHER_ADD": {
    "TITLE": "Add New Publisher",
    "NAME_EN_LABEL": "Publisher Name (English) *",
    "NAME_AR_LABEL": "Publisher Name (Arabic) *",
    "COUNTRY": "Country",
    "FOUNDATION_YEAR": "Foundation Year",
    "WEBSITE": "Website",
    "EMAIL": "Email",
    "ADDRESS": "Address",
    "ICON_URL": "Icon URL",
    "DESCRIPTION": "Description",
    "CANCEL": "Cancel",
    "SAVE": "Save Publisher",
    "SUCCESS": "Publisher added successfully",
    "ERROR": "Error occurred while adding publisher"
  },
  "PUBLISHER_BANNER": {
    "TITLE": "Publishers & Sources",
    "DESCRIPTION": "Manage entities and organizations providing Quranic content"
  },
  "PUBLISHER_STATS": {
    "TOTAL_PUBLISHERS": "Total Publishers",
    "ACTIVE_PUBLISHERS": "Active Publishers",
    "TOTAL_COUNTRIES": "Total Countries"
  }
};

ar.ADMIN = adminAr;
en.ADMIN = adminEn;

fs.writeFileSync(arPath, JSON.stringify(ar, null, 2) + '\n');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
console.log('JSON files updated.');
