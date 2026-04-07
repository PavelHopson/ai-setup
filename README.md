<div align="center">

# ⚡ AI-Setup

### Автоматическая настройка AI-конфигов для вашего проекта

**Одна команда — и Claude Code, Cursor, Codex, Copilot понимают ваш проект.**

[![npm](https://img.shields.io/badge/npm-@eclipse--forge/ai--setup-cb3837?style=for-the-badge&logo=npm)](https://npmjs.com/package/@eclipse-forge/ai-setup)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## Что это?

AI-Setup сканирует ваш проект и автоматически генерирует конфиги для AI-инструментов:

| Файл | Для чего |
|------|----------|
| `CLAUDE.md` | Claude Code — стек, команды, структура, стиль кода |
| `.cursor/rules` | Cursor — правила и контекст проекта |
| `AGENTS.md` | Codex / Multi-agent — определения агентов |
| `.github/copilot-instructions.md` | GitHub Copilot — инструкции |

## Быстрый старт

```bash
# В корне вашего проекта:
npx @eclipse-forge/ai-setup init

# Оценить качество AI-конфигов:
npx @eclipse-forge/ai-setup score

# Обновить конфиги после изменений в коде:
npx @eclipse-forge/ai-setup refresh
```

## Как работает

```
ai-setup init
  │
  ├─ 1. Сканирует файлы проекта
  ├─ 2. Определяет стек (язык, фреймворк, пакетный менеджер)
  ├─ 3. Находит точки входа, зависимости, структуру
  ├─ 4. Генерирует 4 AI-конфига
  └─ 5. Скорит результат (0-100, грейд A-F)
```

## Скоринг

AI-Setup оценивает качество AI-конфигов **детерминистически** (без LLM):

```
⚡ AI-Setup Score

Грейд: A  Баллы: 94/100

  ██████████ CLAUDE.md                 25/25
  ██████████ .cursor/rules             20/20
  ██████████ AGENTS.md                 15/15
  ██████████ Copilot Instructions      10/10
  ██████████ README.md                 15/15
  ██████░░░░ Project Quality            9/15
```

**Категории:**
- **CLAUDE.md** (25 баллов) — наличие, секции, код, инструкции, объём
- **Cursor Rules** (20 баллов) — правила и детализация
- **AGENTS.md** (15 баллов) — определения агентов и команды
- **Copilot Instructions** (10 баллов) — наличие и объём
- **README.md** (15 баллов) — наличие, код, объём
- **Project Quality** (15 баллов) — .gitignore, LICENSE, .env.example, Docker, CI/CD

## Поддерживаемые стеки

| Язык | Фреймворки |
|------|-----------|
| TypeScript/JavaScript | React, Next.js, Vue, Svelte, Angular, Express, NestJS, Fastify |
| Python | FastAPI, Django, Flask |
| Rust | Tauri, Cargo проекты |
| C# | ASP.NET Core |
| Go, Java, Ruby, PHP | Базовая поддержка |

## Команды

| Команда | Описание |
|---------|----------|
| `ai-setup init` | Генерирует AI-конфиги + показывает скор |
| `ai-setup init --force` | Перезаписывает существующие файлы |
| `ai-setup score` | Показывает текущий скор конфигов |
| `ai-setup refresh` | Обновляет все конфиги |
| `ai-setup --help` | Справка |

## Установка (глобально)

```bash
npm install -g @eclipse-forge/ai-setup
```

## Лицензия

[MIT](LICENSE)

---

<div align="center">
<sub>Сделано в Eclipse Forge</sub>
</div>
