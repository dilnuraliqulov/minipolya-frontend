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
| `stadiums.allStadiums` | Barcha maydonlar | Все поля | All pitches |
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
| `checkout.title` | Bronni tasdiqlash | Подтверждение брони | Confirm booking |
| `favorites.emptyTitle` | Sevimli maydonlaringiz yoʻq | У вас нет избранных полей | No favourite pitches yet |
| `favorites.emptyText` | Maydon sahifasidagi yurakchani bosib, uni shu yerga saqlang. | Нажмите на сердечко на странице поля, чтобы сохранить его здесь. | Tap the heart on a pitch’s page to save it here. |
| `favorites.find` | Maydon topish | Найти поле | Find a pitch |
