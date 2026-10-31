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
| `common.retry` | Qayta urinish | Повторить | Try again |
| `common.loading` | Yuklanmoqda | Загрузка | Loading |
| `common.soon` | Tez orada | Скоро | Coming soon |
| `common.back` | Orqaga | Назад | Back |
| `states.errorTitle` | Xatolik yuz berdi | Произошла ошибка | Something went wrong |
| `states.errorNetwork` | Maʼlumotlarni yuklab boʻlmadi. Internet aloqasini tekshirib, qayta urinib koʻring. | Не удалось загрузить данные. Проверьте подключение к интернету и попробуйте ещё раз. | Couldn't load the data. Check your internet connection and try again. |
| `states.errorServer` | Server javob bermadi. Birozdan soʻng qayta urinib koʻring. | Сервер не ответил. Попробуйте ещё раз чуть позже. | The server didn't respond. Please try again in a moment. |
| `money.unit` | soʻm | сум | UZS |
| `format.longDate` | {{day}}-{{month}}, {{year}} | {{day}} {{month}} {{year}} | {{day}} {{month}} {{year}} |
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
| `auth.noTelegramDev` | Dasturlash rejimi: backendda Telegramʼsiz kirish (dev-login) hali yoʻq — soʻrov R19, docs/backend-requests.md. Hozircha ilovani tunnel orqali Telegram ichida oching. | Режим разработки: в бэкенде пока нет входа без Telegram (dev-login) — запрос R19, docs/backend-requests.md. Пока откройте приложение в Telegram через туннель. | Development mode: the backend has no login without Telegram (dev login) yet — request R19, docs/backend-requests.md. For now, open the app inside Telegram through a tunnel. |
| `blocked.title` | Hisobingiz bloklangan | Ваш аккаунт заблокирован | Your account is blocked |
| `blocked.reason` | Sabab: {{reason}} | Причина: {{reason}} | Reason: {{reason}} |
| `blocked.date` | Qaror sanasi: {{date}} | Дата решения: {{date}} | Decision date: {{date}} |
| `blocked.questions` | Savollar boʻlsa, bizga yozing | Если есть вопросы, напишите нам | If you have questions, write to us |
| `blocked.support` | Qoʻllab-quvvatlash bilan bogʻlanish | Связаться с поддержкой | Contact support |
