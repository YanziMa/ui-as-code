# Chrome Web Store Listing

## Extension Name
UI-as-Code — Fix SaaS UI with AI

## Short Description (132 chars max)
Select any element, describe the change in plain English. AI generates a code diff. Preview and submit as a PR.

## Full Description

Fix any SaaS interface without writing a single line of code.

**UI-as-Code** is a Chrome extension that lets you:
1. **Alt+Click** any element on a SaaS page to select it
2. **Describe** what you want changed in plain English
3. **Preview** the AI-generated diff in real-time
4. **Submit** as a Pull Request for community voting

Perfect for users who are frustrated by UI issues but don't have access to the codebase or coding skills.

Features:
- React component detection (automatic boundary identification)
- Multi-modal AI input (code + screenshot + description)
- Unified diff output with syntax highlighting
- Community voting system (for/against)
- PR merge workflow for maintainers
- Works with HubSpot, Notion, Linear, Jira, Salesforce, and any React-based SaaS

How it works:
1. Install the extension and navigate to any SaaS product
2. Hold Alt and click on the element you want to change
3. Type your request: "Make this button bigger" or "Change the color to green"
4. AI generates a unified diff showing exactly what would change
5. Preview the result, then submit as a PR for others to vote on

Privacy:
- Component code is analyzed locally before sending to AI
- Only explicitly submitted changes are stored
- No tracking or analytics on your browsing activity

Open source: github.com/YanziMa/ui-as-code

## Categories
- Productivity
- Developer Tools

## Language
English

## Permissions Used
- `activeTab` — Access the current tab's DOM for component inspection
- `scripting` — Inject inspector overlay into pages
- `storage` — Save user preferences (API URL)

## Screenshots (to be added)
- Hero: Extension panel open on a SaaS page
- Step 1: Alt+Click selecting an element
- Step 2: Description input with screenshot
- Step 3: Diff review with syntax highlighting
- Step 4: Success / PR submitted view

## Icon
- Uses icon.svg from package root (gradient UI logo)
