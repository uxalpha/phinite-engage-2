# Image Placeholders for Playful Streak Page

This directory contains placeholders for images used in the streak page. Please replace these with your own PNG images.

## Required Images

### 1. `fire-icon.png`
- **Size**: 128x128px (recommended)
- **Format**: PNG with transparent background
- **Usage**: Large fire icon displayed in the hero streak card (yellow/orange gradient card)
- **Design**: A playful fire/flame icon, similar to Duolingo's streak flame
- **Location in code**: `app/streak/page.tsx` - Hero Streak Card section

### 2. `mascot.png`
- **Size**: 64x64px (recommended)
- **Format**: PNG with transparent background
- **Usage**: Small mascot icon next to "Daily Goal" title
- **Design**: Your brand's mascot or a fun character icon
- **Location in code**: `app/streak/page.tsx` - Daily Goal Card section

### 3. `reading-mascot.png`
- **Size**: 256x256px (recommended)
- **Format**: PNG with transparent background
- **Usage**: Decorative illustration in the longest streak card (cream background)
- **Design**: Character reading a book or celebrating, placed in bottom-right corner
- **Location in code**: `app/streak/page.tsx` - Longest Streak Card section

### 4. `checkmark.svg` (Optional)
- **Size**: SVG (scalable)
- **Format**: SVG
- **Usage**: Custom checkmark for verified days in calendar
- **Design**: A clean, bold checkmark icon
- **Note**: Currently using built-in SVG, but you can replace with custom design

### 5. `warning.svg` (Optional)
- **Size**: SVG (scalable)
- **Format**: SVG
- **Usage**: Warning icon for grace days in calendar
- **Design**: An exclamation mark or warning symbol
- **Note**: Currently using emoji/text, but you can replace with custom design

## Current Placeholder Status

Currently, the app is using emoji placeholders (🔥, 🎯, 📚) for all images. These will be automatically replaced when you add the image files to this directory and update the code to reference them.

## How to Replace

1. Create your PNG/SVG images according to the specifications above
2. Save them in this directory (`public/images/`)
3. Update the code in `app/streak/page.tsx` to use the images:

### Example replacement:
Replace this:
```tsx
<span className="text-6xl">🔥</span>
```

With this:
```tsx
<img src="/images/fire-icon.png" alt="Fire" className="w-24 h-24" />
```

## Design Tips

- Use transparent backgrounds for all icons/mascots
- Match the playful, friendly Duolingo-inspired aesthetic
- Ensure high contrast on both light and colored backgrounds
- Test images on mobile devices for clarity at smaller sizes
- Keep file sizes optimized (< 100KB per image)

## Color Palette Reference

Use these colors in your designs to match the streak page theme:
- Primary Purple: `#7a44ff`
- Streak Yellow: `#FFD60A`
- Streak Orange: `#FF9500`
- Success Green: `#58CC02`
- Warning Orange: `#FF9600`

---

**Need help?** Refer to the Duolingo app for inspiration on playful, engaging streak icons and mascots!
