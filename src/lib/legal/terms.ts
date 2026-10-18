/**
 * NutriZone public offer (terms of sale) -- the text behind /terms. Payment providers (Payme, Click, Uzum) ask for a
 * public offer with the seller's requisites before going live; the requisites themselves come from Dashboard →
 * Chek sozlamalari (GET /api/v1/settings/public → requisites), so this file holds only the wording.
 * The rules here mirror the code: 14-day return window (ordering/after_sales.RETURN_WINDOW_DAYS), instant cancel
 * while pending payment / confirmed, cancel by request while processing / shipped, unpaid online orders auto-cancel
 * (payment automation). Update EFFECTIVE_DATE whenever the substance changes.
 */
import type { Locale } from "@/i18n/config";
import type { PolicySection } from "@/lib/legal/privacy";

export const TERMS_EFFECTIVE_DATE = "2026-10-18";

export interface TermsText {
  title: string;
  lead: string;
  updated: string;
  tocTitle: string;
  requisitesTitle: string;
  requisitesLabels: { legalName: string; tin: string; address: string; phone: string; email: string; site: string };
  requisitesPending: string;
  sections: PolicySection[];
}

const uz: TermsText = {
  title: "Ommaviy oferta",
  lead: "Ushbu hujjat NutriZone internet-do'koni, Telegram boti va filiallari orqali sport ozuqalari va tegishli mahsulotlarni sotish shartlarini belgilaydi. Buyurtma berish orqali siz quyidagi shartlarni to'liq qabul qilasiz.",
  updated: "Kuchga kirgan sana",
  tocTitle: "Mundarija",
  requisitesTitle: "Sotuvchi rekvizitlari",
  requisitesLabels: { legalName: "Sotuvchi", tin: "STIR", address: "Yuridik manzil", phone: "Telefon", email: "Email", site: "Sayt" },
  requisitesPending: "Yuridik rekvizitlar tez orada e'lon qilinadi.",
  sections: [
    {
      id: "general",
      title: "1. Umumiy qoidalar",
      paragraphs: [
        "Ushbu ommaviy oferta (keyingi o'rinlarda — «Oferta») O'zbekiston Respublikasi Fuqarolik kodeksining 367- va 369-moddalariga muvofiq Sotuvchining har qanday shaxsga (keyingi o'rinlarda — «Xaridor») mahsulotlarni quyida belgilangan shartlarda sotish haqidagi rasmiy taklifidir.",
        "Xaridor saytda, Telegram botida yoki Mini App'da buyurtmani rasmiylashtirgan yoki uni to'lagan paytdan boshlab Oferta qabul qilingan (aksept) hisoblanadi va tomonlar o'rtasida oldi-sotdi shartnomasi tuzilgan bo'ladi.",
        "Sotuvchi Ofertani bir tomonlama o'zgartirishi mumkin. Yangi tahrir shu sahifada e'lon qilingan paytdan kuchga kiradi va undan keyin berilgan buyurtmalarga tatbiq etiladi.",
      ],
    },
    {
      id: "terms",
      title: "2. Atamalar",
      items: [
        "Sotuvchi — NutriZone savdo belgisi ostida faoliyat yurituvchi, rekvizitlari ushbu sahifa oxirida ko'rsatilgan shaxs.",
        "Xaridor — mahsulotni shaxsiy, oilaviy yoki boshqa tadbirkorlik bilan bog'liq bo'lmagan ehtiyojlari uchun buyurtma qiluvchi jismoniy shaxs.",
        "Sayt — nutrizone.uz va uning Telegram boti hamda Mini App ilovasi.",
        "Buyurtma — Xaridorning tanlangan mahsulotlarni sotib olish haqidagi, Sayt orqali rasmiylashtirilgan so'rovi.",
      ],
    },
    {
      id: "order",
      title: "3. Buyurtma berish",
      items: [
        "Buyurtma berish uchun Xaridor Telegram orqali tasdiqlangan telefon raqami bilan ro'yxatdan o'tadi.",
        "Xaridor mahsulot, miqdor, yetkazib berish yoki filialdan olib ketish usulini tanlaydi va aloqa ma'lumotlarini to'g'ri ko'rsatadi.",
        "Buyurtma qabul qilingani haqida Xaridorga sayt va Telegram orqali xabar yuboriladi. Zarur hollarda operator buyurtmani telefon yoki chat orqali aniqlashtiradi.",
        "Mahsulot omborda tugab qolgan yoki narxda texnik xato aniqlangan hollarda Sotuvchi Xaridor bilan bog'lanadi; Xaridor buyurtmani o'zgartirishi yoki bekor qilishi mumkin, to'langan summa to'liq qaytariladi.",
      ],
    },
    {
      id: "prices",
      title: "4. Narxlar va to'lov",
      items: [
        "Narxlar O'zbekiston so'mida ko'rsatiladi. Buyurtma narxi uni rasmiylashtirish paytida qayd etiladi va keyinchalik o'zgarmaydi.",
        "To'lov usullari: naqd pul (kuryerga yoki filialda), shuningdek Payme, Click, Uzum Bank tizimlari va Uzcard/Humo kartalari orqali onlayn to'lov.",
        "Onlayn to'lov to'lov tizimining himoyalangan sahifasida amalga oshiriladi. Karta ma'lumotlari Sotuvchiga uzatilmaydi.",
        "Onlayn to'lov tanlangan, ammo belgilangan muddatda to'lanmagan buyurtma avtomatik ravishda bekor qilinishi mumkin; Xaridorga oldindan eslatma yuboriladi.",
        "Har bir xarid uchun elektron chek beriladi; qonunchilikda nazarda tutilgan hollarda chek fiskallashtiriladi.",
        "Aksiya, promokod va NutriZone Coins chegirmalari ularning shartlariga muvofiq qo'llanadi va bir-biri bilan birlashtirilmasligi mumkin.",
      ],
    },
    {
      id: "delivery",
      title: "5. Yetkazib berish va olib ketish",
      items: [
        "Yetkazib berish narxi va muddati buyurtmani rasmiylashtirishda yoki operator bilan kelishilgan holda belgilanadi.",
        "Filialdan olib ketishda buyurtma tayyor bo'lgani haqida xabar yuboriladi; mahsulot buyurtma raqami va telefon bo'yicha topshiriladi.",
        "Xaridor mahsulotni qabul qilayotganda qadoq butunligi, miqdori va yaroqlilik muddatini tekshirishi lozim. Ko'rinadigan nuqsonlar haqida darhol kuryer yoki filial xodimiga ma'lum qilinadi.",
        "Mahsulotga egalik huquqi va tasodifiy nobud bo'lish xavfi Xaridorga mahsulot topshirilgan paytdan o'tadi.",
      ],
    },
    {
      id: "cancel",
      title: "6. Buyurtmani bekor qilish",
      items: [
        "«To'lov kutilmoqda» va «Tasdiqlangan» holatidagi buyurtmani Xaridor shaxsiy kabinetda darhol bekor qilishi mumkin.",
        "«Qayta ishlanmoqda» yoki «Jo'natildi» holatidagi buyurtmani bekor qilish uchun so'rov yuboriladi va Sotuvchi uni ko'rib chiqadi.",
        "Bekor qilingan buyurtma uchun to'langan summa to'lov qilingan usul orqali qaytariladi.",
      ],
    },
    {
      id: "returns",
      title: "7. Qaytarish va almashtirish",
      items: [
        "Xaridor mahsulot yetkazib berilgan kundan boshlab 14 kun ichida shaxsiy kabinet yoki qo'llab-quvvatlash xizmati orqali qaytarish so'rovini yuborishi mumkin.",
        "Sifatli mahsulot qadog'i ochilmagan, plombasi va himoya plyonkasi buzilmagan, tovar ko'rinishi va yaroqlilik muddati saqlangan holda qabul qilinadi.",
        "Nuqsonli, yaroqlilik muddati o'tgan yoki buyurtmaga mos kelmaydigan mahsulot Xaridorning tanloviga ko'ra almashtiriladi yoki uning puli to'liq qaytariladi.",
        "Oziq-ovqat mahsulotlarini qaytarish O'zbekiston Respublikasining iste'molchilar huquqlarini himoya qilish to'g'risidagi qonunchiligida belgilangan cheklovlar doirasida amalga oshiriladi.",
      ],
    },
    {
      id: "refunds",
      title: "8. Pulni qaytarish",
      items: [
        "Qaytarish tasdiqlangandan so'ng pul to'lov qilingan usul orqali qaytariladi: naqd — filialda, onlayn — to'lov tizimi orqali kartaga.",
        "Kartaga qaytarish muddati bank va to'lov tizimiga bog'liq bo'lib, odatda 3–10 ish kunini tashkil etadi.",
        "Xaridda ishlatilgan NutriZone Coins hisobingizga qaytariladi; qaytarilgan mahsulot uchun berilgan coinlar hisobdan chiqariladi.",
      ],
    },
    {
      id: "loyalty",
      title: "9. NutriZone Coins sodiqlik dasturi",
      paragraphs: [
        "NutriZone Coins — keyingi xaridlarda chegirma sifatida ishlatiladigan bonus ballari. Ular pul mablag'i hisoblanmaydi, naqd pulga almashtirilmaydi va boshqa shaxsga o'tkazilmaydi. Hisoblash foizi, darajalar va ishlatish qoidalari «Sodiqlik dasturi» sahifasida e'lon qilinadi va Sotuvchi tomonidan o'zgartirilishi mumkin.",
      ],
    },
    {
      id: "products",
      title: "10. Mahsulot haqida ma'lumot",
      items: [
        "Sport ozuqalari va biologik faol qo'shimchalar dori vositasi emas. Iste'mol qilishdan oldin qadoqdagi tavsiyalar bilan tanishing; surunkali kasalliklar, homiladorlik yoki 16 yoshgacha bo'lgan hollarda shifokor bilan maslahatlashing.",
        "Saytdagi rasmlar mahsulotni tanishtirish uchun berilgan; qadoq dizayni ishlab chiqaruvchi tomonidan o'zgartirilishi mumkin. Tarkib va yaroqlilik muddati qadoqdagi ma'lumot bo'yicha belgilanadi.",
        "Sotuvchi faqat original mahsulotlarni rasmiy yetkazib beruvchilardan sotadi.",
      ],
    },
    {
      id: "liability",
      title: "11. Javobgarlik",
      items: [
        "Tomonlar majburiyatlarni bajarmaganlik uchun O'zbekiston Respublikasi qonunchiligiga muvofiq javob beradi.",
        "Sotuvchi Xaridor noto'g'ri ko'rsatgan ma'lumotlar (manzil, telefon) tufayli yuzaga kelgan kechikishlar uchun javob bermaydi.",
        "Fors-major holatlarida (tabiiy ofatlar, davlat organlarining qarorlari, aloqa uzilishlari va h.k.) tomonlar majburiyatlarni bajarish muddati shu holatlar davomiga uzaytiriladi.",
      ],
    },
    {
      id: "disputes",
      title: "12. Nizolarni hal qilish",
      paragraphs: [
        "Nizolar avvalo muzokaralar yo'li bilan hal qilinadi — qo'llab-quvvatlash xizmatiga yozing, murojaatga 10 ish kuni ichida javob beriladi. Kelishuvga erishilmagan taqdirda nizo O'zbekiston Respublikasi qonunchiligiga muvofiq sudda ko'rib chiqiladi.",
        "Shaxsiy ma'lumotlarni qayta ishlash tartibi Maxfiylik siyosatida belgilangan.",
      ],
    },
  ],
};

const ru: TermsText = {
  title: "Публичная оферта",
  lead: "Этот документ определяет условия продажи спортивного питания и сопутствующих товаров через интернет-магазин NutriZone, его Telegram-бот и филиалы. Оформляя заказ, вы полностью принимаете эти условия.",
  updated: "Дата вступления в силу",
  tocTitle: "Содержание",
  requisitesTitle: "Реквизиты продавца",
  requisitesLabels: { legalName: "Продавец", tin: "ИНН", address: "Юридический адрес", phone: "Телефон", email: "Email", site: "Сайт" },
  requisitesPending: "Юридические реквизиты будут опубликованы в ближайшее время.",
  sections: [
    {
      id: "general",
      title: "1. Общие положения",
      paragraphs: [
        "Настоящая публичная оферта (далее — «Оферта») в соответствии со статьями 367 и 369 Гражданского кодекса Республики Узбекистан является официальным предложением Продавца любому лицу (далее — «Покупатель») купить товары на изложенных ниже условиях.",
        "Оферта считается принятой (акцепт), а договор купли-продажи — заключённым с момента оформления Покупателем заказа на сайте, в Telegram-боте или Mini App либо его оплаты.",
        "Продавец вправе изменять Оферту в одностороннем порядке. Новая редакция вступает в силу с момента публикации на этой странице и применяется к заказам, оформленным после этого.",
      ],
    },
    {
      id: "terms",
      title: "2. Термины",
      items: [
        "Продавец — лицо, работающее под торговой маркой NutriZone, реквизиты которого указаны в конце этой страницы.",
        "Покупатель — физическое лицо, заказывающее товар для личных, семейных и иных нужд, не связанных с предпринимательской деятельностью.",
        "Сайт — nutrizone.uz, а также его Telegram-бот и Mini App.",
        "Заказ — оформленный через Сайт запрос Покупателя на покупку выбранных товаров.",
      ],
    },
    {
      id: "order",
      title: "3. Оформление заказа",
      items: [
        "Для заказа Покупатель регистрируется с номером телефона, подтверждённым через Telegram.",
        "Покупатель выбирает товары, количество, доставку или самовывоз из филиала и указывает верные контактные данные.",
        "О принятии заказа Покупатель получает уведомление на сайте и в Telegram. При необходимости оператор уточняет заказ по телефону или в чате.",
        "Если товар закончился или в цене обнаружена техническая ошибка, Продавец связывается с Покупателем; Покупатель может изменить или отменить заказ, оплаченная сумма возвращается полностью.",
      ],
    },
    {
      id: "prices",
      title: "4. Цены и оплата",
      items: [
        "Цены указаны в узбекских сумах. Цена заказа фиксируется в момент оформления и далее не меняется.",
        "Способы оплаты: наличными (курьеру или в филиале), а также онлайн через Payme, Click, Uzum Bank и картами Uzcard/Humo.",
        "Онлайн-оплата проходит на защищённой странице платёжной системы. Данные карты Продавцу не передаются.",
        "Заказ с выбранной онлайн-оплатой, не оплаченный в установленный срок, может быть автоматически отменён; Покупатель заранее получает напоминание.",
        "На каждую покупку выдаётся электронный чек; в предусмотренных законом случаях чек фискализируется.",
        "Скидки по акциям, промокодам и NutriZone Coins применяются по их условиям и могут не суммироваться.",
      ],
    },
    {
      id: "delivery",
      title: "5. Доставка и самовывоз",
      items: [
        "Стоимость и срок доставки определяются при оформлении заказа или по согласованию с оператором.",
        "При самовывозе из филиала приходит уведомление о готовности заказа; товар выдаётся по номеру заказа и телефону.",
        "При получении Покупатель проверяет целостность упаковки, количество и срок годности. О видимых дефектах сразу сообщается курьеру или сотруднику филиала.",
        "Право собственности и риск случайной гибели товара переходят к Покупателю в момент передачи товара.",
      ],
    },
    {
      id: "cancel",
      title: "6. Отмена заказа",
      items: [
        "Заказ в статусе «Ожидает оплаты» или «Подтверждён» Покупатель может сразу отменить в личном кабинете.",
        "Для отмены заказа в статусе «В обработке» или «Отправлен» отправляется запрос, который рассматривает Продавец.",
        "Оплаченная сумма за отменённый заказ возвращается тем же способом, которым была произведена оплата.",
      ],
    },
    {
      id: "returns",
      title: "7. Возврат и обмен",
      items: [
        "Покупатель может отправить запрос на возврат через личный кабинет или службу поддержки в течение 14 дней со дня доставки.",
        "Товар надлежащего качества принимается, если упаковка не вскрыта, пломба и защитная плёнка не нарушены, сохранены товарный вид и срок годности.",
        "Товар с недостатками, с истёкшим сроком годности или не соответствующий заказу по выбору Покупателя заменяется либо его стоимость возвращается полностью.",
        "Возврат пищевых продуктов производится с учётом ограничений, установленных законодательством Республики Узбекистан о защите прав потребителей.",
      ],
    },
    {
      id: "refunds",
      title: "8. Возврат денег",
      items: [
        "После одобрения возврата деньги возвращаются тем же способом оплаты: наличные — в филиале, онлайн — на карту через платёжную систему.",
        "Срок зачисления на карту зависит от банка и платёжной системы и обычно составляет 3–10 рабочих дней.",
        "Использованные в покупке NutriZone Coins возвращаются на счёт; начисленные за возвращённый товар коины списываются.",
      ],
    },
    {
      id: "loyalty",
      title: "9. Программа лояльности NutriZone Coins",
      paragraphs: [
        "NutriZone Coins — бонусные баллы, которые используются как скидка при следующих покупках. Они не являются денежными средствами, не обмениваются на наличные и не передаются другим лицам. Процент начисления, уровни и правила использования публикуются на странице программы лояльности и могут изменяться Продавцом.",
      ],
    },
    {
      id: "products",
      title: "10. Информация о товарах",
      items: [
        "Спортивное питание и БАД не являются лекарственными средствами. Перед употреблением ознакомьтесь с рекомендациями на упаковке; при хронических заболеваниях, беременности или в возрасте до 16 лет проконсультируйтесь с врачом.",
        "Изображения на сайте носят ознакомительный характер; дизайн упаковки может быть изменён производителем. Состав и срок годности определяются по данным на упаковке.",
        "Продавец продаёт только оригинальную продукцию от официальных поставщиков.",
      ],
    },
    {
      id: "liability",
      title: "11. Ответственность",
      items: [
        "Стороны несут ответственность за неисполнение обязательств в соответствии с законодательством Республики Узбекистан.",
        "Продавец не отвечает за задержки, вызванные неверно указанными Покупателем данными (адрес, телефон).",
        "При форс-мажоре (стихийные бедствия, решения государственных органов, сбои связи и т. п.) срок исполнения обязательств продлевается на время действия таких обстоятельств.",
      ],
    },
    {
      id: "disputes",
      title: "12. Разрешение споров",
      paragraphs: [
        "Споры решаются прежде всего путём переговоров — напишите в службу поддержки, ответ на обращение даётся в течение 10 рабочих дней. При недостижении согласия спор рассматривается в суде в соответствии с законодательством Республики Узбекистан.",
        "Порядок обработки персональных данных установлен Политикой конфиденциальности.",
      ],
    },
  ],
};

const en: TermsText = {
  title: "Public Offer (Terms of Sale)",
  lead: "This document sets out the terms on which sports nutrition and related products are sold through the NutriZone online store, its Telegram bot and stores. By placing an order you fully accept these terms.",
  updated: "Effective date",
  tocTitle: "Contents",
  requisitesTitle: "Seller details",
  requisitesLabels: { legalName: "Seller", tin: "TIN", address: "Legal address", phone: "Phone", email: "Email", site: "Website" },
  requisitesPending: "The seller's legal details will be published shortly.",
  sections: [
    {
      id: "general",
      title: "1. General",
      paragraphs: [
        "This public offer (the “Offer”) is, under Articles 367 and 369 of the Civil Code of the Republic of Uzbekistan, the Seller's official proposal to any person (the “Buyer”) to buy products on the terms below.",
        "The Offer is accepted, and a sale contract is concluded, when the Buyer places an order on the website, in the Telegram bot or Mini App, or pays for it.",
        "The Seller may change the Offer unilaterally. A new version takes effect when published on this page and applies to orders placed afterwards.",
      ],
    },
    {
      id: "terms",
      title: "2. Definitions",
      items: [
        "Seller — the person trading under the NutriZone brand, whose details are given at the end of this page.",
        "Buyer — an individual ordering products for personal, family or other non-business needs.",
        "Website — nutrizone.uz together with its Telegram bot and Mini App.",
        "Order — the Buyer's request, placed through the Website, to buy the selected products.",
      ],
    },
    {
      id: "order",
      title: "3. Placing an order",
      items: [
        "To order, the Buyer signs up with a phone number confirmed through Telegram.",
        "The Buyer chooses products, quantities, delivery or store pickup, and gives correct contact details.",
        "The Buyer is notified on the website and in Telegram when the order is accepted. If needed, an operator confirms details by phone or chat.",
        "If a product is out of stock or a price contains a technical error, the Seller contacts the Buyer; the Buyer may change or cancel the order and any amount paid is refunded in full.",
      ],
    },
    {
      id: "prices",
      title: "4. Prices and payment",
      items: [
        "Prices are in Uzbek so'm. The order price is fixed when the order is placed and does not change afterwards.",
        "Payment methods: cash (to the courier or in store) and online via Payme, Click, Uzum Bank and Uzcard/Humo cards.",
        "Online payment takes place on the payment system's secure page. Card details are never passed to the Seller.",
        "An order with online payment that is not paid within the set time may be cancelled automatically; the Buyer receives a reminder first.",
        "An electronic receipt is issued for every purchase; receipts are fiscalised where the law requires.",
        "Promotion, promo-code and NutriZone Coins discounts apply on their own terms and may not be combined.",
      ],
    },
    {
      id: "delivery",
      title: "5. Delivery and pickup",
      items: [
        "Delivery cost and time are set when the order is placed or agreed with an operator.",
        "For store pickup the Buyer is notified when the order is ready; it is handed over against the order number and phone.",
        "On receipt the Buyer checks the packaging, quantity and expiry date and reports any visible defect to the courier or store staff at once.",
        "Ownership and the risk of accidental loss pass to the Buyer when the product is handed over.",
      ],
    },
    {
      id: "cancel",
      title: "6. Cancelling an order",
      items: [
        "An order that is “Payment pending” or “Confirmed” can be cancelled instantly from the Buyer's account.",
        "An order that is “Processing” or “Shipped” is cancelled by request, which the Seller reviews.",
        "Money paid for a cancelled order is refunded by the same method it was paid with.",
      ],
    },
    {
      id: "returns",
      title: "7. Returns and exchanges",
      items: [
        "The Buyer may request a return from their account or through support within 14 days of delivery.",
        "Products of proper quality are accepted unopened, with intact seals and protective film, in saleable condition and within their shelf life.",
        "A defective, expired or wrong product is, at the Buyer's choice, exchanged or fully refunded.",
        "Returns of food products follow the limits set by the consumer-protection legislation of the Republic of Uzbekistan.",
      ],
    },
    {
      id: "refunds",
      title: "8. Refunds",
      items: [
        "Once a return is approved, money is refunded by the original method: cash in store, online payments to the card through the payment system.",
        "Card refunds depend on the bank and payment system and usually take 3–10 business days.",
        "NutriZone Coins spent on the purchase are returned; coins earned on the returned product are deducted.",
      ],
    },
    {
      id: "loyalty",
      title: "9. NutriZone Coins loyalty programme",
      paragraphs: [
        "NutriZone Coins are bonus points used as a discount on later purchases. They are not money, cannot be exchanged for cash and cannot be transferred. Earning rates, tiers and rules are published on the loyalty programme page and may be changed by the Seller.",
      ],
    },
    {
      id: "products",
      title: "10. Product information",
      items: [
        "Sports nutrition and dietary supplements are not medicines. Read the label before use; consult a doctor if you have a chronic condition, are pregnant or are under 16.",
        "Website images are illustrative; manufacturers may change packaging. Composition and shelf life are as stated on the package.",
        "The Seller sells only original products from official suppliers.",
      ],
    },
    {
      id: "liability",
      title: "11. Liability",
      items: [
        "The parties are liable for non-performance in accordance with the legislation of the Republic of Uzbekistan.",
        "The Seller is not liable for delays caused by incorrect details (address, phone) given by the Buyer.",
        "In force majeure (natural disasters, decisions of public authorities, communication outages, etc.) deadlines are extended for the duration of such circumstances.",
      ],
    },
    {
      id: "disputes",
      title: "12. Disputes",
      paragraphs: [
        "Disputes are first settled by negotiation — write to our support; we answer within 10 business days. If no agreement is reached, the dispute is heard in court under the law of the Republic of Uzbekistan.",
        "How personal data is processed is set out in the Privacy Policy.",
      ],
    },
  ],
};

const TEXTS: Record<Locale, TermsText> = { uz, ru, en };

export function termsOfSale(locale: string): TermsText {
  return TEXTS[(locale as Locale) in TEXTS ? (locale as Locale) : "uz"];
}
