export interface HelpSection {
  id: string;
  title: string;
  content: string;
}

export const helpContent: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: `Welcome to Shelf Esteem! Here's how to get the most out of your pantry manager.

**First steps:**
1. Add items to your pantry — use the + button or scan barcodes
2. Set expiry dates so Shelfy can warn you before things go bad
3. Browse your matched recipes to see what you can cook right now
4. Set up your weekly meal plan to auto-generate your shopping list`,
  },
  {
    id: 'pantry',
    title: 'Adding Pantry Items',
    content: `There are three ways to add items to your pantry:

**Manual entry** — tap the + button, type the name, set quantity and expiry date.

**Barcode scan** — tap the barcode icon and point your camera at any grocery item. Shelf Esteem will look up the product automatically.

**Receipt import** — upload a photo of your receipt and let AI extract all the items at once.`,
  },
  {
    id: 'barcode',
    title: 'Barcode Scanning',
    content: `The barcode scanner works on any grocery item with a UPC or EAN barcode.

**Tips:**
- Hold the camera steady and make sure the barcode is well-lit
- If the camera scan fails, tap "Enter manually" to type the barcode number
- Once scanned, you can edit the product name, quantity, and expiry date before saving`,
  },
  {
    id: 'recipes',
    title: 'Recipes & Cooking',
    content: `**Can Cook Now** — this filter shows only recipes you have all the ingredients for right now.

**Cook This** — taps the cook button to automatically deduct used ingredients from your pantry.

**Add from URL** — paste any recipe URL and Shelfy will extract ingredients and instructions automatically.

**Cook Mode** — step-by-step view with built-in timers for each step.`,
  },
  {
    id: 'meal-plan',
    title: 'Meal Planning',
    content: `The meal plan shows a full week view with breakfast, lunch, dinner, and snack slots.

**Add Missing to List** — after planning your week, tap this button to automatically add all missing ingredients to your shopping list.

Meals can be recipes from your library, leftovers, or custom dish names.`,
  },
  {
    id: 'shopping',
    title: 'Shopping List',
    content: `Items are grouped by category for easy store navigation.

**Find Coupons** — tap this with unchecked items to let Shelfy hunt for deals at major grocery stores.

**Complete Purchase** — check off what you bought, then tap Complete to automatically add everything to your pantry.`,
  },
  {
    id: 'receipts',
    title: 'Receipts & Spending',
    content: `Upload a photo of any grocery receipt to automatically extract items and prices.

The Spending page shows charts of your monthly spending, spend by store, and spend by category — all built from your receipt history.`,
  },
  {
    id: 'community',
    title: 'Community Features',
    content: `The Community section has seven areas:

- **Recipes** — share and discover recipes from other Shelf Esteem users
- **Sale Alerts** — post great deals you've spotted at local stores
- **Pantry Shares** — offer items you have too much of to neighbors
- **Challenges** — cooking challenges with voting
- **Gadgets** — kitchen tool recommendations
- **Groups** — organize group cooking events
- **Q&A** — get answers from the community`,
  },
  {
    id: 'account',
    title: 'Account & Billing',
    content: `**Tester Codes** — if you have a tester code, enter it in Account to unlock all features.

**Demo Mode** — activate with code PANTRYDEMO to see a pre-filled pantry demo.

**Referrals** — share your referral link to invite friends.

**Data Reset** — wipe all your data if you want a fresh start (requires confirmation).`,
  },
];
