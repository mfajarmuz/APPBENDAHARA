# Global Frontend Professional Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a modular Python CLI tool that acts as a professional frontend developer agent using Google Gen AI SDK, capable of multi-framework development, file manipulation, and automatic shell execution.

**Architecture:** A modular Python application with a clear separation between the CLI entry point (`main.py`), the AI orchestration (`agent.py`), the function-calling tools (`tools.py`), and system configuration (`config.py`). It uses the `google-genai` SDK for Gemini 2.0 Flash interactions.

**Tech Stack:** Python 3.10+, `google-genai` SDK, `python-dotenv`, `setuptools` (for global CLI installation).

---

### Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `D:/AI FILES/FmCompany/requirements.txt`
- Create: `D:/AI FILES/FmCompany/setup.py`
- Create: `D:/AI FILES/FmCompany/.env.example`

- [x] **Step 1: Create requirements.txt**
- [x] **Step 2: Create setup.py for global CLI installation**
- [x] **Step 3: Create .env.example**

### Task 2: Configuration & System Prompt

**Files:**
- Create: `D:/AI FILES/FmCompany/src/config.py`

- [x] **Step 1: Implement config.py**

### Task 3: Implementation of Function Tools

**Files:**
- Create: `D:/AI FILES/FmCompany/src/tools.py`

- [x] **Step 1: Implement tools.py with file and shell capabilities**

### Task 4: Agent Core Logic

**Files:**
- Create: `D:/AI FILES/FmCompany/src/agent.py`

- [x] **Step 1: Implement Agent class using google-genai SDK**

### Task 5: CLI Entry Point

**Files:**
- Create: `D:/AI FILES/FmCompany/src/main.py`
- Create: `D:/AI FILES/FmCompany/src/__init__.py`

- [x] **Step 1: Implement main interactive loop**
- [x] **Step 2: Create empty src/__init__.py**

### Task 6: Global Installation Instructions

**Files:**
- Create: `D:/AI FILES/FmCompany/README.md`

- [x] **Step 1: Create README.md with installation guide**
