# ArbitrumNavigation Implementation Plan

## Overview

This document outlines the implementation plan for creating a new `<ArbitrumNavigation>` component that will replace the current Cobalt sidebar and serve as a unified navigation frame for the entire portal application.

## Phase Quick Reference

| Phase | Name                      | Status      | Est. Time | Dependencies |
| ----- | ------------------------- | ----------- | --------- | ------------ |
| 1     | Component Scaffolding     | ✅ Complete | 30-45 min | None         |
| 2     | Provider Setup            | ✅ Complete | 30-45 min | Phase 1      |
| 3     | Provider Implementation   | ✅ Complete | 1-2 hours | Phase 2      |
| 4     | Master Navbar UI (Static) | ✅ Complete | 2-3 hours | Phase 1      |
| 5     | Navigation Logic          | ✅ Complete | 1-2 hours | Phase 4      |
| 6     | Wallet Connect            | ✅ Complete | 1 hour    | Phase 3, 4   |
| 7     | Wallet Dropdown           | ✅ Complete | 2-3 hours | Phase 6      |
| 8     | Layout Integration        | ✅ Complete | 1-2 hours | Phases 3-7   |
| 9     | Cleanup                   | ✅ Complete | 30 min    | Phase 8      |
| 10    | Search Integration        | ✅ Complete | 2-3 hours | Phase 4      |
| 11    | HeaderDropdown Migration  | ✅ Complete | 1-2 hours | Phase 10     |
| 12    | PortalPage Removal        | ✅ Complete | 1 hour    | Phase 11     |
| 13    | Side Navigation (SubNav)  | ✅ Complete | 3-4 hours | Phase 12     |
| 14    | Route Highlighting        | ✅ Complete | 1 hour    | Phase 13     |
| 15    | Mobile Responsiveness     | ⏳ Pending  | 4-6 hours | Phase 14     |

**Total Estimated Time**: ~24-31 hours (all phases complete)

**Current Status**: Phases 1-14 are **COMPLETE** ✅, Phase 15 is **PENDING** ⏳

## Architecture Philosophy

**ArbitrumNavigation as a Frame Component**: `ArbitrumNavigation` will act as a "frame" that wraps the entire application, providing:

- Top-level navigation UI (master navbar + sub-navbar)
- All shared providers (wallet, query params, analytics, etc.)
- Routing context
- Common application-level functionality

This approach consolidates providers and navigation logic that are currently scattered across different packages (`portal`, `arb-token-bridge-ui`).

## Current State Analysis

### Existing Components to Replace

- **Cobalt Sidebar**: `packages/portal/components/AppSidebar.tsx`
  - Currently used in `packages/app/src/app/(with-sidebar)/layout.tsx`
  - Also used in `packages/app/src/app/not-found.tsx`

### Existing Providers to Consolidate

#### From Bridge App (`packages/arb-token-bridge-ui`)

- **AppProviders** (`src/components/App/AppProviders.tsx`):
  - `OvermindProvider` (state management)
  - `ArbQueryParamProvider` (query params)
  - `WagmiProvider` (wallet connection)
  - `QueryClientProvider` (React Query)
  - `RainbowKitProvider` (wallet UI)
  - `AppContextProvider` (app context)

#### From Portal App (`packages/portal`)

- **Providers** (`components/Providers.tsx`):
  - `PostHogProvider` (analytics)
  - `QueryParamProvider` (query params)

### Current Layout Structure

```
app/
├── layout.tsx (root layout)
├── (with-sidebar)/
│   ├── layout.tsx (uses AppSidebar)
│   ├── (portal)/
│   │   └── layout.tsx (uses Portal Providers)
│   └── bridge/
│       └── BridgeClient.tsx (uses Bridge AppProviders)
```

## Component Structure

### File Organization

```
packages/app/src/components/ArbitrumNavigation/
├── ArbitrumNavigation.tsx          # Main frame component (conditionally renders desktop/mobile)
├── config/
│   └── navConfig.ts               # Shared navigation config (Phase 15)
├── providers/
│   ├── NavigationProviders.tsx   # Consolidated providers wrapper
│   └── wagmi/
│       └── setup.ts               # Wagmi config (moved from bridge)
├── components/
│   ├── MasterNavbar.tsx           # Desktop: Top horizontal navbar
│   ├── SideNav.tsx                # Desktop: Left sidebar
│   ├── mobile/
│   │   ├── MasterNavbarMobile.tsx # Mobile: Top navbar (logo + search + wallet)
│   │   ├── SideNavMobile.tsx      # Mobile: Horizontal tabs at top
│   │   └── BottomNav.tsx          # Mobile: Bottom navigation bar
│   ├── NavLogo.tsx                # Shared: Logo + link to "/"
│   ├── NavSearch.tsx              # Shared: Search component
│   ├── NavLinks.tsx               # Desktop: Navigation links
│   └── NavWallet.tsx              # Shared: Wallet connection dropdown
├── hooks/
│   ├── useActiveRoute.ts          # Active route detection
│   └── useWalletMenu.ts           # Wallet menu logic
└── types.ts                       # Shared types
```

## Implementation Phases

### Phase 1: Component Scaffolding & Structure Setup

**Goal**: Create the basic file structure and placeholder components with no functionality.

**Deliverables**:

- [x] Create directory structure: `packages/app/src/components/ArbitrumNavigation/`
- [x] Create `ArbitrumNavigation.tsx` - Main component (returns children wrapped in div)
- [x] Create `components/MasterNavbar.tsx` - Empty component
- [x] Create `components/NavLogo.tsx` - Placeholder div with "Logo" text
- [x] Create `components/NavSearch.tsx` - Placeholder button with "Search" text
- [x] Create `components/NavLinks.tsx` - Placeholder div with "Nav Links" text
- [x] Create `components/NavWallet.tsx` - Placeholder div with "Wallet" text
- [x] Create `types.ts` - Basic type definitions
- [x] Create `hooks/useActiveRoute.ts` - Empty hook (returns null)
- [x] Wire up components: `MasterNavbar` renders all sub-components, `ArbitrumNavigation` renders `MasterNavbar` + children
- [x] Create `index.ts` - Export file

**Acceptance Criteria**:

- ✅ All files exist and compile without errors
- ✅ Component tree renders (even if just placeholder text)
- ✅ No functionality required, just structure

**Status**: ✅ **COMPLETE** - All scaffolding done, component structure ready

**Estimated Time**: 30-45 minutes

---

### Phase 2: Provider Consolidation - Setup

**Goal**: Move provider code to new location and create consolidated provider wrapper.

**Deliverables**:

- [x] Create `providers/` directory
- [x] Create `providers/wagmi/setup.ts` - Re-export from bridge app (avoids duplication)
- [x] Create `providers/NavigationProviders.tsx` with empty wrapper (just returns children)
- [x] Document which providers will be added in next phase

**Acceptance Criteria**:

- ✅ Wagmi setup accessible from new location (via re-export)
- ✅ NavigationProviders component exists
- ✅ No breaking changes to existing code
- ✅ Can import from new locations

**Status**: ✅ **COMPLETE** - Provider structure ready for Phase 3

**Estimated Time**: 30-45 minutes

---

### Phase 3: Provider Consolidation - Implementation

**Goal**: Add all providers to NavigationProviders and test they work independently.

**Deliverables**:

- [x] Add `OvermindProvider` to `NavigationProviders.tsx` (from bridge)
- [x] Add `PostHogProvider` to `NavigationProviders.tsx` (from portal)
- [x] Add `QueryParamProvider` (portal) to `NavigationProviders.tsx`
- [x] Add `ArbQueryParamProvider` (bridge) to `NavigationProviders.tsx`
- [x] Add `WagmiProvider` to `NavigationProviders.tsx` (using moved setup)
- [x] Add `QueryClientProvider` to `NavigationProviders.tsx`
- [x] Add `RainbowKitProvider` to `NavigationProviders.tsx`
- [x] Add `AppContextProvider` to `NavigationProviders.tsx` (from bridge)
- [x] Integrate `NavigationProviders` into `ArbitrumNavigation` component
- [x] Handle SSR case (wagmi config only available client-side)

**Acceptance Criteria**:

- ✅ All providers added in correct order
- ✅ Providers can be imported and used
- ✅ No console errors when rendering
- ✅ Handles SSR gracefully
- ⏳ Existing functionality still works (needs testing)

**Status**: ✅ **COMPLETE** - All providers integrated, ready for testing

**Estimated Time**: 1-2 hours

---

### Phase 4: Master Navbar - UI Implementation (Static)

**Goal**: Build the visual UI matching Figma design, no functionality yet.

**Deliverables**:

- [x] Style `MasterNavbar` container:
  - Dark grey background (`bg-gray-1`)
  - Full width, sticky positioning
  - Proper height and padding
  - Border-bottom for separation
- [x] Implement `NavLogo`:
  - Functional link to "/"
  - Proper sizing and spacing
  - Hover effects
- [x] Implement `NavSearch`:
  - Placeholder button (functionality deferred)
  - Button styling matching design
- [x] Implement `NavLinks`:
  - Layout: Home, Bridge, Explore, Build
  - Styling for inactive state (transparent with hover)
  - Proper spacing and typography
  - Rounded buttons matching Figma
- [x] Implement `NavWallet`:
  - Placeholder "Wallet" text (functionality in Phase 6)
  - Match design (dark grey, rounded)
- [x] Layout: Three sections (left, center, right) properly aligned
  - Center section uses absolute positioning for perfect centering

**Acceptance Criteria**:

- ✅ Visual design matches Figma
- ✅ All elements positioned correctly
- ✅ Colors and spacing match design
- ✅ Layout structure complete

**Status**: ✅ **COMPLETE** - UI structure matches Figma design

**Estimated Time**: 2-3 hours

---

### Phase 5: Navigation Logic & Active States

**Goal**: Add routing functionality and active state detection.

**Deliverables**:

- [x] Implement `useActiveRoute` hook:
  - Use `usePathname()` from `next/navigation`
  - Return active route based on pathname
  - Handle route matching: exact for "/", prefix for others
- [x] Update `NavLinks`:
  - Use Next.js `Link` components
  - Apply active state styling (darker grey background `bg-gray-8`)
  - Pass active state to individual nav items
- [x] Update `NavLogo`:
  - Make link functional (navigate to "/")
- [x] Test active states:
  - Home active on "/"
  - Bridge active on "/bridge" and "/bridge/\*"
  - Explore active on "/projects" and "/projects/\*"
  - Build active on "/build" and "/build/\*"

**Acceptance Criteria**:

- ✅ Navigation links work and navigate correctly
- ✅ Active state highlights correct route
- ✅ Active state styling matches Figma
- ✅ Route matching logic works for all cases

**Status**: ✅ **COMPLETE** - Navigation fully functional with active states

**Estimated Time**: 1-2 hours

---

### Phase 6: Wallet Integration - Connect Button

**Goal**: Implement wallet connection functionality.

**Deliverables**:

- [x] Update `NavWallet`:
  - Integrate `ConnectButton.Custom` from `@rainbow-me/rainbowkit`
  - Implement disconnected state: "Connect Wallet" button
  - Style button to match design
  - Create `NavWalletDisconnected` component
  - Create `NavWalletConnected` component (basic version, enhanced in Phase 7)
- [x] Implement loading state for wallet button
- [ ] Test wallet connection:
  - Click opens wallet modal (requires providers - Phase 3)
  - Can connect wallet (requires providers - Phase 3)
  - Connection state updates (requires providers - Phase 3)

**Acceptance Criteria**:

- ✅ Connect wallet button component implemented
- ✅ Button styling matches design
- ⏳ Wallet modal opens correctly (pending provider setup - Phase 3)
- ⏳ Can successfully connect wallet (pending provider setup - Phase 3)

**Status**: ✅ **COMPLETE** - Component implemented, requires providers from Phase 3 to function

**Estimated Time**: 1 hour

---

### Phase 7: Wallet Integration - Connected State & Dropdown

**Goal**: Display connected wallet info and dropdown menu.

**Deliverables**:

- [x] Implement connected state display:
  - Show avatar (ENS avatar or generated using CustomBoringAvatar)
  - Show truncated address (e.g., "DHguWz...mRDb")
  - Use `useAccountMenu` hook from bridge app
- [x] Create wallet dropdown menu:
  - Use Headless UI `Popover`
  - Copy address functionality
  - Explorer link
  - Account settings (opens RainbowKit modal)
  - Disconnect button
- [x] Reuse logic from `HeaderAccountPopover`:
  - Use `useAccountMenu` hook for ENS/UD info
  - Use `CustomBoringAvatar` and `SafeImage` components
  - Use `getExplorerUrl` utility
- [x] Style dropdown to match design (dark theme, rounded corners)

**Acceptance Criteria**:

- ✅ Connected state displays correctly
- ✅ Avatar shows (ENS or generated)
- ✅ Address truncated properly
- ✅ Dropdown opens/closes correctly
- ✅ Copy address works
- ✅ Explorer link works
- ✅ Disconnect works
- ✅ All menu items functional

**Status**: ✅ **COMPLETE** - Full wallet dropdown with all functionality

**Estimated Time**: 2-3 hours

---

### Phase 8: Layout Integration - Replace Sidebar

**Goal**: Integrate ArbitrumNavigation into app layout, replacing Cobalt sidebar.

**Deliverables**:

- [x] Update `packages/app/src/app/(with-sidebar)/layout.tsx`:
  - Remove `<AppSidebar />` import and usage
  - Wrap children with `<ArbitrumNavigation />`
  - Adjust layout structure (remove left sidebar spacing)
  - Keep `SiteBanner` and `Toast` components
- [x] Update `packages/app/src/app/not-found.tsx`:
  - Replace `<AppSidebar />` with `<ArbitrumNavigation />`
- [x] Ensure providers wrap at correct level:
  - Verify provider hierarchy works ✅ (completed in Phase 3)
  - Test that bridge and portal pages still work ✅
- [x] Add RainbowKit CSS import to root layout ✅
- [x] Test all routes:
  - Home ("/") ✅
  - Bridge ("/bridge") ✅
  - Explore ("/projects") ✅
  - Build ("/build") ✅
  - Other routes still accessible ✅

**Acceptance Criteria**:

- ✅ Sidebar removed from layouts
- ✅ ArbitrumNavigation renders in correct position
- ✅ All routes work correctly
- ✅ Providers function correctly
- ✅ No layout regressions
- ✅ Existing functionality preserved
- ✅ RainbowKit CSS imported (modal works correctly)

**Status**: ✅ **COMPLETE** - Full integration complete, all functionality working

**Estimated Time**: 1-2 hours

---

### Phase 9: Cleanup - Remove Cobalt Dependency

**Goal**: Remove Cobalt dependency and old sidebar code.

**Deliverables**:

- [x] Remove `@offchainlabs/cobalt` from `packages/portal/package.json`
- [x] Remove `@offchainlabs/cobalt` from `packages/arb-token-bridge-ui/package.json` (Note: Re-added temporarily - bridge mobile sidebar still uses it)
- [x] Update `packages/app/tailwind.config.js`:
  - Remove Cobalt content paths
- [x] Update `packages/portal/tailwind.config.js`:
  - Remove Cobalt content paths
- [x] Update `packages/arb-token-bridge-ui/tailwind.config.js`:
  - Remove Cobalt content paths
- [x] Delete `packages/portal/components/AppSidebar.tsx`
- [x] Search for any remaining references to `AppSidebar` or `cobalt`
- [x] Run `yarn install` to update lockfile

**Note**:

- `MobileHeaderToggleMenu` (portal) - Replaced with placeholder (mobile nav will be handled in Phase 2)
- Bridge app's `AppMobileSidebar` and `AccountMenuItem` still use Cobalt components - These are bridge-specific mobile sidebar components, not part of the main navigation. Cobalt dependency kept in bridge app's package.json for now. Will be migrated when bridge mobile nav is updated.

**Acceptance Criteria**:

- ✅ Cobalt package removed from portal dependencies
- ✅ Old sidebar component deleted
- ✅ No references to AppSidebar remain
- ✅ `MobileHeaderToggleMenu` replaced with placeholder (no Cobalt dependency)
- ✅ Cobalt still referenced in bridge app's mobile sidebar (intentional - bridge-specific components)
- ✅ Lockfile updated via `yarn install`
- ✅ App builds and runs without errors
- ✅ No console warnings about missing dependencies

**Status**: ✅ **COMPLETE** - All cleanup tasks finished

**Estimated Time**: 30 minutes

---

### Phase 10: Sub-Navbar (Future - Not in Current Scope)

**Goal**: Implement left sidebar sub-navigation that changes based on active master nav item.

**Deliverables**:

- [ ] Design sub-navbar component structure
- [ ] Implement dynamic sub-navbar based on active master nav item
- [ ] Mobile responsiveness
- [ ] Integration with master navbar

**Acceptance Criteria**: TBD

**Estimated Time**: TBD

## Technical Details

### Navigation Routes

| Label   | Route       | Active Match                  |
| ------- | ----------- | ----------------------------- |
| Home    | `/`         | Exact match only              |
| Bridge  | `/bridge`   | `/bridge` and `/bridge/*`     |
| Explore | `/projects` | `/projects` and `/projects/*` |
| Build   | `/build`    | `/build` and `/build/*`       |

### Provider Hierarchy

```
ArbitrumNavigation
└── NavigationProviders
    ├── OvermindProvider
    ├── PostHogProvider
    ├── QueryParamProvider (portal)
    ├── ArbQueryParamProvider (bridge)
    ├── WagmiProvider
    ├── QueryClientProvider
    ├── RainbowKitProvider
    └── AppContextProvider
        └── {children} (app content)
```

### Styling Approach

- **Framework**: Tailwind CSS
- **Component Library**: shadcn/ui
- **Theme**: Dark theme matching Figma design
- **Design Tokens**: Use existing CSS variables where applicable
- **Responsive**: Desktop-first (mobile in Phase 2)

### Dependencies

- `next/navigation` - Routing and navigation
- `@rainbow-me/rainbowkit` - Wallet connection UI
- `wagmi` - Wallet connection logic
- `@tanstack/react-query` - Data fetching
- `posthog-js/react` - Analytics
- `use-query-params` - Query parameter management
- `overmind-react` - State management

## Design Specifications (from Figma)

### Master Navbar

- **Layout**: Horizontal bar at top
- **Background**: Dark grey (`bg-[#...]`)
- **Height**: TBD (match Figma)
- **Sections**:
  1. **Left**: Logo + Search icon
  2. **Center**: Navigation links (Home, Bridge, Explore, Build)
  3. **Right**: Wallet connection dropdown

### Active State

- **Background**: Lighter grey than navbar background
- **Text**: White
- **Border Radius**: Rounded corners

### Wallet Button

- **Connected State**:
  - Avatar (circular, left side)
  - Truncated address (e.g., "DHguWz...mRDb")
  - Dropdown arrow
- **Disconnected State**: "Connect Wallet" button

## Phase Summary & Dependencies

### Phase Flow

```
Phase 1 (Scaffolding)
    ↓
Phase 2 (Provider Setup)
    ↓
Phase 3 (Provider Implementation)
    ↓
Phase 4 (UI Static)
    ↓
Phase 5 (Navigation Logic)
    ↓
Phase 6 (Wallet Connect)
    ↓
Phase 7 (Wallet Dropdown)
    ↓
Phase 8 (Layout Integration)
    ↓
Phase 9 (Cleanup)
```

### Phase Dependencies

- **Phase 1** → No dependencies (can start immediately)
- **Phase 2** → Requires Phase 1
- **Phase 3** → Requires Phase 2
- **Phase 4** → Requires Phase 1 (can be parallel with Phase 2-3)
- **Phase 5** → Requires Phase 4
- **Phase 6** → Requires Phase 3 (providers) and Phase 4 (UI)
- **Phase 7** → Requires Phase 6
- **Phase 8** → Requires Phases 3, 4, 5, 6, 7
- **Phase 9** → Requires Phase 8

### Review Checkpoints

After each phase, review and approve before proceeding:

- ✅ **After Phase 1**: Verify structure is correct
- ✅ **After Phase 3**: Verify providers work independently
- ✅ **After Phase 4**: Verify UI matches design
- ✅ **After Phase 5**: Verify navigation works
- ✅ **After Phase 7**: Verify wallet functionality complete
- ✅ **After Phase 8**: Full integration test
- ✅ **After Phase 9**: Final cleanup verification

## Migration Strategy

The migration follows a phased approach where each phase can be reviewed and tested independently:

1. **Phases 1-3**: Foundation (structure + providers)
   - Build component structure
   - Consolidate providers
   - Test providers work independently

2. **Phases 4-7**: Feature Implementation (UI + functionality)
   - Build static UI
   - Add navigation logic
   - Add wallet functionality
   - Test each feature independently

3. **Phases 8-9**: Integration & Cleanup
   - Replace sidebar in layouts
   - Remove old dependencies
   - Final testing

This approach allows for:

- Incremental review and approval
- Early detection of issues
- Ability to pause/resume at any phase
- Testing at each checkpoint

## Testing Checklist by Phase

### Phase 1 Testing

- [ ] All files compile without errors
- [ ] Component tree renders (placeholder text visible)
- [ ] No TypeScript errors

### Phase 2 Testing

- [ ] Wagmi setup file copied successfully
- [ ] Imports updated correctly
- [ ] Can import from new locations
- [ ] No breaking changes

### Phase 3 Testing

- [ ] All providers render without errors
- [ ] No console errors or warnings
- [ ] Existing bridge/portal pages still work
- [ ] Providers can be used independently

### Phase 4 Testing

- [ ] Visual design matches Figma
- [ ] All elements positioned correctly
- [ ] Colors and spacing match design
- [ ] Layout is responsive (desktop)

### Phase 5 Testing

- [ ] Navigation links navigate correctly
- [ ] Active state highlights correct route
- [ ] Route matching works for all cases:
  - [ ] Home active on "/"
  - [ ] Bridge active on "/bridge" and "/bridge/\*"
  - [ ] Explore active on "/projects" and "/projects/\*"
  - [ ] Build active on "/build" and "/build/\*"

### Phase 6 Testing

- [ ] Connect wallet button renders
- [ ] Click opens wallet modal
- [ ] Can connect wallet successfully
- [ ] Connection state updates correctly

### Phase 7 Testing

- [ ] Connected state displays correctly
- [ ] Avatar shows (ENS or generated)
- [ ] Address truncated properly
- [ ] Dropdown opens/closes correctly
- [ ] Disconnect button works
- [ ] All menu items functional

### Phase 8 Testing (Integration)

- [ ] Sidebar removed from layouts
- [ ] ArbitrumNavigation renders in correct position
- [ ] All routes work correctly:
  - [ ] Home ("/")
  - [ ] Bridge ("/bridge")
  - [ ] Explore ("/projects")
  - [ ] Build ("/build")
- [ ] Providers function correctly
- [ ] No layout regressions
- [ ] Existing functionality preserved
- [ ] No console errors

### Phase 9 Testing (Final)

- [x] App builds without errors
- [x] No Cobalt references remain (except bridge mobile sidebar - intentional)
- [x] No console warnings about missing dependencies
- [x] All functionality still works
- [x] Bundle size reduced (Cobalt removed from portal)

## Design Tokens & Assets

### Available Logo Assets

- `/images/arbitrum-logo-white-no-text.svg` - Recommended for navbar (white logo, no text)
- `/images/arbitrum-logo-white.svg` - Alternative option
- `/logo.png` - Fallback option

### Color Palette (from tailwind.config.js)

- **Dark backgrounds**: `gray-1` (#191919), `dark` (#1A1C1D)
- **Text**: `white`, `gray-4` (#CCCCCC)
- **Primary CTA**: `primary-cta` (var(--color-primary-cta, #325EE6))
- **Blue link**: `blue-link` (#1366C1)
- **Border radius**: Default 10px (configurable via CSS variable)

---

## Phase 10: Search Integration

**Goal**: Replace placeholder search with full `SitewideSearchBar` functionality in master navbar.

**Deliverables**:

- [ ] Move `SitewideSearchBar` component from `packages/portal/components/PortalPage/SitewideSearchBar.tsx` to `packages/app/src/components/ArbitrumNavigation/components/`
- [ ] Update `NavSearch` to use `SitewideSearchBar` instead of placeholder
- [ ] Ensure search functionality works:
  - Dropdown results popup
  - Instant lookup
  - Navigation to `/search` page
  - Navigation to exact project/orbit chain
- [ ] Verify search hook (`useSearch`) and `SearchResultsPopup` work correctly in new location
- [ ] Test search functionality across all routes

**Acceptance Criteria**:

- ✅ Search bar fully functional in master navbar
- ✅ Dropdown results appear correctly
- ✅ Can navigate to search results
- ✅ Can navigate to full search page
- ✅ Search styling matches design

**Status**: ✅ **COMPLETE**

**Estimated Time**: 2-3 hours

**Dependencies**: Phase 4 (Master Navbar)

**Notes**:

- `SitewideSearchBar` integrated into `NavSearch` component
- Search functionality fully working with dropdown results and navigation
- `sticky-top-bar` ID moved to `MasterNavbar` for scroll styling

---

## Phase 11: HeaderDropdown Migration

**Goal**: Migrate "Add your project" and "My Apps" buttons from `HeaderDropdownMenu` to appropriate locations.

**Deliverables**:

- [ ] Create "Add your project" button component:
  - Extract logic from `HeaderDropdownMenu`
  - Handle Orbit vs Project link logic (`SUBMIT_ORBIT_CHAIN_LINK` vs `SUBMIT_PROJECT_LINK`)
  - Place in `ProjectsFilterBar` component (alongside category/chain/sort filters)
- [ ] Create "My Apps" placeholder button:
  - Link to `/bookmarks`
  - Place alongside "Add your project" in `ProjectsFilterBar`
  - Note: Will move to sub-navbar in Phase 13
- [ ] Remove `HeaderDropdownMenu` component usage from `PortalPage`
- [ ] Update `ProjectsFilterBar` to include both buttons in the filter bar
- [ ] Test button functionality and styling

**Acceptance Criteria**:

- ✅ "Add your project" button appears in projects filter bar
- ✅ "My Apps" placeholder button appears in projects filter bar
- ✅ Both buttons function correctly
- ✅ `HeaderDropdownMenu` removed from portal layout
- ✅ Styling matches design

**Status**: ✅ **COMPLETE**

**Estimated Time**: 1-2 hours

**Dependencies**: Phase 10

**Notes**:

- "Add your project" button moved to `ProjectsFilterBar` (right side of filter bar)
- "My Apps" button removed from filter bar (now only in side nav)
- `HeaderDropdownMenu` component no longer used in portal layout

---

## Phase 12: PortalPage Removal & Style Migration

**Goal**: Remove `PortalPage` wrapper and migrate its styles to appropriate components.

**Deliverables**:

- [ ] Analyze `PortalPage` component:
  - Identify all styles and layout logic
  - Check what `sticky-top-bar` ID is used for (scroll styling in search)
- [ ] Migrate styles:
  - Move `sticky-top-bar` styles to appropriate component (likely `MasterNavbar` or a new wrapper)
  - Move content wrapper styles (`max-w-[1153px]`, padding, etc.) to portal layout
- [ ] Update portal layout (`packages/app/src/app/(with-sidebar)/(portal)/layout.tsx`):
  - Remove `PortalPage` wrapper
  - Apply migrated styles directly
- [ ] Update any components that depend on `PortalPage` structure
- [ ] Test layout across all portal pages

**Acceptance Criteria**:

- ✅ `PortalPage` component removed
- ✅ All styles preserved and working
- ✅ Layout structure maintained
- ✅ No visual regressions
- ✅ Scroll behavior for sticky nav works correctly

**Status**: ✅ **COMPLETE**

**Estimated Time**: 1 hour

**Dependencies**: Phase 11

**Notes**:

- `PortalPage` wrapper removed from portal layout
- Content wrapper styles migrated directly to portal layout
- Sticky positioning removed from `ProjectsFilterBar` to avoid conflicts with master navbar

---

## Phase 13: Side Navigation (SubNav) Implementation

**Goal**: Create left-hand side navigation bar that changes based on active top-level nav item.

**Deliverables**:

- [ ] Review Figma design for side navigation structure and styling
- [ ] Create `SideNav` component structure:
  - Component in `packages/app/src/components/ArbitrumNavigation/components/SideNav.tsx`
  - Hook `useSideNavItems` to determine which items to show based on active route
- [ ] Implement side nav items per top-level nav:
  - **Home**: No items (empty state or hidden)
  - **Swap** (formerly Bridge):
    - Bridge → `/bridge`
    - Txns → `/bridge` with transaction history tab (check implementation)
    - Buy → `/bridge/buy`
  - **Explore**:
    - Projects → `/projects`
    - Chains → `/chains/ecosystem`
    - My Apps → `/bookmarks` (move from Phase 11 placeholder)
  - **Build**:
    - Dev-tools → `/learn`
    - Connect → `/community`
    - Help → External link to `https://support.arbitrum.io/`
- [ ] Update `ArbitrumNavigation` layout:
  - Add side nav wrapper around children
  - Ensure proper flex layout (side nav + content)
- [ ] Implement active state highlighting for side nav items
- [ ] Style according to Figma design

**Acceptance Criteria**:

- ✅ Side navigation renders correctly
- ✅ Items change based on active top-level nav
- ✅ Active side nav item highlighted
- ✅ All links navigate correctly
- ✅ Styling matches Figma design
- ✅ Layout works with content area

**Status**: ✅ **COMPLETE**

**Estimated Time**: 3-4 hours

**Dependencies**: Phase 12

**Notes**:

- `SideNav` component created and integrated into `ArbitrumNavigation`
- Side nav width set to `w-48` (192px) - adjusted from initial `w-64` based on design feedback
- Items change dynamically based on active top-level nav
- Empty state for Home route (no items)
- Icons: `Squares2X2Icon` (Projects), `CircleStackIcon` (Chains), `UserCircleIcon` (My Apps)
- Component name: `SideNav` (as suggested by user)

---

## Phase 14: Route Highlighting & Navigation Updates

**Goal**: Ensure both top-level and side navigation items highlight correctly based on current route.

**Deliverables**:

- [ ] Update `useActiveRoute` hook:
  - Detect active side nav item based on current pathname
  - Handle special cases (e.g., transaction history tab detection)
- [ ] Implement route matching logic:
  - Bridge/Txns/Buy detection for Swap section
  - Projects/Chains/My Apps detection for Explore section
  - Dev-tools/Connect/Help detection for Build section
- [ ] Update "Bridge" label to "Swap" in master navbar (if confirmed)
- [ ] Test highlighting across all routes:
  - Top nav highlights correct section
  - Side nav highlights correct item
  - Both highlight simultaneously when appropriate

**Acceptance Criteria**:

- ✅ Top-level nav highlights correctly
- ✅ Side nav highlights correctly
- ✅ Both highlight simultaneously
- ✅ Route matching handles all edge cases
- ✅ "Bridge" renamed to "Swap" (if confirmed)

**Status**: ✅ **COMPLETE**

**Estimated Time**: 1 hour

**Dependencies**: Phase 13

**Notes**:

- Updated `useActiveRoute` hook to include sub-routes:
  - `/chains/*` and `/bookmarks` → `/projects` (Explore)
  - `/learn` and `/community` → `/build`
- Both top nav and side nav highlight correctly when navigating to sub-routes
- Fixed query parameter: changed from `ab=tx_history` to `tab=tx_history` for transaction history route

---

## Phase 15: Mobile Responsiveness

**Goal**: Make navigation fully responsive for mobile devices based on Figma design.

**Architecture Decision**: Create separate mobile versions of top-level organizational components instead of morphing the same components. Atomic child components (NavSearch, NavWallet, NavLogo, etc.) remain shared.

**Deliverables**:

- [ ] **Shared Navigation Config**:
  - Create `config/navConfig.ts` (or similar) with shared navigation structure
  - Define master nav items (Home, Bridge, Explore, Build)
  - Define side nav items per section (Bridge: Bridge/Txns/Buy, Explore: Projects/Chains/My Apps, Build: Dev-tools/Connect/Help)
  - Export config for use in both desktop and mobile components
- [ ] **Mobile Component Structure**:
  - Create `components/mobile/MasterNavbarMobile.tsx` - Separate mobile version
  - Create `components/mobile/SideNavMobile.tsx` - Separate mobile version (tabs)
  - Create `components/mobile/BottomNav.tsx` - Bottom navigation bar component
  - Keep atomic components shared: `NavSearch`, `NavWallet`, `NavLogo`, etc.
- [ ] **Master Navbar Mobile Layout** (`MasterNavbarMobile.tsx`):
  - Top section: Logo + Search + Wallet (all at top)
  - Logo stays at top left
  - Wallet button stays at top right
  - Search bar behavior:
    - **Projects/Chains/My Apps pages**: Expanded at top
    - **Home/Bridge/Build pages**: Collapsed (icon button), expands on tap/click
- [ ] **Bottom Navigation Bar** (`BottomNav.tsx`):
  - Fixed at bottom on mobile screens (`< md` breakpoint)
  - Contains all 4 master nav items: Home, Bridge, Explore, Build
  - Styling matches Figma design (refer to selected design)
  - Bottom menu bar pattern similar to phone's bottom menu bar
- [ ] **SideNav Mobile Layout** (`SideNavMobile.tsx`):
  - Convert side nav items to horizontal tabs at top
  - **All sections get tabs**:
    - **Bridge section**: Bridge, Txns, Buy tabs
    - **Explore section**: Projects, Chains, My Apps tabs
    - **Build section**: Dev-tools, Connect, Help tabs
  - Tab/button group design similar to desktop master nav links (elegant, consistent styling)
  - Tabs appear below top navbar, above content
- [ ] **Responsive Breakpoints**:
  - Use `md:` breakpoint (768px) to switch between mobile and desktop
  - Desktop: Show `MasterNavbar` + `SideNav` (existing components)
  - Mobile: Show `MasterNavbarMobile` + `SideNavMobile` + `BottomNav`
  - Update `ArbitrumNavigation` to conditionally render based on screen size
- [ ] **Touch-Friendly Interactions**:
  - Adequate touch target sizes (minimum 44x44px)
  - Proper spacing between interactive elements
  - Smooth animations and transitions

**Acceptance Criteria**:

- ✅ Shared navigation config created and used by both desktop and mobile components
- ✅ Separate mobile components created (MasterNavbarMobile, SideNavMobile, BottomNav)
- ✅ Atomic components (NavSearch, NavWallet, NavLogo) remain shared
- ✅ Logo and wallet button stay at top on mobile
- ✅ Bottom nav bar fixed at bottom with all 4 items (Home, Bridge, Explore, Build)
- ✅ Search bar expanded at top on Projects/Chains/My Apps pages
- ✅ Search bar collapsed (icon) on Home/Bridge/Build pages, expands on tap/click
- ✅ Side nav items convert to horizontal tabs at top for all sections
- ✅ Bridge section shows: Bridge, Txns, Buy tabs
- ✅ Explore section shows: Projects, Chains, My Apps tabs
- ✅ Build section shows: Dev-tools, Connect, Help tabs
- ✅ Tab styling matches desktop master nav links design
- ✅ Layout responsive across all screen sizes (breakpoint: `md:` = 768px)
- ✅ Touch targets meet accessibility standards (44x44px minimum)
- ✅ No layout regressions on desktop
- ✅ Smooth transitions between mobile and desktop layouts

**Status**: ⏳ **PENDING**

**Estimated Time**: 4-6 hours

**Dependencies**: Phase 14

**Notes**:

- **Architecture**: Separate mobile components instead of conditional styling in same components
- **Shared Config**: Create `config/navConfig.ts` to avoid duplication between desktop/mobile
- **Atomic Components**: NavSearch, NavWallet, NavLogo remain shared (used in both desktop and mobile)
- **Breakpoint**: `md:` (768px) - mobile below, desktop above
- **Design Reference**: Figma design selected by user
- **Bottom Nav**: Fixed at bottom, contains all master nav items
- **Search Behavior**: Expanded on Projects/Chains/My Apps, collapsed on other pages

---

## Open Questions / Decisions Needed

1. **Logo Asset**: Use `/images/arbitrum-logo-white-no-text.svg` for navbar logo ✅
2. **Sub-navbar Design**: ✅ Completed - checked Figma design and implemented
3. **Mobile Design**: ⏳ Phase 15 - Mobile responsiveness requirements defined (pending implementation)
4. **Search Functionality**: ✅ Complete - `SitewideSearchBar` integrated
5. **Provider Conflicts**: ✅ Verified - no conflicts (completed in Phase 3)
6. **shadcn Setup**: ✅ Already configured
7. **Bridge → Swap Rename**: ✅ Complete - renamed to "Swap" in master navbar
8. **Transaction History Route**: ✅ Confirmed: `/bridge?tab=tx_history` (fixed from `ab` to `tab`)
9. **Support Page URL**: ✅ Confirmed: `https://support.arbitrum.io/` (from constants.ts)
10. **Side Nav Name**: ✅ Complete - using `SideNav` component name
11. **Side Nav Width**: ✅ Adjusted to `w-48` (192px) based on design feedback

## Completed Phases Summary

Phases 1-14 are now **COMPLETE**. The ArbitrumNavigation component is fully functional on desktop with:

- ✅ Master navbar with logo, search, navigation links, and wallet connection
- ✅ Side navigation that changes based on active route
- ✅ Full search functionality integrated
- ✅ Proper route highlighting for both top and side nav
- ✅ All providers consolidated
- ✅ PortalPage wrapper removed
- ✅ HeaderDropdown functionality migrated

**Next**: Phase 15 (Mobile Responsiveness) - Pending implementation

## Next Steps / Future Enhancements

### Immediate (Optional Polish)

1. **Logo Integration**: Replace placeholder logo with actual Arbitrum logo asset
2. **Icon Refinement**: Verify side nav icons match Figma design exactly (may need custom icons)
3. **Styling Refinements**: Fine-tune spacing, colors, and hover states to match Figma exactly

### Current Phase

1. **Mobile Responsiveness** (Phase 15 - In Progress):
   - Master nav elements fixed at bottom on mobile (bottom menu bar pattern)
   - Side nav items convert to horizontal tabs at top
   - Search bar expanded at top, only on Projects/Chains/My Apps pages
   - Touch-friendly interactions and responsive breakpoints

2. **Additional Features** (Future):
   - Search enhancements (recent searches, suggestions)
   - User preferences/settings persistence
   - Keyboard navigation improvements
   - Accessibility enhancements (ARIA labels, focus management)

## Notes

- ArbitrumNavigation acts as a "frame" wrapping the entire app
- All shared providers consolidated in one place
- Sub-navbar will be part of ArbitrumNavigation (internal component)
- Mobile responsiveness deferred to Phase 2
- Cobalt dependency to be removed after migration
