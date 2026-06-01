# FONT AUDIT REPORT
**Date:** April 14, 2026  
**Project:** Sri Siththi Vinayagar Tempel Kultur Verein e.V  

This document provides a comprehensive audit of the typography system currently implemented across the application, analyzing global CSS, Tailwind configurations, and key React components.

---

## 1. HEADING FONTS

* **H1 (Page Titles & Hero)**
  * **Font Name:** Playfair Display (via `--font-heading` / inline styles)
  * **Size:** 36px (mobile) `text-4xl` / 48px (tablet) `text-5xl` / 60px (desktop) `text-6xl`
  * **Weight:** Bold (700)
  * **Used in:** `HomePage.jsx` (Hero Title), Global `index.css` (`h1` base styles)

* **H2 (Section Headings)**
  * **Font Name:** Playfair Display
  * **Size:** 24px (mobile) `text-2xl` / 30px (desktop) `text-3xl`
  * **Weight:** Semi-Bold (600)
  * **Used in:** Global `index.css` (`h2` base styles), Section Titles

* **H3 (Subsection Headings)**
  * **Font Name:** Plus Jakarta Sans (default sans)
  * **Size:** 20px (mobile) `text-xl` / 24px (desktop) `text-2xl`
  * **Weight:** Semi-Bold (600)
  * **Used in:** Global `index.css` (`h3` base styles)

* **H4, H5, H6**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 18px (mobile) `text-lg` / 20px (desktop) `text-xl`
  * **Weight:** Medium (500)
  * **Used in:** Global `index.css` (`h4` base styles), minor content blocks

---

## 2. BODY TEXT FONTS

* **Paragraph Text**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 16px `text-base`
  * **Weight:** Regular (400)
  * **Line Height:** 1.625 (Relaxed)
  * **Used in:** Global defaults (`html, body`), standard content pages

* **Description Text**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 14px `text-sm`
  * **Weight:** Regular (400)
  * **Used in:** `LoginPage.jsx` (Card descriptions), `Footer.jsx` (Temple description)

* **Small Text / Captions**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 12px `text-xs`
  * **Weight:** Medium (500)
  * **Used in:** `Header.jsx` (Contact details), `Footer.jsx` (Copyright text)

---

## 3. NAVIGATION FONTS

* **Menu Items**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 14px `text-sm`
  * **Weight:** Medium (500)
  * **Used in:** `Header.jsx` (Main navigation links, Dropdown menus)

* **Links (Inline)**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 14px `text-sm`
  * **Weight:** Semi-Bold (600)
  * **Used in:** `LoginPage.jsx` ("Sign up" link), general content inline links

* **Breadcrumbs / Sub-nav**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 14px `text-sm`
  * **Weight:** Medium (500)
  * **Used in:** Global application layouts

---

## 4. BUTTON TEXT FONTS

* **Primary Buttons**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 16px `text-base`
  * **Weight:** Semi-Bold (600)
  * **Used in:** `LoginPage.jsx` ("Sign In" button), `HomePage.jsx` (Hero "About" button)

* **Secondary Buttons**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 16px `text-base`
  * **Weight:** Semi-Bold (600)
  * **Used in:** `LoginPage.jsx` (Google OAuth button)

* **Small Buttons / Quick Actions**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 14px `text-sm`
  * **Weight:** Semi-Bold (600)
  * **Used in:** `HomePage.jsx` (Quick Action Grid cards)

---

## 5. CARD TITLE FONTS

* **Card Headings**
  * **Font Name:** Playfair Display
  * **Size:** 24px `text-2xl`
  * **Weight:** Bold (700)
  * **Used in:** `LoginPage.jsx` ("Welcome Back" title)

* **Card Body Text**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 14px `text-sm`
  * **Weight:** Regular (400)
  * **Used in:** Form labels (`text-sm font-medium`), Card content

---

## 6. FOOTER TEXT FONTS

* **Footer Headings**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 16px `text-base`
  * **Weight:** Bold (700)
  * **Used in:** `Footer.jsx` ("Services", "Opening Hours", "Location")

* **Footer Links & Content**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 14px `text-sm`
  * **Weight:** Medium (500)
  * **Used in:** `Footer.jsx` (Page links, Address, Phone numbers)

* **Footer Copyright / Small Text**
  * **Font Name:** Plus Jakarta Sans
  * **Size:** 12px `text-xs`
  * **Weight:** Medium (500)
  * **Used in:** `Footer.jsx` (Bottom copyright bar)

---

## 7. SPECIAL / DECORATIVE FONTS

* **Temple Brand Name (Header & Footer)**
  * **Font Name:** Playfair Display
  * **Size:** 18px to 36px (Responsive)
  * **Weight:** Bold (700)
  * **Used in:** `Header.jsx` (Logo text), `Footer.jsx` (Logo text)
  * **Note:** Frequently applied via inline `style={{ fontFamily: 'Playfair Display, serif' }}` or Tailwind `font-serif` combined with global CSS rules.

---

## 8. GOOGLE FONTS & CUSTOM FONTS

**Imported Fonts:**
* **Plus Jakarta Sans** (Weights: 400, 500, 600, 700)
* **Playfair Display** (Weights: 600, 700, Italic variants)

**CSS Import Statement (`index.css`):**