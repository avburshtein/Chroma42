:root {
  color-scheme: light dark;

  /* --- Schemes (semantic color roles) --- */
  --md-sys-color-primary: #00543b;
  --md-sys-color-surface-tint: #056c4d;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-primary-container: #0b6e4f;
  --md-sys-color-on-primary-container: #98edc6;
  --md-sys-color-secondary: #b12a33;
  --md-sys-color-on-secondary: #ffffff;
  --md-sys-color-secondary-container: #ff6467;
  --md-sys-color-on-secondary-container: #680010;
  --md-sys-color-tertiary: #5b5f5c;
  --md-sys-color-on-tertiary: #ffffff;
  --md-sys-color-tertiary-container: #fbfffa;
  --md-sys-color-on-tertiary-container: #717672;
  --md-sys-color-error: #8a5100;
  --md-sys-color-on-error: #ffffff;
  --md-sys-color-error-container: #d17d00;
  --md-sys-color-on-error-container: #402300;
  --md-sys-color-background: #f7faf5;
  --md-sys-color-on-background: #181d1a;
  --md-sys-color-surface: #fcf8fa;
  --md-sys-color-on-surface: #1b1b1d;
  --md-sys-color-surface-variant: #e1e2e8;
  --md-sys-color-on-surface-variant: #44474b;
  --md-sys-color-outline: #75777c;
  --md-sys-color-outline-variant: #c5c6cc;
  --md-sys-color-shadow: #000000;
  --md-sys-color-scrim: #000000;
  --md-sys-color-inverse-surface: #303031;
  --md-sys-color-inverse-on-surface: #f3f0f1;
  --md-sys-color-inverse-primary: #83d7b1;
  --md-sys-color-primary-fixed: #9ff4cc;
  --md-sys-color-on-primary-fixed: #002115;
  --md-sys-color-primary-fixed-dim: #83d7b1;
  --md-sys-color-on-primary-fixed-variant: #005139;
  --md-sys-color-secondary-fixed: #ffdad8;
  --md-sys-color-on-secondary-fixed: #410007;
  --md-sys-color-secondary-fixed-dim: #ffb3b1;
  --md-sys-color-on-secondary-fixed-variant: #8f0e1f;
  --md-sys-color-tertiary-fixed: #dfe4df;
  --md-sys-color-on-tertiary-fixed: #181d1a;
  --md-sys-color-tertiary-fixed-dim: #c3c8c3;
  --md-sys-color-on-tertiary-fixed-variant: #434845;
  --md-sys-color-surface-dim: #dcd9da;
  --md-sys-color-surface-bright: #fcf8fa;
  --md-sys-color-surface-container-lowest: #ffffff;
  --md-sys-color-surface-container-low: #f6f3f4;
  --md-sys-color-surface-container: #f0edee;
  --md-sys-color-surface-container-high: #eae7e8;
  --md-sys-color-surface-container-highest: #e4e2e3;

  /* --- Surface Tint Overlays --- */
  --md-sys-surface-tint-5: rgba(5, 108, 77, 0.05);
  --md-sys-surface-tint-8: rgba(5, 108, 77, 0.08);
  --md-sys-surface-tint-11: rgba(5, 108, 77, 0.11);
  --md-sys-surface-tint-12: rgba(5, 108, 77, 0.12);
  --md-sys-surface-tint-14: rgba(5, 108, 77, 0.14);

  /* --- Extended Colors — Lime / Accent --- */
  --md-ext-lime-accent: #546524;
  --md-ext-on-lime-accent: #ffffff;
  --md-ext-lime-accent-container: #d7eb9b;
  --md-ext-on-lime-accent-container: #3d4c0d;

  /* --- Extended Colors — Decorative Lavender (Light) --- */
  --md-ext-lavender-light: #5a5891;
  --md-ext-on-lavender-light: #ffffff;
  --md-ext-lavender-light-container: #e2dfff;
  --md-ext-on-lavender-light-container: #424078;

  /* --- Extended Colors — Decorative Lavender (Purple) --- */
  --md-ext-lavender-purple: #6e528a;
  --md-ext-on-lavender-purple: #ffffff;
  --md-ext-lavender-purple-container: #f0dbff;
  --md-ext-on-lavender-purple-container: #563b71;

  /* --- Extended Colors — Green Accent --- */
  --md-ext-green-accent: #336210;
  --md-ext-on-green-accent: #ffffff;
  --md-ext-green-accent-container: #b3f088;
  --md-ext-on-green-accent-container: #0b2000;

  /* --- Extended Colors — Raw Decorative (static) --- */
  --md-ext-decorative-lime: #ccff00;
  --md-ext-decorative-lavender: #a29ffe;
  --md-ext-decorative-purple: #c084fc;

  /* --- Extended Colors — Gradients --- */
  --md-ext-button-gradient-start: #00543b;
  --md-ext-button-gradient-end: #00543b;
  --md-ext-block-gradient-start: #00543b;
  --md-ext-block-gradient-end: #00543b;

  /* --- Extended Colors — Primary Button Text (always white) --- */
  --md-ext-primary-button-text: #ffffff;

  /* --- Shadow Colors --- */
  --md-shadow-card-accent: rgba(177, 211, 196, 0.3);
  --md-shadow-card-glow: rgba(242, 242, 242, 0.86);
  --md-shadow-card-base: rgba(0, 0, 0, 0.05);
  --md-shadow-card-green-accent: rgba(212, 241, 230, 0.25);
  --md-shadow-card-green-base: rgba(0, 0, 0, 0.06);
  --md-shadow-button-hover-green: rgba(11, 110, 79, 0.2);

  /* --- Non-standard State Layers (custom) --- */
  --md-state-on-surface-20: rgba(27, 27, 29, 0.2);
  --md-state-on-surface-25: rgba(27, 27, 29, 0.25);
  --md-state-on-surface-30: rgba(27, 27, 29, 0.3);
  --md-state-on-surface-35: rgba(27, 27, 29, 0.35);
  --md-state-on-surface-40: rgba(27, 27, 29, 0.4);
  --md-state-on-surface-45: rgba(27, 27, 29, 0.45);
  --md-state-on-surface-50: rgba(27, 27, 29, 0.5);
  --md-state-surface-90: rgba(252, 248, 250, 0.9);
  --md-state-surface-container-50: rgba(255, 255, 255, 0.5);

  /* --- Spacing --- */
  --spacing-0: 0px;
  --spacing-2: 2px;
  --spacing-4: 4px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-14: 14px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-56: 56px;
  --spacing-64: 64px;
  --spacing-80: 80px;
  --spacing-96: 96px;
  --spacing-112: 112px;
  --spacing-120: 120px;
  --spacing-160: 160px;

  /* --- Border Radius --- */
  --radius-none: 0px;
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-base: 12px;
  --radius-lg: 14px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-3xl: 24px;
  --radius-4xl: 28px;
  --radius-5xl: 48px;
  --radius-full: 9999px;

  /* --- Sizing — Icons --- */
  --sizing-icon-xs: 16px;
  --sizing-icon-sm: 18px;
  --sizing-icon-md: 20px;
  --sizing-icon-lg: 24px;
  --sizing-icon-xl: 32px;

  /* --- Sizing — Buttons --- */
  --sizing-button-sm: 36px;
  --sizing-button-md: 44px;
  --sizing-button-lg: 48px;
  --sizing-button-xl: 56px;

  /* --- Sizing — Inputs --- */
  --sizing-input-sm: 40px;
  --sizing-input-md: 48px;
  --sizing-input-lg: 56px;

  /* --- Sizing — Containers --- */
  --sizing-container-content: 1280px; /* 1:1 с Make max-w-[1280px] (Main_page_Spec (24)) */
  --sizing-container-form: 850px;
  --sizing-container-narrow: 768px;
  --sizing-container-page: 1440px;

  /* --- Sizing — Layout --- */
  --sizing-navbar-height: 87px;
  --sizing-section-padding-y: 80px;
  --sizing-section-padding-x-hero: 64px;

  /* --- Opacity --- */
  --opacity-0: 0;
  --opacity-5: 0.05;
  --opacity-6: 0.06;
  --opacity-8: 0.08;
  --opacity-10: 0.1;
  --opacity-12: 0.12;
  --opacity-16: 0.16;
  --opacity-20: 0.2;
  --opacity-25: 0.25;
  --opacity-30: 0.3;
  --opacity-38: 0.38;
  --opacity-50: 0.5;
  --opacity-60: 0.6;
  --opacity-72: 0.72;
  --opacity-80: 0.8;
  --opacity-90: 0.9;
  --opacity-100: 1;

  /* --- Typography --- */
  --font-display: "Poppins", sans-serif;
  --font-body: "Inter", sans-serif;

  --text-display-lg: 500 68px/76px var(--font-display);
  --text-display-lg-tracking: -0.25px;
  --text-display-md: 500 64px/72px var(--font-display);
  --text-display-md-tracking: 0;
  --text-display-sm: 500 52px/60px var(--font-display);
  --text-display-sm-tracking: 0;

  --text-headline-lg: 500 48px/56px var(--font-display);
  --text-headline-lg-tracking: 0;
  --text-headline-md: 500 34px/42px var(--font-display);
  --text-headline-md-tracking: 0;
  --text-headline-sm: 500 26px/34px var(--font-display);
  --text-headline-sm-tracking: 0;

  --text-title-lg: 500 20px/28px var(--font-display);
  --text-title-lg-tracking: 0;
  --text-title-md: 500 16px/24px var(--font-body);
  --text-title-md-tracking: 0.15px;
  --text-title-sm: 500 14px/20px var(--font-body);
  --text-title-sm-tracking: 0.1px;

  --text-body-lg: 400 18px/28px var(--font-body);
  --text-body-lg-tracking: 0.5px;
  --text-body-md: 400 16px/24px var(--font-body);
  --text-body-md-tracking: 0.25px;
  --text-body-sm: 400 14px/22px var(--font-body);
  --text-body-sm-tracking: 0.4px;

  --text-label-lg: 600 16px/24px var(--font-body);
  --text-label-lg-tracking: 0.1px;
  --text-label-md: 500 13px/20px var(--font-body);
  --text-label-md-tracking: 0.5px;
  --text-label-sm: 600 11px/16px var(--font-body);
  --text-label-sm-tracking: 0.5px;
  --text-label-overline: 600 10px/16px var(--font-body);
  --text-label-overline-tracking: 0.5px;

  --text-button: 500 16px/24px var(--font-body);
  --text-button-tracking: 0;
}
/* Dark Mode + @media fallback + Base Styles */

[data-theme="dark"] {
  --md-sys-color-primary: #83d7b1;
  --md-sys-color-surface-tint: #83d7b1;
  --md-sys-color-on-primary: #003826;
  --md-sys-color-primary-container: #0b6e4f;
  --md-sys-color-on-primary-container: #98edc6;
  --md-sys-color-secondary: #ffb3b1;
  --md-sys-color-on-secondary: #680011;
  --md-sys-color-secondary-container: #ff6467;
  --md-sys-color-on-secondary-container: #680010;
  --md-sys-color-tertiary: #ffffff;
  --md-sys-color-on-tertiary: #2d312e;
  --md-sys-color-tertiary-container: #dfe4df;
  --md-sys-color-on-tertiary-container: #616562;
  --md-sys-color-error: #ffb86e;
  --md-sys-color-on-error: #492900;
  --md-sys-color-error-container: #d17d00;
  --md-sys-color-on-error-container: #402300;
  --md-sys-color-background: #101412;
  --md-sys-color-on-background: #e0e3df;
  --md-sys-color-surface: #131314;
  --md-sys-color-on-surface: #e4e2e3;
  --md-sys-color-surface-variant: #44474b;
  --md-sys-color-on-surface-variant: #c5c6cc;
  --md-sys-color-outline: #8f9196;
  --md-sys-color-outline-variant: #44474b;
  --md-sys-color-shadow: #000000;
  --md-sys-color-scrim: #000000;
  --md-sys-color-inverse-surface: #e4e2e3;
  --md-sys-color-inverse-on-surface: #303031;
  --md-sys-color-inverse-primary: #056c4d;
  --md-sys-color-primary-fixed: #9ff4cc;
  --md-sys-color-on-primary-fixed: #002115;
  --md-sys-color-primary-fixed-dim: #83d7b1;
  --md-sys-color-on-primary-fixed-variant: #005139;
  --md-sys-color-secondary-fixed: #ffdad8;
  --md-sys-color-on-secondary-fixed: #410007;
  --md-sys-color-secondary-fixed-dim: #ffb3b1;
  --md-sys-color-on-secondary-fixed-variant: #8f0e1f;
  --md-sys-color-tertiary-fixed: #dfe4df;
  --md-sys-color-on-tertiary-fixed: #181d1a;
  --md-sys-color-tertiary-fixed-dim: #c3c8c3;
  --md-sys-color-on-tertiary-fixed-variant: #434845;
  --md-sys-color-surface-dim: #131314;
  --md-sys-color-surface-bright: #39393a;
  --md-sys-color-surface-container-lowest: #0e0e0f;
  --md-sys-color-surface-container-low: #1b1b1d;
  --md-sys-color-surface-container: #1f1f21;
  --md-sys-color-surface-container-high: #2a2a2b;
  --md-sys-color-surface-container-highest: #353536;

  --md-sys-surface-tint-5: rgba(131, 215, 177, 0.05);
  --md-sys-surface-tint-8: rgba(131, 215, 177, 0.08);
  --md-sys-surface-tint-11: rgba(131, 215, 177, 0.11);
  --md-sys-surface-tint-12: rgba(131, 215, 177, 0.12);
  --md-sys-surface-tint-14: rgba(131, 215, 177, 0.14);

  --md-ext-lime-accent: #bbcf81;
  --md-ext-on-lime-accent: #283500;
  --md-ext-lime-accent-container: #3d4c0d;
  --md-ext-on-lime-accent-container: #d7eb9b;

  --md-ext-lavender-light: #c3c0ff;
  --md-ext-on-lavender-light: #2c2a60;
  --md-ext-lavender-light-container: #424078;
  --md-ext-on-lavender-light-container: #e2dfff;

  --md-ext-lavender-purple: #dbb9f9;
  --md-ext-on-lavender-purple: #3e2458;
  --md-ext-lavender-purple-container: #563b71;
  --md-ext-on-lavender-purple-container: #f0dbff;

  --md-ext-green-accent: #98d46f;
  --md-ext-on-green-accent: #173800;
  --md-ext-green-accent-container: #245000;
  --md-ext-on-green-accent-container: #b3f088;

  --md-ext-button-gradient-start: #00543b;
  --md-ext-button-gradient-end: #336210;
  --md-ext-block-gradient-start: #00543b;
  --md-ext-block-gradient-end: #336210;

  --md-shadow-card-accent: rgba(0, 0, 0, 0.3);
  --md-shadow-card-glow: rgba(0, 0, 0, 0.86);
  --md-shadow-card-base: rgba(0, 0, 0, 0.05);
  --md-shadow-card-green-accent: rgba(0, 0, 0, 0.25);
  --md-shadow-card-green-base: rgba(0, 0, 0, 0.06);
  --md-shadow-button-hover-green: rgba(131, 215, 177, 0.2);

  --md-state-on-surface-20: rgba(228, 226, 227, 0.2);
  --md-state-on-surface-25: rgba(228, 226, 227, 0.25);
  --md-state-on-surface-30: rgba(228, 226, 227, 0.3);
  --md-state-on-surface-35: rgba(228, 226, 227, 0.35);
  --md-state-on-surface-40: rgba(228, 226, 227, 0.4);
  --md-state-on-surface-45: rgba(228, 226, 227, 0.45);
  --md-state-on-surface-50: rgba(228, 226, 227, 0.5);
  --md-state-surface-90: rgba(19, 19, 20, 0.9);
  --md-state-surface-container-50: rgba(255, 255, 255, 0.5);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --md-sys-color-primary: #83d7b1;
    --md-sys-color-surface-tint: #83d7b1;
    --md-sys-color-on-primary: #003826;
    --md-sys-color-primary-container: #0b6e4f;
    --md-sys-color-on-primary-container: #98edc6;
    --md-sys-color-secondary: #ffb3b1;
    --md-sys-color-on-secondary: #680011;
    --md-sys-color-secondary-container: #ff6467;
    --md-sys-color-on-secondary-container: #680010;
    --md-sys-color-tertiary: #ffffff;
    --md-sys-color-on-tertiary: #2d312e;
    --md-sys-color-tertiary-container: #dfe4df;
    --md-sys-color-on-tertiary-container: #616562;
    --md-sys-color-error: #ffb86e;
    --md-sys-color-on-error: #492900;
    --md-sys-color-error-container: #d17d00;
    --md-sys-color-on-error-container: #402300;
    --md-sys-color-background: #101412;
    --md-sys-color-on-background: #e0e3df;
    --md-sys-color-surface: #131314;
    --md-sys-color-on-surface: #e4e2e3;
    --md-sys-color-surface-variant: #44474b;
    --md-sys-color-on-surface-variant: #c5c6cc;
    --md-sys-color-outline: #8f9196;
    --md-sys-color-outline-variant: #44474b;
    --md-sys-color-shadow: #000000;
    --md-sys-color-scrim: #000000;
    --md-sys-color-inverse-surface: #e4e2e3;
    --md-sys-color-inverse-on-surface: #303031;
    --md-sys-color-inverse-primary: #056c4d;
    --md-sys-color-primary-fixed: #9ff4cc;
    --md-sys-color-on-primary-fixed: #002115;
    --md-sys-color-primary-fixed-dim: #83d7b1;
    --md-sys-color-on-primary-fixed-variant: #005139;
    --md-sys-color-secondary-fixed: #ffdad8;
    --md-sys-color-on-secondary-fixed: #410007;
    --md-sys-color-secondary-fixed-dim: #ffb3b1;
    --md-sys-color-on-secondary-fixed-variant: #8f0e1f;
    --md-sys-color-tertiary-fixed: #dfe4df;
    --md-sys-color-on-tertiary-fixed: #181d1a;
    --md-sys-color-tertiary-fixed-dim: #c3c8c3;
    --md-sys-color-on-tertiary-fixed-variant: #434845;
    --md-sys-color-surface-dim: #131314;
    --md-sys-color-surface-bright: #39393a;
    --md-sys-color-surface-container-lowest: #0e0e0f;
    --md-sys-color-surface-container-low: #1b1b1d;
    --md-sys-color-surface-container: #1f1f21;
    --md-sys-color-surface-container-high: #2a2a2b;
    --md-sys-color-surface-container-highest: #353536;

    --md-sys-surface-tint-5: rgba(131, 215, 177, 0.05);
    --md-sys-surface-tint-8: rgba(131, 215, 177, 0.08);
    --md-sys-surface-tint-11: rgba(131, 215, 177, 0.11);
    --md-sys-surface-tint-12: rgba(131, 215, 177, 0.12);
    --md-sys-surface-tint-14: rgba(131, 215, 177, 0.14);

    --md-ext-lime-accent: #bbcf81;
    --md-ext-on-lime-accent: #283500;
    --md-ext-lime-accent-container: #3d4c0d;
    --md-ext-on-lime-accent-container: #d7eb9b;
    --md-ext-lavender-light: #c3c0ff;
    --md-ext-on-lavender-light: #2c2a60;
    --md-ext-lavender-light-container: #424078;
    --md-ext-on-lavender-light-container: #e2dfff;
    --md-ext-lavender-purple: #dbb9f9;
    --md-ext-on-lavender-purple: #3e2458;
    --md-ext-lavender-purple-container: #563b71;
    --md-ext-on-lavender-purple-container: #f0dbff;
    --md-ext-green-accent: #98d46f;
    --md-ext-on-green-accent: #173800;
    --md-ext-green-accent-container: #245000;
    --md-ext-on-green-accent-container: #b3f088;

    --md-ext-button-gradient-start: #00543b;
    --md-ext-button-gradient-end: #336210;
    --md-ext-block-gradient-start: #00543b;
    --md-ext-block-gradient-end: #336210;

    --md-shadow-card-accent: rgba(0, 0, 0, 0.3);
    --md-shadow-card-glow: rgba(0, 0, 0, 0.86);
    --md-shadow-card-base: rgba(0, 0, 0, 0.05);
    --md-shadow-card-green-accent: rgba(0, 0, 0, 0.25);
    --md-shadow-card-green-base: rgba(0, 0, 0, 0.06);
    --md-shadow-button-hover-green: rgba(131, 215, 177, 0.2);

    --md-state-on-surface-20: rgba(228, 226, 227, 0.2);
    --md-state-on-surface-25: rgba(228, 226, 227, 0.25);
    --md-state-on-surface-30: rgba(228, 226, 227, 0.3);
    --md-state-on-surface-35: rgba(228, 226, 227, 0.35);
    --md-state-on-surface-40: rgba(228, 226, 227, 0.4);
    --md-state-on-surface-45: rgba(228, 226, 227, 0.45);
    --md-state-on-surface-50: rgba(228, 226, 227, 0.5);
    --md-state-surface-90: rgba(19, 19, 20, 0.9);
    --md-state-surface-container-50: rgba(255, 255, 255, 0.5);
  }
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

body {
  font: var(--text-body-md);
  letter-spacing: var(--text-body-md-tracking);
  color: var(--md-sys-color-on-background);
  background-color: var(--md-sys-color-background);
  min-height: 100dvh;
}