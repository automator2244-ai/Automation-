# סרטון דמו: ביקורות בגוגל לרופאי שיניים

סרטון אנימציה אנכי (1080x1920, 30fps, 55 שניות) שנבנה עם HyperFrames.

## מבנה
- `src/build.mjs` מחולל את `index.html` (ההרכבה) ואת `src/cues.json` (זמני אפקטי הקול). כאן משנים טקסטים (`COPY`), זמנים (`T`) ופריסה.
- `src/make_audio.py` מסנתז את המוזיקה ואת אפקטי הקול (`assets/audio/`).
- `assets/` גופנים, GSAP ואודיו, הכול מקומי.
- `out/` קובצי ה-MP4.

## עבודה
```bash
node src/build.mjs               # יצירת index.html מחדש
python3 src/make_audio.py        # יצירת אודיו מחדש (אחרי שינוי זמנים)
npx hyperframes check            # בדיקות
npx hyperframes preview          # תצוגה מקדימה
npx hyperframes render --quality delivery --output out/google-reviews-demo-full.mp4
```

## מציינים להחלפה לפני הפצה
ב-`src/build.mjs`, באובייקט `COPY`: `brand` (שם העסק) ו-`contact` (טלפון או וואטסאפ).

## קריינות בעתיד
ערוץ אודיו 22 שמור לקריינות: להוסיף `<audio id="voiceover" data-track-index="22" ...>` ב-`index.html` (או בתבנית ב-`build.mjs`).
