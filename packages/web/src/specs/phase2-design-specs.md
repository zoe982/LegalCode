# Phase 2 Design Specs -- UsersTab & SettingsPage

Authored by Ive (Design Specialist), referencing `.claude/skills/legalcode-design-v3.md`.

These specs are implementation-ready. The Frontend Engineer should follow them exactly, using the MUI v7 component tree, token mappings, and interaction states described below. Every value references the v3 design system.

---

## Component 1: UsersTab

**Location:** `packages/web/src/components/UsersTab.tsx`
**Renders inside:** `AdminPage` TabPanel at index 0 (replaces "User management coming soon" placeholder).
**Container constraint:** Inherits `maxWidth: 960px` from AdminPage parent.

---

### 1.1 Component Hierarchy

```
UsersTab
  Box (root container)
    |
    +-- Box (add-user-form section)
    |     Typography ("Add User" section label)
    |     Box (form row, flexbox)
    |       TextField (email, required)
    |       TextField (name, required)
    |       Select (role: admin | editor | viewer)
    |       Button ("Add User", primary)
    |     Alert (inline error/success, conditional)
    |
    +-- Divider
    |
    +-- Box (user-list section)
    |     Typography ("Users" section label + count badge)
    |     Box (loading state, conditional)
    |       CircularProgress
    |     Alert (error state, conditional)
    |     Box (empty state, conditional)
    |       Typography (empty heading)
    |       Typography (empty body)
    |     Table (user list)
    |       TableHead
    |         TableRow
    |           TableCell ("Name")
    |           TableCell ("Email")
    |           TableCell ("Role")
    |           TableCell ("Member Since")
    |           TableCell ("Actions")
    |       TableBody
    |         TableRow (per user, hover highlight)
    |           TableCell
    |             Box (avatar 28px + name)
    |           TableCell (email)
    |           TableCell
    |             Chip (role badge)
    |           TableCell (date)
    |           TableCell
    |             Box (actions row)
    |               Select (role change dropdown)
    |               IconButton (delete, with tooltip)
    |
    +-- Divider
    |
    +-- Box (allowed-emails section)
    |     Typography ("Allowed Emails" section label)
    |     Typography (note text)
    |     Box (add-email form row)
    |       TextField (email input)
    |       Button ("Add", secondary)
    |     List (allowed emails)
    |       ListItem (per email)
    |         ListItemText (email string)
    |         IconButton (remove, with tooltip)
    |     Box (empty state for allowed emails, conditional)
    |
    +-- Dialog (remove-user confirmation)
    |     DialogTitle
    |     DialogContent
    |       DialogContentText
    |     DialogActions
    |       Button ("Cancel", tertiary)
    |       Button ("Remove", destructive)
    |
    +-- Dialog (remove-email confirmation)
          DialogTitle
          DialogContent
            DialogContentText
          DialogActions
            Button ("Cancel", tertiary)
            Button ("Remove", destructive)
```

---

### 1.2 Token Mapping

#### Surfaces

| Element | Token | Value |
|---|---|---|
| Root container background | inherits `--surface-primary` | `#FFFFFF` |
| Table header row | `--surface-secondary` | `#F9F9FB` |
| Table row hover | `--surface-tertiary` | `#F3F3F7` |
| Dialog background | `--surface-elevated` | `#FFFFFF` |
| Dialog backdrop | `--surface-overlay` | `rgba(0, 0, 0, 0.5)` + `backdrop-filter: blur(8px)` |
| Add-user form section bg | `--surface-secondary` | `#F9F9FB` |
| Allowed email list item hover | `--surface-tertiary` | `#F3F3F7` |

#### Text

| Element | Token | Value |
|---|---|---|
| Section labels | `--text-primary` | `#12111A` |
| Table header text | `--text-secondary` | `#6B6D82` |
| User name (table cell) | `--text-primary` | `#12111A` |
| User email (table cell) | `--text-body` | `#37354A` |
| Member-since date | `--text-secondary` | `#6B6D82` |
| Note text | `--text-secondary` | `#6B6D82` |
| Empty state heading | `--text-primary` | `#12111A` |
| Empty state body | `--text-secondary` | `#6B6D82` |
| Dialog title | `--text-primary` | `#12111A` |
| Dialog body | `--text-body` | `#37354A` |
| Allowed email text | `--text-body` | `#37354A` |

#### Interactive

| Element | Token | Value |
|---|---|---|
| "Add User" button bg | `--accent-primary` | `#8027FF` |
| "Add User" button hover | `--accent-primary-hover` | `#6B1FDB` |
| "Add User" button text | `--text-on-purple` | `#FFFFFF` |
| "Add" email button | secondary style -- transparent bg, `--border-primary` border | |
| Remove icon button (idle) | `--text-tertiary` | `#9B9DB0` |
| Remove icon button (hover) | `--destructive` | `#DC2626` |
| "Remove" confirm button bg | `--destructive` | `#DC2626` |
| "Remove" confirm hover | `--destructive-hover` | `#B91C1C` |
| "Cancel" button | tertiary style -- `--text-secondary` | `#6B6D82` |
| Focus ring (all interactive) | `--accent-primary-ring` | `#8027FF33` |

#### Borders

| Element | Token | Value |
|---|---|---|
| Table borders | `--border-primary` | `#E4E5ED` |
| Input borders | `--border-input` | `#D1D2DE` |
| Input focus border | `--border-focus` | `#8027FF` |
| Dividers | `--border-primary` | `#E4E5ED` |
| Dialog border | `--border-primary` | `#E4E5ED` |
| Form section border-radius | `--radius-xl` | `10px` |

#### Role Chip Colors

| Role | Style | Background | Text | Border |
|---|---|---|---|---|
| Admin | filled | `--accent-primary` (`#8027FF`) | `--text-on-purple` (`#FFFFFF`) | none |
| Editor | outlined | transparent | `--text-primary` (`#12111A`) | `1px solid --border-primary` (`#E4E5ED`) |
| Viewer | outlined | transparent | `--text-secondary` (`#6B6D82`) | `1px solid --border-secondary` (`#F3F3F7`) |

Chip shape: `border-radius: 9999px`, padding `3px 10px`, font `--type-caption-caps` (DM Sans 0.6875rem/1rem, weight 600, uppercase, tracking 0.05em).

---

### 1.3 Typography Mapping

| Element | Type Token | Font | Size | Weight | Line Height |
|---|---|---|---|---|---|
| Section labels ("Add User", "Users", "Allowed Emails") | `--type-subtitle` | DM Sans | 0.875rem (14px) | 600 | 1.25rem |
| Table header cells | `--type-caption-caps` | DM Sans | 0.6875rem (11px) | 600 | 1rem |
| User name in table | `--type-body-medium` | DM Sans | 0.875rem (14px) | 500 | 1.5rem |
| Email in table | `--type-body` | DM Sans | 0.875rem (14px) | 400 | 1.5rem |
| Member-since date | `--type-caption` | DM Sans | 0.75rem (12px) | 400 | 1rem |
| Role chip label | `--type-caption-caps` | DM Sans | 0.6875rem (11px) | 600 | 1rem |
| Note text | `--type-caption` | DM Sans | 0.75rem (12px) | 400 | 1rem |
| Form input text | `--type-body` | DM Sans | 0.875rem (14px) | 400 | 1.5rem |
| Form labels | `--type-label` | DM Sans | 0.8125rem (13px) | 500 | 1.125rem |
| "Add User" button text | `--type-label` | DM Sans | 0.8125rem (13px) | 600 | 1.125rem |
| Empty state heading | `--type-body-medium` | DM Sans | 0.875rem (14px) | 500 | 1.5rem |
| Empty state body | `--type-caption` | DM Sans | 0.75rem (12px) | 400 | 1rem |
| Dialog title | `--type-headline` | Source Serif 4 | 1.5rem (24px) | 600 | 2rem |
| Dialog body | `--type-body` | DM Sans | 0.875rem (14px) | 400 | 1.5rem |
| Count badge (next to "Users") | `--type-caption` | DM Sans | 0.75rem (12px) | 400 | 1rem |
| Allowed email string | `--type-body` | DM Sans | 0.875rem (14px) | 400 | 1.5rem |

Table header cells use uppercase + tracking 0.05em (matching `--type-caption-caps`).

---

### 1.4 Spacing

| Spacing | Token | Value | Where |
|---|---|---|---|
| Section vertical gap | `--space-7` | 32px | Between "Add User" form, "Users" list, and "Allowed Emails" sections |
| Section label to content | `--space-4` | 16px | Below each section label |
| Form row gap | `--space-3` | 12px | Between form fields in the add-user row |
| Form section padding | `--space-5` | 20px | Padding inside the add-user form container |
| Table cell vertical padding | `--space-3` | 12px | Top and bottom of each table cell |
| Table cell horizontal padding | `--space-4` | 16px | Left and right of each table cell |
| Actions button gap | `--space-2` | 8px | Between role Select and delete IconButton |
| Divider vertical margin | `--space-7` | 32px | Above and below each Divider |
| Allowed email list item padding | `--space-3 --space-4` | 12px 16px | Vertical and horizontal padding per list item |
| Add-email row gap | `--space-2` | 8px | Between email input and "Add" button |
| Note text to add-email form | `--space-3` | 12px | Gap between note Typography and add-email row |
| Dialog padding | `--space-6` | 24px | Dialog content padding (per v3 dialog spec) |
| Avatar to name gap | `--space-2` | 8px | In the name cell, between avatar circle and name text |

---

### 1.5 Interaction States

#### Add User Form

- **TextField focus:** border changes to `--border-focus` (`#8027FF`), focus ring `0 0 0 3px var(--accent-primary-ring)`.
- **"Add User" button disabled:** when email or name is empty. 50% opacity, `cursor: not-allowed`.
- **Success feedback:** After adding, show an inline `Alert severity="success"` below the form row: "User added successfully." Auto-dismisses after 4s.
- **Error feedback:** Inline `Alert severity="error"` with the error message. Persists until dismissed or retried.

#### User Table Rows

- **Hover:** `--surface-tertiary` (`#F3F3F7`) background on the entire row. Transition 150ms ease.
- **Role Select focus:** focus ring per v3 spec.
- **Role Select change:** triggers API call. While saving, the Select shows a small CircularProgress (16px) as endAdornment. On success, Chip updates. On error, reverts + shows toast.
- **Delete IconButton hover:** icon color transitions from `--text-tertiary` to `--destructive` (`#DC2626`). Background `--destructive-subtle` (`#FEE2E2`), border-radius `--radius-md` (6px).

#### Self-Protection

- **Current user's row:** The role Select is `disabled` and the delete IconButton is `disabled` with a Tooltip: "You cannot modify your own account".
- **Disabled controls:** 50% opacity, `cursor: not-allowed`. No hover color change.

#### Remove Confirmation Dialog

- **Enter animation:** scale 0.95 to 1.0, opacity 0 to 1, 200ms ease-out.
- **Exit animation:** opacity 1 to 0, 150ms ease-in.
- **"Remove" button:** uses destructive style (red bg). Hover `--destructive-hover`.
- **"Cancel" button:** tertiary style.
- **Dialog body text:** includes user name and email for clarity: "Remove **{name}** ({email}) from LegalCode? This action cannot be undone."

#### Allowed Emails Section

- **Add email input + button:** same focus/disabled patterns as add-user form.
- **Remove email IconButton:** same hover pattern as delete user (tertiary to destructive).
- **Remove email confirmation:** lighter dialog -- "Remove {email} from the allowed list? They will not be able to log in."

---

### 1.6 Accessibility

- **Table:** Use semantic `<table>` via MUI `Table` component. `<thead>` and `<tbody>` rendered automatically.
- **Table header:** `scope="col"` on each header cell (MUI handles this via TableCell in TableHead).
- **ARIA labels:**
  - Add-user form: `aria-label="Add new user form"` on the form Box.
  - Role Select per row: `aria-label="Change role for {userName}"`.
  - Delete IconButton per row: `aria-label="Remove {userName}"`.
  - Role Select in add form: `aria-label="Select role for new user"`.
  - Allowed email remove: `aria-label="Remove {email} from allowed list"`.
- **Focus management:** After adding a user, focus returns to the email input (first field). After removing, focus returns to the table.
- **Keyboard navigation:**
  - Tab order: add-user form fields left-to-right, then table rows top-to-bottom (role Select, then delete button per row), then allowed emails section.
  - Enter/Space on delete button opens confirmation dialog.
  - Escape closes confirmation dialog.
  - Dialog traps focus while open.
- **Color contrast:** All text/background combinations meet WCAG AA (4.5:1 for normal text, 3:1 for large text). The admin chip (#FFFFFF on #8027FF) is 4.6:1 -- passes AA. Editor chip outlined uses `#12111A` on white -- 17.6:1. Viewer chip uses `#6B6D82` on white -- 5.0:1.
- **Screen reader:** Loading state announces "Loading users" via `aria-busy="true"`. Error state uses `role="alert"`. Empty state is announced as content.

---

### 1.7 Responsive Behavior

**Desktop-first. Below 900px the entire app shows an unsupported-width notice (per v3 spec), so these breakpoints only cover 900px+.**

| Breakpoint | Behavior |
|---|---|
| 1280px+ | Full layout. Add-user form fields in a single row. Table shows all 5 columns. |
| 1024-1279px | Add-user form fields in a single row (fields flex-shrink). Table shows all 5 columns but with slightly compressed cell padding (12px horizontal). |
| 900-1023px | Add-user form wraps: email+name on row 1, role+button on row 2 (`flexWrap: 'wrap'`). Table hides "Member Since" column. Actions column uses icon-only buttons. |

The add-user form row uses `display: flex`, `flexWrap: wrap`, `gap: 12px`. Each TextField has `flex: 1`, `minWidth: 180px`. The role Select has `minWidth: 140px`. The "Add User" button has `flexShrink: 0`.

---

### 1.8 States Summary

| State | Rendering |
|---|---|
| **Loading** | `CircularProgress` (24px) centered in the user-list section. `aria-busy="true"`. |
| **Error** | `Alert severity="error"` with error message and a "Retry" button (tertiary style). |
| **Empty (no users)** | Centered text: heading "No users yet", body "Add a user above to get started." |
| **Populated** | Table with user rows. |
| **Saving (role change)** | CircularProgress (16px) inside Select endAdornment. Select disabled during save. |
| **Saving (add user)** | "Add User" button shows CircularProgress (16px) replacing text. Button disabled. |
| **Saving (remove user)** | "Remove" button in dialog shows CircularProgress (16px). Both dialog buttons disabled. |

---

## Component 2: SettingsPage

**Location:** `packages/web/src/pages/SettingsPage.tsx` (replaces existing placeholder).
**Route:** `/settings`
**Container constraint:** `maxWidth: 640px`, centered with `mx: 'auto'`.

---

### 2.1 Component Hierarchy

```
SettingsPage
  Box (root container, maxWidth 640px, mx auto, p 3)
    |
    +-- Typography ("Settings" page title, h1)
    |
    +-- Box (profile section)
    |     Box (profile header row, flex)
    |       Avatar (64px, initials, accent-primary bg)
    |       Box (text column)
    |         Typography (user name, Source Serif 4)
    |         Typography (user email)
    |         Box (badges row, flex)
    |           Chip (role badge)
    |           Chip ("Connected via Google" badge with Google icon)
    |     Box (member-since row)
    |       Typography ("Member since" label)
    |       Typography (date value)
    |
    +-- Divider
    |
    +-- Box (editor-preferences section)
    |     Typography ("Editor Preferences" section label)
    |     Box (preference row, flex, space-between)
    |       Box (label column)
    |         Typography ("Default editor mode" label)
    |         Typography ("Choose your preferred editing mode" caption)
    |       ToggleButtonGroup (exclusive)
    |         ToggleButton ("Edit" value)
    |         ToggleButton ("Review" value)
    |
    +-- Divider
    |
    +-- Box (account section)
          Typography ("Account" section label)
          Button ("Sign out", outlined, destructive hint)
```

---

### 2.2 Token Mapping

#### Surfaces

| Element | Token | Value |
|---|---|---|
| Page background | `--surface-primary` | `#FFFFFF` |
| Avatar background (initials fallback) | `--accent-primary` | `#8027FF` |
| ToggleButtonGroup container | `--surface-tertiary` | `#F3F3F7` |
| Active ToggleButton segment | `--surface-primary` | `#FFFFFF` |
| Inactive ToggleButton segment | transparent | |
| Google badge background | `--surface-secondary` | `#F9F9FB` |

#### Text

| Element | Token | Value |
|---|---|---|
| Page title ("Settings") | `--text-primary` | `#12111A` |
| User name | `--text-primary` | `#12111A` |
| User email | `--text-secondary` | `#6B6D82` |
| Section labels | `--text-primary` | `#12111A` |
| Preference label | `--text-primary` | `#12111A` |
| Preference caption | `--text-secondary` | `#6B6D82` |
| "Member since" label | `--text-secondary` | `#6B6D82` |
| "Member since" value | `--text-primary` | `#12111A` |
| Active toggle text | `--text-primary` | `#12111A` |
| Inactive toggle text | `--text-secondary` | `#6B6D82` |
| Avatar initials | `--text-on-purple` | `#FFFFFF` |
| "Sign out" button text | `--destructive` | `#DC2626` |
| Role badge text (admin) | `--text-on-purple` | `#FFFFFF` |
| "Connected via Google" text | `--text-secondary` | `#6B6D82` |

#### Interactive

| Element | Token | Value |
|---|---|---|
| Active ToggleButton shadow | `--shadow-xs` | `0 1px 2px rgba(0, 0, 0, 0.05)` |
| "Sign out" button border | `--destructive` | `#DC2626` (at 40% opacity for subtlety) |
| "Sign out" hover bg | `--destructive-subtle` | `#FEE2E2` |
| Focus ring (all interactive) | `--accent-primary-ring` | `#8027FF33` |

#### Borders

| Element | Token | Value |
|---|---|---|
| Dividers | `--border-primary` | `#E4E5ED` |
| ToggleButtonGroup border | `--border-primary` | `#E4E5ED` |
| Google badge border | `--border-primary` | `#E4E5ED` |
| "Sign out" button border | `--destructive` at 40% opacity | `rgba(220, 38, 38, 0.4)` |

---

### 2.3 Typography Mapping

| Element | Type Token | Font | Size | Weight | Line Height |
|---|---|---|---|---|---|
| Page title ("Settings") | `--type-headline` | Source Serif 4 | 1.5rem (24px) | 600 | 2rem |
| User name | `--type-title` | Source Serif 4 | 1.125rem (18px) | 600 | 1.5rem |
| User email | `--type-body` | DM Sans | 0.875rem (14px) | 400 | 1.5rem |
| Section labels ("Editor Preferences", "Account") | `--type-subtitle` | DM Sans | 0.875rem (14px) | 600 | 1.25rem |
| Preference label ("Default editor mode") | `--type-body-medium` | DM Sans | 0.875rem (14px) | 500 | 1.5rem |
| Preference caption | `--type-caption` | DM Sans | 0.75rem (12px) | 400 | 1rem |
| "Member since" label | `--type-caption` | DM Sans | 0.75rem (12px) | 400 | 1rem |
| "Member since" date value | `--type-body` | DM Sans | 0.875rem (14px) | 400 | 1.5rem |
| Toggle button labels | `--type-label` | DM Sans | 0.8125rem (13px) | 500 (inactive) / 600 (active) | 1.125rem |
| Role badge label | `--type-caption-caps` | DM Sans | 0.6875rem (11px) | 600 | 1rem |
| "Connected via Google" label | `--type-caption` | DM Sans | 0.75rem (12px) | 400 | 1rem |
| "Sign out" button label | `--type-label` | DM Sans | 0.8125rem (13px) | 600 | 1.125rem |

---

### 2.4 Spacing

| Spacing | Token | Value | Where |
|---|---|---|---|
| Page padding | `--space-6` | 24px | Root container padding (p: 3 in MUI = 24px) |
| Page title to first section | `--space-7` | 32px | Below the "Settings" h1 |
| Avatar to text column | `--space-5` | 20px | Gap between avatar and name/email column |
| Name to email | `--space-1` | 4px | Between name Typography and email Typography |
| Email to badges row | `--space-3` | 12px | Between email and role+google badges |
| Badge gap | `--space-2` | 8px | Between role chip and google chip |
| Profile header to member-since | `--space-5` | 20px | Gap below the avatar+text row to member-since |
| Divider vertical margin | `--space-7` | 32px | Above and below each Divider |
| Section label to content | `--space-5` | 20px | Below each section label to its content |
| Preference label to caption | `--space-0.5` | 2px | Between "Default editor mode" and its caption |
| ToggleButtonGroup internal padding | `--space-0.5` | 3px | Padding inside the group container |
| ToggleButton padding | `6px --space-4` | 6px 16px | Per toggle button segment |
| "Sign out" button height | -- | 36px | Standard button height per v3 spec |

---

### 2.5 Interaction States

#### ToggleButtonGroup (Edit / Review)

- **Container:** `--surface-tertiary` background, `1px solid --border-primary` border, `--radius-lg` (8px), padding 3px.
- **Active segment:** `--surface-primary` background, `--text-primary` text, `--radius-md` (6px), `--shadow-xs`. Weight 600.
- **Inactive segment:** transparent background, `--text-secondary` text. Weight 500. Hover: `--text-primary` text.
- **Transition:** background-position slide, 200ms ease (per v3 mode toggle spec).
- **On change:** value persisted to `localStorage` key `legalcode-editor-mode` (values: `"edit"` or `"review"`). Read on mount with fallback to `"edit"`.
- **Focus:** `0 0 0 3px var(--accent-primary-ring)` on the focused toggle button, `outline-offset: 2px`.

#### Sign Out Button

- **Idle:** transparent background, `1px solid rgba(220, 38, 38, 0.4)` border, `--destructive` text, `--radius-lg` (8px).
- **Hover:** `--destructive-subtle` (`#FEE2E2`) background, `1px solid --destructive` border, `--destructive` text.
- **Active/pressed:** `--destructive` background, `--text-on-dark` text.
- **Focus:** `0 0 0 3px var(--accent-primary-ring)`.
- **On click:** calls the logout API endpoint, clears auth state, redirects to `/login`.

#### Avatar

- **Non-interactive** (read-only profile). No hover, no click. Purely decorative with `aria-hidden="true"`.
- **Size:** 64px (custom, larger than any v3 avatar variant -- this is a profile display, not a nav element).
- **Initials:** first letter of first name + first letter of last name, uppercase. DM Sans, weight 600, font-size 1.5rem. Color `--text-on-purple`. Background `--accent-primary`.

---

### 2.6 Accessibility

- **Page structure:** `<h1>` for "Settings" (via `component="h1"`). Section labels use `<h2>` (via `component="h2"`).
- **ARIA labels:**
  - ToggleButtonGroup: `aria-label="Default editor mode"`.
  - Each ToggleButton: the label text ("Edit", "Review") serves as the accessible name.
  - "Sign out" button: `aria-label="Sign out of LegalCode"`.
  - Avatar: `aria-hidden="true"` (decorative, name is displayed as text).
- **Role badge:** `role="status"` -- announces the user's role.
- **Google badge:** purely informational, no interaction.
- **Keyboard navigation:**
  - Tab order: ToggleButtonGroup (left/right arrow keys switch segments), then "Sign out" button.
  - ToggleButtonGroup follows WAI-ARIA roving tabindex pattern (MUI handles this natively).
- **Color contrast:** All combinations pass WCAG AA. Sign-out red text on white: #DC2626 on #FFFFFF = 4.6:1 (passes AA for normal text at 13px weight 600).
- **Reduced motion:** Toggle segment transition respects `prefers-reduced-motion` -- instant switch, no slide.

---

### 2.7 Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| 1280px+ | Full layout, centered at 640px max-width. Generous whitespace. |
| 1024-1279px | Same layout, same max-width. No changes needed -- 640px fits comfortably. |
| 900-1023px | Same layout. The 640px container still fits within 900px viewport with side padding. |

The SettingsPage is narrow by design (640px max-width) and does not need responsive adaptations above the 900px minimum. All elements are single-column and flex-wrap naturally.

---

### 2.8 States Summary

| State | Rendering |
|---|---|
| **Loading (auth data)** | Skeleton placeholders for avatar (64px circle), name (120px width), email (160px width). Use MUI `Skeleton` with `variant="circular"` and `variant="text"`. |
| **Error (auth fetch failed)** | `Alert severity="error"`: "Unable to load profile. Please try again." with "Retry" button. |
| **Populated** | Full profile display with all sections. |
| **Sign-out in progress** | "Sign out" button shows `CircularProgress` (16px) replacing text. Button disabled. |

---

### 2.9 Google Badge Detail

The "Connected via Google" indicator uses a Chip with:

- **Avatar slot:** Google "G" logo (16px SVG icon or the `Google` icon from `@mui/icons-material`). If no MUI Google icon is available, use a small inline SVG of the Google "G" in Google's brand colors.
- **Label:** "Connected via Google"
- **Style:** `variant="outlined"`, `--surface-secondary` background, `1px solid --border-primary` border, `--radius-full` border-radius.
- **Font:** `--type-caption`, `--text-secondary`.
- **Non-interactive:** no onClick, no hover change.

---

## Implementation Notes for Frontend Engineer

1. **UsersTab hooks:** Create `useUsers()` and `useAllowedEmails()` TanStack Query hooks that call API endpoints (these may not exist yet -- the Backend Engineer will need to build them). Use optimistic updates for role changes and removals.

2. **Self-identification:** The current user's ID/email comes from the auth context (likely `useAuth()` or similar). Compare against each user row to determine self-protection disabling.

3. **SettingsPage auth data:** Use the existing auth context/hook to get `user.name`, `user.email`, `user.role`, `user.createdAt`. The avatar initials are derived from the name.

4. **localStorage for editor mode:** Key `legalcode-editor-mode`, values `"edit"` | `"review"`. Default `"edit"`. This preference should be consumed by the editor page (future integration point).

5. **Date formatting:** Use `Intl.DateTimeFormat` for "Member since" dates (e.g., `new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)` produces "March 2026").

6. **TDD:** Write tests first for all states: loading, error, empty, populated, self-protection, role change, removal confirmation flow, localStorage persistence.

7. **MUI v7 API verification:** Before implementation, use Context7 to verify MUI v7 component APIs for `ToggleButtonGroup`, `Table`, `Select`, `Chip`, `Dialog`, `Alert`, `Skeleton`.
