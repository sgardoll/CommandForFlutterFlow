# AGENTS.md - FlutterFlow Command Dashboard

## Build & Development Commands

### Development
```bash
# Install dependencies (first time only)
npm install

# Start development server (recommended)
npm run dev              # Starts Vite dev server on port 3000

# Build for production
npm run build            # Creates dist/ folder

# Preview production build
npm run preview

# Alternative: Serve with basic HTTP server
npx serve .              # Node-based server
python -m http.server 8000  # Python server
```

### Testing
- No automated test suite
- Manual testing: Open in browser and verify UI functionality
- Test Gemini API integration requires valid API key in .env

### Linting/Formatting
- No build process or linters configured
- Manual code review required

---

## Code Style Guidelines

### JavaScript Conventions
- **Modern ES6+**: async/await, const/let, arrow functions, ES modules
- **Variables**: camelCase for variables and functions
  ```javascript
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const PRIMARY_MODEL = "gemini-3.0-pro-preview"; // Constants: UPPER_SNAKE_CASE
  let currentView = "overview";                     // Mutable: camelCase
  function runAiOptimizer() {}                       // Functions: camelCase
  ```
- **Async Operations**: Always use async/await with try/catch
  ```javascript
  async function fetchWithModel() {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Fetch failed");
      return data;
    } catch (error) {
      console.warn(error);
      return null;
    }
  }
  ```

### HTML Structure
- **Multi-file architecture**: HTML structure → CSS (style block) → External JS
- **Order**: HTML structure → CSS (style block) → Template definitions
- **JavaScript**: Loaded as ES module via `<script type="module" src="/app.js">`
- **Semantic HTML5**: Use proper elements (header, nav, main, section)
- **IDs**: kebab-case (`nav-overview`, `chart-integrity`)
- **Classes**: Tailwind utilities (kebab-case) + custom classes (camelCase)

### CSS Patterns
- **Theming**: CSS custom properties in `:root`
  ```css
  :root {
    --bg-neutral: #09090b;
    --accent-primary: #6366f1;
  }
  ```
- **Tailwind CSS**: Use CDN, utility classes for layout
- **Custom CSS**: In `<style>` block for component-specific styles
- **Dark mode**: Neutral backgrounds (#09090b), indigo accents (#6366f1)
- **Responsive**: Tailwind breakpoints (sm, md, lg)

### Architecture Patterns

#### SPA View System
```javascript
// Add new view:
// 1. Create template div with id="tpl-newview"
// 2. Add nav button with onclick="switchView('newview')"
// 3. Template content clones to main-stage
function switchView(viewId) {
  const stage = document.getElementById("main-stage");
  const tpl = document.getElementById(`tpl-${viewId}`);
  stage.innerHTML = tpl.innerHTML;
}
```

#### Chart Integration (Chart.js)
```javascript
// Add new chart:
// 1. Create canvas element: <canvas id="chart-new"></canvas>
// 2. Add to initCharts() function
// 3. Destroy old charts before creating new ones
charts.forEach((c) => c.destroy());
charts.push(new Chart(ctx, { type: "bar", data: {...} }));
```

#### API Integration Pattern
- **Primary → Fallback**: Always implement fallback logic
- **No SDKs**: Use direct fetch() to API endpoints
- **Error Handling**: Try/catch with user feedback
- **Loading States**: Update UI during async operations

### Naming Conventions
- **Variables**: camelCase (`currentView`, `activeModel`)
- **Constants**: UPPER_SNAKE_CASE (`PRIMARY_MODEL`, `API_BASE_URL`)
- **Functions**: camelCase (`runAiOptimizer`, `checkConnection`)
- **HTML IDs**: kebab-case (`nav-overview`, `chart-integrity`)
- **CSS Classes**: kebab-case (Tailwind), camelCase (custom)

### Dependencies
- **External (CDN only)**: Tailwind CSS, Chart.js, Google Fonts
- **Build Tool**: Vite (npm package) for dev server and environment variables
- **Gemini API**: Direct REST API calls, no SDK
- **Environment**: Load API key from .env via Vite

### Error Handling
- **Try/catch**: Wrap all async operations
- **Fallback Logic**: Primary model → Secondary model → Offline state
- **UI Feedback**: Update status indicators during operations
- **Console**: Use console.warn for non-critical issues

### Code Organization
- **index.html**: HTML structure, inline CSS, template definitions
- **app.js**: All JavaScript logic (modular ES6)
- **.env**: Environment variables (API keys, not in git)
- **vite.config.js**: Vite configuration for dev server
- **package.json**: Project dependencies and scripts

### Environment Variables
- Use `import.meta.env.VITE_GEMINI_API_KEY` to access API key
- All env vars must be prefixed with `VITE_` to be exposed to client code
- Never commit .env to git (already in .gitignore)
- Use fallback for missing keys: `const key = import.meta.env.VITE_GEMINI_API_KEY || ""`

### Adding New Features
1. Add HTML template in `<div id="templates">`
2. Add nav button in sidebar
3. Create JS function to handle feature logic
4. Add state variables if needed
5. Test in browser
