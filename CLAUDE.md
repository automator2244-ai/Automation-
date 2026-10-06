# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## סקירה

אתר דף נחיתה בעברית (RTL) עבור EZ.Path.AI, מתארח ב-GitHub Pages על `ezpath-ai.com` (ראו `CNAME`), מאחורי Cloudflare. אין build, אין package.json ואין linter. הכל קבצים סטטיים, בנוסף ל-Cloudflare Worker אחד שמשמש proxy לטופס הלידים.

כללי כתיבה: לכתוב תמיד בעברית ולעולם לא להשתמש במקף ארוך באף טקסט (בדף, בהערות קוד ובהודעות commit). קיימת התאמה לכך כבר בהיסטוריית ה-commits.

## הרכב המערכת

- `index.html`: כל הדף בקובץ אחד (CSS פנימי, HTML, וסקריפט פנימי יחיד). קובצי מדיה ופונטים ב-`assets/`, כולם מתארחים עצמית.
- `worker/`: Cloudflare Worker (`ezpath-lead-proxy`) שיושב בין הטופס ל-webhook של Make. סדר הבדיקות בו: origin, rate limit (לפני כל פנייה ל-Make), אימות Turnstile, honeypot ואורכים, ורק אז העברה ל-Make עם payload מסונן (כולל שדה `ip`). הסודות `MAKE_WEBHOOK_URL` ו-`TURNSTILE_SECRET` נשמרים ב-`wrangler secret`, לא בקוד.
- הדף מקבל את כתובת ה-Worker ואת Turnstile site key מתגיות `<meta name="ez-worker-url">` ו-`<meta name="ez-turnstile-sitekey">` בראש `index.html`. כתובת Make אסורה להופיע בדף.
- `SECURITY-SETUP.md` ו-`landing-page-update-prompt.md`: תיעוד בעברית של ההגנות, של שלבי פריסת Cloudflare, ושל רקע לעדכוני תוכן. כדאי לקרוא לפני שינוי בהגנות או בטופס.

## האילוץ המרכזי: CSP נעול לפי hash

ה-Content-Security-Policy ב-`<meta http-equiv>` נועל את הסקריפט הפנימי היחיד לפי `sha256`. כל שינוי בתוך `<script>`, אפילו תו אחד, פוסל את ה-hash והדפדפן לא יריץ את הסקריפט (אנימציות, מונה, קרוסלה וטופס נשברים בשקט).

אחרי כל שינוי בסקריפט:

```bash
python3 tools/update-csp-hash.py   # מעדכן את ה-hash ב-index.html
python3 tools/update-csp-hash.py   # הרצה שנייה, חייבת להדפיס "Already correct"
```

עוד אילוצים:
- אסור להוסיף תגית `<script>` שנייה (הכלי מסרב לעבוד), ואסור לטעון סקריפט, פונט או מדיה מדומיין חיצוני. ה-CSP מאפשר `'self'` בלבד, ובאופן ממוקד את `challenges.cloudflare.com` עבור Turnstile ואת כתובת ה-Worker ב-`connect-src`.
- תוכן שניתן לשנות בלי לגעת בסקריפט (טקסט HTML, CSS, כרטיסי סרטון בקרוסלה) אינו דורש חישוב hash מחדש. הקרוסלה נבנית מכרטיסי ה-HTML שבמסילה, כך שהוספת סרטון היא הוספת בלוק HTML והעלאת קובץ ל-`assets/videos/`.
- הסקריפט מחולק לבלוקים ממוספרים (`/* ===== N. NAME ===== */`), כולל הגנת clickjacking, config, curtain, canvas, marquee, counter, וטופס.
- Cloudflare מחליף כתובות מייל ב-`[email protected]`, לכן מייל בפוטר עטוף ב-`<!--email_off-->...<!--/email_off-->`.

## בדיקות ה-Worker

```bash
node worker/test.mjs        # מרים שרת Make מדומה, אך קורא ל-siteverify האמיתי של Cloudflare עם מפתחות הבדיקה, ולכן דורש גישת רשת
cd worker && wrangler deploy
```

אין הרצת בדיקה בודדת, הקובץ הוא סקריפט אחד שמריץ את כל התרחישים.
