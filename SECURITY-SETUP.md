# מדריך אבטחה — EZ.Path.AI

מסמך זה מתעד את ההגנות שכבר פעילות באתר, ואת השלבים שנותרו ודורשים חשבון Cloudflare ו-Make שלך.

**עלות כוללת: $0.** כל מה שמתואר כאן נכנס בגבולות ה-free tier.

---

## חלק א' — מה כבר פעיל (הושלם)

| הגנה | מה היא עושה |
|---|---|
| **Content-Security-Policy** | חוסמת הרצת JavaScript זר. הסקריפט הפנימי נעול לפי חתימת sha256 — כל שינוי בו, גם תו אחד, יפסול אותו. `base-uri`, `object-src`, `frame-src`, `form-action` כולם `'none'`. |
| **אפס בקשות לצד שלישי** | כל הפונטים והלוגואים מאוחסנים אצלנו. אף גורם חיצוני לא רואה יותר את כתובות ה-IP של המבקרים באתר. |
| **הגנת טופס** | שדה פיתיון (honeypot), בדיקת זמן מילוי מינימלי, מגבלת שליחה חוזרת, ואימות אורך ותקינות של מייל וטלפון. |
| **Referrer-Policy** | מונע דליפת כתובת הדף המלאה לאתרים חיצוניים. |
| **security.txt** | כתובת ליצירת קשר עבור חוקרי אבטחה שמוצאים בעיה. |

**מגבלה חשובה:** GitHub Pages **לא מאפשר להגדיר HTTP headers כלל.** לכן HSTS, `X-Frame-Options` ו-`X-Content-Type-Options` אינם קיימים כרגע — הם מחייבים את חלק ב'.

---

## חלק ב' — מה נותר לבצע

### הבעיה שחלק ב' פותר

כתובת ה-webhook של Make חשופה כרגע בקוד המקור של הדף. כל אחד יכול לפתוח "הצג מקור", להעתיק אותה, ולהפציץ אותה בבקשות. **כל בקשה כזו שורפת פעולה בחשבון Make שלך** — וכשהמכסה נגמרת, לידים אמיתיים מפסיקים להיכנס.

חשוב להבין: **rate limiting של Cloudflare לבדו לא פותר את זה.** הדפדפן פונה ישירות ל-`hook.us2.make.com`, כלומר התעבורה הזו לא עוברת דרך Cloudflare בכלל. הפתרון הוא Worker שיושב באמצע.

---

### שלב 1 — חיבור הדומיין ל-Cloudflare

1. הרשמה ב-[cloudflare.com](https://cloudflare.com) → **Add a site** → `ezpath-ai.com` → תוכנית **Free**.
2. Cloudflare יסרוק את רשומות ה-DNS הקיימות. ודא שרשומות ה-GitHub Pages נשמרו:
   - ארבע רשומות `A` עבור `ezpath-ai.com` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - רשומת `CNAME` עבור `www` → `automator2244-ai.github.io`
3. החלף את שרתי ה-DNS אצל רשם הדומיין לשניים ש-Cloudflare נותן. ההחלפה נכנסת לתוקף תוך דקות עד 24 שעות.
4. תחת **SSL/TLS** בחר במצב **Full (strict)**.

> אחרי שלב זה בדוק שהאתר עדיין עולה תקין לפני שממשיכים.

---

### שלב 2 — הוספת ה-headers החסרים

**Rules → Transform Rules → Modify Response Header → Create rule**, עם `Hostname equals ezpath-ai.com`, והוסף ארבע פעולות **Set static**:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=()` |

**HSTS** מוגדר בנפרד: **SSL/TLS → Edge Certificates → HTTP Strict Transport Security → Enable**, עם `max-age` של 12 חודשים ו-`includeSubDomains`.

> ⚠️ **אל תסמן "Preload" בשלב זה.** Preload הוא כמעט בלתי הפיך ולוקח חודשים לצאת ממנו. הפעל אותו רק אחרי שהאתר רץ יציב על HTTPS לפחות חודש.

---

### שלב 3 — יצירת מפתחות Turnstile

**Turnstile → Add widget**, דומיין `ezpath-ai.com`, מצב **Managed**.

תקבל שני מפתחות:
- **Site Key** — פומבי, נכנס לקוד הדף
- **Secret Key** — סודי, **לעולם לא בקוד הדף**

---

### שלב 4 — פריסת ה-Worker

הקוד מוכן בתיקיית `worker/`.

```bash
npm install -g wrangler          # דורש wrangler 4.36.0 ומעלה
cd worker
wrangler login
wrangler deploy

# הסודות — נשמרים מוצפנים אצל Cloudflare, לא בקוד:
wrangler secret put MAKE_WEBHOOK_URL   # הדבק את כתובת ה-Make החדשה (שלב 5)
wrangler secret put TURNSTILE_SECRET   # הדבק את ה-Secret Key משלב 3
```

בסיום תקבל כתובת בסגנון `https://ezpath-lead-proxy.<שם-החשבון>.workers.dev`.

**מה ה-Worker עושה בכל בקשה, לפי הסדר:**
1. חוסם בקשות שלא הגיעו מ-`ezpath-ai.com`
2. מגביל ל-5 שליחות לדקה לכל כתובת IP — **לפני** כל פנייה ל-Make
3. מאמת את טוקן ה-Turnstile מול Cloudflare
4. בודק honeypot, אורכים, ותקינות מייל וטלפון
5. רק אז מעביר ל-Make — עם payload נקי ומסונן, לא הגוף הגולמי מהלקוח

---

### שלב 5 — החלפת כתובת ה-webhook ב-Make ⚠️

**זה שלב קריטי שאסור לדלג עליו.**

הכתובת הנוכחית כבר הייתה חשופה בקוד הדף לאורך זמן. גם אחרי שהדף יפסיק להשתמש בה, **כל מי שהעתיק אותה יוכל להמשיך לפנות אליה ישירות** ולשרוף את המכסה שלך — ה-Worker לא מגן על כתובת שכבר דלפה.

1. ב-Make: צור webhook **חדש** בתרחיש.
2. הרץ `wrangler secret put MAKE_WEBHOOK_URL` עם הכתובת החדשה.
3. **מחק את ה-webhook הישן לחלוטין.**

---

### שלב 6 — חיבור הדף

כשיש לך את **כתובת ה-Worker** ואת ה-**Site Key**, שלח לי אותם ואחבר את הדף. השינוי כולל:

- הוספת ווידג'ט Turnstile לטופס
- שליחת הטופס ל-Worker במקום ל-Make, עם הטוקן
- הסרת כתובת ה-Make מקוד הדף לחלוטין
- עדכון ה-CSP: `connect-src` לכתובת ה-Worker, ו-`script-src`/`frame-src` יאפשרו את `https://challenges.cloudflare.com` (נדרש ל-Turnstile)
- חישוב מחדש של חתימת ה-sha256 של הסקריפט

---

## מה לא להפעיל

**Bot Fight Mode** (תחת Security → Bots) — הגרסה החינמית אינה ניתנת לכוונון ולעיתים חוסמת סורקים לגיטימיים. בדיוק הגשת את האתר לאינדוקס בגוגל; חסימה של Googlebot תפגע ישירות ב-SEO. Turnstile ו-rate limiting נותנים הגנה טובה יותר בלי הסיכון הזה.

---

## בדיקות אחרי סיום

```bash
# כל ה-headers קיימים?
curl -sI https://ezpath-ai.com/ | grep -iE "strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy"

# ה-Worker דוחה בקשה בלי טוקן Turnstile?  (מצופה: 400)
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "Content-Type: application/json" -H "Origin: https://ezpath-ai.com" \
  -d '{"name":"x","email":"x@x.com","phone":"0501234567"}' \
  https://<כתובת-ה-worker>/

# ה-webhook הישן מת?  (מצופה: 400/404, לא 200)
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "Content-Type: application/json" -d '{}' \
  https://hook.us2.make.com/<הכתובת-הישנה>
```

בנוסף: שלח ליד אמיתי דרך הטופס וודא שהוא מגיע ל-Make, ונסה להטמיע את האתר ב-iframe — הדפדפן אמור לסרב.
