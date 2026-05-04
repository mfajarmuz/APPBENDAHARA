---
name: ultrareview
description: High-intensity, multi-pass code review focusing on security, performance, architecture, and edge cases. Use this skill when a critical feature is completed, before a major merge, or when the user requests a deep, exhaustive analysis of code changes.
---

# Ultrareview

Ultrareview is a rigorous, adversarial code review process designed to find deep-seated issues that standard reviews might miss. It operates through multiple specialized passes.

## The Ultrareview Protocol

When triggered, you must perform these 6 specialized passes in order. Do not skip any pass.

### 1. The Context & Integrity Pass
- **Action**: Read ALL related files, including tests, schemas, and configurations.
- **Goal**: Build a complete mental model of the change.
- **Check**: Does the implementation actually fulfill the original requirement? Is there any "ghost" logic that isn't used but added "just in case"?

### 2. The Adversarial Logic Pass
- **Action**: Trace data flow through the change, looking for breaking points.
- **Goal**: Find logic flaws, race conditions, and off-by-one errors.
- **Check**: What happens if input is `null`, `undefined`, empty, or extremely large? Can this code be triggered in an unexpected order?

### 3. The Security & Vulnerability Pass
- **Action**: Inspect for unsafe patterns (SQL injection, XSS, unsafe IPC, hardcoded secrets).
- **Goal**: Ensure zero security regressions.
- **Check**: Are all inputs validated at the boundary? Are sensitive data logs avoided?

### 4. The Performance & Resource Pass
- **Action**: Look for O(n^2) operations, redundant API calls, or memory leaks.
- **Goal**: Optimize for efficiency and scalability.
- **Check**: Does this change add unnecessary complexity to the render loop (in React) or the database transaction?

### 5. The Architectural Consistency Pass
- **Action**: Verify adherence to project-specific standards (e.g., BendaharaApp patterns).
- **Goal**: Maintain codebase health and readability.
- **Check**: Does it use the standard `useStore` slices correctly? Are error handlers standardized? Is the code idiomatic?

### 6. The Test & Coverage Pass
- **Action**: Review existing tests and identify missing edge cases.
- **Goal**: Guarantee behavioral correctness through evidence.
- **Check**: Are the tests "shallow" (testing mocks) or "deep" (testing behavior)? Are negative test cases included?

## Output Format

Always structure your report as follows:

# 🕵️ Ultrareview Report: [Feature/File Name]

## 📊 Summary & Score
**Overall Confidence Score**: [0-10]/10
**Verdict**: [PASS / PASS WITH CONCERNS / REJECT]

## 🛠️ Critical Findings (Blocking)
*List issues that MUST be fixed before merge.*

## ⚠️ Important Observations
*List performance, architectural, or scalability issues.*

## 💡 Minor Suggestions
*Style, wording, or future optimizations.*

## 🧪 Testing Assessment
*Is coverage sufficient? What's missing?*

## 🏁 Final Recommendation
*Clear instructions on next steps.*

---
*Note: Ultrareview is meant to be critical. Be direct, technical, and focus on the "why".*
