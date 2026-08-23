# EZ.Path.AI · אפליקציית חתימה על הצעות מחיר — מדריך הקמה

אפליקציה לחתימה דיגיטלית על הצעות מחיר. **חינם לחלוטין**, מאובטחת, ולעולם לא "נרדמת".
כל הרכיבים על **Cloudflare** (Pages + Functions + D1 + R2) + **Resend** למיילים.

> כל השלבים למטה הם חד-פעמיים. אחרי ההקמה, השימוש היומיומי הוא רק: העלאת הצעה → מיקום חתימה → שליחת קישור בוואטסאפ.

---

## 0. סקירה — מה מתחבר למה

| רכיב | תפקיד | חינם? |
|------|-------|-------|
| Cloudflare Pages | מארח את האתר (הדפים) | ✅ מותר מסחרי, בלי הגבלת פעילות |
| Cloudflare Pages Functions | שכבת השרת (API, חתימה, מייל) | ✅ 100K בקשות/יום |
| Cloudflare D1 | מסד נתונים (הצעות, חתימות) | ✅ 5GB · **לא נרדם** |
| Cloudflare R2 | אחסון קבצים (הצעות, חתימות, PDF חתום) | ✅ 10GB · **לא נרדם** |
| Cloudflare Access | התחברות מאובטחת לאזור הניהול | ✅ עד 50 משתמשים |
| Resend | שליחת מיילים | ✅ 3,000/חודש · 100/יום |

---

## 1. דרישות מקדימות

- חשבון GitHub (כבר יש — הקוד יושב ב-`app/` בריפו).
- חשבון Cloudflare (חינם) — הרשמה ב-https://dash.cloudflare.com/sign-up
- גישה לניהול ה-DNS של `ezpath-ai.com` (אצל הרשם שבו נקנה הדומיין).

---

## 2. יצירת המשאבים ב-Cloudflare (CLI)

מתוך תיקיית `app/`:

```bash
npm install
npx wrangler login          # פותח דפדפן להתחברות לחשבון Cloudflare

# מסד נתונים
npx wrangler d1 create ezpath-sign
#  ↑ מדפיס database_id — יש להעתיק אותו אל wrangler.toml (שדה database_id)

# אחסון קבצים
npx wrangler r2 bucket create ezpath-sign-files

# יצירת הטבלאות בענן
npm run db:init:remote
```

לאחר עדכון `database_id` ב-`wrangler.toml`, מבצעים פריסה ראשונה:

```bash
npm run deploy
#  ↑ בונה את הדפים ומעלה ל-Cloudflare Pages. בפעם הראשונה ייווצר פרויקט Pages בשם ezpath-sign.
```

> חלופה ללא CLI: אפשר לחבר את הריפו ב-Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git, עם build command `npm run build` ותיקיית פלט `dist` ותיקיית שורש `app`.

---

## 3. הגדרת סודות ומשתנים

```bash
# מפתח Resend (ראה שלב 5). נשמר מוצפן, לעולם לא בקוד.
npx wrangler pages secret put RESEND_API_KEY
```

המשתנים הלא-סודיים כבר מוגדרים ב-`wrangler.toml`:
`NOTIFY_EMAIL=automator2244@gmail.com`, `MAIL_FROM`, `APP_BASE_URL`, `ADMIN_EMAILS`.
לשינוי כתובת ההתראה בעתיד — עורכים את `NOTIFY_EMAIL` ומריצים `npm run deploy`.

---

## 4. תת-דומיין `sign.ezpath-ai.com` (לא נוגע באתר הקיים)

1. ב-Cloudflare Dashboard → הפרויקט `ezpath-sign` → **Custom domains** → Set up a custom domain → `sign.ezpath-ai.com`.
2. Cloudflare ייתן ערך CNAME. אצל הרשם של הדומיין מוסיפים רשומה:
   - **Type:** CNAME · **Name:** `sign` · **Target:** `ezpath-sign.pages.dev` (או הערך שיינתן).
3. האתר הראשי `ezpath-ai.com` נשאר על GitHub Pages ללא שינוי.

> אם מעדיפים, אפשר להעביר את כל ניהול ה-DNS של הדומיין ל-Cloudflare (חינם) — אז שלב 2 מתבצע אוטומטית. גם אז האתר הראשי לא מושפע, כל עוד לא נוגעים ברשומות הקיימות שלו.

---

## 5. הקמת Resend (מיילים) + אימות דומיין

1. הרשמה חינם: https://resend.com
2. Add Domain → מזינים `send.ezpath-ai.com` (תת-דומיין ייעודי לשליחה, לא מתנגש באתר).
3. Resend ייתן 3 רשומות DNS (SPF/DKIM/DMARC) — מוסיפים אותן אצל הרשם:
   - `TXT`  ל-SPF, `TXT`/`CNAME` ל-DKIM, `TXT` ל-DMARC (הערכים מופיעים במסך של Resend).
4. אחרי שהדומיין "Verified" — יוצרים **API Key** ומכניסים אותו בשלב 3 (`RESEND_API_KEY`).
5. כתובת השולח כבר מוגדרת: `hatimot@send.ezpath-ai.com` (משתנה `MAIL_FROM`).

> עד לאימות הדומיין אפשר לבדוק שליחה רק לכתובת שלך עצמך דרך דומיין הבדיקה של Resend.

---

## 6. הגנת אזור הניהול (Cloudflare Access)

1. Cloudflare Dashboard → **Zero Trust** → Access → Applications → Add an application → **Self-hosted**.
2. Application domain: `sign.ezpath-ai.com`, **Path:** `admin` (וגם יישום נוסף ל-`api/admin` — או path כללי שמכסה את שניהם).
3. Policy: **Allow** רק למייל `automator2244@gmail.com` (Include → Emails → הכתובת).
4. שיטת התחברות: One-time PIN (קוד חד-פעמי למייל) — לא צריך לנהל סיסמה.

מאותו רגע, כניסה ל-`/admin` דורשת אימות זהות; הדף הציבורי `/s/<token>` נשאר פתוח ללקוחות.

---

## 7. בדיקה מקצה-לקצה (Checklist)

- [ ] כניסה ל-`https://sign.ezpath-ai.com/admin` → מתבקש אימות Access → נכנס.
- [ ] "הצעה חדשה" → העלאת PDF/תמונה → מיקום שדה החתימה → "צור קישור".
- [ ] פתיחת הקישור בטלפון → הזנת מייל → צפייה → חתימה (ציור) → אישור.
- [ ] הגיע מייל ל-`automator2244@gmail.com` עם ה-PDF החתום.
- [ ] "שלח לי עותק" → הגיע מייל ללקוח.
- [ ] רענון הקישור אחרי חתימה → "ההצעה כבר נחתמה" (נעילה).
- [ ] המתנה של כמה ימים → הקישור עדיין נטען מיד (אין pause).

---

## פיתוח מקומי

```bash
npm install
cp .dev.vars.example .dev.vars      # אפשר להשאיר RESEND_API_KEY ריק — מיילים יירשמו לקונסול
npm run db:init:local               # יוצר D1 מקומי
npm run build
npm run preview                     # מריץ על http://localhost:8788 עם DEV_MODE (עוקף Access)
```

ב-`DEV_MODE` אזור הניהול פתוח בלי Access (לבדיקות בלבד). בענן, Access הוא השער האמיתי.

---

## מבנה הקוד

```
app/
├─ src/                     # ה-SPA (React + Vite), עברית RTL
│  ├─ pages/                # Admin, AdminNew, AdminQuote, Sign
│  ├─ components/           # QuoteViewer, SignaturePad, SignatureFieldPlacer, TopBar
│  └─ lib/                  # api client, validation
├─ functions/api/           # שכבת השרת (Pages Functions)
│  ├─ admin/                # מוגן ע"י Access: quotes, quote, file
│  ├─ s.ts, file.ts         # ציבורי (token): נתוני הצעה + קובץ
│  ├─ sign.ts               # קליטת חתימה, יצירת PDF חתום, מייל לבעלים
│  └─ send-copy.ts          # שליחת עותק ללקוח
├─ shared/types.ts          # טיפוסים משותפים ל-client ול-server
├─ schema.sql               # מבנה D1
└─ wrangler.toml            # bindings ותצורה
```
