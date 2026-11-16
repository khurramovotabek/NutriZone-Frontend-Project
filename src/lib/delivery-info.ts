/**
 * Text of the public `/delivery` page in uz/ru/en. Prices and times are NOT written here: they come live from
 * Dashboard → Buyurtmalar → «Yetkazib berish narxlari» (GET /api/v1/orders/delivery-options), so the page always
 * matches what checkout charges. `{tashkent}`, `{regions}`, `{tashkentEta}`, `{regionsEta}` are filled in by the page.
 */
export interface DeliveryInfoText {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  lead: string;
  zones: {
    tashkent: { title: string; price: string; priceNote: string };
    regions: { title: string; price: string; priceNote: string };
    pickup: { title: string; price: string; eta: string; priceNote: string; link: string };
  };
  etaLabel: string;
  carrierLabel: string;
  freeFrom: string;
  stepsTitle: string;
  steps: { title: string; text: string }[];
  workingDays: string;
  paymentTitle: string;
  paymentLead: string;
  paymentCash: string;
  faqTitle: string;
  faq: { q: string; a: string }[];
  ctaTitle: string;
  ctaText: string;
  ctaCatalog: string;
  ctaOrders: string;
}

const uz: DeliveryInfoText = {
  metaTitle: "Yetkazib berish va to'lov",
  metaDescription: "Toshkent shahri bo'ylab 1 ish kuni, viloyatlarga 2 ish kuni ichida yetkazamiz. Narxlar, muddatlar, to'lov usullari va olib ketish shartlari.",
  eyebrow: "Yetkazib berish",
  title: "Buyurtmangiz tez va xavfsiz yetib boradi",
  lead: "Butun O'zbekiston bo'ylab yetkazamiz. Narx va muddat buyurtma berishdan oldin ko'rinadi — hech qanday yashirin to'lovlarsiz.",
  zones: {
    tashkent: { title: "Toshkent shahri", price: "{tashkent} gacha", priceNote: "Narx eng yaqin filialdan manzilgacha bo'lgan masofaga qarab hisoblanadi." },
    regions: { title: "Viloyatlar", price: "{regions} dan", priceNote: "BTS rasmiy tarifi: narx viloyat va posilka og'irligiga qarab aniq hisoblanadi." },
    pickup: { title: "Do'kondan olib ketish", price: "Bepul", eta: "Tayyor bo'lganda xabar beramiz", priceNote: "Buyurtmani o'zingizga qulay filialdan olib keting.", link: "Filiallar" },
  },
  etaLabel: "Muddat",
  carrierLabel: "Xizmat",
  freeFrom: "{amount} dan yuqori buyurtmalar — bepul yetkaziladi",
  stepsTitle: "Buyurtma qanday yetib keladi",
  steps: [
    { title: "Buyurtma berasiz", text: "Manzilni xaritada belgilang — yetkazish narxi va muddati darhol ko'rinadi." },
    { title: "Tasdiqlaymiz", text: "Buyurtma tasdiqlanishi bilan Telegram va saytdagi bildirishnomalar orqali xabar olasiz." },
    { title: "Yig'amiz va qadoqlaymiz", text: "Har bir mahsulot tekshiriladi va ehtiyotkorlik bilan qadoqlanadi." },
    { title: "Yetkazib beramiz", text: "Buyurtma yo'lga chiqqanda xabar beramiz. Holatini «Mening buyurtmalarim» bo'limida kuzatasiz." },
  ],
  workingDays: "Muddat buyurtma tasdiqlangan paytdan boshlab ish kunlarida hisoblanadi — dam olish va bayram kunlari kirmaydi.",
  paymentTitle: "To'lov usullari",
  paymentLead: "Naqd yoki onlayn karta bilan to'lashingiz mumkin.",
  paymentCash: "Naqd",
  faqTitle: "Ko'p beriladigan savollar",
  faq: [
    { q: "«Ish kuni» nima degani?", a: "Muddat buyurtma tasdiqlangan kundan boshlab hisoblanadi, dam olish va bayram kunlari kirmaydi. Masalan, Toshkentda juma kuni tasdiqlangan buyurtma keyingi ish kunida yetkaziladi." },
    { q: "Yetkazish narxini qanday bilaman?", a: "Savatda va rasmiylashtirishda manzilni tanlashingiz bilan aniq narx ko'rsatiladi. Buyurtmadagi narx keyin o'zgarmaydi." },
    { q: "Buyurtmamni qanday kuzataman?", a: "Har bir holat o'zgarishi haqida Telegram botimiz va saytdagi bildirishnomalar orqali xabar beramiz. To'liq ma'lumot «Mening buyurtmalarim» bo'limida." },
    { q: "Buyurtmani o'zim olib keta olamanmi?", a: "Ha, rasmiylashtirishda «Olib ketish»ni tanlang — bu bepul. Buyurtma filialda tayyor bo'lgach sizga xabar beramiz." },
  ],
  ctaTitle: "Kerakli mahsulotni tanlang — qolganini biz hal qilamiz",
  ctaText: "Savollaringiz bo'lsa, sayt chatiga yoki Telegram botimizga yozing.",
  ctaCatalog: "Katalogga o'tish",
  ctaOrders: "Mening buyurtmalarim",
};

const ru: DeliveryInfoText = {
  metaTitle: "Доставка и оплата",
  metaDescription: "Доставляем по Ташкенту за 1 рабочий день, в регионы — за 2 рабочих дня. Цены, сроки, способы оплаты и самовывоз.",
  eyebrow: "Доставка",
  title: "Ваш заказ приедет быстро и в целости",
  lead: "Доставляем по всему Узбекистану. Стоимость и срок видны ещё до оформления заказа — без скрытых платежей.",
  zones: {
    tashkent: { title: "Ташкент", price: "до {tashkent}", priceNote: "Стоимость зависит от расстояния от ближайшего филиала до адреса." },
    regions: { title: "Регионы", price: "от {regions}", priceNote: "Официальный тариф BTS: цена точно считается по региону и весу посылки." },
    pickup: { title: "Самовывоз из магазина", price: "Бесплатно", eta: "Сообщим, когда будет готов", priceNote: "Заберите заказ в удобном для вас филиале.", link: "Филиалы" },
  },
  etaLabel: "Срок",
  carrierLabel: "Служба",
  freeFrom: "Заказы от {amount} — доставка бесплатно",
  stepsTitle: "Как заказ доходит до вас",
  steps: [
    { title: "Вы оформляете заказ", text: "Отметьте адрес на карте — стоимость и срок доставки видны сразу." },
    { title: "Мы подтверждаем", text: "Как только заказ подтверждён, вы получите сообщение в Telegram и уведомление на сайте." },
    { title: "Собираем и упаковываем", text: "Каждый товар проверяется и бережно упаковывается." },
    { title: "Доставляем", text: "Сообщим, когда заказ отправится в путь. Статус — в разделе «Мои заказы»." },
  ],
  workingDays: "Срок считается в рабочих днях с момента подтверждения заказа — выходные и праздники не входят.",
  paymentTitle: "Способы оплаты",
  paymentLead: "Наличными или картой онлайн.",
  paymentCash: "Наличные",
  faqTitle: "Частые вопросы",
  faq: [
    { q: "Что значит «рабочий день»?", a: "Срок отсчитывается со дня подтверждения заказа, выходные и праздники не учитываются. Например, заказ по Ташкенту, подтверждённый в пятницу, доставим в следующий рабочий день." },
    { q: "Как узнать стоимость доставки?", a: "Точная стоимость появляется в корзине и при оформлении, как только вы выберете адрес. Цена в заказе потом не меняется." },
    { q: "Как отслеживать заказ?", a: "О каждом изменении статуса сообщаем в нашем Telegram-боте и в уведомлениях на сайте. Подробности — в разделе «Мои заказы»." },
    { q: "Можно забрать заказ самому?", a: "Да, выберите «Самовывоз» при оформлении — это бесплатно. Сообщим, когда заказ будет готов в филиале." },
  ],
  ctaTitle: "Выберите нужное — остальное мы возьмём на себя",
  ctaText: "Есть вопросы? Напишите в чат на сайте или нашему Telegram-боту.",
  ctaCatalog: "Перейти в каталог",
  ctaOrders: "Мои заказы",
};

const en: DeliveryInfoText = {
  metaTitle: "Delivery and payment",
  metaDescription: "Delivery within Tashkent in 1 working day, to the regions in 2 working days. Prices, times, payment methods and store pickup.",
  eyebrow: "Delivery",
  title: "Your order arrives fast and safe",
  lead: "We deliver across Uzbekistan. You see the price and the delivery time before you place the order — no hidden fees.",
  zones: {
    tashkent: { title: "Tashkent city", price: "up to {tashkent}", priceNote: "The price depends on the distance from the nearest branch to your address." },
    regions: { title: "Regions", price: "from {regions}", priceNote: "Official BTS tariff: the price is worked out from your region and the parcel weight." },
    pickup: { title: "Store pickup", price: "Free", eta: "We'll tell you when it's ready", priceNote: "Pick the order up at the branch that suits you.", link: "Branches" },
  },
  etaLabel: "Time",
  carrierLabel: "Carrier",
  freeFrom: "Orders over {amount} ship for free",
  stepsTitle: "How your order gets to you",
  steps: [
    { title: "You place the order", text: "Pin your address on the map — the delivery price and time show up right away." },
    { title: "We confirm it", text: "As soon as the order is confirmed you get a Telegram message and a site notification." },
    { title: "We pick and pack", text: "Every item is checked and carefully packed." },
    { title: "We deliver", text: "We'll tell you when the order is on its way. Follow it under «My orders»." },
  ],
  workingDays: "Times are counted in working days from the moment the order is confirmed — weekends and public holidays are not included.",
  paymentTitle: "Payment methods",
  paymentLead: "Pay in cash or by card online.",
  paymentCash: "Cash",
  faqTitle: "Frequently asked questions",
  faq: [
    { q: "What does «working day» mean?", a: "The time is counted from the day the order is confirmed; weekends and holidays don't count. For example, a Tashkent order confirmed on Friday arrives on the next working day." },
    { q: "How do I know the delivery price?", a: "The exact price appears in the cart and at checkout as soon as you choose an address. It never changes after the order is placed." },
    { q: "How do I track my order?", a: "We announce every status change in our Telegram bot and in site notifications. Full details are under «My orders»." },
    { q: "Can I pick the order up myself?", a: "Yes — choose «Pickup» at checkout, it's free. We'll let you know once the order is ready at the branch." },
  ],
  ctaTitle: "Choose what you need — we'll handle the rest",
  ctaText: "Questions? Write to the site chat or our Telegram bot.",
  ctaCatalog: "Browse the catalog",
  ctaOrders: "My orders",
};

export function deliveryInfo(locale: string): DeliveryInfoText {
  return locale === "ru" ? ru : locale === "en" ? en : uz;
}
