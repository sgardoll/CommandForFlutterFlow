---
phase: 12-remove-help-button-and-notifications-tog
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - index.html
autonomous: true
requirements: []
must_haves:
  truths:
    - Help button no longer appears in sidebar
    - Notifications toggle no longer appears in Advanced Settings
  artifacts:
    - path: index.html
      contains: No help-button element
    - path: index.html
      contains: No notify-toggle element
---

<objective>
Remove the Help button and Notifications toggle from the UI. Both are non-functional or unnecessary per user request.
</objective>

<context>
@index.html (lines 1484-1496 for Notifications toggle, lines 1585-1593 for Help button)

The Help button opens a modal with help content. The Notifications toggle attempts to request browser notification permissions but the user reports it doesn't work. Both should be removed.
</context>

<tasks>

<task type="auto">
  <name>Remove Help button from sidebar footer</name>
  <files>index.html</files>
  <action>
    Remove the Help button tooltip container (lines 1585-1593 in index.html):
    - The tooltip div with class "tooltip" containing the help-button button
    - Keep the surrounding Sign in / usage tracking elements intact
  </action>
  <verify>Grep for "help-button" returns no matches in index.html</verify>
  <done>Help button no longer appears in the sidebar footer</done>
</task>

<task type="auto">
  <name>Remove Notifications toggle from Advanced Settings</name>
  <files>index.html</files>
  <action>
    Remove the Notifications subsection from the Advanced Settings collapsible (lines 1484-1496 in index.html):
    - The sb-advanced-sub div containing the notify-toggle-row
    - Includes the label, checkbox, slider, text, permission badge, and hint paragraph
  </action>
  <verify>Grep for "notify-toggle" returns no matches in index.html</verify>
  <done>Notifications toggle no longer appears in Advanced Settings</done>
</task>

</tasks>

<verification>
- [ ] Help button removed from sidebar footer area
- [ ] Notifications toggle removed from Advanced Settings collapsible
- [ ] No remaining references to help-button or notify-toggle in index.html
</verification>

<success_criteria>
Both the Help button and Notifications toggle are completely removed from the UI. The page should still function normally with all other features intact.
</success_criteria>

<output>
After completion, create `.planning/quick/12-remove-help-button-and-notifications-tog/12-SUMMARY.md`
</output>
