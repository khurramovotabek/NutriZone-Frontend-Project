/**
 * NutriZone privacy policy -- the text behind /privacy (footer, login, contact and product-request forms link here).
 * Kept as data so the page stays a thin renderer; update EFFECTIVE_DATE whenever the substance changes.
 * Describes what the shop actually does: phone/Telegram sign-in, delivery addresses and map pins, orders and
 * receipts (fiscalised), NutriZone Coins, chat, product-request photos, card payments handled by Payme / Click /
 * Uzum (no card numbers stored), only functional cookies -- no advertising or third-party analytics trackers.
 */
import type { Locale } from "@/i18n/config";

export const EFFECTIVE_DATE = "2026-10-18";

export interface PolicySection {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: string[];
}

export interface PolicyText {
  title: string;
  lead: string;
  updated: string;
  tocTitle: string;
  contactTitle: string;
  contactText: string;
  sections: PolicySection[];
}

const uz: PolicyText = {
  title: "Maxfiylik siyosati",
  lead: "NutriZone mijozlarning ishonchini qadrlaydi. Ushbu siyosat sayt, Telegram bot va Mini App hamda filiallarimizda qanday shaxsiy ma'lumotlar yig'ilishi, ulardan qanday foydalanilishi va qanday himoya qilinishini tushuntiradi.",
  updated: "Kuchga kirgan sana",
  tocTitle: "Mundarija",
  contactTitle: "Savollaringiz bormi?",
  contactText: "Shaxsiy ma'lumotlaringiz bo'yicha har qanday so'rov yoki shikoyat uchun biz bilan bog'laning — 10 ish kuni ichida javob beramiz.",
  sections: [
    {
      id: "general",
      title: "1. Umumiy qoidalar",
      paragraphs: [
        "Ushbu Maxfiylik siyosati NutriZone sport ozuqalari do'konining nutrizone.uz sayti, Telegram boti va Mini App ilovasi, shuningdek filiallardagi kassalar orqali ko'rsatiladigan xizmatlarga taalluqli.",
        "Xizmatlarimizdan foydalanib, ro'yxatdan o'tib yoki buyurtma berib, siz ma'lumotlaringiz ushbu siyosatda ko'rsatilgan tartibda qayta ishlanishiga rozilik bildirasiz. Shaxsiy ma'lumotlar O'zbekiston Respublikasining «Shaxsga doir ma'lumotlar to'g'risida»gi Qonuni va boshqa amaldagi qonun hujjatlariga muvofiq qayta ishlanadi.",
      ],
    },
    {
      id: "data",
      title: "2. Qanday ma'lumotlarni yig'amiz",
      items: [
        "Hisob ma'lumotlari: telefon raqami, ism-familiya, Telegram identifikatori va foydalanuvchi nomi, profil rasmi, til va bildirishnoma sozlamalari.",
        "Profil (ixtiyoriy): tug'ilgan sana, bo'y, vazn va maqsad — faqat sizga mos tavsiyalar va kunlik rejani hisoblash uchun.",
        "Yetkazib berish: manzillar, xaritada belgilangan nuqta va qabul qiluvchining telefoni.",
        "Xaridlar: buyurtmalar, cheklar, qaytarishlar, to'lov usuli va holati, NutriZone Coins hisobi va darajangiz.",
        "Muloqot: qo'llab-quvvatlash chatidagi xabarlar va fayllar, sharhlar, aloqa formasi va «Mahsulotni topib berish» so'rovlari (mahsulot nomi, tavsif, havola va rasm).",
        "Texnik ma'lumotlar: IP-manzil, brauzer va qurilma turi, kirish vaqti — xavfsizlik, firibgarlikka qarshi kurash va xatolarni tuzatish uchun.",
      ],
    },
    {
      id: "purposes",
      title: "3. Ma'lumotlardan foydalanish maqsadlari",
      items: [
        "Hisobingizga kirish (Telegram orqali bir martalik kod) va uni himoya qilish.",
        "Buyurtmalarni qabul qilish, to'lov, yetkazib berish yoki filialdan olib ketishni tashkil etish.",
        "Elektron va fiskal cheklarni rasmiylashtirish, kafolat va qaytarishlarni ko'rib chiqish.",
        "Sodiqlik dasturi: coin hisoblash, daraja va sovg'alar.",
        "Buyurtma holati, to'lov eslatmalari va so'rovlaringizga javoblar haqida xabar berish.",
        "Siz roziligingiz bilan — aksiyalar va yangiliklar haqida xabarlar (sozlamalarda istalgan vaqtda o'chirish mumkin).",
        "Xizmat sifatini oshirish: qidiruv natijalari, assortiment va tavsiyalarni yaxshilash (umumlashtirilgan, shaxssiz statistika asosida).",
      ],
    },
    {
      id: "payments",
      title: "4. To'lov ma'lumotlari",
      paragraphs: [
        "Onlayn to'lovlar Payme, Click va Uzum Bank to'lov tizimlarining himoyalangan sahifalarida amalga oshiriladi. Karta raqami, amal qilish muddati va SMS-kodlar NutriZone serverlariga kelmaydi va saqlanmaydi — biz faqat tranzaksiya raqami, summa va to'lov holatini olamiz.",
      ],
    },
    {
      id: "sharing",
      title: "5. Ma'lumotlarni kimga beramiz",
      paragraphs: ["Shaxsiy ma'lumotlaringizni sotmaymiz va reklama maqsadida uchinchi shaxslarga bermaymiz. Ma'lumotlar faqat xizmat ko'rsatish uchun zarur hajmda quyidagilarga beriladi:"],
      items: [
        "Kuryer va filial xodimlariga — buyurtmani yetkazish yoki topshirish uchun (ism, telefon, manzil).",
        "To'lov tizimlariga (Payme, Click, Uzum Bank) — to'lovni amalga oshirish uchun.",
        "Telegram'ga — kirish kodi va bildirishnomalarni yuborish uchun.",
        "Fiskal ma'lumotlar operatori va soliq organlariga — qonun talab qilgan fiskal chek ma'lumotlari.",
        "Xosting va texnik xizmat ko'rsatuvchilarga — maxfiylik majburiyati asosida, faqat ko'rsatmalarimiz bo'yicha.",
        "Sun'iy intellekt asosidagi xarid yordamchisidan foydalansangiz — savolingiz matni javob tayyorlash uchun xizmat ko'rsatuvchiga uzatiladi.",
        "Davlat organlariga — faqat qonunda belgilangan hollarda va tartibda.",
      ],
    },
    {
      id: "cookies",
      title: "6. Cookie va brauzer xotirasi",
      paragraphs: [
        "Biz faqat sayt ishlashi uchun zarur cookie va brauzer xotirasidan foydalanamiz: kirish sessiyasi, tanlangan til, savat, mavzu (yorug'/qorong'i), solishtirish ro'yxati va oxirgi qidiruvlar. Reklama yoki uchinchi tomon kuzatuv cookie'lari ishlatilmaydi. Brauzer sozlamalarida cookie'larni o'chirishingiz mumkin, ammo bunda tizimga kirish va savat ishlamaydi.",
      ],
    },
    {
      id: "retention",
      title: "7. Saqlash muddati",
      paragraphs: [
        "Hisob ma'lumotlari hisobingiz faol bo'lgan davrda saqlanadi. Buyurtma, chek va to'lov yozuvlari buxgalteriya va soliq qonunchiligi talab qilgan muddat davomida saqlanadi. Texnik jurnallar va eskirgan sessiyalar muntazam o'chirib boriladi. Hisobingizni o'chirishni so'rasangiz, qonunan saqlanishi shart bo'lgan yozuvlardan tashqari ma'lumotlaringiz o'chiriladi yoki shaxssizlashtiriladi.",
      ],
    },
    {
      id: "security",
      title: "8. Ma'lumotlar xavfsizligi",
      items: [
        "Sayt va ilovalar bilan barcha aloqa HTTPS (TLS) orqali shifrlangan.",
        "To'lov tizimlari kalitlari shifrlangan holda saqlanadi; xodimlar ma'lumotlarga faqat lavozimiga zarur hajmda kiradi.",
        "Ma'lumotlar bazasining muntazam zaxira nusxalari olinadi, tizim kuzatib boriladi.",
        "Shubhali kirish urinishlari cheklanadi; hisobingiz uchun «Barcha qurilmalardan chiqish» funksiyasi mavjud.",
      ],
    },
    {
      id: "rights",
      title: "9. Sizning huquqlaringiz",
      items: [
        "Qaysi ma'lumotlaringiz qayta ishlanayotgani haqida ma'lumot olish.",
        "Noto'g'ri ma'lumotlarni tuzatish — Profil va Manzillar bo'limida o'zingiz yoki biz orqali.",
        "Ma'lumotlarni o'chirish yoki qayta ishlashni cheklashni talab qilish.",
        "Reklama xabarlariga roziligingizni istalgan vaqtda qaytarib olish — Sozlamalar → Bildirishnomalar.",
        "Huquqlaringiz buzilgan deb hisoblasangiz, vakolatli davlat organiga shikoyat qilish.",
      ],
    },
    {
      id: "children",
      title: "10. Voyaga yetmaganlar",
      paragraphs: [
        "Xizmatlarimiz 16 yoshdan katta foydalanuvchilar uchun mo'ljallangan. Sport ozuqalarini 16 yoshgacha bo'lgan shaxslar ota-onasi yoki shifokor bilan maslahatlashgan holda iste'mol qilishi tavsiya etiladi. Agar bola bizga ma'lumot bergani ma'lum bo'lsa, ular o'chiriladi.",
      ],
    },
    {
      id: "changes",
      title: "11. Siyosatdagi o'zgarishlar",
      paragraphs: [
        "Ushbu siyosat yangilanishi mumkin. Muhim o'zgarishlar haqida sayt yoki Telegram orqali xabar beramiz. Amaldagi tahrir doimo shu sahifada, kuchga kirgan sanasi bilan e'lon qilinadi.",
      ],
    },
  ],
};

const ru: PolicyText = {
  title: "Политика конфиденциальности",
  lead: "NutriZone ценит доверие клиентов. Эта политика объясняет, какие персональные данные мы собираем на сайте, в Telegram-боте и Mini App, а также в наших филиалах, как мы их используем и защищаем.",
  updated: "Дата вступления в силу",
  tocTitle: "Содержание",
  contactTitle: "Остались вопросы?",
  contactText: "По любым запросам и жалобам, связанным с персональными данными, свяжитесь с нами — ответим в течение 10 рабочих дней.",
  sections: [
    {
      id: "general",
      title: "1. Общие положения",
      paragraphs: [
        "Настоящая Политика конфиденциальности распространяется на сайт nutrizone.uz магазина спортивного питания NutriZone, его Telegram-бот и Mini App, а также на услуги, оказываемые через кассы филиалов.",
        "Пользуясь нашими сервисами, регистрируясь или оформляя заказ, вы соглашаетесь на обработку данных в порядке, описанном в этой политике. Персональные данные обрабатываются в соответствии с Законом Республики Узбекистан «О персональных данных» и иным действующим законодательством.",
      ],
    },
    {
      id: "data",
      title: "2. Какие данные мы собираем",
      items: [
        "Данные аккаунта: номер телефона, имя и фамилия, идентификатор и имя пользователя Telegram, фото профиля, язык и настройки уведомлений.",
        "Профиль (по желанию): дата рождения, рост, вес и цель — только для персональных рекомендаций и расчёта дневного плана.",
        "Доставка: адреса, точка на карте и телефон получателя.",
        "Покупки: заказы, чеки, возвраты, способ и статус оплаты, баланс NutriZone Coins и ваш уровень.",
        "Общение: сообщения и файлы в чате поддержки, отзывы, форма обратной связи и запросы «Найдите товар» (название, описание, ссылка и фото).",
        "Технические данные: IP-адрес, тип браузера и устройства, время входа — для безопасности, защиты от мошенничества и исправления ошибок.",
      ],
    },
    {
      id: "purposes",
      title: "3. Цели использования данных",
      items: [
        "Вход в аккаунт (одноразовый код через Telegram) и его защита.",
        "Приём заказов, оплата, доставка или самовывоз из филиала.",
        "Оформление электронных и фискальных чеков, рассмотрение гарантий и возвратов.",
        "Программа лояльности: начисление коинов, уровни и подарки.",
        "Уведомления о статусе заказа, напоминания об оплате и ответы на ваши запросы.",
        "С вашего согласия — сообщения об акциях и новостях (можно отключить в настройках в любой момент).",
        "Улучшение сервиса: поиска, ассортимента и рекомендаций (на основе обобщённой обезличенной статистики).",
      ],
    },
    {
      id: "payments",
      title: "4. Платёжные данные",
      paragraphs: [
        "Онлайн-оплата проходит на защищённых страницах платёжных систем Payme, Click и Uzum Bank. Номер карты, срок действия и SMS-коды не передаются на серверы NutriZone и не хранятся — мы получаем только номер транзакции, сумму и статус оплаты.",
      ],
    },
    {
      id: "sharing",
      title: "5. Кому мы передаём данные",
      paragraphs: ["Мы не продаём ваши персональные данные и не передаём их третьим лицам в рекламных целях. Данные передаются только в объёме, необходимом для оказания услуг:"],
      items: [
        "Курьерам и сотрудникам филиалов — для доставки или выдачи заказа (имя, телефон, адрес).",
        "Платёжным системам (Payme, Click, Uzum Bank) — для проведения оплаты.",
        "Telegram — для отправки кода входа и уведомлений.",
        "Оператору фискальных данных и налоговым органам — фискальные данные чека, требуемые законом.",
        "Хостинг- и техническим подрядчикам — на условиях конфиденциальности и только по нашим инструкциям.",
        "Если вы пользуетесь AI-помощником покупок — текст вашего вопроса передаётся поставщику сервиса для подготовки ответа.",
        "Государственным органам — только в случаях и порядке, установленных законом.",
      ],
    },
    {
      id: "cookies",
      title: "6. Cookie и память браузера",
      paragraphs: [
        "Мы используем только cookie и память браузера, необходимые для работы сайта: сессия входа, выбранный язык, корзина, тема (светлая/тёмная), список сравнения и последние поиски. Рекламные и сторонние отслеживающие cookie не используются. Вы можете отключить cookie в настройках браузера, но тогда вход и корзина работать не будут.",
      ],
    },
    {
      id: "retention",
      title: "7. Сроки хранения",
      paragraphs: [
        "Данные аккаунта хранятся, пока аккаунт активен. Записи о заказах, чеках и платежах хранятся в течение сроков, установленных бухгалтерским и налоговым законодательством. Технические журналы и устаревшие сессии регулярно удаляются. По запросу на удаление аккаунта ваши данные удаляются или обезличиваются, кроме записей, хранение которых обязательно по закону.",
      ],
    },
    {
      id: "security",
      title: "8. Безопасность данных",
      items: [
        "Весь обмен данными с сайтом и приложениями шифруется по HTTPS (TLS).",
        "Ключи платёжных систем хранятся в зашифрованном виде; сотрудники получают доступ к данным только в объёме, необходимом для работы.",
        "Регулярно создаются резервные копии базы данных, работа системы контролируется.",
        "Подозрительные попытки входа ограничиваются; для аккаунта доступна функция «Выйти на всех устройствах».",
      ],
    },
    {
      id: "rights",
      title: "9. Ваши права",
      items: [
        "Получать информацию о том, какие ваши данные обрабатываются.",
        "Исправлять неточные данные — самостоятельно в разделах Профиль и Адреса или через нас.",
        "Требовать удаления данных или ограничения их обработки.",
        "В любой момент отозвать согласие на рекламные сообщения — Настройки → Уведомления.",
        "Обратиться с жалобой в уполномоченный государственный орган, если считаете, что ваши права нарушены.",
      ],
    },
    {
      id: "children",
      title: "10. Несовершеннолетние",
      paragraphs: [
        "Наши сервисы предназначены для пользователей старше 16 лет. Лицам младше 16 лет рекомендуется употреблять спортивное питание только после консультации с родителями или врачом. Если станет известно, что ребёнок передал нам данные, они будут удалены.",
      ],
    },
    {
      id: "changes",
      title: "11. Изменения политики",
      paragraphs: [
        "Политика может обновляться. О существенных изменениях мы сообщим на сайте или в Telegram. Актуальная редакция всегда опубликована на этой странице с датой вступления в силу.",
      ],
    },
  ],
};

const en: PolicyText = {
  title: "Privacy Policy",
  lead: "NutriZone values its customers' trust. This policy explains what personal data we collect on our website, Telegram bot and Mini App and in our stores, how we use it and how we protect it.",
  updated: "Effective date",
  tocTitle: "Contents",
  contactTitle: "Have a question?",
  contactText: "For any request or complaint about your personal data, contact us — we reply within 10 business days.",
  sections: [
    {
      id: "general",
      title: "1. General",
      paragraphs: [
        "This Privacy Policy applies to the NutriZone sports nutrition store website nutrizone.uz, its Telegram bot and Mini App, and to services provided through our store tills.",
        "By using our services, signing up or placing an order, you agree to your data being processed as described in this policy. Personal data is processed in accordance with the Law of the Republic of Uzbekistan “On Personal Data” and other applicable legislation.",
      ],
    },
    {
      id: "data",
      title: "2. Data we collect",
      items: [
        "Account data: phone number, full name, Telegram ID and username, profile photo, language and notification settings.",
        "Profile (optional): birthday, height, weight and goal — only for personal recommendations and your daily plan.",
        "Delivery: addresses, the point you pin on the map and the recipient's phone.",
        "Purchases: orders, receipts, returns, payment method and status, your NutriZone Coins balance and tier.",
        "Communication: support chat messages and files, reviews, the contact form and “Find a product” requests (product name, description, link and photo).",
        "Technical data: IP address, browser and device type, sign-in time — for security, fraud prevention and fixing errors.",
      ],
    },
    {
      id: "purposes",
      title: "3. How we use it",
      items: [
        "Signing you in (one-time code via Telegram) and protecting your account.",
        "Accepting orders, payment, delivery or store pickup.",
        "Issuing electronic and fiscal receipts, handling warranty and returns.",
        "Loyalty programme: coins, tiers and gifts.",
        "Notifying you about order status, payment reminders and answers to your requests.",
        "With your consent — news and promotions (you can turn them off in settings at any time).",
        "Improving search, assortment and recommendations (based on aggregated, anonymised statistics).",
      ],
    },
    {
      id: "payments",
      title: "4. Payment data",
      paragraphs: [
        "Online payments are made on the secure pages of Payme, Click and Uzum Bank. Card numbers, expiry dates and SMS codes never reach NutriZone servers and are not stored — we only receive the transaction ID, amount and payment status.",
      ],
    },
    {
      id: "sharing",
      title: "5. Who we share data with",
      paragraphs: ["We do not sell your personal data or share it with third parties for advertising. Data is shared only to the extent needed to provide the service:"],
      items: [
        "Couriers and store staff — to deliver or hand over your order (name, phone, address).",
        "Payment systems (Payme, Click, Uzum Bank) — to process the payment.",
        "Telegram — to send sign-in codes and notifications.",
        "The fiscal data operator and tax authorities — the receipt data required by law.",
        "Hosting and technical providers — under confidentiality and only on our instructions.",
        "If you use the AI shopping assistant — the text of your question is sent to the service provider to prepare an answer.",
        "Public authorities — only where and as required by law.",
      ],
    },
    {
      id: "cookies",
      title: "6. Cookies and browser storage",
      paragraphs: [
        "We only use cookies and browser storage that the site needs to work: your sign-in session, language, cart, theme (light/dark), compare list and recent searches. No advertising or third-party tracking cookies are used. You can disable cookies in your browser, but sign-in and the cart will then stop working.",
      ],
    },
    {
      id: "retention",
      title: "7. Retention",
      paragraphs: [
        "Account data is kept while your account is active. Order, receipt and payment records are kept for the periods required by accounting and tax law. Technical logs and expired sessions are deleted regularly. If you ask us to delete your account, your data is deleted or anonymised, except records we are legally required to keep.",
      ],
    },
    {
      id: "security",
      title: "8. Security",
      items: [
        "All traffic with our website and apps is encrypted with HTTPS (TLS).",
        "Payment system keys are stored encrypted; staff access data only as far as their role requires.",
        "The database is backed up regularly and the system is monitored.",
        "Suspicious sign-in attempts are rate-limited; you can “Sign out of all devices” from your account.",
      ],
    },
    {
      id: "rights",
      title: "9. Your rights",
      items: [
        "To know which of your data is being processed.",
        "To correct inaccurate data — yourself in Profile and Addresses, or through us.",
        "To request deletion of your data or restriction of its processing.",
        "To withdraw consent to marketing messages at any time — Settings → Notifications.",
        "To complain to the competent public authority if you believe your rights have been violated.",
      ],
    },
    {
      id: "children",
      title: "10. Minors",
      paragraphs: [
        "Our services are intended for users over 16. People under 16 should use sports nutrition only after consulting a parent or doctor. If we learn that a child has given us personal data, it will be deleted.",
      ],
    },
    {
      id: "changes",
      title: "11. Changes to this policy",
      paragraphs: [
        "We may update this policy. We will announce significant changes on the website or in Telegram. The current version is always published on this page with its effective date.",
      ],
    },
  ],
};

const TEXTS: Record<Locale, PolicyText> = { uz, ru, en };

export function privacyPolicy(locale: string): PolicyText {
  return TEXTS[(locale as Locale) in TEXTS ? (locale as Locale) : "uz"];
}
