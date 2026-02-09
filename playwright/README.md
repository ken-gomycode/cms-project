# CMS Playwright Test Suite

Comprehensive end-to-end tests for the Content Management System.

## Structure

```
playwright/
├── tests/                  # Test files
│   ├── auth.spec.ts        # Authentication tests
│   ├── dashboard.spec.ts   # Admin dashboard tests
│   ├── content.spec.ts     # Content management CRUD tests
│   ├── media.spec.ts       # Media library tests
│   ├── taxonomy.spec.ts    # Categories and tags tests
│   ├── comments.spec.ts    # Comment moderation tests
│   ├── users.spec.ts       # User management tests
│   ├── seo.spec.ts         # SEO management tests
│   ├── analytics.spec.ts   # Analytics dashboard tests
│   ├── public.spec.ts      # Public-facing pages tests
│   ├── api-integration.spec.ts  # Direct API tests
│   ├── accessibility.spec.ts    # a11y tests
│   └── smoke.spec.ts       # Quick smoke tests
├── pages/                  # Page Object Models
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   ├── content.page.ts
│   ├── media.page.ts
│   ├── taxonomy.page.ts
│   ├── comments.page.ts
│   ├── users.page.ts
│   ├── seo.page.ts
│   ├── analytics.page.ts
│   └── public.page.ts
├── fixtures/               # Test fixtures and data
│   └── auth.fixture.ts     # Authentication fixtures
├── utils/                  # Test utilities
│   ├── test-data.ts        # Test data generators
│   ├── api-client.ts       # API helper for setup/teardown
│   └── ...
├── playwright.config.ts    # Playwright configuration
├── global-setup.ts         # Global setup (seeds data)
├── global-teardown.ts      # Global teardown (cleans data)
└── .env.example            # Environment variables template
```

## Setup

1. **Install dependencies:**
   ```bash
   cd playwright
   npm install
   npx playwright install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start the application:**
   ```bash
   # In root directory
   docker-compose up -d   # or
   npm run dev            # in backend and frontend separately
   ```

## Running Tests

```bash
# Run all tests headlessly
npm test

# Run with UI mode for debugging
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Debug specific test
npm run test:debug

# Run smoke tests only
npx playwright test smoke.spec.ts

# Run tests in specific project (browser)
npx playwright test --project=chromium

# Run with tag
npx playwright test --grep "@critical"

# Show report
npm run test:report
```

## Test Categories

### Authentication (`auth.spec.ts`)
- Login with valid/invalid credentials
- User registration
- Protected route redirection
- Role-based access control

### Content Management (`content.spec.ts`)
- Create, edit, delete content
- Draft vs published status
- Validation errors
- Search and filtering
- Auto-slug generation

### Media Library (`media.spec.ts`)
- Grid/list view toggle
- File upload
- Bulk operations
- Search

### Taxonomy (`taxonomy.spec.ts`)
- Create/edit/delete categories
- Create/edit/delete tags
- Nested categories
- Auto-slug generation

### Comments (`comments.spec.ts`)
- Moderation workflow (approve, reject, spam)
- Bulk operations
- Status filtering
- Detail view

### User Management (`users.spec.ts`)
- CRUD operations
- Role assignment
- Search and filtering
- Access control (author vs admin)

### SEO (`seo.spec.ts`)
- Edit metadata
- Character counters
- SEO analysis
- Status badges

### Analytics (`analytics.spec.ts`)
- Stat cards
- Date range selection
- Charts
- Export functionality

### Public Pages (`public.spec.ts`)
- Home page content grid
- Content detail view
- Comments submission
- Search and filtering
- SEO meta tags

### API Integration (`api-integration.spec.ts`)
- Direct API calls
- Authentication flow
- CRUD operations
- Pagination
- Error handling

### Smoke Tests (`smoke.spec.ts`)
- Quick health checks
- All routes load
- No console errors
- Database connectivity

### Accessibility (`accessibility.spec.ts`)
- Form labels
- Focus indicators
- Alt text
- Keyboard navigation
- Error announcements

## Test Data

Tests use the `testData` utility for generating unique data:

```typescript
import { testData } from '../utils/test-data';

const title = testData.content.title('Draft'); // "Draft Content a3f9d2e1"
const email = testData.user.email(); // "test.a3f9d2e1@test.com"
```

## Page Object Model

Tests use Page Objects for maintainability:

```typescript
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login(email, password);
```

## Authentication Fixtures

The `authenticatedPage` fixture handles login/logout:

```typescript
test('admin can access dashboard', async ({ page, authenticatedPage }) => {
  await authenticatedPage.login('admin');
  // Test as authenticated admin
  await authenticatedPage.logout();
});
```

## API Client

For test setup/teardown, use the API client:

```typescript
import { apiClient } from '../utils/api-client';

await apiClient.loginAsAdmin();
const content = await apiClient.createContent({ title: 'Test', body: 'Body' });
await apiClient.deleteContent(content.id);
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Playwright tests
  run: |
    cd playwright
    npm ci
    npx playwright test
```

## Troubleshooting

**Tests failing with timeout:**
- Increase timeout in `playwright.config.ts`
- Check if backend/frontend are running

**API calls failing:**
- Check `API_URL` in `.env`
- Ensure database is seeded with test credentials

**Screenshots/videos not captured:**
- Check `playwright.config.ts` trace settings
- Videos are only captured on failure by default

## Browser Support

Tests run on:
- Chromium (Chrome)
- Firefox
- WebKit (Safari)
- Mobile Chrome
- Mobile Safari

Configure in `playwright.config.ts`.
