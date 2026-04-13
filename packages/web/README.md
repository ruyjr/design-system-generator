# Design System Generator - Web Analysis Engine

Core infrastructure for analyzing website visual design and extracting design system elements.

## Features

- 🌐 **Website Analysis** - Navigate to any public website and extract visual design elements
- 📊 **DOM Extraction** - Extract all DOM elements with computed styles and relationships
- 🎨 **Color Palette** - Automatically extract color schemes from websites
- ✍️ **Typography** - Detect and catalog typography systems (fonts, sizes, weights)
- 📸 **Screenshots** - Capture full-page screenshots for visual reference
- 🔄 **Session Management** - Track analysis sessions with metadata and status
- 🛡️ **Error Handling** - Robust error handling with retry logic
- 📝 **Logging** - Comprehensive logging for debugging and analysis

## Installation

```bash
npm install
```

## Quick Start

```javascript
const { AnalysisEngine } = require('.');

async function analyzeWebsite() {
  const engine = new AnalysisEngine();
  
  try {
    // Initialize engine
    await engine.initialize();
    
    // Analyze a website
    const results = await engine.analyze('https://example.com');
    
    console.log('Analysis Complete:');
    console.log(`  Elements Extracted: ${results.elements.length}`);
    console.log(`  Colors Found: ${results.colorPalette.colors.length}`);
    console.log(`  Fonts Found: ${results.typography.fonts.length}`);
    console.log(`  Duration: ${results.duration}ms`);
    
    // Shutdown
    await engine.shutdown();
  } catch (error) {
    console.error('Analysis failed:', error.message);
  }
}

analyzeWebsite();
```

## API Reference

### AnalysisEngine

Main orchestrator for website analysis.

#### Methods

**`new AnalysisEngine(options)`**
- Creates a new analysis engine instance

**`async initialize()`**
- Initializes the browser and engine
- Must be called before `analyze()`

**`async analyze(url)`**
- Analyzes a website
- Returns: `{ sessionId, url, elements, colorPalette, typography, screenshotPath, duration }`

**`getSession(sessionId)`**
- Retrieves session data by ID

**`listActiveSessions()`**
- Returns array of active session IDs

**`getStats()`**
- Returns engine statistics (sessions, memory)

**`cleanup()`**
- Removes old sessions (>24 hours)

**`async shutdown()`**
- Closes browser and shuts down engine

### URLValidator

Validates and normalizes URLs.

#### Methods

**`validate(url)`**
- Validates URL format and content rules
- Throws: `ValidationError` if invalid
- Returns: Normalized URL

**`isValid(url)`**
- Checks if URL format is valid
- Returns: `boolean`

**`normalize(url)`**
- Normalizes URL (adds protocol, removes trailing slash)
- Returns: Normalized URL

**`isPrivateIP(url)`**
- Checks if URL is localhost or private IP
- Returns: `boolean`

### SessionManager

Manages analysis sessions.

#### Methods

**`createSession(url)`**
- Creates new analysis session
- Returns: Session object with metadata

**`getSession(sessionId)`**
- Retrieves session by ID
- Returns: Session object or null

**`updateSessionStatus(sessionId, status, updates)`**
- Updates session status and metadata

**`completeSession(sessionId, results)`**
- Marks session as complete with results

**`listActiveSessions()`**
- Lists all active session IDs
- Returns: Array of session IDs

**`cleanupOldSessions()`**
- Removes sessions older than 24 hours
- Returns: Number of cleaned sessions

### DOMExtractor

Extracts DOM elements and visual properties.

#### Methods

**`async extract(page)`**
- Extracts all DOM elements
- Returns: Array of element objects

**`extractColorPalette(elements)`**
- Extracts color palette from elements
- Returns: `{ colors: Array, count: number }`

**`extractTypography(elements)`**
- Extracts typography information
- Returns: `{ fonts: Array, sizes: Array }`

### Error Classes

**`ValidationError`** - URL or input validation failed  
**`NetworkError`** - Network operation failed  
**`TimeoutError`** - Operation exceeded timeout  
**`BrowserError`** - Browser operation failed  
**`ExtractionError`** - DOM extraction failed  
**`SessionError`** - Session operation failed  

## Performance

- First page load: **< 15 seconds**
- DOM extraction: **< 5 seconds**
- Total analysis: **< 20 seconds**
- Memory usage: **< 200MB per session**

## Configuration

### Browser Options

```javascript
const engine = new AnalysisEngine({
  // Pass Puppeteer launch options
  headless: true,
  args: ['--no-sandbox']
});
```

### Logging

Logs are written to `.aios/logs/analysis-engine.log`

Set minimum log level:
```javascript
const logger = require('./src/utils/logger');
logger.minLevel = 'DEBUG'; // DEBUG, INFO, WARN, ERROR
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## Development

```bash
# Start development mode with auto-reload
npm run dev

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix
```

## Architecture

```
src/
├── engine/
│   ├── AnalysisEngine.js       # Main orchestrator
│   ├── BrowserManager.js        # Browser lifecycle
│   ├── URLValidator.js          # URL validation
│   ├── DOMExtractor.js          # DOM parsing
│   └── SessionManager.js        # Session tracking
├── utils/
│   ├── logger.js                # Logging utility
│   └── errors.js                # Error classes
└── index.js                     # Main export
```

## Data Models

### Session Object
```javascript
{
  sessionId: "sess_uuid",
  url: "https://example.com",
  status: "complete|analyzing|error",
  startTime: "2026-04-13T...",
  endTime: "2026-04-13T...",
  duration: 5000,  // milliseconds
  elementCount: 1234,
  errorMessage: null,
  metadata: {
    userAgent: "...",
    viewport: { width: 1920, height: 1080 },
    screenshotPath: "/tmp/..."
  }
}
```

### Element Object
```javascript
{
  id: "elem_abc123",
  tagName: "div",
  classes: ["container", "main"],
  text: "Element text content",
  boundingBox: { x: 0, y: 0, width: 100, height: 50 },
  isVisible: true,
  styles: {
    color: "#FF5733",
    fontSize: "16px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#FFFFFF",
    // ... more styles
  }
}
```

## Requirements

- Node.js >= 18.0.0
- 500MB+ available disk space (for Chromium)
- Internet connection for website analysis

## License

MIT

## Support

For issues and questions:
1. Check the logs at `.aios/logs/analysis-engine.log`
2. Review error messages (descriptive error codes provided)
3. Check acceptance criteria compliance in story 1.1

## Roadmap

- [ ] Story 1.2: Color Palette Extraction
- [ ] Story 1.3: Typography System Detection
- [ ] Story 1.4: Spacing & Layout Pattern Analysis
- [ ] Story 1.5: Design System Report Generation
- [ ] Story 1.6: Export & Delivery Formats
