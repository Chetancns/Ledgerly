# Transaction Form & List Visual Design Guide

## Color Palette & Design Tokens

### Status Colors

#### Posted (Success State)
```
Light Mode:
- Background: rgba(22, 163, 74, 0.1) - Light green tint
- Text: #16a34a - Dark green
- Border: rgba(22, 163, 74, 0.3) - Green border
- Dot: #22c55e - Bright green with pulse

Dark Mode:
- Background: rgba(34, 197, 94, 0.15) - Green glow
- Text: #22c55e - Bright green
- Border: rgba(34, 197, 94, 0.3) - Green outline
- Dot: #22c55e - Bright green with pulse
```

#### Pending (Warning State)
```
Light Mode:
- Background: rgba(217, 119, 6, 0.1) - Light amber tint
- Text: #d97706 - Dark amber
- Border: rgba(217, 119, 6, 0.3) - Amber border
- Dot: #f59e0b - Bright amber with pulse

Dark Mode:
- Background: rgba(245, 158, 11, 0.15) - Amber glow
- Text: #f59e0b - Bright amber
- Border: rgba(245, 158, 11, 0.3) - Amber outline
- Dot: #f59e0b - Bright amber with pulse
```

#### Cancelled (Neutral State)
```
Light Mode:
- Background: rgba(0, 0, 0, 0.05) - Light gray tint
- Text: #64748b - Dark gray
- Border: rgba(0, 0, 0, 0.15) - Gray border
- Dot: #94a3b8 - Medium gray with pulse

Dark Mode:
- Background: rgba(255, 255, 255, 0.08) - Gray glow
- Text: #94a3b8 - Light gray
- Border: rgba(255, 255, 255, 0.15) - Gray outline
- Dot: #94a3b8 - Light gray with pulse
```

## Component Specifications

### SegmentedControl Component

```
┌─────────────────────────────────────────────────────┐
│  ╔═══════════╗  ┌───────────┐  ┌───────────┐       │
│  ║ 💸 Normal ║  │ 🔀 Transfer │  │ 🏦 Savings │       │
│  ╚═══════════╝  └───────────┘  └───────────┘       │
└─────────────────────────────────────────────────────┘

Active State:
- Blue/Purple gradient background
- White text (dark mode) / Dark text (light mode)
- Smooth sliding animation (300ms spring)
- Border highlight

Inactive State:
- Transparent background
- Gray text
- Hover: Slight opacity increase

Dimensions:
- Height: 40px (md), 36px (sm), 48px (lg)
- Padding: 16px horizontal
- Border radius: 12px (container), 8px (items)
- Gap between items: 4px
```

### Enhanced StatusBadge

```
┌────────────────────────┐
│ ● Posted              │  ← Pulsing green dot
└────────────────────────┘

┌────────────────────────┐
│ ● Pending             │  ← Pulsing amber dot
│ Expected: Jan 10      │  ← Optional subtitle
└────────────────────────┘

┌────────────────────────┐
│ ● Cancelled           │  ← Pulsing gray dot
└────────────────────────┘

Dimensions:
- Small: 8px dot, 10px text, 6px padding
- Medium: 10px dot, 12px text, 8px padding  
- Large: 12px dot, 14px text, 10px padding
- Border radius: Full (9999px)
- Dot pulse: 2s infinite animation
```

### Transaction Form Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ➕ New Transaction                                    ✕     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Transaction Type                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ╔═══════════╗  ┌───────────┐  ┌───────────┐         │  │
│  │ ║ 💸 Normal ║  │ 🔀 Transfer │  │ 🏦 Savings │         │  │
│  │ ╚═══════════╝  └───────────┘  └───────────┘         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ From Account *       │  │ Category *           │        │
│  │ ▼ Select Account     │  │ ▼ Select Category    │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Amount *             │  │ Transaction Date *   │        │
│  │ 0.00                 │  │ 2026-01-04           │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Description                                        │    │
│  │ What was this transaction for?                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Status                                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ╔══════════╗  ┌──────────┐  ┌────────────┐          │  │
│  │ ║ ✅ Posted ║  │ ⏳ Pending │  │ ❌ Cancelled │          │  │
│  │ ╚══════════╝  └──────────┘  └────────────┘          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Tags (optional)                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 🏷️ Work  🏷️ Travel  +                              │    │
│  └────────────────────────────────────────────────────┘    │
│  💡 Use tags to organize and filter...                      │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────┐  ┌────────┐            │
│  │ ➕ Add        │  │ 🤖 AI Import │  │ Cancel │            │
│  │  Transaction │  └─────────────┘  └────────┘            │
│  └──────────────┘                                           │
│                                                              │
│  💡 Tip: Press Enter to submit or Esc to cancel             │
└─────────────────────────────────────────────────────────────┘

Spacing:
- Container padding: 24px
- Section gap: 24px
- Field gap: 20px
- Label to input: 8px
- Border radius: 24px (container), 12px (inputs)
```

### Transaction Card (List View)

```
┌─────────────────────────────────────┐
│ 💸 Expense        Jan 4, 2026      │  ← Type + Date
│                                     │
│ $125.50                             │  ← Large Amount
│                                     │
│ Chase Checking                      │  ← Account
│ Category: Groceries                 │  ← Category
│ Weekly shopping at store            │  ← Description
│                                     │
│ 🏷️ Food  🏷️ Weekly  +2             │  ← Tags
│                                     │
│ ● Posted                            │  ← Status
│                                     │
├─────────────────────────────────────┤
│  ✏️ Edit    🗑️ Delete              │  ← Actions
└─────────────────────────────────────┘

Card Specs:
- Width: Responsive (grid: 1/2/3/4/5 columns)
- Padding: 16px
- Border radius: 16px
- Background: Glass morphism (backdrop-blur)
- Shadow: Soft, increases on hover
- Hover: Scale 102%, elevate shadow
- Transition: 300ms ease-out
```

### Transaction Table Row

```
┌──────┬─────────┬────────────┬────────┬──────────┬─────────────┬──────┬──────┬────────┬─────────┐
│ Date │ Amount  │ From       │ To     │ Category │ Description │ Type │ Tags │ Status │ Actions │
├──────┼─────────┼────────────┼────────┼──────────┼─────────────┼──────┼──────┼────────┼─────────┤
│ Jan 4│ 💸$125 │ Checking   │   -    │ Food     │ Shopping... │  💸  │ 🏷️🏷️ │ ●Posted│ ✏️ 🗑️  │
│      │         │            │        │          │             │Expense│ +1   │        │         │
├──────┼─────────┼────────────┼────────┼──────────┼─────────────┼──────┼──────┼────────┼─────────┤

Row Specs:
- Height: 60px minimum
- Padding: 16px horizontal, 12px vertical
- Hover: Background tint (light on dark, dark on light)
- Border: Subtle divider between rows
- Text: Variable sizes (12px-14px)
- Actions: Hover to show, always visible on mobile
```

## Animation Specifications

### SegmentedControl Sliding Indicator
```
Animation: Spring
Duration: Auto (based on distance)
Stiffness: 300
Damping: 30
Easing: ease-out

Sequence:
1. User clicks option
2. Indicator slides from current position
3. Spring effect on arrival
4. Text color transitions
```

### StatusBadge Pulse
```
Animation: Infinite pulse
Duration: 2s
Keyframes:
  0%: opacity 1, scale 1
  50%: opacity 0.6, scale 1.1
  100%: opacity 1, scale 1

Applied to: Dot indicator only
```

### Card Hover
```
Transform: translateY(-4px) scale(1.02)
Shadow: Increase elevation by 2 levels
Duration: 300ms
Easing: ease-out
```

### Modal Entry
```
Backdrop:
- Fade in: 200ms
- Final opacity: 0.6

Content:
- Combined animation: fade-in + zoom-in
- Duration: 200ms
- Start: opacity 0, scale 0.95
- End: opacity 1, scale 1
- Easing: ease-out
```

## Responsive Breakpoints

### Mobile (< 640px)
- Form: Single column
- Cards: 2 columns (if space allows, else 1)
- Table: Horizontal scroll
- Font sizes: -2px from base
- Padding: 16px (reduced from 24px)

### Tablet (640px - 1024px)
- Form: Two columns
- Cards: 3 columns
- Table: Full width, comfortable spacing
- Font sizes: Base
- Padding: 20px

### Desktop (> 1024px)
- Form: Two columns
- Cards: 4-5 columns
- Table: Full width with all columns
- Font sizes: Base
- Padding: 24px

## Accessibility Features

### Keyboard Navigation
- Tab order: Logical top-to-bottom, left-to-right
- Focus indicators: 3px outline in accent color
- Skip links: Navigate to main content
- Esc key: Close modals/cancel forms

### Screen Reader Support
- ARIA labels on all interactive elements
- Role attributes (tab, tablist, status)
- Live regions for dynamic updates
- Descriptive alt text

### Color Contrast
- All text: WCAG AA compliant (4.5:1 minimum)
- Interactive elements: 3:1 minimum
- Status badges: High contrast in both themes
- Focus indicators: Always visible

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Design Principles Applied

1. **Clarity**: Clear visual hierarchy, readable typography
2. **Consistency**: Unified color palette, spacing system
3. **Feedback**: Every action has visual confirmation
4. **Efficiency**: Keyboard shortcuts, smart defaults
5. **Delight**: Smooth animations, thoughtful details
6. **Accessibility**: WCAG AA compliant, keyboard navigable
7. **Performance**: GPU-accelerated animations, optimized renders

## Implementation Notes

- All colors use CSS custom properties for theme switching
- Animations use `transform` and `opacity` for GPU acceleration
- Framer Motion for complex animations (spring physics)
- CSS animations for simpler transitions
- Mobile-first responsive design
- Component-based architecture for reusability
