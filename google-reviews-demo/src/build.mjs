// Generates index.html (the HyperFrames composition) and src/cues.json (sound cue times).
// Run: node src/build.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Editable copy (all fictional). Brand and contact are placeholders until confirmed.
// ---------------------------------------------------------------------------
const COPY = {
  clinic: "מרפאת שיניים נקודת חיוך",
  brand: "[שם העסק של בניה]",
  contact: "[טלפון או וואטסאפ ליצירת קשר]",
  link: "clinic.link/aB3xK9Q",
};

// ---------------------------------------------------------------------------
// Timeline (seconds). Scene boundaries follow the storyboard.
// ---------------------------------------------------------------------------
const T = {
  total: 55,
  // scene 1
  card1In: 0.3,
  cap1a: [1.4, 3.7],
  cap1b: [3.8, 6.0],
  pulse38: 4.5,
  // scene 2
  cap2: [6.5, 9.0],
  // scene 3
  phoneIn: 9.0,
  typing1: 9.9,
  msg1: 10.5,
  btns: 11.9,
  finger1In: 13.5,
  tap1: 14.75,
  reply: 15.2,
  typing2: 16.2,
  msg2: 17.0,
  capA: [9.5, 15.7],
  capB: [16.3, 20.9],
  finger2In: 19.2,
  tapLink: 20.45,
  // scene 4
  swap: 20.95,
  capC: [21.6, 27.7],
  rvStars: 22.7,
  finger3In: 24.6,
  tapPublish: 25.55,
  phoneOut: 27.3,
  // scene 5
  s5: 28.0,
  cap5: [28.7, 37.7],
  // scene 6
  s6: 38.0,
  cap6: [38.7, 44.9],
  countFrom: 39.4,
  countDur: 4.3,
  // scene 7
  s7: 45.0,
  chips: [45.5, 46.6, 47.7],
  // scene 8
  s8: 50.0,
};

// order in which the mini chats come alive in scene 5 (fixed shuffle, no randomness)
const CELL_ORDER = [5, 2, 10, 7, 0, 9, 4, 11, 1, 6, 8, 3];
const CELL_STARTS = [29.0, 29.75, 30.4, 30.95, 31.4, 31.8, 32.15, 32.45, 32.7, 32.95, 33.15, 33.35];

// ---------------------------------------------------------------------------
// Layout constants (px, canvas 1080x1920)
// ---------------------------------------------------------------------------
const PH = { x: 140, y: 100, w: 800, h: 1280, b: 14 };
const SCR = { x: PH.x + PH.b, y: PH.y + PH.b, w: PH.w - PH.b * 2, h: PH.h - PH.b * 2 };
const CHAT = {
  msg1Top: 215,
  msg1H: 300,
  bubbleW: 616,
  gap: 22,
};
CHAT.slot = CHAT.msg1Top + CHAT.msg1H + CHAT.gap;
const BTN = { h: 84, gap: 14 };
const btnTop = (i) => CHAT.slot + i * (BTN.h + BTN.gap);
const REPLY_H = 92;
CHAT.msg2Top = CHAT.slot + REPLY_H + CHAT.gap;
CHAT.msg2H = 345;
const RIGHT_M = 28;
const bubbleLeft = SCR.w - RIGHT_M - CHAT.bubbleW; // incoming bubbles sit on the right (RTL)
const centerX = bubbleLeft + CHAT.bubbleW / 2;

// finger targets in canvas coordinates
const TG = {
  btn1: { x: SCR.x + centerX, y: SCR.y + btnTop(0) + BTN.h / 2 },
  link: { x: SCR.x + bubbleLeft + CHAT.bubbleW - 210, y: SCR.y + CHAT.msg2Top + CHAT.msg2H - 52 },
  publish: { x: SCR.x + SCR.w / 2, y: SCR.y + 1118 },
};

// ---------------------------------------------------------------------------
// Small SVG helpers
// ---------------------------------------------------------------------------
const STAR_PATH = "M12 2.4l2.95 6.2 6.8.9-5 4.7 1.3 6.7L12 17.6l-6.05 3.3 1.3-6.7-5-4.7 6.8-.9z";
const star = (cls = "") =>
  `<svg class="star ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;
const starsRow = (cls, n = 5) => Array.from({ length: n }, () => star("")).join("");
const TOOTH =
  "M12 5.4C10.8 4.2 8.2 3.6 6.4 4.6 4.4 5.7 3.8 8.2 4.4 10.4c.5 1.8 1.4 3 1.7 5 .3 2.2.5 4.8 1.7 5.2 1.2.4 1.7-1.6 2.1-3.2.3-1.2.7-2.2 2.1-2.2s1.8 1 2.1 2.2c.4 1.6.9 3.6 2.1 3.2 1.2-.4 1.4-3 1.7-5.2.3-2 1.2-3.2 1.7-5 .6-2.2 0-4.7-2-5.8-1.8-1-4.4-.4-5.6.8z";
const tooth = (cls = "") =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${TOOTH}"/></svg>`;
const icon = (inner, cls = "ic") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICONS = {
  phone: icon(
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  ),
  nav: icon('<polygon points="3 11 22 2 13 21 11 13 3 11"/>'),
  globe: icon(
    '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  ),
  smartphone: icon('<rect x="5" y="2" width="14" height="20" rx="2.5"/><line x1="12" y1="18" x2="12.01" y2="18"/>'),
  sliders: icon(
    '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  ),
  check: icon('<polyline points="20 6 9 17 4 12"/>'),
  back: icon('<polyline points="9 6 15 12 9 18"/>'),
  close: icon('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
};

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function profileCard(id, count) {
  return `
    <div id="${id}" class="pcard">
      <div class="pc-cover">
        <div class="pc-shine"></div>
        ${tooth("pc-bg-tooth")}
      </div>
      <div class="pc-avatar">${tooth("pc-avatar-tooth")}</div>
      <div class="pc-body">
        <div class="pc-tag">ביקורות בגוגל</div>
        <h2 class="pc-name">${COPY.clinic}</h2>
        <div class="pc-sub">מרפאת שיניים</div>
        <div class="pc-rating">
          <span class="pc-score">4.6</span>
          <span class="pc-stars" dir="ltr">
            ${[0, 1, 2, 3, 4]
              .map(
                (i) =>
                  `<span class="pc-star">${star("base")}<span class="pc-fill ${i === 4 ? "partial" : ""}" data-layout-allow-overflow>${star("gold")}</span></span>`,
              )
              .join("")}
          </span>
        </div>
        <div class="pc-count"><span class="cnt">${count}</span> ביקורות</div>
        <div class="pc-actions">
          <div class="pc-act">${ICONS.phone}<span>התקשרו</span></div>
          <div class="pc-act">${ICONS.nav}<span>הגעה</span></div>
          <div class="pc-act">${ICONS.globe}<span>אתר</span></div>
        </div>
      </div>
    </div>`;
}

function miniChat(i) {
  return `
    <div class="mini" id="mini${i}">
      <div class="mini-in">
        <div class="mh"><span class="mh-av"></span><span class="mh-line"></span></div>
        <div class="mb mb1"><i></i><i></i></div>
        <div class="mp"><i></i></div>
        <div class="mb mr"><i></i></div>
        <div class="mb mb2"><i></i><i class="lnk"></i></div>
        <div class="mrev"><span class="mrev-stars" dir="ltr">${starsRow("")}</span></div>
      </div>
      <div class="mini-glow"></div>
    </div>`;
}

function chip(i, iconSvg, text) {
  return `
    <div class="chip" id="chip${i}">
      <div class="chip-ic">${iconSvg}</div>
      <div class="chip-tx">${text}</div>
      <div class="chip-ok">${ICONS.check}</div>
    </div>`;
}

const cap = (id, lines, extra = "") =>
  `<div class="cap ${extra}" id="${id}">${lines.map((l) => `<span class="cl">${l}</span>`).join("")}</div>`;

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
const FONT_FACES = [500, 700, 800]
  .map(
    (w) => `
      @font-face { font-family: "Heebo"; font-style: normal; font-weight: ${w}; font-display: block;
        src: url("assets/fonts/heebo-hebrew-${w}-normal.woff2") format("woff2");
        unicode-range: U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F; }
      @font-face { font-family: "Heebo"; font-style: normal; font-weight: ${w}; font-display: block;
        src: url("assets/fonts/heebo-latin-${w}-normal.woff2") format("woff2");
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }`,
  )
  .join("");

const CSS = `
${FONT_FACES}
:root {
  --navy: #0B2A4A; --navy-2: #123A63; --navy-3: #071B31;
  --teal: #12B5A6; --teal-d: #0C8D81; --teal-l: #D7F5F0;
  --white: #FFFFFF; --gray: #F2F5F8; --gray-2: #DCE3EA; --ink-2: #5B6B7F;
  --gold: #FFB400; --red: #E5484D;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; background: var(--navy); }
body { font-family: "Heebo", sans-serif; color: var(--white); }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; direction: rtl; }
bdi { unicode-bidi: isolate; }

/* background */
#bg { position: absolute; inset: 0; background:
  radial-gradient(900px 900px at 88% 8%, rgba(18,181,166,0.20), transparent 62%),
  radial-gradient(1100px 1100px at 8% 96%, rgba(40,110,190,0.28), transparent 60%),
  linear-gradient(180deg, #0D3157 0%, #0B2A4A 55%, #08203A 100%); }
#bg-dots { position: absolute; inset: -80px; opacity: 0.5;
  background-image: radial-gradient(rgba(255,255,255,0.10) 2px, transparent 2.5px); background-size: 64px 64px; }

.scene { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }

/* captions */
.cap { position: absolute; left: 70px; right: 70px; top: 1430px; height: 330px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; font-weight: 800; font-size: 76px; line-height: 1.22;
  color: var(--white); text-shadow: 0 4px 28px rgba(3,14,28,0.45); text-wrap: balance; }
.cap .cl { display: block; }
.cap .hl { color: var(--teal); }
.cap .red { color: var(--red); display: inline-block; }
.cap.mid { top: 0; height: 1920px; font-size: 80px; padding: 0 30px; }

/* stars */
.star { width: 100%; height: 100%; display: block; }
.star path { fill: var(--gray-2); }
.star.gold path { fill: var(--gold); }
.star.base path { fill: #D5DCE4; }

/* profile card */
.pcard { position: absolute; left: 70px; top: 300px; width: 940px; background: var(--white); border-radius: 56px; overflow: hidden;
  box-shadow: 0 40px 90px rgba(2,12,26,0.45); color: var(--navy); }
.pc-cover { position: relative; height: 250px; background: linear-gradient(120deg, #0C8D81 0%, #12B5A6 45%, #1E7BC4 100%); overflow: hidden; }
.pc-bg-tooth { position: absolute; left: -30px; top: -40px; width: 380px; height: 380px; opacity: 0.14; }
.pc-bg-tooth path { fill: #fff; }
.pc-shine { position: absolute; top: -60px; bottom: -60px; width: 120px; left: -200px; background: rgba(255,255,255,0.28); transform: skewX(-20deg); }
.pc-avatar { position: absolute; right: 56px; top: 178px; width: 144px; height: 144px; border-radius: 50%; background: #fff; border: 8px solid #fff;
  box-shadow: 0 10px 30px rgba(11,42,74,0.25); display: flex; align-items: center; justify-content: center; }
.pc-avatar::before { content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--teal-l); }
.pc-avatar-tooth { position: relative; width: 78px; height: 78px; }
.pc-avatar-tooth path { fill: var(--teal-d); }
.pc-body { padding: 110px 56px 52px; }
.pc-tag { font-size: 32px; font-weight: 700; color: var(--teal-d); margin-bottom: 8px; }
.pc-name { font-size: 62px; font-weight: 800; line-height: 1.15; color: var(--navy); }
.pc-sub { font-size: 36px; font-weight: 500; color: var(--ink-2); margin-top: 6px; }
.pc-rating { display: flex; align-items: center; gap: 26px; margin-top: 36px; }
.pc-score { font-size: 124px; font-weight: 800; line-height: 1; color: var(--navy); }
.pc-stars { display: flex; gap: 6px; }
.pc-star { position: relative; width: 78px; height: 78px; display: block; }
.pc-star .star.base { position: absolute; inset: 0; }
.pc-fill { position: absolute; inset: 0; display: block; overflow: hidden; }
.pc-fill.partial { width: 60%; }
.pc-fill .star { width: 78px; height: 78px; }
.pc-count { font-size: 50px; font-weight: 700; color: var(--ink-2); margin-top: 18px; }
.pc-count .cnt { color: var(--navy); font-weight: 800; display: inline-block; }
.pc-actions { display: flex; gap: 20px; margin-top: 40px; }
.pc-act { flex: 1; height: 112px; border-radius: 56px; border: 3px solid var(--gray-2); display: flex; align-items: center; justify-content: center; gap: 14px;
  font-size: 34px; font-weight: 700; color: var(--teal-d); }
.pc-act .ic { width: 38px; height: 38px; }

/* sparkles */
.spark { position: absolute; width: 46px; height: 46px; opacity: 0; }
.spark path { fill: #FFE08A; }

/* phone */
#phone { position: absolute; left: ${PH.x}px; top: ${PH.y}px; width: ${PH.w}px; height: ${PH.h}px; border-radius: 108px; background: #061A30;
  box-shadow: 0 0 0 4px #2B5C8F, 0 50px 110px rgba(2,12,26,0.55); }
#screen { position: absolute; left: ${PH.b}px; top: ${PH.b}px; width: ${SCR.w}px; height: ${SCR.h}px; border-radius: 94px; overflow: hidden; background: #EEF2F5; }
#notch { position: absolute; left: 50%; margin-left: -80px; top: 18px; width: 160px; height: 40px; border-radius: 20px; background: #061A30; z-index: 20; }
#chat, #review { position: absolute; left: 0; top: 0; width: ${SCR.w}px; height: ${SCR.h}px; }
#chat { background: #E9EFF3; background-image: radial-gradient(rgba(11,42,74,0.05) 2px, transparent 2.5px); background-size: 40px 40px; }
#hdr { position: absolute; left: 0; right: 0; top: 0; height: 190px; background: #fff; border-bottom: 2px solid var(--gray-2); }
#hdr .h-av { position: absolute; right: 92px; top: 84px; width: 80px; height: 80px; border-radius: 50%; background: var(--teal-l); display: flex; align-items: center; justify-content: center; }
#hdr .h-av svg { width: 46px; height: 46px; } #hdr .h-av path { fill: var(--teal-d); }
#hdr .h-back { position: absolute; right: 26px; top: 100px; width: 46px; height: 46px; color: var(--navy); }
#hdr .h-name { position: absolute; right: 188px; top: 80px; font-size: 36px; font-weight: 800; color: var(--navy); white-space: nowrap; }
#hdr .h-sub { position: absolute; right: 188px; top: 128px; font-size: 26px; font-weight: 500; color: var(--ink-2); }
#inputbar { position: absolute; left: 0; right: 0; bottom: 0; height: 124px; background: #fff; border-top: 2px solid var(--gray-2); }
#inputbar .pill { position: absolute; right: 24px; left: 120px; top: 24px; height: 76px; border-radius: 38px; background: var(--gray); }
#inputbar .send { position: absolute; left: 24px; top: 24px; width: 76px; height: 76px; border-radius: 50%; background: var(--teal); }

.bub { position: absolute; width: ${CHAT.bubbleW}px; border-radius: 34px; padding: 22px 28px; font-size: 35px; line-height: 1.42; font-weight: 500; color: var(--navy);
  box-shadow: 0 3px 10px rgba(11,42,74,0.10); }
.bub p + p { margin-top: 14px; }
.bub.in { right: ${RIGHT_M}px; background: #fff; border-top-right-radius: 10px; }
.bub.out { left: ${RIGHT_M}px; background: var(--teal-l); border-top-left-radius: 10px; width: 536px; font-weight: 700; }
#msg1 { top: ${CHAT.msg1Top}px; height: ${CHAT.msg1H}px; }
#reply { top: ${CHAT.slot}px; height: ${REPLY_H}px; padding-top: 20px; padding-bottom: 14px; }
#msg2 { top: ${CHAT.msg2Top}px; height: ${CHAT.msg2H}px; }
#msg2 .lk { color: #0A74B8; font-weight: 700; text-decoration: underline; text-underline-offset: 6px; display: inline-block; border-radius: 10px; }
.typing { position: absolute; right: ${RIGHT_M}px; width: 150px; height: 70px; border-radius: 35px; background: #fff; box-shadow: 0 3px 10px rgba(11,42,74,0.10); display: flex; align-items: center; justify-content: center; gap: 12px; }
.typing i { display: block; width: 16px; height: 16px; border-radius: 50%; background: #9AA8B8; }
#typing1 { top: ${CHAT.msg1Top}px; }
#typing2 { top: ${CHAT.msg2Top}px; }
.qbtn { position: absolute; right: ${RIGHT_M}px; width: ${CHAT.bubbleW}px; height: ${BTN.h}px; border-radius: 42px; background: #fff; border: 3px solid var(--teal);
  display: flex; align-items: center; justify-content: center; font-size: 33px; font-weight: 700; color: var(--teal-d); box-shadow: 0 3px 10px rgba(11,42,74,0.08); }
#btn1 { top: ${btnTop(0)}px; } #btn2 { top: ${btnTop(1)}px; } #btn3 { top: ${btnTop(2)}px; }

/* review screen */
#review { background: #F7F9FB; }
.rv-top { position: absolute; left: 0; right: 0; top: 0; height: 190px; background: #fff; border-bottom: 2px solid var(--gray-2); }
.rv-top .t { position: absolute; left: 0; right: 0; top: 96px; text-align: center; font-size: 40px; font-weight: 800; color: var(--navy); }
.rv-top .x { position: absolute; left: 30px; top: 94px; width: 50px; height: 50px; color: var(--ink-2); }
.rv-biz { position: absolute; right: 36px; left: 36px; top: 232px; height: 150px; display: flex; align-items: center; gap: 24px; }
.rv-biz .av { width: 104px; height: 104px; border-radius: 50%; background: var(--teal-l); display: flex; align-items: center; justify-content: center; flex: none; }
.rv-biz .av svg { width: 60px; height: 60px; } .rv-biz .av path { fill: var(--teal-d); }
.rv-biz .n { font-size: 38px; font-weight: 800; color: var(--navy); line-height: 1.2; }
.rv-biz .s { font-size: 28px; font-weight: 500; color: var(--ink-2); margin-top: 4px; }
#rvstars { position: absolute; left: 0; right: 0; top: 420px; display: flex; justify-content: center; gap: 18px; direction: ltr; }
#rvstars .rs { position: relative; width: 104px; height: 104px; display: block; }
#rvstars .rs .star { position: absolute; inset: 0; }
#rvstars .rs .star path { fill: #E3E9EF; stroke: #C5CFDA; stroke-width: 0.9; }
#rvstars .rs .fillwrap { position: absolute; inset: 0; display: block; }
#rvstars .rs .fillwrap .star path { fill: var(--gold); stroke: #E69F00; }
#field { position: absolute; right: 36px; left: 36px; top: 600px; height: 400px; border-radius: 32px; background: #fff; border: 3px solid var(--gray-2); box-shadow: 0 6px 20px rgba(11,42,74,0.06); }
#cursor { position: absolute; right: 36px; top: 40px; width: 5px; height: 52px; border-radius: 3px; background: var(--teal); }
#publish { position: absolute; right: 36px; left: 36px; top: 1068px; height: 100px; border-radius: 50px; background: var(--teal); display: flex; align-items: center; justify-content: center;
  font-size: 42px; font-weight: 800; color: #fff; box-shadow: 0 10px 26px rgba(18,181,166,0.35); overflow: hidden; }
#publish .lab { position: absolute; display: flex; align-items: center; gap: 12px; }
#publish .lab .ic { width: 44px; height: 44px; }
#pubB { opacity: 0; }

/* finger and ripple */
#ring { position: absolute; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%; border: 8px solid rgba(18,181,166,0.9); opacity: 0; }
#finger { position: absolute; left: 0; top: 0; width: 0; height: 0; opacity: 0; }
#finger svg { position: absolute; left: -46px; top: -6px; width: 128px; height: 188px; overflow: visible; filter: drop-shadow(0 14px 14px rgba(2,12,26,0.35)); }

/* scene 5 */
#counters { position: absolute; left: 70px; top: 110px; width: 940px; height: 230px; border-radius: 44px; background: rgba(255,255,255,0.08);
  border: 2px solid rgba(255,255,255,0.14); display: flex; direction: rtl; }
.ctr { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.ctr + .ctr::before { content: ""; position: absolute; right: 0; top: 40px; bottom: 40px; width: 2px; background: rgba(255,255,255,0.16); }
.ctr .lab { font-size: 38px; font-weight: 700; color: #BFEFE9; }
.ctr .num { font-size: 100px; font-weight: 800; line-height: 1.05; color: #fff; direction: ltr; font-variant-numeric: tabular-nums; }
#grid { position: absolute; left: 70px; top: 390px; width: 940px; height: 1000px; display: grid; grid-template-columns: repeat(4, 220px); grid-template-rows: repeat(3, 320px); gap: 20px; }
.mini { position: relative; width: 220px; height: 320px; border-radius: 30px; background: #EEF2F5; border: 5px solid #2B5C8F; overflow: hidden; box-shadow: 0 16px 36px rgba(2,12,26,0.35); }
.mini-in { position: absolute; inset: 0; }
.mini-glow { position: absolute; inset: 0; border-radius: 24px; box-shadow: inset 0 0 0 4px rgba(18,181,166,0); }
.mh { position: absolute; left: 0; right: 0; top: 0; height: 50px; background: #fff; border-bottom: 2px solid var(--gray-2); }
.mh-av { position: absolute; right: 12px; top: 12px; width: 26px; height: 26px; border-radius: 50%; background: var(--teal); }
.mh-line { position: absolute; right: 46px; top: 19px; width: 84px; height: 11px; border-radius: 6px; background: #B9C4D0; }
.mb { position: absolute; border-radius: 14px; padding: 10px 12px; box-shadow: 0 2px 5px rgba(11,42,74,0.10); }
.mb i { display: block; height: 9px; border-radius: 5px; background: #C3CDD8; margin-bottom: 8px; } .mb i:last-child { margin-bottom: 0; }
.mb1 { right: 12px; top: 62px; width: 166px; height: 56px; background: #fff; }
.mb1 i:first-child { width: 100%; } .mb1 i:last-child { width: 62%; }
.mp { position: absolute; right: 12px; top: 128px; width: 168px; height: 38px; border-radius: 19px; border: 3px solid var(--teal); background: #fff; }
.mp i { position: absolute; left: 24px; right: 24px; top: 13px; height: 6px; border-radius: 3px; background: var(--teal); }
.mr { left: 12px; top: 128px; width: 130px; height: 38px; background: var(--teal-l); padding: 0; }
.mr i { position: absolute; left: 16px; right: 16px; top: 14px; height: 8px; margin: 0; background: #7FD6CC; }
.mb2 { right: 12px; top: 176px; width: 166px; height: 54px; background: #fff; }
.mb2 i { width: 100%; } .mb2 i.lnk { width: 70%; background: #4BA3D6; }
.mrev { position: absolute; left: 12px; right: 12px; top: 242px; height: 62px; border-radius: 18px; background: #fff; box-shadow: 0 4px 12px rgba(11,42,74,0.14); display: flex; align-items: center; justify-content: center; }
.mrev-stars { display: flex; gap: 5px; direction: ltr; }
.mrev-stars .star { width: 31px; height: 31px; }
.mrev-stars .star path { fill: #E3E9EF; }

/* scene 7 */
.chip { position: absolute; left: 70px; width: 940px; height: 236px; border-radius: 48px; background: #fff; color: var(--navy); box-shadow: 0 30px 70px rgba(2,12,26,0.4);
  display: flex; align-items: center; padding: 0 48px; gap: 36px; }
.chip-ic { width: 128px; height: 128px; border-radius: 50%; background: var(--teal); color: #fff; display: flex; align-items: center; justify-content: center; flex: none; }
.chip-ic .ic { width: 66px; height: 66px; }
.chip-tx { flex: 1; font-size: 56px; font-weight: 800; line-height: 1.2; text-wrap: balance; }
.chip-ok { width: 64px; height: 64px; border-radius: 50%; background: var(--teal-l); color: var(--teal-d); display: flex; align-items: center; justify-content: center; flex: none; }
.chip-ok .ic { width: 36px; height: 36px; stroke-width: 3; }
#chip1 { top: 520px; } #chip2 { top: 830px; } #chip3 { top: 1140px; }

/* scene 8 */
#s8 .brand { position: absolute; left: 60px; right: 60px; top: 520px; text-align: center; font-size: 92px; font-weight: 800; color: #fff; line-height: 1.15; }
#s8 .rule { position: absolute; left: 50%; margin-left: -90px; top: 690px; width: 180px; height: 8px; border-radius: 4px; background: var(--teal); }
#s8 .cta { position: absolute; left: 70px; right: 70px; top: 770px; text-align: center; font-size: 70px; font-weight: 800; line-height: 1.25; text-wrap: balance; }
#s8 .cta .big { display: block; margin-top: 24px; color: var(--teal); font-size: 96px; }
#s8 .contact { position: absolute; left: 90px; right: 90px; top: 1250px; height: 150px; border-radius: 75px; background: var(--teal); color: var(--navy); display: flex; align-items: center; justify-content: center;
  font-size: 52px; font-weight: 800; text-align: center; padding: 0 30px; }
`;

// ---------------------------------------------------------------------------
// Scene markup
// ---------------------------------------------------------------------------
const s1 = `
  <div id="s1" class="scene clip" data-start="0" data-duration="6.6" data-track-index="1">
    ${profileCard("card1", 38)}
    ${cap("cap1a", ["2,000 מטופלים ותיקים."])}
    ${cap("cap1b", ['<span class="red" id="n38">38</span> ביקורות בלבד.'])}
  </div>`;

const s2 = `
  <div id="s2" class="scene clip" data-start="6.0" data-duration="3.4" data-track-index="2">
    ${cap("cap2", ["מה אם כל מטופל מרוצה", 'היה <span class="hl">כותב ביקורת</span>?'], "mid")}
  </div>`;

const phoneScene = `
  <div id="s3" class="scene clip" data-start="${T.phoneIn}" data-duration="${(T.s5 + 0.6 - T.phoneIn).toFixed(2)}" data-track-index="3">
    <div id="phone">
      <div id="screen">
        <div id="notch"></div>
        <div id="chat">
          <div id="hdr">
            <span class="h-back">${ICONS.back}</span>
            <span class="h-av">${tooth()}</span>
            <span class="h-name">${COPY.clinic}</span>
            <span class="h-sub">חשבון עסקי</span>
          </div>
          <div class="typing" id="typing1"><i></i><i></i><i></i></div>
          <div class="bub in" id="msg1">
            <p>היי נועה, כאן ד״ר כרמי ממרפאת שיניים נקודת חיוך 👋</p>
            <p>היית אצלנו בטיפול לפני כמה זמן, ורצינו לשאול איך הייתה החוויה שלכם? נשמח מאוד לשמוע 🙏</p>
          </div>
          <div class="qbtn" id="btn1">היה מעולה, יצאתי מאוד מרוצה!</div>
          <div class="qbtn" id="btn2">הייתה חוויה טובה</div>
          <div class="qbtn" id="btn3">האמת קצת פחות טוב..</div>
          <div class="bub out" id="reply">היה מעולה, יצאתי מאוד מרוצה!</div>
          <div class="typing" id="typing2"><i></i><i></i><i></i></div>
          <div class="bub in" id="msg2">
            <p>תודה רבה נועה! 🙏 שמחים לשמוע.</p>
            <p>אם יש לך דקה, ביקורת קצרה בגוגל עוזרת לנו מאוד, וגם לאנשים שמחפשים מרפאה:</p>
            <p><span class="lk" id="lnk"><bdi dir="ltr">${COPY.link}</bdi></span></p>
          </div>
          <div id="inputbar"><div class="pill"></div><div class="send"></div></div>
        </div>
        <div id="review">
          <div class="rv-top"><span class="t">כתיבת ביקורת</span><span class="x">${ICONS.close}</span></div>
          <div class="rv-biz">
            <div class="av">${tooth()}</div>
            <div><div class="n">${COPY.clinic}</div><div class="s">ביקורת בגוגל</div></div>
          </div>
          <div id="rvstars">
            ${[1, 2, 3, 4, 5].map((i) => `<span class="rs" id="rs${i}">${star("")}<span class="fillwrap" id="rsf${i}">${star("")}</span></span>`).join("")}
          </div>
          <div id="field"><span id="cursor"></span></div>
          <div id="publish">
            <span class="lab" id="pubA">פרסום</span>
            <span class="lab" id="pubB">${ICONS.check}פורסם</span>
          </div>
        </div>
      </div>
    </div>
    ${cap("capA", ["שואלים כל מטופל ותיק.", '<span class="hl">בלחיצה אחת.</span>'])}
    ${cap("capB", ["ואז מקבלים קישור אישי", "לכתיבת ביקורת."])}
    ${cap("capC", ["ובלחיצה אחת מגיעים", 'ישר <span class="hl">לחלון הביקורת</span>.'])}
    <div id="ring"></div>
    <div id="finger">
      <svg viewBox="0 0 100 147" aria-hidden="true">
        <path d="M36 12c0-7 5-12 11-12s11 5 11 12v58l9-3c5-1.600 10 .4 11.500 5 5-1.600 10 .6 11.500 5.500 5-1.200 9.500 2 10.500 7l4 26c1.800 12-1.200 24-9 33l-5 6H44l-17-27L9 94c-3-5 1-10 6-9l15 6z" fill="#F6D2AE" stroke="#D3A27A" stroke-width="2.500" stroke-linejoin="round"/>
        <path d="M58 70c0 0 1 8 1 14M70 75c0 0 1 7 1 13M82 80c0 0 1 6 1 12" stroke="#D3A27A" stroke-width="2.500" stroke-linecap="round" fill="none"/>
      </svg>
    </div>
  </div>`;

const s5 = `
  <div id="s5" class="scene clip" data-start="${T.s5}" data-duration="${(T.s6 + 0.6 - T.s5).toFixed(2)}" data-track-index="4">
    <div id="counters">
      <div class="ctr"><span class="lab">נשלחו</span><span class="num" id="c1">0</span></div>
      <div class="ctr"><span class="lab">ענו</span><span class="num" id="c2">0</span></div>
      <div class="ctr"><span class="lab">לחצו</span><span class="num" id="c3">0</span></div>
    </div>
    <div id="grid">${Array.from({ length: 12 }, (_, i) => miniChat(i)).join("")}</div>
    ${cap("cap5", ["וזה קורה לאלפי מטופלים.", '<span class="hl">אוטומטית.</span>'])}
  </div>`;

const s6 = `
  <div id="s6" class="scene clip" data-start="${T.s6}" data-duration="${(T.s7 + 0.6 - T.s6).toFixed(2)}" data-track-index="5">
    ${profileCard("card2", 38)}
    ${Array.from({ length: 6 }, (_, i) => `<svg class="spark" id="sp${i}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c.8 6.500 4.500 10.200 12 12-7.500 1.800-11.200 5.500-12 12-.8-6.500-4.500-10.200-12-12C7.500 10.200 11.200 6.500 12 0z"/></svg>`).join("")}
    ${cap("cap6", ["ביקורות חדשות", 'בפרופיל <span class="hl">של המרפאה</span>.'])}
  </div>`;

const s7 = `
  <div id="s7" class="scene clip" data-start="${T.s7}" data-duration="${(T.s8 + 0.6 - T.s7).toFixed(2)}" data-track-index="6">
    ${chip(1, ICONS.phone, "מהמספר הקיים של המרפאה")}
    ${chip(2, ICONS.smartphone, "האפליקציה בטלפון ממשיכה לעבוד כרגיל")}
    ${chip(3, ICONS.sliders, "אנחנו מפעילים ומנהלים הכול")}
  </div>`;

const s8 = `
  <div id="s8" class="scene clip" data-start="${T.s8}" data-duration="${(T.total - T.s8).toFixed(2)}" data-track-index="7">
    <div class="brand" id="brand">${COPY.brand}</div>
    <div class="rule" id="rule"></div>
    <div class="cta" id="cta">רוצים לראות איך זה יעבוד במרפאה שלכם?<span class="big">שיחה של 15 דקות.</span></div>
    <div class="contact" id="contact">${COPY.contact}</div>
  </div>`;

// ---------------------------------------------------------------------------
// Animation script
// ---------------------------------------------------------------------------
const SCRIPT = `
const T = ${JSON.stringify(T)};
const TG = ${JSON.stringify(TG)};
const CELL_ORDER = ${JSON.stringify(CELL_ORDER)};
const CELL_STARTS = ${JSON.stringify(CELL_STARTS)};
const SCR_W = ${SCR.w};
const fmt = (n) => String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
const tl = gsap.timeline({ paused: true });
const q = (s) => document.querySelector(s);
const qa = (s) => Array.from(document.querySelectorAll(s));

// helpers
const capIn = (id, t, out) => {
  tl.fromTo("#" + id + " .cl", { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.18 }, t);
  tl.to("#" + id, { opacity: 0, duration: 0.3, ease: "power2.in" }, out - 0.3);
};
const pop = (sel, t, d = 0.45) =>
  tl.fromTo(sel, { opacity: 0, y: 30, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: d, ease: "back.out(1.5)", transformOrigin: "50% 100%" }, t);
const counter = (sel, from, to, start, dur, ease) => {
  const el = q(sel), o = { v: from };
  el.textContent = fmt(from);
  tl.to(o, { v: to, duration: dur, ease, onUpdate() { el.textContent = fmt(Math.round(o.v)); } }, start);
};
const tapAt = (x, y, t) => {
  tl.set("#ring", { x, y, opacity: 0, scale: 0.3 }, t - 0.01);
  tl.fromTo("#ring", { opacity: 0.95, scale: 0.35 }, { opacity: 0, scale: 1.5, duration: 0.55, ease: "power2.out", immediateRender: false }, t);
};
const fingerTo = (from, to, tIn, tTap, tOut) => {
  tl.fromTo("#finger", { x: from.x, y: from.y, opacity: 0, scale: 1 }, { x: to.x, y: to.y, opacity: 1, duration: tTap - tIn - 0.12, ease: "power2.out", immediateRender: false }, tIn);
  tl.to("#finger", { scale: 0.88, duration: 0.12, ease: "power1.in" }, tTap - 0.12);
  tl.to("#finger", { scale: 1, duration: 0.18, ease: "power1.out" }, tTap);
  tl.to("#finger", { y: to.y + 160, x: to.x + 40, opacity: 0, duration: 0.5, ease: "power2.in" }, tOut);
};

// ---- background drift
tl.fromTo("#bg-dots", { x: 0, y: 0 }, { x: -64, y: -64, duration: T.total, ease: "none" }, 0);

// ---- scene 1: opening
tl.fromTo("#card1", { opacity: 0, y: 160, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out" }, T.card1In);
tl.fromTo("#card1 .pc-star", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)", stagger: 0.09, transformOrigin: "50% 50%" }, 0.95);
tl.fromTo("#card1 .pc-shine", { x: 0 }, { x: 1300, duration: 1.2, ease: "power2.inOut" }, 1.0);
capIn("cap1a", T.cap1a[0], T.cap1a[1]);
capIn("cap1b", T.cap1b[0], T.cap1b[1]);
// the number 38 pulses once, softly red
tl.fromTo("#n38", { scale: 1 }, { scale: 1.28, duration: 0.3, ease: "power2.out", yoyo: true, repeat: 1 }, T.pulse38);
tl.fromTo("#card1 .cnt", { scale: 1, color: "#0B2A4A" }, { scale: 1.3, color: "#E5484D", duration: 0.3, ease: "power2.out", yoyo: true, repeat: 1, transformOrigin: "0% 50%" }, T.pulse38);
// exit: slides away
tl.to("#card1", { y: -260, opacity: 0, duration: 0.55, ease: "power3.in" }, 6.0);

// ---- scene 2: the question
capIn("cap2", T.cap2[0], T.cap2[1]);

// ---- scene 3: whatsapp-style chat
tl.fromTo("#phone", { y: 700, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: "power3.out" }, T.phoneIn);
capIn("capA", T.capA[0], T.capA[1]);
capIn("capB", T.capB[0], T.capB[1]);
tl.fromTo("#typing1", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, T.typing1);
tl.fromTo("#typing1 i", { y: 0 }, { y: -9, duration: 0.22, ease: "sine.inOut", yoyo: true, repeat: 3, stagger: 0.1 }, T.typing1);
tl.to("#typing1", { opacity: 0, duration: 0.12 }, T.msg1 - 0.05);
pop("#msg1", T.msg1);
tl.fromTo(".qbtn", { opacity: 0, y: 26, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.6)", stagger: 0.18 }, T.btns);
// finger taps the first quick reply
fingerTo({ x: TG.btn1.x + 120, y: TG.btn1.y + 520 }, TG.btn1, T.finger1In, T.tap1, T.tap1 + 0.35);
tapAt(TG.btn1.x, TG.btn1.y, T.tap1);
tl.to("#btn1", { backgroundColor: "#0C8D81", color: "#FFFFFF", duration: 0.15 }, T.tap1);
tl.to(".qbtn", { opacity: 0, y: -10, duration: 0.3, ease: "power2.in", stagger: 0.05 }, T.reply - 0.05);
pop("#reply", T.reply + 0.15);
tl.fromTo("#typing2", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, T.typing2);
tl.fromTo("#typing2 i", { y: 0 }, { y: -9, duration: 0.22, ease: "sine.inOut", yoyo: true, repeat: 2, stagger: 0.1 }, T.typing2);
tl.to("#typing2", { opacity: 0, duration: 0.12 }, T.msg2 - 0.05);
pop("#msg2", T.msg2, 0.5);
// finger taps the link
fingerTo({ x: TG.link.x + 160, y: TG.link.y + 500 }, TG.link, T.finger2In, T.tapLink, T.tapLink + 0.5);
tapAt(TG.link.x, TG.link.y, T.tapLink);
tl.fromTo("#lnk", { backgroundColor: "rgba(10,116,184,0)" }, { backgroundColor: "rgba(10,116,184,0.18)", duration: 0.15 }, T.tapLink);

// ---- scene 4: review window (stars only, never text)
tl.fromTo("#chat", { x: 0, opacity: 1 }, { x: 260, opacity: 0.0, duration: 0.65, ease: "power3.inOut" }, T.swap);
tl.fromTo("#review", { x: -SCR_W }, { x: 0, duration: 0.65, ease: "power3.inOut" }, T.swap);
tl.set("#review", { x: -SCR_W, opacity: 0 }, 0);
tl.set("#review", { opacity: 1 }, T.swap);
capIn("capC", T.capC[0], T.capC[1]);
tl.fromTo("#cursor", { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "steps(1)", repeat: 10, yoyo: true }, T.swap + 0.7);
for (let i = 1; i <= 5; i++) {
  tl.fromTo("#rsf" + i, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.2, ease: "power1.out" }, T.rvStars + (i - 1) * 0.36);
  tl.fromTo("#rs" + i, { scale: 1 }, { scale: 1.25, duration: 0.17, ease: "power2.out", yoyo: true, repeat: 1, transformOrigin: "50% 50%" }, T.rvStars + (i - 1) * 0.36);
}
fingerTo({ x: TG.publish.x + 140, y: TG.publish.y + 460 }, TG.publish, T.finger3In, T.tapPublish, T.tapPublish + 0.35);
tapAt(TG.publish.x, TG.publish.y, T.tapPublish);
tl.to("#publish", { scale: 0.96, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" }, T.tapPublish - 0.05);
tl.to("#publish", { backgroundColor: "#0C8D81", duration: 0.2 }, T.tapPublish + 0.1);
tl.to("#pubA", { opacity: 0, y: -20, duration: 0.2 }, T.tapPublish + 0.1);
tl.fromTo("#pubB", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.6)" }, T.tapPublish + 0.15);
// phone shrinks away into the grid of scene 5
tl.to("#phone", { scale: 0.42, opacity: 0, y: -120, duration: 0.75, ease: "power3.in" }, T.phoneOut);

// ---- scene 5: multiplication
tl.fromTo("#counters", { opacity: 0, y: -60 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, T.s5 + 0.15);
const gridOrder = [5, 6, 4, 7, 1, 2, 0, 3, 9, 10, 8, 11];
tl.fromTo(".mini", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.4)", stagger: { each: 0.05, from: "center" } }, T.s5 + 0.35);
CELL_ORDER.forEach((cell, k) => {
  const t = CELL_STARTS[k], id = "#mini" + cell;
  tl.fromTo(id + " .mb1", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }, t);
  tl.fromTo(id + " .mp", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }, t + 0.35);
  tl.to(id + " .mp", { backgroundColor: "#12B5A6", duration: 0.12 }, t + 0.75);
  tl.to(id + " .mp", { opacity: 0, duration: 0.15 }, t + 0.95);
  tl.fromTo(id + " .mr", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.22 }, t + 0.9);
  tl.fromTo(id + " .mb2", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, t + 1.2);
  tl.fromTo(id + " .mrev", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, t + 1.55);
  tl.to(id + " .mrev-stars .star path", { fill: "#FFB400", duration: 0.12, stagger: 0.09 }, t + 1.8);
  tl.fromTo(id + " .mini-glow", { boxShadow: "inset 0 0 0 4px rgba(18,181,166,0)" }, { boxShadow: "inset 0 0 0 4px rgba(18,181,166,0.9)", duration: 0.2, yoyo: true, repeat: 1 }, t + 2.3);
});
counter("#c1", 0, 1240, T.s5 + 0.7, 6.4, "power1.inOut");
counter("#c2", 0, 436, T.s5 + 1.0, 6.2, "power1.inOut");
counter("#c3", 0, 301, T.s5 + 1.3, 6.0, "power1.inOut");
capIn("cap5", T.cap5[0], T.cap5[1]);
tl.to(["#counters", "#grid"], { opacity: 0, scale: 0.96, duration: 0.5, ease: "power2.in", transformOrigin: "50% 40%" }, T.s6 - 0.45);

// ---- scene 6: the result
tl.fromTo("#card2", { opacity: 0, y: 160, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out" }, T.s6 + 0.25);
tl.fromTo("#card2 .pc-shine", { x: 0 }, { x: 1300, duration: 1.2, ease: "power2.inOut" }, T.s6 + 1.0);
counter("#card2 .cnt", 38, 112, T.countFrom, T.countDur, "power2.inOut");
capIn("cap6", T.cap6[0], T.cap6[1]);
const sparkPos = [[330, 900], [470, 868], [600, 888], [690, 910], [400, 1000], [560, 1012]];
sparkPos.forEach((p, i) => {
  tl.set("#sp" + i, { left: p[0], top: p[1] }, 0);
  tl.fromTo("#sp" + i, { opacity: 0, scale: 0, rotate: -30 }, { opacity: 1, scale: 1, rotate: 20, duration: 0.35, ease: "back.out(2)" }, T.countFrom + 1.2 + i * 0.35);
  tl.to("#sp" + i, { opacity: 0, scale: 0, rotate: 80, duration: 0.35, ease: "power2.in" }, T.countFrom + 1.65 + i * 0.35);
});
tl.to("#card2", { y: -220, opacity: 0, duration: 0.5, ease: "power3.in" }, T.s7 - 0.1);

// ---- scene 7: why it is easy
T.chips.forEach((t, i) => {
  const id = "#chip" + (i + 1);
  tl.fromTo(id, { opacity: 0, x: 120, scale: 0.95 }, { opacity: 1, x: 0, scale: 1, duration: 0.55, ease: "power3.out" }, t);
  tl.fromTo(id + " .chip-ok", { scale: 0 }, { scale: 1, duration: 0.35, ease: "back.out(2.4)" }, t + 0.45);
});
tl.to(["#chip1", "#chip2", "#chip3"], { opacity: 0, y: -40, duration: 0.45, ease: "power2.in", stagger: 0.08 }, T.s8 - 0.35);

// ---- scene 8: closing
tl.fromTo("#brand", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, T.s8 + 0.35);
tl.fromTo("#rule", { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power2.out" }, T.s8 + 0.8);
tl.fromTo("#cta", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, T.s8 + 1.0);
tl.fromTo("#contact", { opacity: 0, y: 40, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.4)" }, T.s8 + 1.8);

window.__timelines["main"] = tl;
`;

// ---------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------
const html = `<!doctype html>
<html lang="he" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>ביקורות בגוגל לרופאי שיניים</title>
    <script src="assets/vendor/gsap.min.js"></script>
    <style>${CSS}</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T.total}" data-width="1080" data-height="1920">
      <div id="bg"><div id="bg-dots"></div></div>
${s1}
${s2}
${phoneScene}
${s5}
${s6}
${s7}
${s8}
      <audio id="music" src="assets/audio/music.mp3" data-start="0" data-duration="${T.total}" data-track-index="20"></audio>
      <audio id="sfx" src="assets/audio/sfx.mp3" data-start="0" data-duration="${T.total}" data-track-index="21"></audio>
      <!-- Reserved: track 22 for a future Hebrew voiceover (id="voiceover"). -->
    </div>
    <script>${SCRIPT}</script>
  </body>
</html>
`;

writeFileSync(join(ROOT, "index.html"), html);

// sound cues for src/make_audio.py
const cues = {
  total: T.total,
  whoosh: [T.card1In, 6.0, T.phoneIn, T.swap, T.phoneOut, T.s5 + 0.35, T.s6 + 0.25, T.s7 - 0.1],
  pop: [T.msg1, T.reply + 0.15, T.msg2, T.btns, T.btns + 0.18, T.btns + 0.36, ...T.chips],
  click: [T.tap1, T.tapLink, T.tapPublish],
  ding: Array.from({ length: 5 }, (_, i) => T.rvStars + 0.1 + i * 0.36),
  tick: CELL_STARTS.map((t) => t + 0.75),
  starTick: CELL_STARTS.map((t) => t + 1.8),
  thud: [T.pulse38],
  chime: Array.from({ length: 6 }, (_, i) => T.countFrom + 1.2 + i * 0.35),
  swell: [T.s8 + 0.35],
};
writeFileSync(join(ROOT, "src", "cues.json"), JSON.stringify(cues, null, 2) + "\n");
console.log("wrote index.html and src/cues.json");
