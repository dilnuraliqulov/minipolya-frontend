# Mini App translations to review

The Uzbek text comes from the design (`design/telegram-webapp.pen`) or was
written for it; **the Russian and English were written by Claude** and need a
native speaker's check. When a line is checked, fix it in
`src/miniapp/i18n/locales/{ru,en}.json` and tick it here.

This table mirrors the locale files (`uz.json` keys, in file order).
Placeholders such as `{{count}}` must stay as they are.

| Key | uz | ru (to review) | en (to review) |
|---|---|---|---|
| `app.name` | MiniPolya | MiniPolya | MiniPolya |
| `app.tagline` | Toshkentda futbol maydonini band qiling | Бронируйте футбольные поля в Ташкенте | Book a football pitch in Tashkent |
| `home.greeting` | Salom, {{name}} | Привет, {{name}} | Hi, {{name}} |
| `common.retry` | Qayta urinish | Повторить | Try again |
| `common.loading` | Yuklanmoqda | Загрузка | Loading |
| `common.soon` | Tez orada | Скоро | Coming soon |
| `common.back` | Orqaga | Назад | Back |
| `common.clear` | Tozalash | Очистить | Clear |
| `states.errorTitle` | Xatolik yuz berdi | Произошла ошибка | Something went wrong |
| `states.errorNetwork` | Maʼlumotlarni yuklab boʻlmadi. Internet aloqasini tekshirib, qayta urinib koʻring. | Не удалось загрузить данные. Проверьте подключение к интернету и попробуйте ещё раз. | Couldn't load the data. Check your internet connection and try again. |
| `states.errorServer` | Server javob bermadi. Birozdan soʻng qayta urinib koʻring. | Сервер не ответил. Попробуйте ещё раз чуть позже. | The server didn't respond. Please try again in a moment. |
| `money.unit` | soʻm | сум | UZS |
| `format.longDate` | {{day}}-{{month}}, {{year}} | {{day}} {{month}} {{year}} | {{day}} {{month}} {{year}} |
| `format.dayTitle` | {{weekday}}, {{day}}-{{month}} | {{weekday}}, {{day}} {{month}} | {{weekday}}, {{day}} {{month}} |
| `months.jan` | yanvar | января | January |
| `months.feb` | fevral | февраля | February |
| `months.mar` | mart | марта | March |
| `months.apr` | aprel | апреля | April |
| `months.may` | may | мая | May |
| `months.jun` | iyun | июня | June |
| `months.jul` | iyul | июля | July |
| `months.aug` | avgust | августа | August |
| `months.sep` | sentabr | сентября | September |
| `months.oct` | oktabr | октября | October |
| `months.nov` | noyabr | ноября | November |
| `months.dec` | dekabr | декабря | December |
| `auth.errorSession` | Sessiya tugadi. «Qayta urinish»ni bosing yoki ilovani qayta oching. | Сессия завершилась. Нажмите «Повторить» или откройте приложение заново. | Your session has ended. Tap “Try again” or reopen the app. |
| `auth.noTelegramTitle` | Telegram orqali oching | Откройте через Telegram | Open it in Telegram |
| `auth.noTelegramText` | MiniPolya Telegram ichida ishlaydi. Botni oching va ilovani ishga tushiring. | MiniPolya работает внутри Telegram. Откройте бота и запустите приложение. | MiniPolya runs inside Telegram. Open the bot and launch the app. |
| `auth.noTelegramDev` | Dasturlash rejimi: ilova hozircha faqat Telegram ichida kiradi. Uni tunnel orqali Telegram ichida oching. | Режим разработки: приложение пока входит только внутри Telegram. Откройте его в Telegram через туннель. | Development mode: the app can only sign in inside Telegram for now. Open it in Telegram through a tunnel. |
| `blocked.title` | Hisobingiz bloklangan | Ваш аккаунт заблокирован | Your account is blocked |
| `blocked.reason` | Sabab: {{reason}} | Причина: {{reason}} | Reason: {{reason}} |
| `blocked.date` | Qaror sanasi: {{date}} | Дата решения: {{date}} | Decision date: {{date}} |
| `blocked.questions` | Savollar boʻlsa, bizga yozing | Если есть вопросы, напишите нам | If you have questions, write to us |
| `blocked.support` | Qoʻllab-quvvatlash bilan bogʻlanish | Связаться с поддержкой | Contact support |
| `tabs.label` | Asosiy menyu | Главное меню | Main menu |
| `tabs.stadiums` | Maydonlar | Поля | Pitches |
| `tabs.team` | Jamoam | Команда | My team |
| `tabs.games` | Oʻyinlarim | Мои игры | My games |
| `tabs.profile` | Profil | Профиль | Profile |
| `soon.text` | Bu boʻlim tez orada ishga tushadi. | Этот раздел скоро заработает. | This section is coming soon. |
| `errors.network` | Internet aloqasi yoʻq. Tekshirib, qayta urinib koʻring. | Нет подключения к интернету. Проверьте его и попробуйте ещё раз. | No internet connection. Check it and try again. |
| `errors.server` | Serverda xatolik. Birozdan soʻng qayta urinib koʻring. | Ошибка на сервере. Попробуйте ещё раз чуть позже. | Server error. Please try again in a moment. |
| `errors.session` | Sessiya tugadi. Ilovani qayta oching. | Сессия завершилась. Откройте приложение заново. | Your session has ended. Reopen the app. |
| `errors.blocked` | Hisobingiz bloklangan. | Ваш аккаунт заблокирован. | Your account is blocked. |
| `errors.forbidden` | Bu amalga ruxsatingiz yoʻq. | У вас нет прав на это действие. | You are not allowed to do this. |
| `errors.notFound` | Maʼlumot topilmadi. | Данные не найдены. | Not found. |
| `errors.invalid` | Maʼlumotlar notoʻgʻri. Tekshirib, qayta urinib koʻring. | Данные неверны. Проверьте их и попробуйте ещё раз. | Some details are not valid. Check them and try again. |
| `errors.conflict` | Maʼlumotlar oʻzgargan. Sahifani yangilab, qayta urinib koʻring. | Данные изменились. Обновите страницу и попробуйте ещё раз. | The data has changed. Refresh and try again. |
| `errors.phoneTaken` | Bu raqam boshqa hisobga bogʻlangan. Boshqa raqam kiriting. | Этот номер уже привязан к другому аккаунту. Введите другой номер. | This number is already linked to another account. Enter a different number. |
| `errors.tooMany` | Juda koʻp urinish. Birozdan soʻng qayta urinib koʻring. | Слишком много попыток. Попробуйте чуть позже. | Too many attempts. Please try again later. |
| `errors.unknown` | Nimadir xato ketdi. Qayta urinib koʻring. | Что-то пошло не так. Попробуйте ещё раз. | Something went wrong. Please try again. |
| `errors.alreadyReviewed` | Siz bu maydonni allaqachon baholagansiz. | Вы уже оценили это поле. | You have already rated this pitch. |
| `errors.reviewNotPlayed` | Faqat oʻynagan maydoningizni baholashingiz mumkin. | Оценить можно только поле, где вы играли. | You can only rate a pitch you have played at. |
| `errors.cardDeclined` | Karta rad etildi. Boshqa karta tanlang yoki kartani tekshiring. | Карта отклонена. Выберите другую карту или проверьте эту. | The card was declined. Choose another card or check this one. |
| `errors.insufficientFunds` | Kartada mablagʻ yetarli emas. Boshqa karta tanlang yoki kartani toʻldiring. | На карте недостаточно средств. Выберите другую карту или пополните эту. | Not enough money on the card. Choose another card or top this one up. |
| `errors.providerUnavailable` | Toʻlov tizimi vaqtincha ishlamayapti. Birozdan soʻng urinib koʻring. | Платёжная система временно не работает. Попробуйте чуть позже. | The payment system is temporarily unavailable. Please try again shortly. |
| `errors.cardNotSupported` | Faqat Uzcard va Humo kartalari qabul qilinadi. | Принимаются только карты Uzcard и Humo. | Only Uzcard and Humo cards are accepted. |
| `errors.cardExpiryInvalid` | Karta raqami yoki amal qilish muddati notoʻgʻri. Tekshirib, qayta kiriting. | Неверный номер карты или срок действия. Проверьте и введите ещё раз. | The card number or expiry date is wrong. Check them and try again. |
| `errors.cardExpired` | Kartaning amal qilish muddati tugagan. Boshqa kartadan foydalaning. | Срок действия карты истёк. Используйте другую карту. | This card has expired. Use another card. |
| `errors.smsCodeWrong` | SMS kod notoʻgʻri. Qaytadan kiriting. | Неверный SMS-код. Введите ещё раз. | Wrong SMS code. Enter it again. |
| `errors.smsCodeExpired` | SMS kodning muddati tugadi. Kodni qayta yuboring. | Срок действия SMS-кода истёк. Отправьте код ещё раз. | The SMS code has expired. Send a new code. |
| `errors.smsResendTooEarly` | Yangi kodni biroz kutib soʻrang. | Подождите немного, прежде чем запрашивать новый код. | Please wait a little before asking for a new code. |
| `errors.smsResendUnavailable` | Kodni qayta yuborib boʻlmadi. Karta maʼlumotlarini qaytadan kiriting. | Не удалось отправить код ещё раз. Введите данные карты заново. | The code couldn't be sent again. Enter the card details once more. |
| `errors.bindingNotFound` | Karta qoʻshish jarayoni tugagan. Qaytadan boshlang. | Процесс добавления карты завершён. Начните заново. | This card setup has ended. Please start again. |
| `errors.cardBindingFailed` | Kartani qoʻshib boʻlmadi. Boshqa karta bilan urinib koʻring. | Не удалось добавить карту. Попробуйте другую карту. | The card couldn't be added. Try another card. |
| `errors.tooLate` | Oʻyin boshlanishiga 3 soatdan kam qoldi — endi qoʻshilib boʻlmaydi. | До игры меньше 3 часов — присоединиться уже нельзя. | The game starts in less than 3 hours — it can no longer be joined. |
| `errors.paymentConfirming` | Toʻlov hali tasdiqlanmoqda — qayta toʻlamang, natija tez orada koʻrinadi. | Оплата ещё подтверждается — не платите повторно, результат скоро появится. | The payment is still being confirmed — do not pay again; the result shows soon. |
| `errors.paymentUnclear` | Toʻlov tasdiqlanmadi. Pul yechilgan boʻlsa, toʻliq qaytariladi — Oʻyinlarim boʻlimida tekshiring. | Оплата не подтвердилась. Если деньги списались, они вернутся полностью — проверьте «Мои игры». | The payment was not confirmed. If money was taken, it comes back in full — check My games. |
| `errors.paymentPending` | Toʻlov tasdiqlanmoqda. Natija bildirishnoma orqali keladi. | Платёж подтверждается. Результат придёт в уведомлении. | Your payment is being confirmed. You'll get the result in a notification. |
| `errors.hasOpponent` | Bu oʻyinga raqib allaqachon topilgan. | У этой игры уже есть соперник. | This game already has an opponent. |
| `errors.onlyLeaderJoins` | Raqib chaqiruvini faqat jamoa sardori qabul qila oladi — u jamoa nomidan toʻlaydi. | Принять вызов может только капитан команды — он платит за команду. | Only the team captain can accept a challenge — they pay for the team. |
| `errors.minimumTooLow` | Oldindan toʻlov kamida 500 soʻm boʻlishi kerak. | Предоплата должна быть не меньше 500 сум. | The deposit must be at least 500 soʻm. |
| `errors.alreadyPaid` | Bu toʻlov allaqachon qayd etilgan. | Эта оплата уже записана. | This payment is already recorded. |
| `errors.imageType` | Faqat JPG, PNG yoki WebP rasm yuklash mumkin. | Можно загрузить только JPG, PNG или WebP. | Only JPG, PNG or WebP images can be uploaded. |
| `errors.tooManyPhotos` | Maydonda koʻpi bilan 10 ta rasm boʻlishi mumkin. | У поля может быть не больше 10 фото. | A pitch can have at most 10 photos. |
| `errors.fileTooLarge` | Rasm juda katta — 10 MB gacha boʻlishi kerak. | Фото слишком большое — до 10 МБ. | The photo is too large — up to 10 MB. |
| `languages.uz` | Oʻzbekcha | Oʻzbekcha | Oʻzbekcha |
| `languages.ru` | Русский | Русский | Русский |
| `languages.en` | English | English | English |
| `profile.personal` | Shaxsiy maʼlumotlar | Личные данные | Personal details |
| `profile.cards` | Kartalarim | Мои карты | My cards |
| `profile.favorites` | Sevimlilar | Избранное | Favourites |
| `profile.language` | Til | Язык | Language |
| `profile.languageTitle` | Tilni tanlang | Выберите язык | Choose a language |
| `profile.theme` | Mavzu | Тема | Theme |
| `profile.themeTitle` | Mavzuni tanlang | Выберите тему | Choose a theme |
| `profile.themeLight` | Yorugʻ | Светлая | Light |
| `profile.themeDark` | Qorongʻi | Тёмная | Dark |
| `profile.themeSystem` | Tizim | Системная | System |
| `profile.noPhone` | Telefon raqam kiritilmagan | Номер телефона не указан | No phone number yet |
| `profile.ownerMode` | Ega rejimi | Режим владельца | Owner mode |
| `profile.ownerModeText` | Maydonlaringiz, bronlar va toʻlovlarni boshqarish | Управление полями, бронированиями и платежами | Manage your pitches, bookings and payments |
| `profile.firstName` | Ism | Имя | First name |
| `profile.lastName` | Familiya | Фамилия | Last name |
| `profile.phone` | Telefon raqam | Номер телефона | Phone number |
| `profile.phoneHint` | Format: +998 XX XXX XX XX | Формат: +998 XX XXX XX XX | Format: +998 XX XXX XX XX |
| `profile.firstNameRequired` | Ismni kiriting | Введите имя | Enter your first name |
| `profile.lastNameRequired` | Familiyani kiriting | Введите фамилию | Enter your last name |
| `profile.phoneRequired` | Telefon raqamni kiriting | Введите номер телефона | Enter your phone number |
| `profile.phoneInvalid` | Raqam +998 XX XXX XX XX formatida boʻlishi kerak | Номер должен быть в формате +998 XX XXX XX XX | The number must look like +998 XX XXX XX XX |
| `profile.notFromTelegram` | Ism, familiya va telefon Telegramʼdan avtomatik olinmaydi — faqat siz kiritgan maʼlumotlar saqlanadi. | Имя, фамилия и телефон не берутся из Telegram автоматически — сохраняется только то, что вы ввели. | Your name and phone are never taken from Telegram automatically — only what you enter is saved. |
| `profile.save` | Saqlash | Сохранить | Save |
| `profile.saved` | Saqlandi | Сохранено | Saved |
| `profile.setupTitle` | Profilingizni toʻldiring | Заполните профиль | Complete your profile |
| `profile.setupSubtitle` | Maydon egasi siz bilan bogʻlana olishi uchun | Чтобы владелец поля мог с вами связаться | So the pitch owner can contact you |
| `profile.continue` | Davom etish | Продолжить | Continue |
| `profile.sectionAccount` | Hisob | Аккаунт | Account |
| `profile.sectionApp` | Ilova | Приложение | App |
| `profile.phoneNotSet` | Kiritilmagan | Не указан | Not set |
| `profile.version` | MiniPolya v{{version}} · Telegram ilovasi | MiniPolya v{{version}} · приложение в Telegram | MiniPolya v{{version}} · Telegram app |
| `profile.versionOwner` | MiniPolya v{{version}} · Ega rejimi | MiniPolya v{{version}} · режим владельца | MiniPolya v{{version}} · Owner mode |
| `profile.ownerCard.noneTitle` | Maydoningiz bormi? | У вас есть поле? | Do you have a pitch? |
| `profile.ownerCard.noneText` | Uni MiniPolyaʼga qoʻshing va bronlarni onlayn qabul qiling | Добавьте его в MiniPolya и принимайте брони онлайн | Add it to MiniPolya and take bookings online |
| `profile.ownerCard.reviewText` | Koʻrib chiqilmoqda. Tez orada siz bilan bogʻlanamiz. | На проверке. Скоро мы с вами свяжемся. | Under review. We will contact you soon. |
| `profile.ownerCard.enter` | Ega rejimiga oʻtish | Перейти в режим владельца | Switch to owner mode |
| `stadiums.search` | Maydon yoki manzilni qidiring | Поиск поля или адреса | Search for a pitch or address |
| `stadiums.filters` | Filtrlar | Фильтры | Filters |
| `stadiums.allFormats` | Hammasi | Все | All |
| `stadiums.format` | Format | Формат | Format |
| `stadiums.allTitle` | Barcha maydonlar | Все поля | All pitches |
| `stadiums.allCount` | Barcha maydonlar · {{count}} | Все поля · {{count}} | All pitches · {{count}} |
| `stadiums.foundCount` | Topilgan maydonlar · {{count}} | Найдено полей · {{count}} | Pitches found · {{count}} |
| `stadiums.bannerText` | Toʻlov xavfsiz · Bekor qilish shartlari aniq | Оплата безопасна · Условия отмены понятны | Secure payment · Clear cancellation terms |
| `stadiums.bannerClose` | Yopish | Закрыть | Close |
| `stadiums.perHour` | soʻm/soat | сум/час | UZS/hour |
| `stadiums.perHourShort` | /soat | /час | /hour |
| `stadiums.book` | Band qilish | Забронировать | Book |
| `stadiums.more` | Yana koʻrsatish | Показать ещё | Show more |
| `stadiums.emptyTitle` | Hozircha maydonlar yoʻq | Пока нет полей | No pitches yet |
| `stadiums.emptyText` | Maydonlar qoʻshilishi bilan shu yerda paydo boʻladi. | Поля появятся здесь, как только их добавят. | Pitches will appear here as soon as they are added. |
| `stadiums.notFoundTitle` | Hech narsa topilmadi | Ничего не найдено | Nothing found |
| `stadiums.notFoundQuery` | «{{q}}» boʻyicha maydon topilmadi. Boshqa nom yoki tumanni kiritib koʻring. | По запросу «{{q}}» полей не найдено. Попробуйте другое название или район. | No pitches found for “{{q}}”. Try another name or district. |
| `stadiums.notFoundFilters` | Tanlangan filtrlar boʻyicha maydon topilmadi. | По выбранным фильтрам полей не найдено. | No pitches match the selected filters. |
| `stadiums.clearSearch` | Qidiruvni tozalash | Сбросить поиск | Clear search |
| `stadiums.maxPrice` | Soatiga narx, gacha (soʻm) | Цена за час, до (сум) | Price per hour, up to (UZS) |
| `stadiums.district` | Tuman | Район | District |
| `stadiums.allDistricts` | Barcha tumanlar | Все районы | All districts |
| `stadiums.chooseDistrict` | Tumanni tanlang | Выберите район | Choose a district |
| `stadiums.apply` | Qoʻllash | Применить | Apply |
| `stadiums.resetFilters` | Filtrlarni tozalash | Сбросить фильтры | Reset filters |
| `stadium.title` | Maydon | Поле | Pitch |
| `stadium.favorite` | Sevimlilarga qoʻshish | Добавить в избранное | Add to favourites |
| `stadium.unfavorite` | Sevimlilardan olib tashlash | Убрать из избранного | Remove from favourites |
| `stadium.districtName` | {{district}} tumani | Район {{district}} | {{district}} district |
| `stadium.surface.natural` | Tabiiy gazon | Натуральный газон | Natural grass |
| `stadium.surface.artificial` | Sunʼiy gazon | Искусственный газон | Artificial turf |
| `stadium.surface.hybrid` | Gibrid gazon | Гибридный газон | Hybrid turf |
| `stadium.amenity.lighting` | Yoritish | Освещение | Lighting |
| `stadium.amenity.lockerRoom` | Kiyinish xonasi | Раздевалка | Changing room |
| `stadium.amenity.showers` | Dush | Душ | Showers |
| `stadium.amenity.parking` | Avtoturargoh | Парковка | Parking |
| `stadium.amenity.tribune` | Tribuna | Трибуна | Stand |
| `stadium.amenity.equipmentRental` | Toʻp ijarasi | Прокат мячей | Ball rental |
| `stadium.amenity.wifi` | Wi-Fi | Wi-Fi | Wi-Fi |
| `stadium.amenity.cafe` | Kafe | Кафе | Café |
| `stadium.amenities` | Qulayliklar | Удобства | Amenities |
| `stadium.address` | Manzil | Адрес | Address |
| `stadium.openMap` | Xaritada ochish | Открыть на карте | Open in maps |
| `stadium.mapLabel` | Maydon xaritada | Поле на карте | The pitch on a map |
| `stadium.mapAttribution` | © OpenStreetMap | © OpenStreetMap | © OpenStreetMap |
| `stadium.cancelRule` | Oʻyin boshlanishiga {{hours}} soat qolguncha bekor qilsangiz, toʻlangan pul toʻliq qaytariladi. | Если отменить не позднее чем за {{hours}} ч до начала игры, оплата вернётся полностью. | Cancel at least {{hours}} hours before the game starts and everything you paid is refunded in full. |
| `stadium.reviews` | Sharhlar | Отзывы | Reviews |
| `stadium.allReviews` | Barcha sharhlar | Все отзывы | All reviews |
| `stadium.noReviews` | Hali sharhlar yoʻq | Отзывов пока нет | No reviews yet |
| `stadium.reviewCount` | {{count}} ta sharh | Отзывов: {{count}} | Reviews: {{count}} |
| `stadium.ratingOf` | {{rating}} / 5 | {{rating}} из 5 | {{rating}} out of 5 |
| `stadium.anonymous` | Foydalanuvchi | Пользователь | User |
| `stadium.ownerReply` | Maydon egasi javobi | Ответ владельца | Owner’s reply |
| `stadium.photoAlt` | {{name}}, {{n}}-rasm | {{name}}, фото {{n}} | {{name}}, photo {{n}} |
| `stadium.notFoundTitle` | Maydon topilmadi | Поле не найдено | Pitch not found |
| `stadium.notFoundText` | Bu maydon endi mavjud emas yoki yopilgan. | Этого поля больше нет или оно закрыто. | This pitch no longer exists or has been closed. |
| `weekdays.short.mon` | Dush | Пн | Mon |
| `weekdays.short.tue` | Sesh | Вт | Tue |
| `weekdays.short.wed` | Chor | Ср | Wed |
| `weekdays.short.thu` | Pay | Чт | Thu |
| `weekdays.short.fri` | Jum | Пт | Fri |
| `weekdays.short.sat` | Shan | Сб | Sat |
| `weekdays.short.sun` | Yak | Вс | Sun |
| `weekdays.long.mon` | Dushanba | Понедельник | Monday |
| `weekdays.long.tue` | Seshanba | Вторник | Tuesday |
| `weekdays.long.wed` | Chorshanba | Среда | Wednesday |
| `weekdays.long.thu` | Payshanba | Четверг | Thursday |
| `weekdays.long.fri` | Juma | Пятница | Friday |
| `weekdays.long.sat` | Shanba | Суббота | Saturday |
| `weekdays.long.sun` | Yakshanba | Воскресенье | Sunday |
| `slots.date` | Sana | Дата | Date |
| `slots.time` | Vaqt | Время | Time |
| `slots.today` | Bugun | Сегодня | Today |
| `slots.tomorrow` | Ertaga | Завтра | Tomorrow |
| `slots.unavailable` | Boʻsh emas | Недоступно | Not available |
| `slots.booked` | Band | Занято | Booked |
| `slots.closed` | Yopiq | Закрыто | Closed |
| `slots.past` | Oʻtgan | Прошло | Past |
| `slots.waitingGame` | Raqib qidirilmoqda | Ищут соперника | Looking for an opponent |
| `slots.waitingHint` | «Raqib qidirilmoqda» vaqtni band qilsangiz, oʻsha oʻyin bekor qilinadi va jamoaga pul qaytariladi. | Если забронировать время «Ищут соперника», та игра отменится, а команде вернут деньги. | If you book a “Looking for an opponent” hour, that game is cancelled and the team gets its money back. |
| `slots.emptyTitle` | Bu kunda boʻsh vaqt yoʻq | В этот день нет свободного времени | No free hours on this day |
| `slots.emptyText` | Barcha soatlar band qilingan. Boshqa kunni tanlang. | Все часы заняты. Выберите другой день. | Every hour is taken. Choose another day. |
| `slots.seeDay` | {{day}}ni koʻrish | Смотреть: {{day}} | See {{day}} |
| `slots.choose` | Vaqtni tanlang | Выберите время | Choose a time |
| `slots.book` | Band qilish · {{time}} · {{price}} | Забронировать · {{time}} · {{price}} | Book · {{time}} · {{price}} |
| `checkout.title` | Bron qilish | Бронирование | Booking |
| `checkout.date` | Sana | Дата | Date |
| `checkout.time` | Vaqt | Время | Time |
| `checkout.duration` | Davomiyligi | Длительность | Duration |
| `checkout.oneHour` | 1 soat | 1 час | 1 hour |
| `checkout.total` | Jami | Итого | Total |
| `checkout.paymentType` | Toʻlov turi | Способ оплаты | Payment |
| `checkout.deposit` | Oldindan toʻlov: {{amount}} | Предоплата: {{amount}} | Deposit: {{amount}} |
| `checkout.full` | Toʻliq toʻlov: {{amount}} | Полная оплата: {{amount}} | Full payment: {{amount}} |
| `checkout.remainderNote` | Qolgan summani keyin ilovada yoki maydonda naqd toʻlaysiz. | Остаток оплатите позже в приложении или наличными на поле. | Pay the rest later in the app or in cash at the pitch. |
| `checkout.fullOnly` | Bu maydon toʻliq toʻlovni talab qiladi. | Это поле требует полной оплаты. | This pitch requires full payment. |
| `checkout.card` | Karta | Карта | Card |
| `checkout.addCardFirst` | Toʻlash uchun avval karta qoʻshing | Чтобы оплатить, сначала добавьте карту | Add a card to pay |
| `checkout.cancelNote` | Oʻyin boshlanishidan {{hours}} soat oldingacha bekor qilsangiz, toʻlov toʻliq qaytariladi. Undan keyin qaytarilmaydi. | При отмене не позднее чем за {{hours}} ч до начала игры оплата вернётся полностью. Позже — не возвращается. | Cancel at least {{hours}} hours before the game and you get a full refund. After that, nothing is refunded. |
| `checkout.pay` | Toʻlash · {{amount}} | Оплатить · {{amount}} | Pay · {{amount}} |
| `checkout.paying` | Toʻlanmoqda… | Оплата… | Paying… |
| `checkout.declinedTitle` | Toʻlov amalga oshmadi | Оплата не прошла | The payment did not go through |
| `checkout.hold` | Bron {{time}} davomida saqlanadi | Бронь сохраняется ещё {{time}} | The booking is held for {{time}} |
| `checkout.holdExpired` | Bron muddati tugadi | Срок брони истёк | The hold has expired |
| `checkout.retry` | Qayta urinish | Повторить | Try again |
| `checkout.otherCard` | Boshqa karta | Другая карта | Another card |
| `checkout.slotTakenTitle` | Bu vaqt band boʻlib qoldi | Это время уже заняли | This time was just taken |
| `checkout.slotTakenText` | Kimdir sizdan oldin band qildi. Boshqa vaqtni tanlang. | Кто-то забронировал раньше вас. Выберите другое время. | Someone booked it before you. Choose another time. |
| `checkout.chooseOther` | Boshqa vaqt tanlash | Выбрать другое время | Choose another time |
| `checkout.myBookings` | Bronlarim | Мои брони | My bookings |
| `checkout.checkingTitle` | Toʻlov tekshirilmoqda | Оплата проверяется | Checking the payment |
| `checkout.checkingText` | Natijani Bronlarim boʻlimida koʻrasiz. | Результат появится в разделе «Мои брони». | You will see the result in My bookings. |
| `checkout.viewBooking` | Bronni koʻrish | Открыть бронь | View the booking |
| `checkout.badLinkTitle` | Vaqt tanlanmagan | Время не выбрано | No time chosen |
| `checkout.badLinkText` | Maydon sahifasida boʻsh vaqtni tanlang. | Выберите свободное время на странице поля. | Choose a free time on the pitch page. |
| `checkout.slotGoneTitle` | Bu vaqt endi boʻsh emas | Это время больше не свободно | This time is no longer free |
| `checkout.chooseTime` | Vaqtni tanlash | Выбрать время | Choose a time |
| `favorites.emptyTitle` | Sevimli maydonlaringiz yoʻq | У вас нет избранных полей | No favourite pitches yet |
| `favorites.emptyText` | Maydon sahifasidagi yurakchani bosib, uni shu yerga saqlang. | Нажмите на сердечко на странице поля, чтобы сохранить его здесь. | Tap the heart on a pitch’s page to save it here. |
| `favorites.find` | Maydon topish | Найти поле | Find a pitch |
| `cards.add` | Karta qoʻshish | Добавить карту | Add card |
| `cards.addTitle` | Karta qoʻshish | Добавление карты | Add card |
| `cards.number` | Karta raqami | Номер карты | Card number |
| `cards.expiry` | Amal qilish muddati (OO/YY) | Срок действия (ММ/ГГ) | Expiry date (MM/YY) |
| `cards.next` | Davom etish | Продолжить | Continue |
| `cards.step1` | 1-qadam / 2 · Karta maʼlumotlari | Шаг 1 из 2 · Данные карты | Step 1 of 2 · Card details |
| `cards.step2` | 2-qadam / 2 · Tasdiqlash | Шаг 2 из 2 · Подтверждение | Step 2 of 2 · Confirmation |
| `cards.smsTitle` | SMS kodni kiriting | Введите SMS-код | Enter the SMS code |
| `cards.smsLabel` | SMS kod | SMS-код | SMS code |
| `cards.codeSent` | Kod {{phone}} raqamiga yuborildi | Код отправлен на номер {{phone}} | The code was sent to {{phone}} |
| `cards.confirm` | Tasdiqlash | Подтвердить | Confirm |
| `cards.resend` | Kodni qayta yuborish | Отправить код ещё раз | Resend the code |
| `cards.resendIn` | Kodni qayta yuborish ({{time}}) | Отправить код ещё раз ({{time}}) | Resend the code ({{time}}) |
| `cards.codeResent` | Yangi kod yuborildi | Новый код отправлен | A new code has been sent |
| `cards.privacy` | Karta maʼlumotlari MiniPolyaʼda saqlanmaydi. | Данные карты не хранятся в MiniPolya. | Card details are not stored in MiniPolya. |
| `cards.footer` | Karta maʼlumotlari MiniPolyaʼda saqlanmaydi — faqat toʻlov tokeni saqlanadi. | Данные карты не хранятся в MiniPolya — сохраняется только платёжный токен. | Card details are not stored in MiniPolya — only a payment token is kept. |
| `cards.numberLength` | Karta raqami 16 ta raqamdan iborat boʻlishi kerak | Номер карты должен состоять из 16 цифр | The card number must have 16 digits |
| `cards.numberBrand` | Faqat Uzcard (8600…) va Humo (9860…) kartalari qabul qilinadi | Принимаются только карты Uzcard (8600…) и Humo (9860…) | Only Uzcard (8600…) and Humo (9860…) cards are accepted |
| `cards.expiryShape` | Muddatni OO/YY koʻrinishida kiriting, masalan 08/28 | Введите срок в формате ММ/ГГ, например 08/28 | Enter the expiry as MM/YY, e.g. 08/28 |
| `cards.expiryPast` | Kartaning amal qilish muddati tugagan | Срок действия карты истёк | This card has expired |
| `cards.noInternet` | Internet aloqasi yoʻq | Нет подключения к интернету | No internet connection |
| `cards.noInternetHint` | Ulanishni tekshiring, qayta urinib koʻring. | Проверьте соединение и попробуйте ещё раз. | Check your connection and try again. |
| `cards.saved` | Karta qoʻshildi | Карта добавлена | Card added |
| `cards.emptyTitle` | Saqlangan kartalar yoʻq | Нет сохранённых карт | No saved cards |
| `cards.emptyText` | Karta qoʻshsangiz, keyingi toʻlovlar tezroq boʻladi. | Добавьте карту, и следующие платежи пройдут быстрее. | Add a card and your next payments will be quicker. |
| `cards.more` | Karta amallari | Действия с картой | Card actions |
| `cards.delete` | Kartani oʻchirish | Удалить карту | Delete card |
| `cards.deleteTitle` | Kartani oʻchirasizmi? | Удалить карту? | Delete this card? |
| `cards.deleteText` | {{card}} roʻyxatdan oʻchiriladi. Keyin uni qayta qoʻshishingiz mumkin. | {{card}} будет удалена из списка. Позже вы сможете добавить её снова. | {{card}} will be removed from the list. You can add it again later. |
| `cards.deleteConfirm` | Oʻchirish | Удалить | Delete |
| `cards.back` | Ortga | Назад | Back |
| `cards.deleted` | Karta oʻchirildi | Карта удалена | Card deleted |
| `bookings.status.pending` | Kutilmoqda | Ожидает оплаты | Pending |
| `bookings.status.confirmed` | Tasdiqlangan | Подтверждена | Confirmed |
| `bookings.status.completed` | Oʻtkazilgan | Состоялась | Completed |
| `bookings.status.expired` | Muddati oʻtgan | Истекла | Expired |
| `bookings.status.cancelled` | Bekor qilingan | Отменена | Cancelled |
| `bookings.upcoming` | Kelgusi | Предстоящие | Upcoming |
| `bookings.past` | Oʻtgan | Прошедшие | Past |
| `bookings.filterSoon` | Kelgusi va oʻtgan boʻyicha ajratish tez orada | Разделение на предстоящие и прошедшие — скоро | Splitting into upcoming and past is coming soon |
| `bookings.listLabel` | Bronlar | Брони | Bookings |
| `bookings.emptyTitle` | Hali bronlar yoʻq | Броней пока нет | No bookings yet |
| `bookings.emptyText` | Maydon tanlab, birinchi bronni qiling. | Выберите поле и сделайте первую бронь. | Pick a pitch and make your first booking. |
| `bookings.findPitch` | Maydon topish | Найти поле | Find a pitch |
| `bookings.more` | Yana koʻrsatish | Показать ещё | Show more |
| `booked.headerTitle` | Bron | Бронь | Booking |
| `booked.title` | Band qilindi! | Забронировано! | Booked! |
| `booked.paid` | Toʻlandi: {{amount}} | Оплачено: {{amount}} | Paid: {{amount}} |
| `booked.remaining` | Qolgani: {{amount}} | Осталось: {{amount}} | Left to pay: {{amount}} |
| `booked.remainderNote` | Qolgan summani ilovada yoki maydonda naqd toʻlashingiz mumkin. | Остаток можно оплатить в приложении или наличными на поле. | You can pay the rest in the app or in cash at the pitch. |
| `booked.deadline` | Bekor qilish muddati: {{date}}, {{time}} gacha | Отменить можно до {{date}}, {{time}} | Free cancellation until {{date}}, {{time}} |
| `booked.toGames` | Oʻyinlarimga oʻtish | Перейти в «Мои игры» | Go to My games |
| `booked.home` | Bosh sahifa | На главную | Home |
| `booking.title` | Bron | Бронь | Booking |
| `booking.hours` | {{count}} soat | {{count}} ч | {{count}} h |
| `booking.openMap` | Xaritada ochish | Открыть на карте | Open the map |
| `booking.call` | Qoʻngʻiroq | Позвонить | Call |
| `booking.payment` | Toʻlov | Оплата | Payment |
| `booking.price` | Narx | Цена | Price |
| `booking.paid` | Toʻlangan | Оплачено | Paid |
| `booking.remaining` | Qolgan summa | Остаток | Left to pay |
| `booking.unpaid` | Toʻlanmagan | Не оплачено | Unpaid |
| `booking.paidInFull` | Toʻliq toʻlangan | Оплачено полностью | Paid in full |
| `booking.payRest` | Qolganini ilovada toʻlash | Доплатить в приложении | Pay the rest in the app |
| `booking.cashNote` | yoki maydonda naqd toʻlashingiz mumkin | или оплатите наличными на поле | or pay in cash at the pitch |
| `booking.payNow` | Toʻlash | Оплатить | Pay |
| `booking.pendingBanner` | Toʻlovni {{time}} gacha yakunlang | Завершите оплату до {{time}} | Finish paying by {{time}} |
| `booking.pendingLeft` | Bron yana {{left}} saqlanadi | Бронь сохраняется ещё {{left}} | Held for another {{left}} |
| `booking.rules` | Bekor qilish shartlari | Условия отмены | Cancellation terms |
| `booking.rulesDeadline` | {{date}}, {{time}} gacha bekor qilsangiz, toʻlov toʻliq qaytariladi. Undan keyin qaytarilmaydi. | При отмене до {{date}}, {{time}} оплата вернётся полностью. Позже — не возвращается. | Cancel before {{date}}, {{time}} for a full refund. After that, nothing is refunded. |
| `booking.refundNow` | Hozir bekor qilsangiz: {{amount}} qaytariladi | Если отменить сейчас: вернём {{amount}} | Cancel now: {{amount}} is refunded |
| `booking.noRefundNow` | Hozir bekor qilsangiz, toʻlov qaytarilmaydi | Если отменить сейчас, оплата не вернётся | Cancel now and nothing is refunded |
| `booking.cancel` | Bronni bekor qilish | Отменить бронь | Cancel the booking |
| `booking.cancelTitle` | Bronni bekor qilasizmi? | Отменить бронь? | Cancel this booking? |
| `booking.cancelConfirm` | Ha, bekor qilish | Да, отменить | Yes, cancel |
| `booking.cancelKeep` | Yoʻq, qoldirish | Нет, оставить | No, keep it |
| `booking.cancelled` | Bron bekor qilindi | Бронь отменена | Booking cancelled |
| `booking.cancelledRefund` | Bron bekor qilindi · {{amount}} qaytarildi | Бронь отменена · возвращено {{amount}} | Booking cancelled · {{amount}} refunded |
| `booking.cancelledAt` | Bekor qilingan: {{date}}, {{time}} | Отменена: {{date}}, {{time}} | Cancelled: {{date}}, {{time}} |
| `booking.cancelReason` | Sabab: {{reason}} | Причина: {{reason}} | Reason: {{reason}} |
| `booking.payRestTitle` | Qolganini toʻlash | Доплата | Pay the rest |
| `booking.payRestButton` | Toʻlash · {{amount}} | Оплатить · {{amount}} | Pay · {{amount}} |
| `booking.restPaid` | Toʻlov qabul qilindi | Оплата принята | Payment received |
| `booking.notFoundTitle` | Bron topilmadi | Бронь не найдена | Booking not found |
| `booking.notFoundText` | Bu bron mavjud emas yoki sizga tegishli emas. | Этой брони нет или она не ваша. | This booking does not exist or is not yours. |
| `review.rate` | Oʻyinni baholang | Оцените игру | Rate the game |
| `review.rateText` | Fikringiz boshqa oʻyinchilarga maydon tanlashda yordam beradi. | Ваш отзыв поможет другим игрокам выбрать поле. | Your review helps other players choose a pitch. |
| `review.yours` | Sizning bahoyingiz | Ваша оценка | Your rating |
| `review.sheetTitle` | Maydonni baholang | Оцените поле | Rate the pitch |
| `review.star` | {{count}} yulduz | {{count}} из 5 | {{count}} of 5 |
| `review.comment` | Izoh (ixtiyoriy) | Комментарий (необязательно) | Comment (optional) |
| `review.submit` | Yuborish | Отправить | Send |
| `review.thanks` | Rahmat! Bahoyingiz qabul qilindi | Спасибо! Оценка принята | Thank you! Your rating was received |
| `games.status.open` | Raqib kutilmoqda | Ждём соперника | Waiting for an opponent |
| `games.status.confirmed` | Tasdiqlangan | Подтверждена | Confirmed |
| `games.status.completed` | Oʻtkazilgan | Состоялась | Played |
| `games.status.cancelled` | Bekor qilingan | Отменена | Cancelled |
| `games.section` | Oʻyinlar | Игры | Games |
| `games.teamGame` | Jamoa vs jamoa | Команда на команду | Team vs team |
| `games.friendsGame` | Doʻstlar oʻyini | Игра с друзьями | Friends game |
| `games.openGame` | Ochiq oʻyin | Открытая игра | Open game |
| `team.emptyTitle` | Sizda hali jamoa yoʻq | У вас пока нет команды | You have no team yet |
| `team.emptyText` | Jamoa yarating va boshqa jamoalar bilan oʻynang. | Создайте команду и играйте с другими командами. | Create a team and play against other teams. |
| `team.create` | Jamoa yaratish | Создать команду | Create a team |
| `team.newTeam` | Yangi jamoa | Новая команда | New team |
| `team.pick` | Jamoa | Команда | Team |
| `team.members` | Aʼzolar | Участники | Members |
| `team.memberCount` | {{count}} aʼzo | {{count}} уч. | {{count}} members |
| `team.leader` | Sardor | Капитан | Captain |
| `team.member` | Aʼzo | Участник | Member |
| `team.anonymous` | Oʻyinchi | Игрок | Player |
| `team.invite` | Taklif havolasini ulashish | Поделиться приглашением | Share the invite link |
| `team.memberActions` | {{name}} — amallar | {{name}} — действия | {{name}} — actions |
| `team.remove` | Jamoadan chiqarish | Исключить из команды | Remove from the team |
| `team.removeTitle` | {{name}}ni jamoadan chiqarasizmi? | Исключить {{name}} из команды? | Remove {{name}} from the team? |
| `team.removeConfirm` | Chiqarish | Исключить | Remove |
| `team.removed` | Aʼzo chiqarildi | Участник исключён | Member removed |
| `team.delete` | Jamoani oʻchirish | Удалить команду | Delete the team |
| `team.deleteTitle` | Jamoani oʻchirasizmi? | Удалить команду? | Delete this team? |
| `team.deleteText` | {{name}} va uning aʼzolari roʻyxati oʻchiriladi. | Команда {{name}} и её состав будут удалены. | {{name}} and its member list will be deleted. |
| `team.deleteConfirm` | Oʻchirish | Удалить | Delete |
| `team.deleted` | Jamoa oʻchirildi | Команда удалена | Team deleted |
| `team.cancel` | Bekor qilish | Отмена | Cancel |
| `team.challenges` | Raqib qidirayotgan jamoalar | Команды ищут соперника | Teams looking for an opponent |
| `team.challengesEmpty` | Hozircha raqib qidirayotgan jamoa yoʻq. | Сейчас никто не ищет соперника. | No team is looking for an opponent right now. |
| `team.leaderAccepts` | Chaqiriqlarni jamoa sardori qabul qiladi. | Вызовы принимает капитан команды. | The team captain accepts challenges. |
| `team.payNow` | Jamoangiz toʻlaydi: {{amount}} | Ваша команда платит: {{amount}} | Your team pays: {{amount}} |
| `team.accept` | Qabul qilish | Принять | Accept |
| `team.more` | Yana koʻrsatish | Показать ещё | Show more |
| `team.createTitle` | Jamoa yaratish | Создание команды | Create a team |
| `team.createIntro` | Siz jamoa sardori boʻlasiz. | Вы станете капитаном команды. | You will be the team captain. |
| `team.name` | Jamoa nomi | Название команды | Team name |
| `team.nameHint` | 3–24 belgi. | 3–24 символа. | 3–24 characters. |
| `team.created` | Jamoa yaratildi | Команда создана | Team created |
| `team.notFoundTitle` | Jamoa topilmadi | Команда не найдена | Team not found |
| `team.inviteSheet.title` | Taklif havolasi | Ссылка-приглашение | Invite link |
| `team.inviteSheet.text` | Havolani doʻstlaringizga yuboring — ular bosib jamoaga qoʻshiladi. | Отправьте ссылку друзьям — по ней они вступят в команду. | Send the link to your friends — they join the team by opening it. |
| `team.inviteSheet.copy` | Havoladan nusxa olish | Скопировать ссылку | Copy link |
| `team.inviteSheet.copied` | Havola nusxalandi | Ссылка скопирована | Link copied |
| `team.inviteSheet.copyFailed` | Nusxa olib boʻlmadi. Havolani bosib turib nusxalang. | Не удалось скопировать. Нажмите на ссылку и удерживайте, чтобы скопировать. | Could not copy. Press and hold the link to copy it. |
| `team.inviteSheet.share` | Telegramda ulashish | Поделиться в Telegram | Share in Telegram |
| `team.inviteSheet.shareText` | «{{team}}» jamoasiga qoʻshiling | Вступайте в команду «{{team}}» | Join the “{{team}}” team |
| `team.inviteSheet.renew` | Yangi havola yaratish | Создать новую ссылку | Create a new link |
| `team.inviteSheet.renewed` | Yangi havola tayyor. Eskisi endi ishlamaydi. | Новая ссылка готова. Старая больше не работает. | New link ready. The old one no longer works. |
| `team.inviteSheet.notConfigured` | Taklif havolasi hali sozlanmagan. | Ссылка-приглашение ещё не настроена. | The invite link is not set up yet. |
| `team.join.title` | Jamoaga qoʻshilish | Вступление в команду | Join a team |
| `team.join.invited` | Sizni jamoaga taklif qilishdi | Вас пригласили в команду | You have been invited to a team |
| `team.join.leader` | Sardor: {{name}} | Капитан: {{name}} | Captain: {{name}} |
| `team.join.members` | {{count}} aʼzo | участников: {{count}} | {{count}} members |
| `team.join.join` | Jamoaga qoʻshilish | Вступить в команду | Join the team |
| `team.join.later` | Keyinroq | Позже | Later |
| `team.join.joinedTitle` | Siz jamoaga qoʻshildingiz | Вы вступили в команду | You joined the team |
| `team.join.joinedText` | Endi «{{team}}» oʻyinlari va chatini koʻrasiz. | Теперь вы видите игры и чат «{{team}}». | You now see “{{team}}” games and chat. |
| `team.join.memberTitle` | Siz allaqachon shu jamoadasiz | Вы уже в этой команде | You are already in this team |
| `team.join.memberText` | «{{team}}» jamoasining aʼzosisiz. | Вы участник команды «{{team}}». | You are a member of “{{team}}”. |
| `team.join.toTeam` | Jamoamga oʻtish | Перейти в мою команду | Go to my team |
| `team.join.invalidTitle` | Havola yaroqsiz | Ссылка недействительна | Invalid link |
| `team.join.invalidText` | Taklif havolasi eskirgan yoki notoʻgʻri. Sardordan yangi havola soʻrang. | Ссылка устарела или неверна. Попросите капитана прислать новую. | The invite link is out of date or wrong. Ask the captain for a new one. |
| `team.join.home` | Bosh sahifaga | На главную | Go to home |
| `game.title` | Oʻyin | Игра | Game |
| `game.vs` | vs | vs | vs |
| `game.waitingOpponent` | Raqib kutilmoqda | Ждём соперника | Waiting for an opponent |
| `game.waitingText` | Raqib jamoa qabul qilishi bilan maydon band qilinadi va xabar beramiz. | Как только соперник примет вызов, поле будет забронировано, и мы сообщим. | As soon as an opponent accepts, the pitch is booked and we will let you know. |
| `game.chat` | Chat | Чат | Chat |
| `game.chatText` | Ikkala jamoa sardorlari bilan yozishma | Переписка капитанов обеих команд | Messages between both captains |
| `game.teams` | Jamoalar | Команды | Teams |
| `game.captain` | Sardor: {{name}} | Капитан: {{name}} | Captain: {{name}} |
| `game.myPayment` | Jamoangiz toʻlovi | Оплата вашей команды | Your team's payment |
| `game.joinPrice` | Qoʻshilishda toʻlov | Оплата при вступлении | Paid on joining |
| `game.paidInApp` | Ilovada toʻlangan | Оплачено в приложении | Paid in the app |
| `game.remainder` | Qolgan summa | Остаток | Left to pay |
| `game.remainderPaid` | Toʻlangan | Оплачено | Paid |
| `game.remainderUnpaid` | Toʻlanmagan | Не оплачено | Unpaid |
| `game.payRest` | Qolganini toʻlash | Доплатить | Pay the rest |
| `game.cashNote` | yoki maydonda naqd toʻlashingiz mumkin | или оплатите наличными на поле | or pay in cash at the pitch |
| `game.restPaid` | Qolgan summa toʻlandi | Остаток оплачен | The rest is paid |
| `game.declined` | Karta rad etildi. Boshqa karta tanlang. | Карта отклонена. Выберите другую. | The card was declined. Choose another. |
| `game.rules` | Bekor qilish shartlari | Условия отмены | Cancellation terms |
| `game.deadline` | {{date}}, {{time}} gacha bekor qilsangiz, jamoangiz toʻlagani toʻliq qaytariladi. | При отмене до {{date}}, {{time}} оплата команды вернётся полностью. | Cancel before {{date}}, {{time}} and your team gets everything back. |
| `game.refundNow` | Hozir bekor qilsangiz: {{amount}} qaytariladi | Если отменить сейчас: вернём {{amount}} | Cancel now: {{amount}} is refunded |
| `game.noRefundNow` | Hozir bekor qilsangiz, toʻlov qaytarilmaydi | Если отменить сейчас, оплата не вернётся | Cancel now and nothing is refunded |
| `game.cancel` | Oʻyinni bekor qilish | Отменить игру | Cancel the game |
| `game.cancelTitle` | Oʻyinni bekor qilasizmi? | Отменить игру? | Cancel this game? |
| `game.cancelConfirm` | Ha, bekor qilish | Да, отменить | Yes, cancel |
| `game.cancelKeep` | Yoʻq, qoldirish | Нет, оставить | No, keep it |
| `game.cancelled` | Oʻyin bekor qilindi | Игра отменена | Game cancelled |
| `game.notFoundTitle` | Oʻyin topilmadi | Игра не найдена | Game not found |
| `game.notFoundText` | Bu oʻyin mavjud emas. | Такой игры нет. | This game does not exist. |
| `game.payTitle` | Qolganini toʻlash | Доплата | Pay the rest |
| `game.payButton` | Toʻlash · {{amount}} | Оплатить · {{amount}} | Pay · {{amount}} |
| `game.unclearTitle` | Natijani tekshiring | Проверьте результат | Check the result |
| `game.unclearText` | Javob kelmadi. Toʻlov oʻtgan boʻlishi mumkin — Oʻyinlarim boʻlimida tekshiring, qayta urinmang. | Ответ не пришёл. Оплата могла пройти — проверьте «Мои игры», не повторяйте. | No answer came back. The payment may have gone through — check My games instead of trying again. |
| `game.toGames` | Oʻyinlarimga oʻtish | Перейти в «Мои игры» | Go to My games |
| `accept.title` | Raqibni qabul qilish | Принять вызов | Accept the challenge |
| `accept.payNow` | Jamoangiz hozir toʻlaydi | Ваша команда платит сейчас | Your team pays now |
| `accept.remainder` | Qolgan summa | Остаток | Left to pay |
| `accept.remainderNote` | Qolgan summani keyin ilovada yoki maydonda naqd toʻlaysiz. | Остаток — позже в приложении или наличными на поле. | Pay the rest later in the app or in cash at the pitch. |
| `accept.rule` | Oʻyin boshlanishiga 3 soatdan kam qolganda qabul qilib boʻlmaydi. | Меньше чем за 3 часа до игры принять вызов нельзя. | A challenge cannot be accepted less than 3 hours before the game. |
| `accept.submit` | Toʻlash va qabul qilish · {{amount}} | Оплатить и принять · {{amount}} | Pay and accept · {{amount}} |
| `accept.done` | Raqib qabul qilindi — maydon band qilindi | Вызов принят — поле забронировано | Challenge accepted — the pitch is booked |
| `accept.goneTitle` | Bu chaqiriq endi mavjud emas | Этот вызов больше недоступен | This challenge is no longer available |
| `accept.goneText` | Boshqa jamoa qabul qilgan yoki chaqiriq bekor qilingan. | Его уже приняли или отменили. | Another team accepted it or it was cancelled. |
| `accept.slotTakenTitle` | Bu vaqt band boʻlib qoldi | Это время уже заняли | This time was just taken |
| `accept.tooLateTitle` | Oʻyinga 3 soatdan kam qoldi | До игры меньше 3 часов | Less than 3 hours to the game |
| `accept.backToTeam` | Jamoamga qaytish | Вернуться в команду | Back to my team |
| `accept.pendingTitle` | Toʻlov tasdiqlanmoqda | Платёж подтверждается | Payment being confirmed |
| `accept.openGame` | Oʻyinni ochish | Открыть игру | Open the game |
| `accept.leaderOnlyTitle` | Faqat sardor qabul qila oladi | Принять может только капитан | Only the captain can accept |
| `choice.title` | Qanday band qilasiz? | Как бронируете? | How do you want to book? |
| `choice.self` | Oʻzim band qilaman | Забронирую сам | Book it myself |
| `choice.selfText` | Oddiy bron · {{price}} | Обычная бронь · {{price}} | A regular booking · {{price}} |
| `choice.opponent` | Raqib jamoa qidiraman | Найду команду-соперника | Find an opposing team |
| `choice.opponentText` | Jamoa vs jamoa · narxni ikki jamoa boʻlishadi | Команда на команду · цену делят две команды | Team vs team · two teams share the price |
| `choice.note` | «Raqib jamoa qidiraman» faqat jamoa sardorlariga koʻrinadi. | «Найти соперника» видят только капитаны. | "Find an opposing team" is shown to team captains only. |
| `choice.back` | Ortga | Назад | Back |
| `opponent.title` | Raqib qidirish | Поиск соперника | Find an opponent |
| `opponent.whichTeam` | Qaysi jamoa bilan? | Какой командой? | With which team? |
| `opponent.slotPrice` | Maydon narxi | Цена поля | Pitch price |
| `opponent.quoteSoon` | Jamoangiz toʻlaydigan summa oʻyin yaratilgach koʻrinadi (tez orada — oldindan). | Сумма для вашей команды появится после создания игры (скоро — заранее). | Your team's amount shows once the game is created (coming soon — beforehand). |
| `opponent.rules` | Raqib topilguncha kartangizda summa band qilinadi, maydon esa band qilinmaydi. Raqib topilmasa, pul toʻliq qaytariladi. | Пока соперник не найден, сумма удерживается на карте, а поле не бронируется. Если соперник не найдётся, деньги вернутся полностью. | Until an opponent is found, the amount is held on your card and the pitch is not booked. If nobody accepts, you get everything back. |
| `opponent.submit` | Raqib qidirishni boshlash | Начать поиск соперника | Start looking for an opponent |
| `opponent.started` | Raqib qidirish boshlandi | Поиск соперника начат | Looking for an opponent |
| `opponent.noLedTeam` | Raqib qidirish uchun jamoa sardori boʻlishingiz kerak. | Искать соперника может только капитан команды. | Only a team captain can look for an opponent. |
| `chat.title` | Chat | Чат | Chat |
| `chat.placeholder` | Xabar yozing… | Напишите сообщение… | Write a message… |
| `chat.input` | Xabar | Сообщение | Message |
| `chat.send` | Yuborish | Отправить | Send |
| `chat.emptyTitle` | Hali xabarlar yoʻq | Сообщений пока нет | No messages yet |
| `chat.emptyText` | Raqib jamoa sardori bilan oʻyinni kelishib oling. | Договоритесь об игре с капитаном соперников. | Agree on the game with the other captain. |
| `chat.closed` | Chat faqat tasdiqlangan oʻyinda ochiq. | Чат открыт только для подтверждённой игры. | Chat is open only for a confirmed game. |
| `chat.you` | Siz | Вы | You |
| `owner.tabs.schedule` | Jadval | Расписание | Schedule |
| `owner.tabs.stadium` | Maydonim | Моё поле | My pitch |
| `owner.tabs.report` | Hisobot | Отчёт | Report |
| `owner.tabs.profile` | Profil | Профиль | Profile |
| `owner.tabsLabel` | Ega rejimi boʻlimlari | Разделы режима владельца | Owner mode sections |
| `owner.pickStadium` | Maydon | Поле | Pitch |
| `owner.noStadiumTitle` | Sizda hali maydon yoʻq | У вас пока нет поля | You have no pitch yet |
| `owner.noStadiumText` | Maydon qoʻshing — admin tekshirgach, oʻyinchilar uni koʻradi. | Добавьте поле — после проверки админом его увидят игроки. | Add a pitch — players see it once an admin approves it. |
| `owner.addStadium` | Yangi maydon qoʻshish | Добавить поле | Add a pitch |
| `owner.status.pending` | Koʻrib chiqilmoqda | На проверке | Under review |
| `owner.status.approved` | Faol | Активно | Active |
| `owner.status.rejected` | Rad etildi | Отклонено | Rejected |
| `owner.status.blocked` | Bloklangan | Заблокировано | Blocked |
| `owner.banner.pending` | Maydon admin tomonidan koʻrib chiqilmoqda. Tasdiqlangach, oʻyinchilar uni koʻradi. | Поле проверяет администратор. После одобрения его увидят игроки. | An admin is reviewing the pitch. Players see it once it is approved. |
| `owner.banner.rejected` | Maydon rad etildi. | Поле отклонено. | The pitch was rejected. |
| `owner.banner.blocked` | Maydon bloklangan va oʻyinchilarga koʻrinmaydi. | Поле заблокировано и не видно игрокам. | The pitch is blocked and hidden from players. |
| `owner.banner.reason` | Sabab: {{reason}} | Причина: {{reason}} | Reason: {{reason}} |
| `owner.section.info` | Maʼlumotlar | Данные | Details |
| `owner.section.infoText` | Nomi, manzili, tumani, format, qoplama | Название, адрес, район, формат, покрытие | Name, address, district, format, surface |
| `owner.section.photos` | Rasmlar | Фото | Photos |
| `owner.section.hours` | Ish vaqti | Часы работы | Opening hours |
| `owner.section.prices` | Narxlar | Цены | Prices |
| `owner.section.pricesText` | Asosiy narx: {{price}} | Базовая цена: {{price}} | Base price: {{price}} |
| `owner.section.terms` | Bron shartlari | Условия брони | Booking terms |
| `owner.section.closures` | Yopiq kunlar | Закрытые дни | Closed days |
| `owner.section.closuresText` | Rejalashtirilgan yopilishlar | Запланированные закрытия | Planned closures |
| `owner.section.hoursText` | Ochilish va yopilish vaqti | Время открытия и закрытия | Opening and closing time |
| `owner.section.termsText` | Oldindan toʻlov va bekor qilish muddati | Предоплата и срок отмены | Deposit and cancellation period |
| `owner.section.photosText` | Koʻpi bilan 10 ta, birinchisi — muqova | До 10 фото, первое — обложка | Up to 10, the first is the cover |
| `owner.soonDetail` | Tez orada — server bu maʼlumotni egaga hali bermaydi | Скоро — сервер пока не отдаёт эти данные владельцу | Coming soon — the server does not give the owner this yet |
| `owner.save` | Saqlash | Сохранить | Save |
| `owner.saved` | Saqlandi | Сохранено | Saved |
| `owner.cancel` | Bekor qilish | Отмена | Cancel |
| `owner.remove` | Oʻchirish | Удалить | Delete |
| `owner.removeItem` | {{item}} — oʻchirish | {{item}} — удалить | {{item}} — delete |
| `owner.add` | Qoʻshish | Добавить | Add |
| `owner.field.name` | Maydon nomi | Название поля | Pitch name |
| `owner.field.address` | Manzil | Адрес | Address |
| `owner.field.district` | Tuman | Район | District |
| `owner.field.format` | Format | Формат | Format |
| `owner.field.surface` | Qoplama | Покрытие | Surface |
| `owner.field.phone` | Telefon (ixtiyoriy) | Телефон (необязательно) | Phone (optional) |
| `owner.field.description` | Tavsif (ixtiyoriy) | Описание (необязательно) | Description (optional) |
| `owner.field.open` | Ochilish | Открытие | Opens |
| `owner.field.close` | Yopilish | Закрытие | Closes |
| `owner.field.price` | Soatlik narx (soʻm) | Цена за час (сум) | Price per hour (soʻm) |
| `owner.field.priceHint` | Oʻyinchilar uchun narx karta toʻlovi bilan biroz yuqoriroq koʻrinadi. | Игроки увидят цену немного выше — с учётом оплаты картой. | Players see a slightly higher price that covers the card payment. |
| `owner.field.minimum` | Oldindan toʻlov (soʻm, ixtiyoriy) | Предоплата (сум, необязательно) | Deposit (soʻm, optional) |
| `owner.field.minimumHint` | Boʻsh qolsa — faqat toʻliq toʻlov. Kamida 500 soʻm. | Пусто — только полная оплата. Минимум 500 сум. | Empty means full payment only. At least 500 soʻm. |
| `owner.field.cancelHours` | Bepul bekor qilish (soat) | Бесплатная отмена (часов) | Free cancellation (hours) |
| `owner.field.day` | Kun | День | Day |
| `owner.field.from` | Dan | С | From |
| `owner.field.to` | Gacha | До | To |
| `owner.field.startDate` | Boshlanish sanasi | Дата начала | Start date |
| `owner.field.endDate` | Tugash sanasi | Дата окончания | End date |
| `owner.field.reason` | Sabab (ixtiyoriy) | Причина (необязательно) | Reason (optional) |
| `owner.field.clientName` | Mijoz ismi | Имя клиента | Client name |
| `owner.field.clientPhone` | Mijoz telefoni | Телефон клиента | Client phone |
| `owner.field.time` | Vaqt | Время | Time |
| `owner.field.cashPaid` | Naqd toʻlandi | Оплачено наличными | Paid in cash |
| `owner.field.hoursUnit` | {{count}} soat | {{count}} ч | {{count}} h |
| `owner.prices.title` | Narxlar | Цены | Prices |
| `owner.prices.empty` | Alohida narx qoidalari yoʻq — asosiy narx amal qiladi. | Отдельных правил нет — действует базовая цена. | No special rules — the base price applies. |
| `owner.prices.add` | Narx qoidasi qoʻshish | Добавить правило цены | Add a price rule |
| `owner.prices.player` | Oʻyinchiga: {{price}} | Для игрока: {{price}} | For players: {{price}} |
| `owner.prices.added` | Narx qoidasi qoʻshildi | Правило добавлено | Price rule added |
| `owner.prices.removed` | Narx qoidasi oʻchirildi | Правило удалено | Price rule removed |
| `owner.prices.minimum` | Oldindan toʻlov | Предоплата | Deposit |
| `owner.prices.minimumField` | Eng kam toʻlov (soʻm) | Минимальная оплата (сум) | Minimum payment (soʻm) |
| `owner.prices.minimumText` | Oʻyinchi band qilishda kamida shu summani toʻlaydi, qolganini keyin. Kamida 500 soʻm. Joriy qiymat hozircha koʻrsatilmaydi — tez orada. | При бронировании игрок платит не меньше этой суммы, остальное позже. Не меньше 500 сум. Текущее значение пока не показывается — скоро. | Players pay at least this much when booking and the rest later. At least 500 soʻm. The current value is not shown yet — coming soon. |
| `owner.prices.edit` | Narx qoidasini oʻzgartirish | Изменить правило цены | Edit price rule |
| `owner.prices.updated` | Narx qoidasi saqlandi | Правило цены сохранено | Price rule saved |
| `owner.prices.editBase` | Asosiy narxni oʻzgartirish | Изменить базовую цену | Change the base price |
| `owner.prices.base` | Asosiy narx | Базовая цена | Base price |
| `owner.prices.baseText` | Narx qoidalari qamramagan barcha soatlar uchun. Oʻyinchilar narxi shundan hisoblanadi. | Для всех часов, которые не попадают в правила цены. Цена для игроков считается от неё. | For every hour no price rule covers. The player price is worked out from it. |
| `owner.closures.title` | Yopiq kunlar | Закрытые дни | Closed days |
| `owner.closures.empty` | Rejalashtirilgan yopilish yoʻq. | Закрытий не запланировано. | No closures planned. |
| `owner.closures.add` | Yopiq kun qoʻshish | Добавить закрытие | Add a closure |
| `owner.closures.allDay` | Butun kun | Весь день | All day |
| `owner.closures.added` | Yopiq kun qoʻshildi | Закрытие добавлено | Closure added |
| `owner.closures.removed` | Yopiq kun oʻchirildi | Закрытие удалено | Closure removed |
| `owner.schedule.free` | Boʻsh | Свободно | Free |
| `owner.schedule.closed` | Yopiq | Закрыто | Closed |
| `owner.schedule.past` | Oʻtgan | Прошло | Past |
| `owner.schedule.summary` | Band: {{booked}}/{{total}} · Tushum: {{revenue}} | Занято: {{booked}}/{{total}} · Выручка: {{revenue}} | Booked: {{booked}}/{{total}} · Revenue: {{revenue}} |
| `owner.schedule.walkIn` | Qoʻlda band qilish | Забронировать вручную | Add a walk-in |
| `owner.schedule.waitingGame` | {{team}} raqib kutmoqda | {{team}} ждёт соперника | {{team}} is waiting for an opponent |
| `owner.schedule.empty` | Bu kunga bronlar yoʻq. | На этот день броней нет. | No bookings for this day. |
| `owner.schedule.walkInTitle` | Qoʻlda band qilish | Ручная бронь | Walk-in booking |
| `owner.schedule.walkInDone` | Bron qoʻshildi | Бронь добавлена | Booking added |
| `owner.schedule.noFreeHour` | Bu kunda boʻsh soat yoʻq. | В этот день свободных часов нет. | No free hour on this day. |
| `owner.schedule.waitingWarning` | Bu soatda jamoa raqib kutmoqda. Qoʻlda band qilsangiz, ularning oʻyini bekor qilinadi va pul qaytariladi. | В этот час команда ждёт соперника. Ручная бронь отменит их игру и вернёт деньги. | A team is waiting for an opponent at this hour. A walk-in cancels their game and refunds them. |
| `owner.schedule.waitingShort` | Jamoa kutmoqda | Команда ждёт | A team is waiting |
| `owner.booking.title` | Bron tafsilotlari | Детали брони | Booking details |
| `owner.booking.player` | Oʻyinchi (ilova) | Игрок (приложение) | Player (app) |
| `owner.booking.walkIn` | Qoʻlda | Вручную | Walk-in |
| `owner.booking.price` | Narx | Цена | Price |
| `owner.booking.paidInApp` | Ilovada toʻlangan | Оплачено в приложении | Paid in the app |
| `owner.booking.remaining` | Naqd olinadi | Получить наличными | To collect in cash |
| `owner.booking.receives` | Sizga tushadi | Вы получите | You receive |
| `owner.booking.cash` | Naqd olindi | Наличные получены | Cash received |
| `owner.booking.call` | Qoʻngʻiroq | Позвонить | Call |
| `owner.booking.cancel` | Bronni bekor qilish | Отменить бронь | Cancel the booking |
| `owner.booking.cancelTitle` | Bronni bekor qilasizmi? | Отменить бронь? | Cancel this booking? |
| `owner.booking.cancelText` | Oʻyinchiga karta orqali toʻlagan hamma pul qaytariladi. | Игроку вернутся все деньги, оплаченные картой. | The player gets back everything paid by card. |
| `owner.booking.cancelled` | Bron bekor qilindi | Бронь отменена | Booking cancelled |
| `owner.booking.playerPays` | Oʻyinchi toʻlaydi | Игрок платит | The player pays |
| `owner.booking.cashDone` | Naqd toʻlov qayd etildi | Оплата наличными записана | Cash payment recorded |
| `owner.booking.cashConfirmText` | Mijozdan {{amount}} naqd olinganini tasdiqlaysizmi? | Подтверждаете, что получили от клиента {{amount}} наличными? | Confirm that you received {{amount}} in cash from the client? |
| `owner.report.today` | Bugun | Сегодня | Today |
| `owner.report.week` | Hafta | Неделя | Week |
| `owner.report.month` | Oy | Месяц | Month |
| `owner.report.periods` | Davr | Период | Period |
| `owner.report.bookings` | Bronlar | Брони | Bookings |
| `owner.report.revenue` | Tushum | Выручка | Revenue |
| `owner.report.rating` | Reyting | Рейтинг | Rating |
| `owner.report.occupancy` | Bandlik | Загрузка | Occupancy |
| `owner.report.unpaid` | Toʻlanmagan qoldiqlar | Неоплаченные остатки | Unpaid remainders |
| `owner.report.chartTitle` | Kunlik tushum | Выручка по дням | Daily revenue |
| `owner.report.chartWindow` | Davr | Период | Period |
| `owner.report.days` | {{count}} kun | {{count}} дн. | {{count}} days |
| `owner.report.chartTotal` | Davr boʻyicha jami | Всего за период | Total for the period |
| `owner.report.bookingCount` | {{count}} ta bron | броней: {{count}} | {{count}} bookings |
| `owner.report.date` | Sana | Дата | Date |
| `owner.report.inApp` | Ilova orqali olingan | Получено через приложение | Received in the app |
| `owner.report.inCash` | Naqd olingan | Получено наличными | Received in cash |
| `owner.report.outstanding` | Toʻlanmagan qoldiq | Неоплаченный остаток | Still owed |
| `owner.report.unpaidEmpty` | Toʻlanmagan qoldiqlar yoʻq. | Неоплаченных остатков нет. | Nothing is still owed. |
| `owner.report.owes` | Qolgan: {{amount}} | Осталось: {{amount}} | Still owed: {{amount}} |
| `owner.report.cash` | Naqd olindi | Получено наличными | Cash received |
| `owner.profile.playerMode` | Oʻyinchi rejimiga qaytish | Вернуться в режим игрока | Back to player mode |
| `owner.profile.playerModeText` | Maydon band qilish va jamoa oʻyinlari | Бронирование полей и командные игры | Book pitches and play team games |
| `owner.profile.payouts` | Toʻlovlar | Выплаты | Payouts |
| `owner.profile.badge` | Maydon egasi · {{count}} maydon | Владелец · полей: {{count}} | Pitch owner · {{count}} pitches |
| `owner.profile.sectionStadium` | Maydon | Поле | Pitch |
| `owner.profile.myStadiums` | Maydonlarim | Мои поля | My pitches |
| `owner.profile.count` | {{count}} ta | {{count}} | {{count}} |
| `owner.profile.switchStadium` | Maydonni tanlang | Выберите поле | Choose a pitch |
| `owner.wizard.title` | Maydon qoʻshish | Добавление поля | Add a pitch |
| `owner.wizard.step` | {{n}}-qadam / {{total}} · {{name}} | Шаг {{n}} из {{total}} · {{name}} | Step {{n}} of {{total}} · {{name}} |
| `owner.wizard.basics` | Asosiy | Основное | Basics |
| `owner.wizard.place` | Manzil | Адрес | Location |
| `owner.wizard.hours` | Ish vaqti | Часы работы | Opening hours |
| `owner.wizard.price` | Narx va shartlar | Цена и условия | Price and terms |
| `owner.wizard.review` | Koʻrib chiqish | Проверка | Review |
| `owner.wizard.next` | Davom etish | Далее | Next |
| `owner.wizard.back` | Ortga | Назад | Back |
| `owner.wizard.submit` | Tekshiruvga yuborish | Отправить на проверку | Send for review |
| `owner.wizard.photosSoon` | Rasmlarni maydon yuborilgach, Maydonim → Rasmlar boʻlimida yuklaysiz. | Фото загрузите после отправки поля, в разделе Моё поле → Фото. | Upload photos after sending the pitch, in My pitch → Photos. |
| `owner.wizard.hoursError` | Yopilish vaqti ochilishdan keyin boʻlishi kerak. | Время закрытия должно быть позже открытия. | Closing time must be after opening time. |
| `owner.wizard.sentTitle` | Maydon tekshiruvga yuborildi | Поле отправлено на проверку | The pitch was sent for review |
| `owner.wizard.sentText` | Admin tasdiqlagach, oʻyinchilar uni koʻradi va band qila oladi. | После одобрения админом игроки смогут его увидеть и забронировать. | Once an admin approves it, players can see and book it. |
| `owner.wizard.toStadium` | Maydonimga oʻtish | Перейти к полю | Go to my pitch |
| `owner.wizard.onTheHour` | Vaqt butun soatda boʻlishi kerak (masalan, 08:00). | Время должно быть ровно в начале часа (например, 08:00). | Times must be on the hour (e.g. 08:00). |
| `owner.wizard.toProfile` | Profilga qaytish | Вернуться в профиль | Back to Profile |
| `owner.discount.title` | Narxni oʻzgartirish | Изменить цену | Change price |
| `owner.discount.open` | {{time}} narxini oʻzgartirish | Изменить цену на {{time}} | Change the {{time}} price |
| `owner.discount.percent` | Chegirma (%) | Скидка (%) | Discount (%) |
| `owner.discount.hint` | 1 dan 100 gacha | От 1 до 100 | 1 to 100 |
| `owner.discount.playersSee` | Oʻyinchilar koʻradi | Игроки видят | Players see |
| `owner.discount.note` | Bu soat uchun narxni chegirma bilan pasaytirish mumkin. Oʻyinchilar narxi chegirmadan keyin hisoblanadi. | Цену на этот час можно снизить скидкой. Цена для игроков рассчитывается после скидки. | You can lower this hour’s price with a discount. The player price is worked out after the discount. |
| `owner.discount.name` | {{time}} chegirmasi | Скидка на {{time}} | {{time}} discount |
| `owner.discount.saved` | Chegirma saqlandi | Скидка сохранена | Discount saved |
| `owner.discount.remove` | Chegirmani olib tashlash | Убрать скидку | Remove discount |
| `owner.discount.removed` | Chegirma olib tashlandi | Скидка убрана | Discount removed |
| `owner.editItem` | {{item}} — oʻzgartirish | {{item}} — изменить | {{item}} — edit |
| `owner.gameCash.title` | Jamoalar toʻlovi | Оплата команд | Team payments |
| `owner.gameCash.owes` | {{team}} · Qolgani: {{amount}} | {{team}} · Осталось: {{amount}} | {{team}} · Still owed: {{amount}} |
| `owner.gameCash.paid` | {{team}} · Toʻlangan | {{team}} · Оплачено | {{team}} · Paid |
| `owner.gameCash.button` | Naqd olindi · {{amount}} | Получено наличными · {{amount}} | Cash received · {{amount}} |
| `owner.gameCash.confirmTitle` | Naqd toʻlovni tasdiqlash | Подтвердите оплату наличными | Confirm cash payment |
| `owner.gameCash.confirmText` | {{team}} jamoasidan {{amount}} naqd olinganini tasdiqlaysizmi? | Подтверждаете, что получили {{amount}} наличными от команды {{team}}? | Confirm that you received {{amount}} in cash from {{team}}? |
| `owner.gameCash.confirm` | Tasdiqlash | Подтвердить | Confirm |
| `owner.gameCash.done` | Naqd toʻlov qayd etildi | Оплата наличными записана | Cash payment recorded |
| `owner.contract.title` | Toʻlovlar va shartnoma | Выплаты и договор | Payouts and contract |
| `owner.contract.readOnly` | Faqat koʻrish uchun — oʻzgartirish uchun bizga yozing | Только просмотр — чтобы изменить, напишите нам | Read only — write to us to change it |
| `owner.contract.legalType` | Yuridik shakl | Юридическая форма | Legal form |
| `owner.contract.atmos` | ATMOS shartnomasi | Договор ATMOS | ATMOS contract |
| `owner.contract.notSet` | Kiritilmagan | Не указано | Not set |
| `owner.contract.payoutNote` | Ilova orqali toʻlovlar shartnoma boʻyicha hisobingizga oʻtkaziladi. | Оплаты через приложение перечисляются на ваш счёт по договору. | Payments made in the app are transferred to your account under the contract. |
| `owner.contract.support` | Qoʻllab-quvvatlashga yozish | Написать в поддержку | Write to support |
| `owner.contract.status.none` | Yoʻq | Нет | None |
| `owner.contract.status.pending` | Jarayonda | В процессе | In progress |
| `owner.contract.status.signed` | Imzolangan | Подписан | Signed |
| `owner.contract.legal.yatt` | YaTT | ИП | Sole proprietor |
| `owner.contract.legal.mchj` | MChJ | ООО | LLC |
| `owner.contract.legal.self_employed` | Oʻzini oʻzi band qilgan | Самозанятый | Self-employed |
| `owner.reviews.title` | Sharhlar | Отзывы | Reviews |
| `owner.reviews.count` | {{count}} ta sharh | отзывов: {{count}} | {{count}} reviews |
| `owner.reviews.emptyTitle` | Hozircha sharhlar yoʻq | Отзывов пока нет | No reviews yet |
| `owner.reviews.emptyText` | Oʻyinchilar oʻynagandan keyin maydoningizni baholaydi. | Игроки оценивают поле после игры. | Players rate your pitch after they play. |
| `owner.reviews.yourReply` | Sizning javobingiz | Ваш ответ | Your reply |
| `owner.reviews.reply` | Javob berish | Ответить | Reply |
| `owner.reviews.replyTitle` | Sharhga javob | Ответ на отзыв | Reply to the review |
| `owner.reviews.replyLabel` | Javobingiz | Ваш ответ | Your reply |
| `owner.reviews.send` | Yuborish | Отправить | Send |
| `owner.reviews.sent` | Javob yuborildi | Ответ отправлен | Reply sent |
| `owner.hours.note` | Soatlik bronlar shu oraliqda ochiladi. Alohida kunlarni «Yopiq kunlar» boʻlimida yoping. | Почасовые брони открываются в этом промежутке. Отдельные дни закрывайте в разделе «Закрытые дни». | Hourly bookings open within these hours. Close single days in “Closed days”. |
| `owner.terms.minimum` | Minimal toʻlov | Минимальная оплата | Minimum payment |
| `owner.terms.minimumOn` | Oʻyinchi band qilishda kamida shu summani oldindan toʻlaydi, qolganini keyin. | При бронировании игрок платит не меньше этой суммы, остальное — потом. | When booking, the player pays at least this amount up front and the rest later. |
| `owner.terms.minimumOff` | Minimum yoʻq — oʻyinchi band qilishda toʻliq toʻlaydi. | Без минимума — игрок платит полностью при бронировании. | No minimum — the player pays in full when booking. |
| `owner.terms.playerPays` | Oʻyinchilar uchun: {{amount}} | Для игроков: {{amount}} | Players pay: {{amount}} |
| `owner.terms.cancelTitle` | Bekor qilish muddati | Срок отмены | Cancellation period |
| `owner.terms.cancelText` | Oʻyin boshlanishiga shuncha soat qolguncha bekor qilinsa, toʻlov toʻliq qaytariladi. | Если отменить не позже чем за столько часов до игры, оплата возвращается полностью. | Cancelled at least this many hours before the game, the payment is refunded in full. |
| `owner.terms.hours` | {{count}} soat | {{count}} ч | {{count}} h |
| `owner.terms.less` | Bir soat kamroq | На час меньше | One hour less |
| `owner.terms.more` | Bir soat koʻproq | На час больше | One hour more |
| `owner.photos.text` | Birinchi rasm muqova boʻladi. Tartibni oʻqlar bilan oʻzgartiring. | Первое фото — обложка. Меняйте порядок стрелками. | The first photo is the cover. Change the order with the arrows. |
| `owner.photos.upload` | Rasm yuklash | Загрузить фото | Upload a photo |
| `owner.photos.uploaded` | Rasm yuklandi | Фото загружено | Photo uploaded |
| `owner.photos.deleted` | Rasm oʻchirildi | Фото удалено | Photo deleted |
| `owner.photos.emptyTitle` | Hozircha rasm yoʻq | Фото пока нет | No photos yet |
| `owner.photos.emptyText` | Maydon rasmlari oʻyinchilarga tanlashda yordam beradi. | Фото поля помогают игрокам выбрать. | Photos help players choose your pitch. |
| `owner.photos.alt` | {{n}}-rasm | Фото {{n}} | Photo {{n}} |
| `owner.photos.cover` | Muqova | Обложка | Cover |
| `owner.photos.makeCover` | Muqova qilish | Сделать обложкой | Make cover |
| `owner.photos.delete` | {{n}}-rasmni oʻchirish | Удалить фото {{n}} | Delete photo {{n}} |
| `owner.photos.left` | {{n}}-rasmni chapga surish | Сдвинуть фото {{n}} влево | Move photo {{n}} left |
| `owner.photos.right` | {{n}}-rasmni oʻngga surish | Сдвинуть фото {{n}} вправо | Move photo {{n}} right |
| `owner.photos.limits` | {{count}} / {{max}} · JPG, PNG yoki WebP, 10 MB gacha | {{count}} / {{max}} · JPG, PNG или WebP, до 10 МБ | {{count}} / {{max}} · JPG, PNG or WebP, up to 10 MB |
| `notifications.title` | Bildirishnomalar | Уведомления | Notifications |
| `notifications.unreadValue` | {{count}} ta yangi | новых: {{count}} | {{count}} new |
| `notifications.unread` | oʻqilmagan | не прочитано | unread |
| `notifications.readAll` | Hammasini oʻqilgan deb belgilash | Отметить все прочитанными | Mark all as read |
| `notifications.emptyTitle` | Bildirishnomalar yoʻq | Уведомлений нет | No notifications |
| `notifications.emptyText` | Bronlar, oʻyinlar va toʻlovlar haqidagi xabarlar shu yerda chiqadi. | Здесь появятся сообщения о бронях, играх и платежах. | News about your bookings, games and payments will appear here. |
| `notifications.types.booking_confirmed` | Bron tasdiqlandi | Бронь подтверждена | Booking confirmed |
| `notifications.types.booking_cancelled` | Bron bekor qilindi | Бронь отменена | Booking cancelled |
| `notifications.types.booking_reminder` | Bron eslatmasi | Напоминание о брони | Booking reminder |
| `notifications.types.booking_expired` | Bron muddati oʻtdi | Срок брони истёк | Booking expired |
| `notifications.types.game_confirmed` | Oʻyin tasdiqlandi | Игра подтверждена | Game confirmed |
| `notifications.types.game_cancelled` | Oʻyin bekor qilindi | Игра отменена | Game cancelled |
| `notifications.types.game_player_joined` | Oʻyinga qoʻshilishdi | К игре присоединились | Someone joined your game |
| `notifications.types.game_player_left` | Oʻyinchi chiqib ketdi | Игрок вышел | A player left |
| `notifications.types.game_payment_received` | Oʻyin uchun toʻlov qabul qilindi | Оплата за игру получена | Game payment received |
| `notifications.types.game_opponent_left` | Raqib chiqib ketdi | Соперник вышел | The opponent left |
| `notifications.types.review_reply` | Sharhingizga javob berildi | Ответ на ваш отзыв | Reply to your review |
| `notifications.types.stadium_approved` | Maydoningiz tasdiqlandi | Ваше поле одобрено | Your pitch was approved |
| `notifications.types.stadium_rejected` | Maydoningiz rad etildi | Ваше поле отклонено | Your pitch was rejected |
| `notifications.types.owner_application_status` | Arizangiz koʻrib chiqildi | Ваша заявка рассмотрена | Your application was reviewed |
| `notifications.types.promotion_new` | Yangi aksiya | Новая акция | New promotion |
| `notifications.types.other` | Yangi xabar | Новое сообщение | New message |
| `phonePage.current` | Hozirgi raqam: {{phone}} | Текущий номер: {{phone}} | Current number: {{phone}} |
| `phonePage.shareTitle` | Telegram orqali ulashing | Поделитесь через Telegram | Share via Telegram |
| `phonePage.shareText` | Raqamingiz Telegram hisobingizdan olinadi — kiritish shart emas. | Номер возьмётся из вашего аккаунта Telegram — вводить не нужно. | Your number is taken from your Telegram account — no typing needed. |
| `phonePage.share` | Raqamni ulashish | Поделиться номером | Share my number |
| `phonePage.or` | yoki qoʻlda kiriting | или введите вручную | or type it in |
| `phonePage.shared` | Raqam saqlandi | Номер сохранён | Number saved |
| `phonePage.notReceived` | Raqam hali kelmadi. Qoʻlda kiriting yoki birozdan soʻng qayta urinib koʻring. | Номер ещё не пришёл. Введите его вручную или попробуйте чуть позже. | The number has not arrived yet. Type it in or try again in a moment. |
| `help.title` | Yordam | Помощь | Help |
| `help.supportTitle` | Savolingiz bormi? | Есть вопрос? | Have a question? |
| `help.supportText` | Qoʻllab-quvvatlash xizmatiga Telegramʼda yozing. | Напишите в поддержку в Telegram. | Write to support on Telegram. |
| `help.supportSoon` | Qoʻllab-quvvatlash chati tez orada qoʻshiladi. | Чат поддержки скоро появится. | A support chat is coming soon. |
| `help.write` | @{{username}} ga yozish | Написать @{{username}} | Message @{{username}} |
| `help.faq` | Koʻp soʻraladigan savollar | Частые вопросы | Frequently asked questions |
| `help.q.booking` | Qanday bron qilaman? | Как забронировать? | How do I book? |
| `help.q.cancel` | Bekor qilish va pulni qaytarish | Отмена и возврат денег | Cancelling and refunds |
| `help.q.cash` | Qolganini naqd toʻlash | Оплата остатка наличными | Paying the rest in cash |
| `help.q.teams` | Jamoa jamoaga qarshi oʻyin | Игра команда на команду | Team vs team games |
| `help.q.stadium` | Maydonimni qanday qoʻshaman? | Как добавить своё поле? | How do I add my pitch? |
| `help.a.booking` | Maydonlar boʻlimida maydonni tanlang, kun va bir soatlik vaqtni belgilang, soʻng kartangiz bilan toʻlang. Bir necha soat kerak boʻlsa, har biri uchun alohida bron qiling. | В разделе «Поля» выберите поле, день и час, затем оплатите картой. Если нужно несколько часов, бронируйте каждый отдельно. | In Pitches choose a pitch, a day and an hour, then pay by card. Need several hours? Book each one separately. |
| `help.a.cancel` | Oʻyinlarim → bron → «Bekor qilish». Qancha pul qaytishi bekor qilishdan oldin bron sahifasida koʻrsatiladi — u maydonning bekor qilish shartlariga va oʻyingacha qolgan vaqtga bogʻliq. Pul kartangizga qaytariladi. | Мои игры → бронь → «Отменить». Сумма возврата показывается на странице брони до отмены — она зависит от условий поля и времени до игры. Деньги вернутся на карту. | My games → booking → “Cancel”. The refund is shown on the booking page before you cancel — it depends on the pitch's cancellation terms and how long is left before the game. The money goes back to your card. |
| `help.a.cash` | Agar maydon oldindan toʻlovga ruxsat bersa, bron qilishda faqat bir qismini toʻlaysiz. Qolganini oʻyin kuni maydonda naqd berishingiz yoki ilovada «Qolganini toʻlash» orqali karta bilan toʻlashingiz mumkin. | Если поле разрешает предоплату, при бронировании вы платите только часть. Остаток можно отдать наличными на поле в день игры или оплатить картой в приложении через «Оплатить остаток». | If the pitch allows a deposit, you pay only part of the price when booking. Pay the rest in cash at the pitch on the day, or by card in the app with “Pay the rest”. |
| `help.a.teams` | Jamoam boʻlimida jamoa yarating va doʻstlaringizni taklif havolasi bilan qoʻshing. Sardor vaqt tanlab raqib qidiradi; boshqa jamoa qabul qilsa, oʻyin tasdiqlanadi va maydon narxi ikki jamoa orasida boʻlinadi. | В разделе «Моя команда» создайте команду и пригласите друзей по ссылке. Капитан выбирает время и ищет соперника; когда другая команда принимает вызов, игра подтверждается, а стоимость поля делится между командами. | In My team create a team and invite friends with the invite link. The captain picks a time and looks for an opponent; when another team accepts, the game is confirmed and the pitch price is split between the teams. |
| `help.a.stadium` | Profil → «Maydon qoʻshish». Maʼlumotlarni toʻldirib yuboring — maydon koʻrib chiqiladi va tasdiqlangach oʻyinchilarga koʻrinadi. Shundan soʻng Profil orqali ega rejimiga oʻtasiz. | Профиль → «Добавить поле». Заполните данные и отправьте — поле проверят, и после одобрения его увидят игроки. Затем через Профиль вы перейдёте в режим владельца. | Profile → “Add a pitch”. Fill in the details and send — the pitch is reviewed, and once approved players can see it. Then switch to owner mode from Profile. |
| `about.title` | Ilova haqida | О приложении | About |
| `about.version` | Versiya {{version}} | Версия {{version}} | Version {{version}} |
| `about.terms` | Foydalanish shartlari | Условия использования | Terms of use |
| `about.privacy` | Maxfiylik siyosati | Политика конфиденциальности | Privacy policy |
| `about.copyright` | © 2026 MiniPolya · Toshkent | © 2026 MiniPolya · Ташкент | © 2026 MiniPolya · Tashkent |
| `legal.terms.general.title` | Umumiy qoidalar | Общие положения | General |
| `legal.terms.general.text` | MiniPolya — Toshkentdagi futbol maydonlarini onlayn bron qilish xizmati. Ilovadan foydalanib, siz ushbu shartlarga rozilik bildirasiz. | MiniPolya — сервис онлайн-бронирования футбольных полей в Ташкенте. Пользуясь приложением, вы соглашаетесь с этими условиями. | MiniPolya is an online booking service for football pitches in Tashkent. By using the app you agree to these terms. |
| `legal.terms.booking.title` | Bron va toʻlov | Бронь и оплата | Booking and payment |
| `legal.terms.booking.text` | Bron toʻlov qabul qilingandan keyin tasdiqlanadi. Siz bron oynasida koʻrsatilgan narxni toʻlaysiz; qoʻshimcha toʻlov olinmaydi. | Бронь подтверждается после оплаты. Вы платите цену, указанную при бронировании; дополнительных сборов нет. | A booking is confirmed once it is paid. You pay the price shown when booking; there are no extra charges. |
| `legal.terms.cancel.title` | Bekor qilish va qaytarish | Отмена и возврат | Cancelling and refunds |
| `legal.terms.cancel.text` | Har bir maydonning bekor qilish shartlari bron sahifasida koʻrsatiladi. Qaytariladigan summa bekor qilishdan oldin aniq koʻrsatiladi. | Условия отмены каждого поля указаны на странице брони. Сумма возврата показывается до отмены. | Each pitch's cancellation terms are shown on the booking page. The refund is shown before you cancel. |
| `legal.terms.owners.title` | Maydon egalari | Владельцы полей | Pitch owners |
| `legal.terms.owners.text` | Maydon egasi maydon haqidagi maʼlumotlar, narxlar va ish vaqti toʻgʻriligi uchun javob beradi. Maydonlar tasdiqlangandan keyingina oʻyinchilarga koʻrinadi. | Владелец отвечает за точность данных о поле, цен и часов работы. Поля видны игрокам только после одобрения. | Owners are responsible for accurate pitch details, prices and opening hours. Pitches are visible to players only after approval. |
| `legal.terms.changes.title` | Oʻzgarishlar | Изменения | Changes |
| `legal.terms.changes.text` | Shartlar oʻzgarsa, yangi tahriri shu sahifada eʼlon qilinadi. | Если условия изменятся, новая редакция будет опубликована на этой странице. | If these terms change, the new version is published on this page. |
| `legal.privacy.collect.title` | Qanday maʼlumot yigʻamiz | Какие данные мы собираем | What we collect |
| `legal.privacy.collect.text` | Telegram identifikatoringiz, siz kiritgan ism, familiya va telefon raqam, bronlar va toʻlovlar tarixi. | Ваш идентификатор Telegram, указанные вами имя, фамилию и телефон, историю броней и платежей. | Your Telegram id, the first name, last name and phone you enter, and your booking and payment history. |
| `legal.privacy.use.title` | Nima uchun | Зачем | Why |
| `legal.privacy.use.text` | Bron qilish, toʻlovlarni amalga oshirish, maydon egasi siz bilan bogʻlanishi va bildirishnomalar yuborish uchun. | Чтобы бронировать и проводить платежи, чтобы владелец поля мог с вами связаться, и для уведомлений. | To make bookings and payments, so the pitch owner can reach you, and to send notifications. |
| `legal.privacy.share.title` | Kim bilan baham koʻramiz | С кем мы делимся | Who we share it with |
| `legal.privacy.share.text` | Bron qilgan maydon egasi ismingiz va telefon raqamingizni koʻradi. Karta maʼlumotlari faqat toʻlov tizimida saqlanadi — biz ularni koʻrmaymiz. | Владелец забронированного поля видит ваше имя и телефон. Данные карты хранятся только у платёжной системы — мы их не видим. | The owner of a pitch you book sees your name and phone. Card details are kept only by the payment provider — we never see them. |
| `legal.privacy.keep.title` | Saqlash | Хранение | How long |
| `legal.privacy.keep.text` | Maʼlumotlar xizmat ishlashi uchun kerak boʻlgan muddat davomida saqlanadi. | Данные хранятся столько, сколько нужно для работы сервиса. | Data is kept for as long as the service needs it to work. |
| `legal.privacy.contact.title` | Bogʻlanish | Связь | Contact |
| `legal.privacy.contact.text` | Maʼlumotlaringiz boʻyicha savollar uchun Yordam boʻlimidagi qoʻllab-quvvatlash chatiga yozing. | По вопросам о ваших данных пишите в чат поддержки в разделе «Помощь». | For questions about your data, write to the support chat in Help. |
