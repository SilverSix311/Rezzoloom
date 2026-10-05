---
name: Rezzo
description: Local creative operator workspace
colors:
  canvas: "#171a18"
  sidebar: "#121513"
  surface: "#202521"
  raised: "#292f29"
  line: "#363e36"
  ink: "#ecefe6"
  muted: "#a4afa2"
  accent: "#d1ed9a"
  accent-ink: "#202b16"
  warning: "#f0bf8c"
  error: "#ffb6a3"
typography:
  heading:
    fontFamily: "Manrope, sans-serif"
    fontSize: "42px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  control: "7px"
  panel: "12px"
spacing:
  compact: "8px"
  normal: "16px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
---
# Rezzo design system

## Overview

A focused creative operator console for building and keeping Arena recipes. The user selected a sleek, professional direction; the implementation uses warm charcoal, restrained lime and clear typography. This is an operational workspace, so real status, target identity and review actions lead.

The product requirements remain in [docs/PRODUCT.md](docs/PRODUCT.md), with implementation boundaries in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). This file describes the shipped UI, not future product capabilities.

## Colors

Muted green undertones connect the sidebar, canvas and panels. Lime identifies primary actions and selected navigation. Warning and error colors always accompany text, never carry meaning alone. Surface differences and dividers provide grouping without decorative glow.

## Typography

Self-hosted Manrope, weights 400, 600 and 800, carries the UI. The brand uses 800; headings use 600. Desktop page titles are 42px, reducing to 33px below 700px. Section titles are 17–20px; controls 12–13px; metadata 10–12px. Monospace is reserved for literal endpoint addresses. Font files come from Google Fonts; the OFL is included in `public/fonts/OFL.txt`.

## Layout

Three hash-routed views: Gallery, Prompt studio and Connections. The desktop sidebar is 232px, reducing to 200px below 1100px. Below 700px it becomes a horizontal navigation bar. Content has a 1400px maximum width. Gallery recipes use divided rows rather than nested cards. The studio uses a flexible form with a 280px review column (350px on wide screens); below 1100px review follows the form. Controls stack below 700px.

## Elevation & Depth

Use tonal layering and single dividers. No decorative shadows. The connection dialog uses a dark backdrop for focus. Status notices remain visible while scrolling.

## Shapes

Controls use 7px corners; panels and recipe placeholders use 12px. The mark and navigation icons are small authored SVG geometry. Recipe artwork is explicitly a missing-preview placeholder, not a generated image or Arena output.

## Components

- Primary buttons: lime with dark text, brighter hover, visible focus outline, disabled opacity and busy cursor.
- Navigation: only the current view is highlighted and has `aria-current="page"`.
- Status filters: labeled toggle buttons with `aria-pressed`; status is also readable on each record.
- Inputs: dark solid surfaces, themed caret/selection, visible focus and readable placeholders.
- Review: target, prompt, source/effect chain and approval remain explicit. Editing the form invalidates the visible review; changing the target hides stale controls.
- Empty and error states: explain what happened and provide an actionable next step. No fake previews or live status.

## Do's and Don'ts

Keep primary tasks prominent, target context visible and unsupported functionality honest. Respect reduced motion. Use SVG icons consistently. Do not add continuous canvas animation, external font requests, fake queue controls, or a pretend live monitor to create visual polish. Preserve keyboard navigation, focus outlines and mobile access to every actual feature.
