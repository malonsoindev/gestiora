# agents.md — Gestiora Backend

## Purpose

This document defines **mandatory rules and behavioral constraints** for any AI agent (LLM, Copilot, automation) interacting with the Gestiora backend codebase.

These rules are **authoritative**. If there is any conflict between agent behavior and this document, **this document prevails**.

---

## 1. Scope

This `agents.md` applies to:

* Backend development only (Node.js + TypeScript)
* Clean Architecture + DDD codebase
* All automated code generation, refactoring, or assistance by AI agents

Frontend is **out of scope** for this version.

---

## 1.1 Project Documentation

Authoritative project documentation is located in the `/docs` directory.

Additional agent rules derived from code quality fixes live in `RULES.md` and must be consulted.

The `/docs` folder contains:

* **Architecture Decision Records (ADR)** — architectural decisions and rationale
* **Design Docs (DD-xxxxx)** — detailed technical and design specifications
* **User Stories** — functional requirements and acceptance criteria
* **Diagrams** — class diagrams, use-case diagrams, and related visuals

**Rules:**

* AI agents MUST treat documentation in `/docs` as the source of truth
* Any generated code MUST be consistent with the documented architecture and design
* If ambiguity exists, agents SHOULD consult the relevant document in `/docs`

The meeting report document may be omitted by default, but **can be explicitly referenced if a prompt requires historical or contextual clarification**.

---

## 2. Core Principles (Non‑Negotiable)

### 2.1 Architecture

* The project follows **Clean Architecture with DDD**.
* Layers are strictly separated:

  * `domain`
  * `application`
  * `infrastructure`

**Rules:**

* ❌ Domain MUST NOT import anything from infrastructure
* ❌ Domain MUST NOT depend on Express, JWT, bcrypt, ORM, or external libraries
* ✅ Application depends only on domain abstractions (ports)
* ✅ Infrastructure implements ports and adapters

Violations are considered critical errors.

---

### 2.2 Test‑Driven Development (TDD)

**Tests define behavior.**

* ✅ Tests are written first
* ✅ Implementation adapts to tests
* ❌ Tests MUST NOT be modified to fit the implementation

Tests may only be changed if:

* A functional requirement changes
* A user story or acceptance criteria changes

If a test fails:

> **Fix the code. Do NOT change the test.**

---

### 2.3 SOLID Principles

All generated code MUST follow SOLID:

* **S — Single Responsibility**: one reason to change per class/file
* **O — Open/Closed**: extend via composition, not modification
* **L — Liskov Substitution**: port implementations must respect contracts
* **I — Interface Segregation**: avoid large generic interfaces
* **D — Dependency Inversion**: depend on abstractions, never concretes

---

## 3. Language & Style Rules

### 3.1 Language

* **TypeScript only**
* `strict: true`
* ❌ `any` is forbidden

---

### 3.2 Naming Conventions (JS / TS Standard)

* `camelCase`: variables, functions, properties
* `PascalCase`: classes, types, interfaces
* `SCREAMING_SNAKE_CASE`: global constants only

**Files:**

* `kebab-case`

  * `create-user.use-case.ts`
  * `jwt-auth.middleware.ts`

---

### 3.3 Semantic Naming

* Use Cases: `VerbNounUseCase`

  * `LoginUserUseCase`
  * `CreateSupplierUseCase`

* Ports (interfaces):

  * `UserRepository`
  * `SessionRepository`

* Adapters:

  * `JwtTokenService`
  * `UserRepositoryPrisma`

* DTOs:

  * `CreateUserRequest`
  * `CreateUserResponse`

❌ Do NOT prefix interfaces with `I`.

---

## 4. Layer Responsibilities

### 4.1 Domain

* Contains:

  * Entities
  * Value Objects
  * Domain Errors
  * Domain Events

**Rules:**

* No framework imports
* No persistence logic
* No HTTP concepts
* Business rules ONLY

---

### 4.2 Application

* Contains:

  * Use Cases
  * Ports (interfaces)

**Rules:**

* Orchestrates business logic
* Coordinates domain objects
* Depends only on domain and ports

---

### 4.3 Infrastructure

* Contains:

  * Express controllers
  * JWT / bcrypt adapters
  * Database repositories
  * External services

**Rules:**

* May depend on frameworks
* Must not contain business rules
* Must implement ports faithfully

---

## 5. Authentication & Security

* Passwords:

  * Hashed with **bcrypt**
  * Never stored or logged in plain text

* Tokens:

  * Access Token: JWT, short‑lived
  * Refresh Token: persisted, hashed, revocable

* JWT claims:

  * `sub` (userId)
  * `roles`
  * `iat`, `exp`

Security logic lives in **application/domain**, not controllers.

---

## 6. API & OpenAPI

* OpenAPI (Swagger) is the **contract of the API**
* Endpoints MUST respect the OpenAPI definition

**Rules:**

* Breaking the contract is forbidden
* Authenticated endpoints must declare `bearerAuth`
* Errors must follow the standard error schema

---

## 7. Testing Rules

### 7.1 What to Test

Priority order:

1. Domain (highest)
2. Application (use cases)
3. Infrastructure (selective)

---

### 7.2 Test Quality

* Tests must be:

  * deterministic
  * isolated
  * fast

* No real DB

* No real network

* Mock **ports only**, never domain

Coverage targets:

* Domain / Application: >90%

---

## 8. Error Handling

* Use typed errors in domain/application
* Infrastructure maps errors to HTTP responses

❌ Do NOT throw raw strings
❌ Do NOT leak internal errors to clients

---

## 9. Forbidden Actions (Hard Rules)

An agent MUST NOT:

* Modify existing tests to make code pass
* Introduce business logic in controllers
* Bypass ports and call infrastructure directly
* Use `any`
* Break OpenAPI contracts
* Ignore naming conventions

Violations invalidate the generated output.

---

## 10. Final Rule

When in doubt:

> **Prefer correctness, clarity, and architectural integrity over speed.**

The agent exists to protect the system, not to shortcut it.
