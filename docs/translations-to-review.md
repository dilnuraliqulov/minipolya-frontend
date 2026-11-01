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
| `favorites.emptyTitle` | Sevimli maydonlaringiz yoʻq | У вас нет избранных полей | No favourite pitches yet |
| `favorites.emptyText` | Maydon sahifasidagi yurakchani bosib, uni shu yerga saqlang. | Нажмите на сердечко на странице поля, чтобы сохранить его здесь. | Tap the heart on a pitch’s page to save it here. |
| `favorites.find` | Maydon topish | Найти поле | Find a pitch |
| `bookings.status.pending` | Kutilmoqda | Ожидает оплаты | Pending |
| `bookings.status.confirmed` | Tasdiqlangan | Подтверждена | Confirmed |
| `bookings.status.completed` | Oʻtkazilgan | Состоялась | Completed |
| `bookings.status.expired` | Muddati oʻtgan | Истекла | Expired |
| `bookings.status.cancelled` | Bekor qilingan | Отменена | Cancelled |
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
| `cards.newCode` | Yangi kod yuborish | Отправить новый код | Send a new code |
| `cards.privacy` | Karta maʼlumotlari MiniPolyaʼda saqlanmaydi. | Данные карты не хранятся в MiniPolya. | Card details are not stored in MiniPolya. |
| `cards.footer` | Karta maʼlumotlari MiniPolyaʼda saqlanmaydi — faqat toʻlov tokeni saqlanadi. | Данные карты не хранятся в MiniPolya — сохраняется только платёжный токен. | Card details are not stored in MiniPolya — only a payment token is kept. |
| `cards.wrongNumber` | Karta raqami yoki amal qilish muddati notoʻgʻri | Неверный номер карты или срок действия | The card number or expiry date is wrong |
| `cards.wrongCode` | Kod notoʻgʻri. Qaytadan kiriting. | Неверный код. Введите ещё раз. | Wrong code. Enter it again. |
| `cards.codeExpired` | Kod muddati tugadi — yangi kod soʻrang | Срок действия кода истёк — запросите новый | The code has expired — request a new one |
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
| `checkout.declinedText` | Karta rad etildi. Boshqa karta tanlang yoki kartani tekshiring. | Карта отклонена. Выберите другую карту или проверьте эту. | The card was declined. Choose another card or check this one. |
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
| `booked.headerTitle` | Bron | Бронь | Booking |
| `booked.title` | Band qilindi! | Забронировано! | Booked! |
| `booked.paid` | Toʻlandi: {{amount}} | Оплачено: {{amount}} | Paid: {{amount}} |
| `booked.remaining` | Qolgani: {{amount}} | Осталось: {{amount}} | Left to pay: {{amount}} |
| `booked.remainderNote` | Qolgan summani ilovada yoki maydonda naqd toʻlashingiz mumkin. | Остаток можно оплатить в приложении или наличными на поле. | You can pay the rest in the app or in cash at the pitch. |
| `booked.deadline` | Bekor qilish muddati: {{date}}, {{time}} gacha | Отменить можно до {{date}}, {{time}} | Free cancellation until {{date}}, {{time}} |
| `booked.toGames` | Oʻyinlarimga oʻtish | Перейти в «Мои игры» | Go to My games |
| `booked.home` | Bosh sahifa | На главную | Home |
| `bookings.upcoming` | Kelgusi | Предстоящие | Upcoming |
| `bookings.past` | Oʻtgan | Прошедшие | Past |
| `bookings.filterSoon` | Kelgusi va oʻtgan boʻyicha ajratish tez orada | Разделение на предстоящие и прошедшие — скоро | Splitting into upcoming and past is coming soon |
| `bookings.listLabel` | Bronlar | Брони | Bookings |
| `bookings.emptyTitle` | Hali bronlar yoʻq | Броней пока нет | No bookings yet |
| `bookings.emptyText` | Maydon tanlab, birinchi bronni qiling. | Выберите поле и сделайте первую бронь. | Pick a pitch and make your first booking. |
| `bookings.findPitch` | Maydon topish | Найти поле | Find a pitch |
| `bookings.more` | Yana koʻrsatish | Показать ещё | Show more |
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
| `errors.alreadyReviewed` | Siz bu maydonni allaqachon baholagansiz. | Вы уже оценили это поле. | You have already rated this pitch. |
| `errors.reviewNotPlayed` | Faqat oʻynagan maydoningizni baholashingiz mumkin. | Оценить можно только поле, где вы играли. | You can only rate a pitch you have played at. |
| `games.status.open` | Raqib kutilmoqda | Ждём соперника | Waiting for an opponent |
| `games.status.confirmed` | Tasdiqlangan | Подтверждена | Confirmed |
| `games.status.completed` | Oʻtkazilgan | Состоялась | Played |
| `games.status.cancelled` | Bekor qilingan | Отменена | Cancelled |
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
| `team.payNow` | Jamoangiz toʻlaydi: {{amount}} | Ваша команда платит: {{amount}} | Your team pays: {{amount}} |
| `team.accept` | Qabul qilish | Принять | Accept |
| `team.more` | Yana koʻrsatish | Показать ещё | Show more |
| `team.createTitle` | Jamoa yaratish | Создание команды | Create a team |
| `team.createIntro` | Siz jamoa sardori boʻlasiz. Keyin doʻstlaringizni havola orqali taklif qilasiz. | Вы станете капитаном. Потом пригласите друзей по ссылке. | You will be the captain. Then invite friends with a link. |
| `team.name` | Jamoa nomi | Название команды | Team name |
| `team.nameHint` | 3–24 belgi. Keyin oʻzgartirish mumkin. | 3–24 символа. | 3–24 characters. |
| `team.created` | Jamoa yaratildi | Команда создана | Team created |
| `team.notFoundTitle` | Jamoa topilmadi | Команда не найдена | Team not found |
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
| `errors.cardDeclined` | Karta rad etildi. Boshqa karta tanlang yoki kartani tekshiring. | Карта отклонена. Выберите другую карту или проверьте эту. | The card was declined. Choose another card or check this one. |
| `errors.tooLate` | Oʻyin boshlanishiga 3 soatdan kam qoldi — endi qoʻshilib boʻlmaydi. | До игры меньше 3 часов — присоединиться уже нельзя. | The game starts in less than 3 hours — it can no longer be joined. |
| `games.section` | Oʻyinlar | Игры | Games |
| `games.teamGame` | Jamoa vs jamoa | Команда на команду | Team vs team |
| `games.friendsGame` | Doʻstlar oʻyini | Игра с друзьями | Friends game |
| `games.openGame` | Ochiq oʻyin | Открытая игра | Open game |
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
