# CryptoPay Mini - Design Guidelines

## Design Approach
**Reference-Based: Revolut / N26 / Monzo Style**
Clean fintech aesthetic prioritizing clarity, trust, and effortless navigation. The interface should feel modern, lightweight, and professional with smooth interactions optimized for Telegram WebView.

## Typography System
- **Font Family**: Modern sans-serif (Inter, SF Pro Display, or similar)
- **Balance Numbers**: Extra large, bold (48-56px) for primary USDT/RUB values
- **Headers**: 24-28px, semibold
- **Body Text**: 16px regular, 14px for secondary info
- **Small Labels**: 12px for captions and metadata

## Color Palette
- **Background**: Pure white (#FFFFFF)
- **Cards**: Light grey (#F5F7FA)
- **Primary Accent**: Blue (#0066FF or similar fintech blue)
- **Text Primary**: Dark grey/black (#1A1A1A)
- **Text Secondary**: Medium grey (#6B7280)
- **Success**: Green (#10B981)
- **Warning**: Orange (#F59E0B)
- **Error**: Red (#EF4444)

## Layout System
**Spacing**: Use Tailwind units of 4, 6, 8, 12, 16, 20 (p-4, m-6, gap-8, etc.)
**Container**: Full-width with px-4 padding, max-w-md centered for optimal mobile experience
**Cards**: Rounded-xl (12px), subtle shadow, p-6 padding

## Screen-by-Screen Components

### 1. Welcome Screen
- Centered layout with generous vertical spacing
- Greeting text: 20px regular, center-aligned, mb-8
- Large "Open My Wallet" button: full-width, rounded-lg, py-4, blue background
- Clean, minimal - no images needed

### 2. Main Dashboard
**Balance Cards** (3 stacked cards with rounded-xl borders):
- Card 1: USDT Balance - Large number display (48px bold), "USDT" label in grey
- Card 2: Exchange Rate - "1 USDT ≈ 90 RUB" centered, 18px
- Card 3: RUB Equivalent - Large ruble amount (48px bold), "₽" symbol

**Action Buttons** (2-column grid, gap-4):
- "➕ Top Up" and "💳 Pay" - Equal width, rounded-lg, py-4, outlined style

**Bottom Navigation** (Fixed at bottom):
- 4 equal-width tabs: 🏠 Home | 🧾 History | 🆘 Support | ⚙️ Settings
- Icon + label layout, active state with blue accent
- Light border-top separator

### 3. Top-Up Page
- **Wallet Address Card**: 
  - Rounded-xl grey card with p-6
  - "TRC-20 Wallet Address" label (14px grey)
  - Address in monospace font, 14px, breakable
  - "Copy Address" button below (full-width, outlined)
- **Info Note**: Small grey text box with light background, rounded corners
- Back button in top-left

### 4. Pay Page (Multi-Step Form)
**Step 1 - Amount Input**:
- Large input field for RUB amount, placeholder "0.00 ₽"
- Show USDT equivalent below in real-time (grey text)

**Step 2 - Urgency Selection**:
- 2 radio cards in grid
- "⚡ Urgent (5–10 min)" and "⏱️ Standard (10–30 min)"
- Selected state: blue border + light blue background

**Step 3 - Details**:
- Text area for link/description
- Optional comment field (labeled clearly)

**Confirmation Screen**:
- Summary card showing all details in rows
- Large "Submit Request" button at bottom
- Success card after submission: centered checkmark icon, success message, "View History" secondary button

### 5. History Page
- Scrollable list of transaction cards
- Each card: rounded-lg, p-4, border, mb-3
- Left side: RUB amount (bold, 20px), USDT equivalent below (14px grey)
- Right side: Status badge (rounded-full pill, 10px text)
- Bottom: Urgency icon + Date/time (12px grey)
- Status colors: Blue (Submitted), Yellow (Processing), Green (Paid), Red (Rejected)

### 6. Support Page
- Centered contact card with rounded-xl border
- Icon at top (💬 or similar)
- Contact info in clean rows with copy buttons
- Generous padding and spacing

### 7. Settings Page
- Profile info card: Avatar placeholder, username, join date
- Action buttons stacked: "Clear Data" (outlined), "Log Out" (red outlined)

## Animations & Interactions
- **Page Transitions**: Subtle fade (200ms ease)
- **Button Presses**: Slight scale (0.98) on tap
- **Card Hover**: Very subtle shadow increase
- **Copy Actions**: Brief success feedback (checkmark animation)
- **Loading States**: Simple spinner for async operations

## Responsive Behavior
- Optimized for 320-428px mobile width (Telegram WebView)
- All layouts stack vertically on mobile
- Touch targets minimum 44px height
- Bottom navigation fixed, always accessible
- Safe area padding for notched devices

## Visual Hierarchy
- Balance numbers are the hero elements - make them prominent
- Status badges should be immediately scannable
- CTAs use high-contrast blue against white/grey backgrounds
- Maintain consistent card elevation throughout

## Images
**No images required** - This is a clean, data-focused fintech interface relying on typography, numbers, and icons for visual communication. The design stays intentionally minimal to maintain fast load times in Telegram.