# Coding Standards

## TypeScript

- Strict mode enabled
- No `any` types - use proper typing or `unknown`
- Define interfaces for all props, API responses, and data models
- Use type inference where obvious, explicit types where helpful

## React

- Functional components only (no class components)
- Use hooks for state and side effects
- Keep components focused - one job per component
- Extract reusable logic into custom hooks

## Next.js

- Each page has to be a server component
- Use Server Actions for form submissions and simple mutations
- Use API routes when you need:
  - Webhooks (Stripe, etc.)
  - Long-running operations
  - Specific HTTP status codes or headers
- Otherwise, fetch data directly in server components
- We're not using any components library

## File Organization

- Components: `src/components/ComponentName.tsx`
- Pages: `src/app/[route]/page.tsx`
- Server Actions: `src/action/action.ts`
- Lib/Utils: `src/lib/utils.ts`

## Naming

- Components: PascalCase (`ItemCard.tsx`)
- Files: Match component name or kebab-case
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase (no prefix)

## Styling

- Use the globals.css file
- No inline styles
- We're NOT using Tailwind
- Use variable for colors, border-radius, section padding, and other properties that are used sitewide
- Every size value must pe in rem, no px
- Don't create classes with no styles in it

## Backend and Database

- Use Payload CMS for all database operations
- All the content is coming Payload, collections or globals
- We're using Payload's locales for translation, the default language is 'en'
- We're getting the locale on each page with: const { lang } = await params; const locale = (lang as TypedLocale) || "en";
- The data must be fetched at the page level since it's where we're getting the locale and the data is passed down to components
- Keep in mind that we're using MongoDB for the database
- There must be one folder per page in the globals and one tab per section

## Data Fetching

- Server components fetch directly with Payload
- Client components use Server Actions
- Validate all inputs with Zod

## Error Handling

- Use try/catch in Server Actions
- Return `{ success, data, error }` pattern from actions
- Display user-friendly error messages via toast

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Always use absolute path for internal imports
- Keep functions under 50 lines when possible

## General

- Keep in mind we'll be using Vercel for deployment
- Use environment variables when needed
