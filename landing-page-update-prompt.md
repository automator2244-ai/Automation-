# פרומט: עדכון דף הנחיתה EZ.Path.AI

## רקע שחייבים לדעת לפני שמתחילים

- כל הדף נמצא בקובץ אחד: `index.html`. הוא מתארח ב-GitHub Pages על הדומיין `ezpath-ai.com`, והדומיין עובר דרך Cloudflare.
- **CSP נעול לפי חתימה:** בשורת `<meta http-equiv="Content-Security-Policy">` הסקריפט הפנימי היחיד בדף נעול לפי חתימת `sha256`. כל שינוי בתוך תגית `<script>`, אפילו תו אחד, פוסל את החתימה, והדפדפן לא יריץ את הסקריפט בכלל (כל האנימציות, המונה והטופס יישברו בשקט).
  **אחרי כל שינוי בסקריפט חובה להריץ:** `python3 tools/update-csp-hash.py`, ואז להריץ שוב ולוודא שמודפס `Already correct`.
- אסור להוסיף תגית `<script>` נוספת (הכלי מסרב לעבוד אם יש יותר מאחת), ואסור לטעון שום סקריפט, פונט או מדיה מדומיין חיצוני. ה-CSP מאפשר רק `'self'`.
- אין להשתמש במקף ארוך באף טקסט בדף.
- לשמור על הסגנון הקיים: משתני הצבע (`--green-50` עד `--green-700`, `--gradient`, `--text-muted`, `--ease`), המחלקות `section-head`, `tag-pill`, `underline reveal-underline`, `ambient-blob`, ופונט Heebo.

---

## חלק 1: שינויי טקסט

### 1.1 המונה "כמה שעות בזבזתם השבוע על עבודה ידנית?"
- בסקריפט, בבלוק `/* ===== 10. COUNTER ===== */`: לשנות `const target = 12` ל-`const target = 30`.
- להריץ `tools/update-csp-hash.py`.

### 1.2 התגית ב-Hero (מתחת לשם ולכפתורים)
- `📱 WhatsApp אוטומציה` הופך ל-`📱 אוטומציות וואטסאפ` (וואטסאפ בעברית, האייקון נשאר).

### 1.3 כרטיס וואטסאפ באזור "מה אנחנו בונים בשבילכם?"
- כותרת: `אוטומציית WhatsApp` הופכת ל-`אוטומציות וואטסאפ`
- טקסט: `מענה מיידי 24/7, מסעות לקוח מותאמים אישית, חיבור ישיר ל-CRM`
- התג "⭐ הכי מבוקש" נשאר.

### 1.4 החלפת "אוטומציית תהליכים" בכרטיס דשבורד
הכרטיס "אוטומציית תהליכים" חופף בתוכן ל"אינטגרציות מתקדמות". מחליפים אותו, באותו מיקום בגריד:
- אייקון: `📊` (במקום 🔄)
- כותרת: `דשבורד לניהול העסק`
- טקסט: `כל נתוני העסק במסך אחד: הכנסות, לידים ומשימות בזמן אמת, עם תובנות AI שעוזרות לכם לקבל החלטות נכונות`
- הכרטיס "אינטגרציות מתקדמות" נשאר בלי שינוי.

---

## חלק 2: המייל בפוטר מוצג כ-"[email protected]"

**הסיבה:** המייל לא נמחק מהקוד. בקוד כתוב `EZ.Path.AI@outlook.co.il`. אבל Cloudflare מפעיל "Email Address Obfuscation": הוא מחליף את המייל בטקסט `[email protected]` ומוסיף סקריפט שאמור לפענח אותו בדפדפן. ה-CSP של הדף חוסם את הסקריפט הזה, ולכן המייל לא חוזר.

**התיקון:** לעטוף את קישור המייל בפוטר בהערות ש-Cloudflare מכבד, כך שלא ייגע בו:
```html
<!--email_off--><a href="mailto:EZ.Path.AI@outlook.co.il">✉️ EZ.Path.AI@outlook.co.il</a><!--/email_off-->
```
זה לא נוגע בסקריפט, ולכן לא צריך לעדכן חתימה.
חלופה (לא חובה): בלוח הבקרה של Cloudflare, תחת Scrape Shield, לכבות את Email Address Obfuscation לכל האתר.

---

## חלק 3: גלריית סרטוני המלצות (קרוסלה מעגלית)

### 3.1 מה המטרה
סקשן חדש של סרטוני המלצה מלקוחות. כרגע 3 סרטונים, ובהמשך יתווספו עוד. תצוגה: סרטון אחד במרכז, גדול ובולט, ושני סרטונים בצדדים, קטנים ושקופים יותר. אפשר לעבור ביניהם בגלילה/החלקה בטלפון ובמחשב, **בצורה מעגלית**: מי שממשיך שמאלה אחרי הסרטון השמאלי ביותר מגיע לימני ביותר, ולהפך. אין "סוף" לגלריה.

### 3.2 מיקום בדף
בין הסקשן "איך זה עובד?" (`#how`) לבין הטופס (`#form`). כך ההמלצות מגיעות רגע לפני ההחלטה להשאיר פרטים.

### 3.3 ארכיטקטורה: הוספת סרטון בלי לגעת בסקריפט
זו הנקודה החשובה ביותר, כי יתווספו סרטונים בהמשך. **רשימת הסרטונים נמצאת ב-HTML, לא ב-JavaScript.** הסקריפט קורא את כל הכרטיסים שבתוך המסילה ומסתדר עם כל כמות. כך הוספת סרטון = העתקת בלוק HTML אחד והעלאת קובץ, בלי לשנות את הסקריפט ובלי לחשב חתימה מחדש.

קבצים:
- סרטונים: `assets/videos/testimonial-1.mp4`, `testimonial-2.mp4`, `testimonial-3.mp4` וכו'.
- תמונת פתיחה לכל סרטון (poster): `assets/videos/testimonial-1.jpg` וכו'.

מבנה HTML:
```html
<!-- TESTIMONIALS -->
<section class="testimonials" id="testimonials">
  <div class="ambient-blob" style="width:420px;height:420px;background:rgba(34,197,94,0.08);top:-100px;left:-120px;animation-duration:24s"></div>
  <div class="container">
    <div class="section-head">
      <span class="tag-pill">לקוחות מספרים</span>
      <h2>מה אומרים עלינו?</h2>
      <div class="underline reveal-underline"></div>
      <p>בעלי עסקים שכבר חוסכים שעות כל שבוע, במילים שלהם</p>
    </div>

    <div class="tcarousel" id="tcarousel" role="region" aria-roledescription="carousel" aria-label="סרטוני המלצות">
      <button class="tc-arrow tc-left" type="button" aria-label="לסרטון שמשמאל">‹</button>
      <div class="tc-track">
        <!-- כדי להוסיף סרטון: להעתיק בלוק figure אחד, לשנות את הקבצים והשם. אין צורך לגעת בסקריפט. -->
        <figure class="tc-item">
          <video src="assets/videos/testimonial-1.mp4" poster="assets/videos/testimonial-1.jpg"
                 preload="none" playsinline controls></video>
          <figcaption><strong>שם הלקוח</strong><span>שם העסק</span></figcaption>
        </figure>
        <figure class="tc-item"> ...testimonial-2... </figure>
        <figure class="tc-item"> ...testimonial-3... </figure>
      </div>
      <button class="tc-arrow tc-right" type="button" aria-label="לסרטון שמימין">›</button>
      <div class="tc-dots" aria-hidden="true"></div>
    </div>
  </div>
</section>
```
עד שהסרטונים מגיעים: לשים שלושה כרטיסים עם poster זמני (או רקע ירוק בהיר עם הכיתוב "בקרוב") כדי שהעיצוב והקרוסלה יעבדו כבר עכשיו.

### 3.4 עיצוב (CSS, בתוך ה-`<style>` הקיים)
- כרטיסים בפורמט אנכי 9:16 (סרטוני טלפון): `aspect-ratio:9/16`, `border-radius:24px`, `overflow:hidden`, מסגרת `1px solid var(--green-200)`, צל עדין ירקרק.
- `.tc-track`: `position:relative`, גובה קבוע לפי הכרטיס האמצעי, כל `.tc-item` ממוקם `position:absolute` במרכז, והמיקום נקבע רק ב-`transform`.
- מצבים לפי מרחק מהמרכז (מחלקות שהסקריפט שם):
  - `is-center`: `translateX(0) scale(1)`, `opacity:1`, `z-index:3`, צל חזק יותר ומסגרת `var(--green-500)` עם הילה ירוקה עדינה.
  - `is-left`: `translateX(-70%) scale(0.8)`, `opacity:0.55`, `z-index:2`, `filter:saturate(0.7)`, `cursor:pointer`.
  - `is-right`: `translateX(70%) scale(0.8)`, אותו דבר לצד השני.
  - כל השאר (כשיהיו יותר מ-3): `scale(0.6)`, `opacity:0`, `pointer-events:none`, מאחור.
- מעבר: `transition:transform 0.6s var(--ease), opacity 0.6s var(--ease)`.
- הכרטיסים בצדדים: הפקדים של הווידאו מוסתרים (אפשר שכבה שקופה מעל, `::after`), לחיצה עליהם מביאה אותם למרכז.
- מידות: מחשב, כרטיס מרכזי ברוחב כ-300px. טלפון (`max-width:600px`), כרטיס מרכזי כ-62vw, והצדדיים מציצים מהקצוות. לוודא שאין גלילה אופקית לדף (`overflow:hidden` על הסקשן).
- חצים: עיגולים לבנים 48px עם מסגרת ירוקה, בצדי המסילה, `hover` בצבע `var(--green-600)`. בטלפון אפשר להקטין ל-40px.
- נקודות (dots) מתחת: נקודה פעילה ארוכה יותר בצבע `var(--gradient)`.
- `figcaption` מתחת לכרטיס האמצעי בלבד: שם בכתב מודגש ושם העסק ב-`var(--text-muted)`.
- `@media (prefers-reduced-motion: reduce)`: לבטל את ה-transition.

### 3.5 התנהגות (JavaScript, בתוך ה-`<script>` הקיים, בבלוק חדש `/* ===== TESTIMONIALS CAROUSEL ===== */`)
**כיוונים הם פיזיים (שמאל/ימין על המסך) ולא לפי RTL**, כדי שהתנועה תרגיש טבעית.

1. `items = [...document.querySelectorAll('#tcarousel .tc-item')]`, `n = items.length`, `current = 0`. אם `n === 0` לצאת.
2. פונקציית `render()`: לכל כרטיס מחשבים מרחק מעגלי מהמרכז:
   `let d = ((i - current) % n + n) % n; if (d > n / 2) d -= n;`
   `d === 0` מקבל `is-center`, `d === -1` מקבל `is-left`, `d === 1` מקבל `is-right`, כל השאר מוסתר.
   (עם 3 סרטונים תמיד יש אחד בכל צד, וזה מה שיוצר את התחושה המעגלית.)
   מקרי קצה: `n === 1` מציג רק מרכז בלי חצים. `n === 2` מציג את השני בצד אחד בלבד.
3. `go(step)`: `current = (current + step + n) % n; render();`
   - חץ שמאלי / החלקה ימינה / מקש ArrowLeft: הכרטיס שמשמאל עובר למרכז.
   - חץ ימני / החלקה שמאלה / מקש ArrowRight: הכרטיס שמימין עובר למרכז.
   - לחיצה על כרטיס צדדי מביאה אותו למרכז.
   - לחיצה על נקודה קופצת לסרטון הזה.
4. **החלקה (swipe):** Pointer Events על `.tc-track`: `pointerdown` שומר X, `pointerup` מחשב הפרש, מעל 40px מזיז צעד אחד. `touch-action: pan-y` על המסילה כדי שגלילה אנכית של הדף תמשיך לעבוד. בנוסף, במחשב: גלגלת/טאצ'פד אופקי (`wheel` עם `deltaX` דומיננטי) מזיז צעד, עם השהייה של כ-500ms בין צעדים.
5. **וידאו:** לפני כל מעבר, `pause()` לכל הסרטונים. רק לסרטון המרכזי יש `controls`. הסרטונים לא מתנגנים אוטומטית. גם כשהסקשן יוצא מהמסך (IntersectionObserver, כמו התבנית הקיימת בבלוק COUNTER) לעצור את הסרטון.
6. נגישות: לכרטיסים שלא במרכז `aria-hidden="true"` ו-`inert`. מקשי החצים עובדים כשהפוקוס בתוך הקרוסלה.
7. בסיום: להריץ `python3 tools/update-csp-hash.py` ואז שוב, לוודא `Already correct`.

### 3.6 הכנת הסרטונים (חשוב לביצועים ול-GitHub)
- GitHub מגביל קובץ ל-100MB, ודף כבד פוגע בטעינה. לדחוס כל סרטון ל-MP4 (H.264 + AAC), 720p אנכי, עד כ-8 עד 10MB:
  `ffmpeg -i input.mov -vf "scale=720:-2" -c:v libx264 -crf 28 -preset slow -c:a aac -b:a 96k -movflags +faststart testimonial-1.mp4`
- poster מתוך הסרטון:
  `ffmpeg -ss 00:00:02 -i testimonial-1.mp4 -frames:v 1 -q:v 3 testimonial-1.jpg`
- `preload="none"` מבטיח שהסרטון נטען רק כשלוחצים Play.
- לא להטמיע מ-YouTube/Vimeo: זה דורש לפתוח את ה-CSP לדומיין חיצוני ומוסיף מעקב של צד שלישי.

### 3.7 איך מוסיפים סרטון בעתיד
1. לדחוס ולשים את `testimonial-4.mp4` ו-`testimonial-4.jpg` ב-`assets/videos/`.
2. להעתיק בלוק `<figure class="tc-item">` אחד בתוך `.tc-track`, לעדכן קבצים, שם ועסק.
3. זהו. הסקריפט מזהה את הכמות לבד, בלי חתימה חדשה.

---

## חלק 4: בדיקות לפני פרסום
1. `python3 tools/update-csp-hash.py` מדפיס `Already correct`.
2. לפתוח את הדף מקומית (למשל `python3 -m http.server`) בדפדפן, ולוודא שאין שגיאות CSP בקונסול.
3. המונה מגיע ל-30.
4. בתגית ב-Hero ובכרטיס כתוב "אוטומציות וואטסאפ", וכרטיס הדשבורד מופיע במקום "אוטומציית תהליכים".
5. קרוסלה: חץ שמאלי 3 פעמים חוזר לסרטון ההתחלתי (מעגל). אותו דבר ימינה. החלקה בטלפון (DevTools במצב מובייל, רוחב 375px) עובדת, וגלילה אנכית של הדף לא נתקעת. אין גלילה אופקית לדף.
6. מעבר סרטון עוצר את הסרטון שהתנגן.
7. אחרי פרסום: בפוטר של `ezpath-ai.com` המייל `EZ.Path.AI@outlook.co.il` מופיע במלואו, והקישור פותח מייל.
8. לחפש בקובץ את התו של מקף ארוך (U+2014) ולוודא שלא נוסף מקף ארוך.
