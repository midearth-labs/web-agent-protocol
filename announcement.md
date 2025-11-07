# WAP: A Safe, Cooperative Path to Agentic Browsing

*Why website owners and users both win when AI agents respect the web's security model*

---

The race for agentic browsers is heating up. OpenAI launched [ChatGPT Atlas](https://openai.com/index/introducing-chatgpt-atlas/), Perplexity shipped [Comet](https://www.perplexity.ai/comet), and Amazon is [fighting back](https://www.aboutamazon.com/news/company-news/amazon-perplexity-comet-statement) against what they see as degraded customer experiences. But there's a fundamental problem with the current approach: these solutions are **adversarial to website owners** and create **serious security vulnerabilities** for users.

What if there was a better way? One that respects website owners, protects users, and actually works reliably?

Enter **WAP (Web Agent Protocol)** - a specification that enables safe, secure, privacy-enabled agentic browsing by having websites expose their functionality as discoverable, invokable tools for AI agents.

## The Problem With Current Agentic Browsers

Current agentic browsers like Comet and Atlas use **DOM manipulation and accessibility tree parsing** to automate web interactions. They build models from the Document Object Model and perform actions by simulating clicks, form fills, and navigation - essentially treating every website as an adversary to be automated around.

This approach creates three critical problems:

### 1. Security Nightmares

Atlas's "agent mode" allows ChatGPT to operate browsers semi-autonomously with access to browsing context, seeing every open tab, interacting with forms, clicking buttons, and navigating between pages. Combined with "browser memories" that log websites and activities, the AI builds detailed understanding of users' digital lives.

[Brave Security's research](https://brave.com/blog/comet-prompt-injection/) revealed that Comet is vulnerable to **prompt injection attacks across domains**:

> "When an AI assistant follows malicious instructions from untrusted webpage content, traditional protections such as same-origin policy (SOP) or cross-origin resource sharing (CORS) are all effectively useless. The AI operates with the user's full privileges across authenticated sessions, providing potential access to banking accounts, corporate systems, private emails, cloud storage, and other services."

Imagine visiting a seemingly innocent shopping site that contains invisible instructions directing the AI agent to scrape personal data from all your open tabs - your medical portal, draft emails, banking information. The AI can't distinguish between legitimate instructions from the user and malicious instructions embedded in web content.

### 2. Unreliability

Comet relies on DOM and accessibility trees, which means it cannot interact with images, icons, or SVG elements that lack proper labels or ARIA attributes. It also cannot access cross-origin iframes.

The web is messy. Many sites don't follow accessibility best practices. Complex SPAs use custom components that don't map cleanly to semantic HTML. The result? Automation that works beautifully on well-structured sites but fails unpredictably on the real web.

[A technical analysis of Comet](https://www.harness.io/blog/reverse-engineering-comet) demonstrated this limitation - it failed to click on unlabeled cart icons and struggled with elements that weren't properly marked up in the accessibility tree.

### 3. Adversarial to Website Owners

Amazon's recent statement about Perplexity's Comet highlights a crucial concern:

> "We prioritize making browsing easy for customers and our [customer-obsessed innovation] is what has led to transformational products over the last three decades..."

Website owners invest millions in building curated experiences, conversion funnels, upselling strategies, and monetization. DOM-scraping agents bypass all of this, potentially:
- Eliminating ad revenue
- Breaking analytics and A/B testing
- Bypassing rate limiting and abuse protection
- Degrading carefully designed user experiences
- Removing sponsored content and recommendations

**This is why adoption will be slow.** Major platforms like Amazon, Netflix, and banking institutions will actively resist these approaches through technical countermeasures.

## WAP: The Cooperative Alternative

WAP takes a fundamentally different approach: **websites voluntarily expose their functionality as tools that AI agents can call.**

```mermaid
graph TB
    A[User: Natural Language Input] --> B[WAP Engine]
    B --> C{Parse Intent}
    C --> D[Load /.well-known/wap.json]
    D --> E[Discover Available Tools]
    E --> F[Select Relevant Tools]
    F --> G[Execute API Calls]
    G --> H[Website APIs]
    H --> I[Return Structured Data]
    I --> J[Render Response]
    J --> K[User: See Results]
    
    style A fill:#e1f5ff
    style K fill:#e1f5ff
    style D fill:#fff4e1
    style H fill:#f0e1ff
```

*Figure 1: WAP Architecture - [Technical Details](https://github.com/midearth-labs/web-agent-protocol/blob/main/first-draft/technical-design.md)*

## WAP: The Cooperative Alternative

WAP takes a fundamentally different approach: **websites voluntarily expose their functionality as tools that AI agents can call.**

### No New Software Required

Here's a critical difference: **you don't need to download yet another browser** to get natural language and agentic features.

WAP meets users where they already are:
- **Your current browser** - Chrome, Safari, Firefox, Edge, whatever you use today
- **Your current device** - Desktop, mobile, tablet, even smart TVs
- **Your current platform** - Mac, Windows, Linux, iOS, Android

Just like a chatbot widget doesn't replace your website or redirect you elsewhere, WAP doesn't either. It's an **enhanced experience layer** that activates when you want it.

**For users:** Visit `amazon.com?agentmode=1` and your familiar Amazon experience gains natural language superpowers. All your cookies, history, saved preferences, and logged-in session remain intact.

**For enterprises:** Adopt incrementally and on your terms. Start with one feature, expand at your pace. Your customers use your site exactly how they always have - with an optional natural language interface available when they want it.

Atlas and Comet ask users to abandon their existing browser and adopt new software. WAP asks nothing of users and gives enterprises full control of the rollout.

### How It Works

**Step 1: Discovery**
Websites publish a manifest at `/.well-known/wap.json` that declares their capabilities:

```json
{
  "name": "TodoApp",
  "version": "1.0",
  "functions": [
    {
      "name": "listTodos",
      "type": "server",
      "endpoint": "/api/todos",
      "method": "GET",
      "parameters": {
        "filter": {
          "status": ["initial", "complete", "due"],
          "dueBefore": "date",
          "titleContains": "string"
        }
      }
    },
    {
      "name": "updateTodo",
      "type": "server",
      "endpoint": "/api/todos/{id}",
      "method": "PUT"
    }
  ]
}
```

**Step 2: Agent Activation**
Users trigger agent mode (e.g., `amazon.com?agentmode=1`) while remaining in their familiar browser context with full session continuity.

**Step 3: Natural Language Orchestration**
The user gives a natural language command. The AI agent:
1. Parses intent
2. Discovers available tools from the manifest
3. Plans a sequence of API calls
4. Executes them with user confirmation when needed
5. Presents results

### Real-World Example: Task Rescheduling

Let's see WAP in action with a real multi-step workflow.

**User Command:**
> "Push all incomplete todos due this week to next Monday, except anything with 'urgent' in it"

```mermaid
sequenceDiagram
    participant User
    participant WAP_Engine
    participant Todo_API
    
    User->>WAP_Engine: "Push all incomplete todos due this week<br/>to next Monday, except urgent ones"
    WAP_Engine->>WAP_Engine: Parse intent & constraints
    WAP_Engine->>Todo_API: GET /api/todos?filter=status:initial<br/>&dueBetween=2025-11-07,2025-11-13<br/>&titleNotContains=urgent
    Todo_API-->>WAP_Engine: [Todo objects array]
    WAP_Engine->>WAP_Engine: Plan bulk update
    loop For each todo
        WAP_Engine->>Todo_API: PUT /api/todos/{id}<br/>{dueDate: "2025-11-11"}
        Todo_API-->>WAP_Engine: Success
    end
    WAP_Engine->>User: "Updated 7 todos to Monday, Nov 11.<br/>2 urgent items left unchanged."
    
    Note over User,Todo_API: All operations use standard REST APIs<br/>within the same browser security context
```

*Figure 2: Multi-step Orchestrator Mode workflow - [See Full Todo Example](https://github.com/midearth-labs/web-agent-protocol/blob/main/first-draft/todo-management-example.md)*

**What happened:**
1. Agent parsed the natural language into structured filters
2. Called `listTodos()` with specific criteria
3. Received an array of matching todo objects
4. Executed `updateTodo()` for each item
5. Reported results back to the user

**Traditional approach:** The agent would need to:
- Navigate to the todo page
- Parse the visual layout
- Guess which elements are todos
- Simulate clicks on each checkbox/button
- Hope nothing breaks

**WAP approach:** 
- Direct API calls
- Structured data
- Predictable results
- Fast execution

## WAP's Two Operating Modes

WAP supports two distinct modes of operation:

### 1. **CoPilot Mode** 
Natural language → UI operations within current page/component context

Best for: Page-specific interactions like filtering search results, filling forms, or navigating single-page components.

*Example:* "Filter these products by size M and sort by price low to high"

[See Amazon Search CoPilot Example](https://github.com/midearth-labs/web-agent-protocol/blob/main/first-draft/amazon-copilot-example.md)

### 2. **Orchestrator Mode**
Natural language → Multi-step API workflows across the entire site

Best for: Complex tasks requiring multiple API calls, state management, and cross-functional operations.

*Example:* "Find all orders from last quarter, export to CSV, and email to my accountant"

## Why WAP Addresses Every Major Concern

```mermaid
graph LR
    A[WAP Protocol] --> B[Security]
    A --> C[Reliability]
    A --> D[Performance]
    A --> E[Privacy]
    A --> F[Monetization]
    
    B --> B1[Inherits browser<br/>security model]
    B --> B2[Same-origin policy]
    B --> B3[CORS respected]
    B --> B4[No prompt injection<br/>across domains]
    
    C --> C1[Structured APIs]
    C --> C2[Explicit contracts]
    C --> C3[No DOM parsing]
    
    D --> D1[Direct API calls]
    D --> D2[No vision processing]
    D --> D3[Parallel execution]
    
    E --> E1[User's session/cookies]
    E --> E2[No new auth flow]
    E --> E3[Standard web privacy]
    
    F --> F1[Sites control experience]
    F --> F2[Can include ads/upsells]
    F --> F3[Analytics preserved]
    
    style A fill:#4CAF50,color:#fff
    style B fill:#2196F3,color:#fff
    style C fill:#2196F3,color:#fff
    style D fill:#2196F3,color:#fff
    style E fill:#2196F3,color:#fff
    style F fill:#2196F3,color:#fff
```

*Figure 3: WAP's Comprehensive Solution - [See Detailed Comparison](https://github.com/midearth-labs/web-agent-protocol/blob/main/first-draft/solutions-comparison.md)*

### Security: Inheriting the Browser's Security Model

**The Problem with Atlas/Comet:**
Malicious code on one website could influence AI behavior across multiple tabs - a script on a shopping site could trick the AI agent into switching to an open banking tab and submitting a transfer form.

**WAP's Solution:**
- All API calls are same-origin requests
- Uses the user's existing cookies and session
- CORS already handled
- CSRF tokens managed by the site
- No cross-domain prompt injection possible

The site executes its own code in its own context. If a site wanted to be malicious, it could do so in normal browsing mode already. WAP adds no new attack surface.

### Reliability: Explicit Contracts

**The Problem with DOM Automation:**
Agents must guess intent from visual layouts, handle accessibility tree inconsistencies, and cope with constantly changing DOM structures.

**WAP's Solution:**
Websites explicitly declare their capabilities. The agent knows exactly what's possible and how to invoke each function. No guessing, no vision processing, no brittle selectors.

### Performance: Direct API Calls

**The Problem with Automation:**
Navigate pages → Parse DOM → Extract data → Simulate interactions → Wait for responses → Repeat

**WAP's Solution:**
Call API → Get structured JSON → Done

Typically 5-10x faster than DOM automation approaches.

### Privacy: Standard Web Model

**The Problem with Agentic Browsers:**
Browser memories create comprehensive profiles of behavior - websites visited, searches, purchases, and content read.

**WAP's Solution:**
- Uses the user's existing session
- No new authentication flow
- No additional tracking beyond what the site already does
- User remains in control of their browser privacy settings

### Monetization: Sites Stay in Control

**The Problem with DOM Scraping:**
Sites lose control over user experience, can't serve ads, lose analytics data, and have no way to present sponsored content or upsells.

**WAP's Solution:**
The website defines the response schema. They can include:
- Sponsored products in search results
- Upsell recommendations in cart responses
- Ads in appropriate contexts
- Custom rendering for brand control

Amazon can curate the same carefully designed experience they've spent decades perfecting - just delivered via natural language instead of clicks.

## Adoption: Progressive and Pragmatic

[See Detailed Adoption Strategy](https://github.com/midearth-labs/web-agent-protocol/blob/main/first-draft/adoption-strategy.md)

### No Permission Required

WAP doesn't need browser vendor approval or W3C standardization to launch. Like Google Analytics, Stripe, or OAuth, it can succeed through grassroots adoption:

1. **NPM Package**: `npm install wap-engine`
2. **Site Integration**: Add `<script src="wap-engine.js"></script>`
3. **Create Manifest**: Publish `/.well-known/wap.json`
4. **Enable Agent Mode**: Users trigger with `?agentmode=1`

Done. No browser changes, no vendor buy-in needed upfront.

### Progressive Enhancement

Sites can adopt incrementally:

**Phase 1: Single Feature**
Amazon starts with just order search
- Users can query orders in natural language
- Limited manifest, easy to test
- Learn from real usage

**Phase 2: Core Journeys**
Add shopping cart, checkout, product search
- Most common user flows now available
- Still manageable scope

**Phase 3: Full Integration**
Complete API coverage across the site
- Account management, wish lists, subscriptions
- Full agentic experience

### Platform Leverage

If Shopify implements WAP, **every Shopify store automatically gets agentic capabilities.** Same for WooCommerce, BigCommerce, Squarespace, etc.

This is the key to rapid adoption - platforms unlock thousands of sites at once.

### Economic Incentives

**For Website Owners:**
- Better UX without losing control
- Maintain monetization strategies
- Get analytics on agent usage
- Competitive advantage ("AI-Ready" badge)
- Future-proof as agents become mainstream

**For Users:**
- Natural language interface
- Faster task completion
- Reduced cognitive load
- Privacy maintained
- Better than adversarial automation

**For Platform Providers:**
- Differentiation in crowded market
- New analytics opportunities
- Happy customers on both sides
- Revenue opportunities (hosting agent models, etc.)

## Limitations (By Design)

WAP is intentionally scoped to address real problems without over-engineering:

### Single-Domain Scope

**Limitation:** WAP agents cannot orchestrate workflows across multiple websites in a single command.

**Why It's Intentional:** Cross-domain orchestration introduces massive complexity:
- Who pays for inference costs?
- How do you handle authentication across sites?
- What happens when one site's API changes?
- Security implications of cross-domain data flow

By scoping to single domains, WAP inherits all the web's existing security properties. Users can complete tasks on Site A, then move to Site B - the same way they browse today.

### Requires Site Adoption

**Limitation:** Sites must explicitly implement WAP manifests.

**Why It's Intentional:** This is a feature, not a bug. Opt-in cooperation ensures:
- Sites maintain control over their experience
- Security model remains sound
- Monetization is preserved
- APIs are maintained and supported

Yes, this means slower initial adoption than adversarial approaches. But it means **sustainable, long-term success** instead of an arms race.

### HTML Transform Limitations

**Limitation:** Sites using HTML transforms (for legacy pages without APIs) won't work as reliably as sites with proper APIs.

**Why It's Intentional:** This creates **upgrade pressure**. Sites that provide clean JSON APIs will perform better in agent mode, naturally incentivizing modernization. The transform capability exists as a bridge, not a destination.

## What's Next

WAP is currently in the specification phase. We're building:

1. **Reference Implementation** - Open-source WAP engine (NPM package)
2. **Sample Manifests** - Real-world examples from e-commerce, SaaS, productivity apps
3. **Onboarding Tools** - AI agent that crawls sites and generates draft manifests
4. **Developer Documentation** - Integration guides, best practices, security guidelines

**Early Access:**
We're looking for early partners - especially platforms (Shopify, WooCommerce, etc.) and innovative SaaS companies. If you're interested in being part of the first wave, reach out.

---

## The Bottom Line

The web doesn't need to be adversarial. We don't need to choose between:
- Users having natural language interfaces, OR
- Websites maintaining control and monetization

**We can have both.**

WAP proves that the path to agentic browsing doesn't require breaking the web's security model, fighting website owners, or building unreliable automation.

It just requires **cooperation.**

The question isn't whether agentic browsing will happen - it's whether we'll do it in a way that benefits everyone or creates a new arms race of ever-more-sophisticated automation versus ever-more-aggressive blocking.

I believe cooperation beats conflict. WAP is the cooperative path.

---

**Related Resources:**

- [Complete Technical Specification](https://github.com/midearth-labs/web-agent-protocol/blob/main/first-draft/technical-design.md)
- [Todo Management Example (Full Implementation)](https://github.com/midearth-labs/web-agent-protocol/blob/main/first-draft/todo-management-example.md)
- [Amazon CoPilot Mode Example](https://github.com/midearth-labs/web-agent-protocol/blob/main/first-draft/amazon-copilot-example.md)
- [WAP vs. Current Solutions (Detailed Comparison)](https://github.com/midearth-labs/web-agent-protocol/blob/main/first-draft/solutions-comparison.md)
- [Adoption Strategy & Economics](https://github.com/midearth-labs/web-agent-protocol/blob/main/first-draft/adoption-strategy.md)
- [Security Model Deep Dive](https://github.com/midearth-labs/web-agent-protocol/blob/main/first-draft/security-model.md)
- [Interactive Demo](https://github.com/midearth-labs/web-agent-protocol/blob/main/first-draft/live-demo.md)

**References:**

1. [ChatGPT Atlas: Browser Security Risks](https://www.cyberhaven.com/blog/browser-agent-security-risk-chatgpt-atlas)
2. [Building ChatGPT Atlas (OpenAI)](https://openai.com/index/building-chatgpt-atlas/)
3. [Comet Prompt Injection Vulnerability (Brave)](https://brave.com/blog/comet-prompt-injection/)
4. [Amazon's Response to Perplexity Comet](https://www.aboutamazon.com/news/company-news/amazon-perplexity-comet-statement)

---

*What do you think? Would your company adopt WAP if it was available today? Let's discuss in the comments.*

---

**About the Author:**
I'm the Lead Developer and Co-Founder at MidEarth Labs, building open-source frameworks for rapid AI-based software prototyping. After 12+ years in software engineering (including time at AWS working on systems serving millions), I'm focused on making AI practical and safe for real-world applications.

Connect with me on [LinkedIn](https://linkedin.com) | Follow the project on [GitHub](https://github.com/midearth-labs/web-agent-protocol)
