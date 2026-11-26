/** Texts of `/app` -- "install NutriZone on your phone or computer" (Android, iPhone, desktop), uz / ru / en. */

export interface AppPageInfo {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  lead: string;
  cta: string;
  installed: string;
  chips: string[];
  platformsTitle: string;
  platforms: { key: "android" | "ios" | "desktop"; title: string; browsers: string; steps: string[]; note: string }[];
  perksTitle: string;
  perks: { title: string; text: string }[];
  previewTitle: string;
  faqTitle: string;
  faq: { q: string; a: string }[];
  shopCta: string;
}

const uz: AppPageInfo = {
  metaTitle: "NutriZone ilovasi — telefonga va kompyuterga o'rnatish (Android, iPhone)",
  metaDescription:
    "NutriZone ilovasini Play Market va App Store'siz, to'g'ridan-to'g'ri saytdan o'rnating: Android, iPhone va kompyuter uchun 3 qadamli yo'riqnoma. Bepul, 1 MB dan kam, o'zi yangilanadi.",
  eyebrow: "NutriZone ilovasi",
  title: "Sport ozuqalari do'koni — telefoningiz ekranida",
  lead: "Play Market yoki App Store kerak emas: ilova to'g'ridan-to'g'ri nutrizone.uz dan 10 soniyada o'rnatiladi. Savat, buyurtmalar, coinlar va xabarlar — bir bosishda.",
  cta: "Ilovani o'rnatish",
  installed: "Ilova o'rnatilgan",
  chips: ["Bepul", "1 MB dan kam", "O'zi yangilanadi", "Android · iPhone · Kompyuter"],
  platformsTitle: "Qurilmangizni tanlang",
  platforms: [
    {
      key: "android",
      title: "Android",
      browsers: "Chrome, Samsung Internet, Yandex",
      steps: ["nutrizone.uz ni brauzerda oching", "Pastda chiqadigan «Ilovani o'rnatish» tugmasini bosing (yoki menyu ⋮ → «Ilovani o'rnatish»)", "«O'rnatish»ni tasdiqlang — belgi ekranda paydo bo'ladi"],
      note: "Instagram yoki Telegram ichidan ochgan bo'lsangiz — avval «Brauzerda ochish»ni tanlang.",
    },
    {
      key: "ios",
      title: "iPhone va iPad",
      browsers: "Safari",
      steps: ["nutrizone.uz ni Safari'da oching", "Pastdagi «Ulashish» belgisini bosing (kvadrat va yuqoriga strelka)", "«Ekranga qo'shish» → «Qo'shish»"],
      note: "iPhone'da o'rnatish faqat Safari orqali ishlaydi.",
    },
    {
      key: "desktop",
      title: "Kompyuter",
      browsers: "Chrome, Edge, Yandex · Safari (macOS)",
      steps: ["nutrizone.uz ni brauzerda oching", "Manzil qatoridagi o'rnatish belgisini yoki saytdagi «Kompyuterga o'rnatish» tugmasini bosing", "«O'rnatish» — ilova alohida oynada ochiladi va vazifalar paneliga qo'shiladi"],
      note: "Firefox ilova o'rnatmaydi — Chrome yoki Edge'dan foydalaning.",
    },
  ],
  perksTitle: "Nega ilova qulayroq",
  perks: [
    { title: "Bir bosishda ochiladi", text: "Belgi telefon ekranida — saytni qidirish va manzil yozish shart emas." },
    { title: "To'liq ekran", text: "Brauzer panellarisiz, haqiqiy ilova kabi tez va toza." },
    { title: "Xotira egallamaydi", text: "1 MB dan kam — Play Market'dagi ilovalardan o'nlab marta yengil." },
    { title: "Doim yangi", text: "Yangilanishlar o'zi keladi, hech narsa yuklab olish kerak emas." },
    { title: "Internet uzilsa ham", text: "Ochilgan sahifalar saqlanadi, aloqa tiklanganda o'zi yangilanadi." },
    { title: "Xaritalar bilan", text: "Do'kon manzili Yandex Maps yoki 2GIS ilovasida darhol ochiladi." },
  ],
  previewTitle: "Ilova shunday ko'rinadi",
  faqTitle: "Ko'p beriladigan savollar",
  faq: [
    { q: "NutriZone ilovasi Play Market yoki App Store'da bormi?", a: "Kerak emas — ilova to'g'ridan-to'g'ri saytdan o'rnatiladi (PWA texnologiyasi). Bu xavfsiz: Google Chrome va Apple Safari'ning o'zi o'rnatadi." },
    { q: "Ilova pullikmi?", a: "Yo'q, butunlay bepul. Hech qanday obuna yoki to'lov yo'q." },
    { q: "Telefon xotirasidan qancha joy oladi?", a: "1 MB dan kam. Rasmlar va sahifalar keshda saqlanadi, telefon xotirasi to'lsa brauzer ularni o'zi tozalaydi." },
    { q: "Ilovani qanday o'chiraman?", a: "Oddiy ilova kabi: belgini bosib turing → «O'chirish». Kompyuterda — ilova oynasidagi menyu → «O'chirish»." },
    { q: "Hisobim, savat va coinlarim saqlanadimi?", a: "Ha. Ilova va sayt bitta hisob bilan ishlaydi — buyurtmalar, savat, sevimlilar va coinlar bir xil." },
  ],
  shopCta: "Katalogga o'tish",
};

const ru: AppPageInfo = {
  metaTitle: "Приложение NutriZone — установить на телефон и компьютер (Android, iPhone)",
  metaDescription:
    "Установите приложение NutriZone без Play Market и App Store — прямо с сайта: инструкция в 3 шага для Android, iPhone и компьютера. Бесплатно, меньше 1 МБ, обновляется само.",
  eyebrow: "Приложение NutriZone",
  title: "Магазин спортпита — на экране вашего телефона",
  lead: "Play Market и App Store не нужны: приложение ставится прямо с nutrizone.uz за 10 секунд. Корзина, заказы, коины и уведомления — в одно касание.",
  cta: "Установить приложение",
  installed: "Приложение установлено",
  chips: ["Бесплатно", "Меньше 1 МБ", "Обновляется само", "Android · iPhone · Компьютер"],
  platformsTitle: "Выберите устройство",
  platforms: [
    {
      key: "android",
      title: "Android",
      browsers: "Chrome, Samsung Internet, Яндекс",
      steps: ["Откройте nutrizone.uz в браузере", "Нажмите кнопку «Установить приложение» внизу (или меню ⋮ → «Установить приложение»)", "Подтвердите «Установить» — значок появится на экране"],
      note: "Если открыли из Instagram или Telegram — сначала выберите «Открыть в браузере».",
    },
    {
      key: "ios",
      title: "iPhone и iPad",
      browsers: "Safari",
      steps: ["Откройте nutrizone.uz в Safari", "Нажмите «Поделиться» внизу (квадрат со стрелкой вверх)", "«На экран «Домой»» → «Добавить»"],
      note: "На iPhone установка работает только через Safari.",
    },
    {
      key: "desktop",
      title: "Компьютер",
      browsers: "Chrome, Edge, Яндекс · Safari (macOS)",
      steps: ["Откройте nutrizone.uz в браузере", "Нажмите значок установки в адресной строке или кнопку «Установить на компьютер» на сайте", "«Установить» — приложение откроется в отдельном окне и появится на панели задач"],
      note: "Firefox не устанавливает приложения — используйте Chrome или Edge.",
    },
  ],
  perksTitle: "Почему приложение удобнее",
  perks: [
    { title: "Открывается в одно касание", text: "Значок на экране телефона — не нужно искать сайт и вводить адрес." },
    { title: "Во весь экран", text: "Без панелей браузера — быстро и чисто, как настоящее приложение." },
    { title: "Не занимает память", text: "Меньше 1 МБ — в десятки раз легче приложений из Play Market." },
    { title: "Всегда свежее", text: "Обновления приходят сами, ничего скачивать не нужно." },
    { title: "Даже без интернета", text: "Открытые страницы сохраняются и обновятся, когда связь вернётся." },
    { title: "С картами", text: "Адрес магазина сразу открывается в Яндекс Картах или 2GIS." },
  ],
  previewTitle: "Так выглядит приложение",
  faqTitle: "Частые вопросы",
  faq: [
    { q: "Есть ли приложение NutriZone в Play Market или App Store?", a: "Не нужно — приложение ставится прямо с сайта (технология PWA). Это безопасно: устанавливают его сами Google Chrome и Apple Safari." },
    { q: "Приложение платное?", a: "Нет, полностью бесплатное. Никаких подписок и платежей." },
    { q: "Сколько места занимает?", a: "Меньше 1 МБ. Картинки и страницы хранятся в кэше, при нехватке памяти браузер очищает их сам." },
    { q: "Как удалить приложение?", a: "Как обычное: удерживайте значок → «Удалить». На компьютере — меню в окне приложения → «Удалить»." },
    { q: "Сохранятся ли аккаунт, корзина и коины?", a: "Да. Приложение и сайт работают с одним аккаунтом — заказы, корзина, избранное и коины общие." },
  ],
  shopCta: "Перейти в каталог",
};

const en: AppPageInfo = {
  metaTitle: "NutriZone app — install on your phone and computer (Android, iPhone)",
  metaDescription:
    "Install the NutriZone app straight from the website — no Play Store or App Store: a 3-step guide for Android, iPhone and computer. Free, under 1 MB, updates itself.",
  eyebrow: "The NutriZone app",
  title: "Your sports nutrition store — on your home screen",
  lead: "No Play Store or App Store needed: the app installs straight from nutrizone.uz in 10 seconds. Cart, orders, coins and notifications — one tap away.",
  cta: "Install the app",
  installed: "App installed",
  chips: ["Free", "Under 1 MB", "Updates itself", "Android · iPhone · Computer"],
  platformsTitle: "Choose your device",
  platforms: [
    {
      key: "android",
      title: "Android",
      browsers: "Chrome, Samsung Internet, Yandex",
      steps: ["Open nutrizone.uz in your browser", "Tap the “Install the app” button at the bottom (or menu ⋮ → “Install app”)", "Confirm “Install” — the icon appears on your home screen"],
      note: "Opened it from Instagram or Telegram? Choose “Open in browser” first.",
    },
    {
      key: "ios",
      title: "iPhone and iPad",
      browsers: "Safari",
      steps: ["Open nutrizone.uz in Safari", "Tap Share at the bottom (the square with an up arrow)", "“Add to Home Screen” → “Add”"],
      note: "On iPhone, installing only works from Safari.",
    },
    {
      key: "desktop",
      title: "Computer",
      browsers: "Chrome, Edge, Yandex · Safari (macOS)",
      steps: ["Open nutrizone.uz in your browser", "Click the install icon in the address bar or the “Install on this computer” button on the site", "“Install” — the app opens in its own window and is added to your taskbar"],
      note: "Firefox doesn't install apps — use Chrome or Edge.",
    },
  ],
  perksTitle: "Why the app is handier",
  perks: [
    { title: "One tap to open", text: "The icon sits on your home screen — no searching or typing the address." },
    { title: "Full screen", text: "No browser bars — fast and clean, like a real app." },
    { title: "Takes no storage", text: "Under 1 MB — dozens of times lighter than store apps." },
    { title: "Always up to date", text: "Updates arrive by themselves, nothing to download." },
    { title: "Even offline", text: "Pages you opened are kept and refresh when you're back online." },
    { title: "Works with maps", text: "Store addresses open straight in Yandex Maps or 2GIS." },
  ],
  previewTitle: "What the app looks like",
  faqTitle: "Frequently asked questions",
  faq: [
    { q: "Is the NutriZone app on the Play Store or App Store?", a: "It doesn't need to be — the app installs straight from the website (PWA technology). It's safe: Google Chrome and Apple Safari install it themselves." },
    { q: "Is the app paid?", a: "No, it's completely free. No subscriptions or payments." },
    { q: "How much space does it take?", a: "Under 1 MB. Images and pages are cached, and the browser clears them itself if storage runs low." },
    { q: "How do I remove it?", a: "Like any app: press and hold the icon → “Remove”. On a computer — the menu in the app window → “Uninstall”." },
    { q: "Will my account, cart and coins be there?", a: "Yes. The app and the website share one account — orders, cart, wishlist and coins are the same." },
  ],
  shopCta: "Go to the catalogue",
};

export function appPageInfo(locale: string): AppPageInfo {
  return locale === "ru" ? ru : locale === "en" ? en : uz;
}
