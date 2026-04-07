#!/usr/bin/env node

/**
 * AI-Setup CLI — автогенерация AI-конфигов из вашего кода
 *
 * Команды:
 *   ai-setup init    — сканирует проект и генерирует CLAUDE.md, .cursor/rules, AGENTS.md
 *   ai-setup score   — оценивает качество AI-конфигов (0-100, грейд A-F)
 *   ai-setup refresh — обновляет конфиги на основе текущего состояния кода
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { analyzeProject } from './analyzer.js';
import { generateClaudeMd, generateCursorRules, generateAgentsMd, generateCopilotInstructions } from './generator.js';
import { scoreProject } from './scorer.js';

const VERSION = '1.0.0';

const program = new Command();

program
  .name('ai-setup')
  .description('CLI для автогенерации AI-конфигов (CLAUDE.md, .cursor/rules, AGENTS.md)')
  .version(VERSION);

// ====== INIT ======

program
  .command('init')
  .description('Сканирует проект и генерирует AI-конфиги')
  .option('-p, --path <path>', 'Путь к проекту', '.')
  .option('--force', 'Перезаписать существующие файлы', false)
  .action(async (opts) => {
    const rootPath = join(process.cwd(), opts.path);
    console.log(chalk.bold(`\n⚡ AI-Setup v${VERSION}\n`));

    const spinner = ora('Анализирую проект...').start();

    try {
      const analysis = await analyzeProject(rootPath);
      spinner.succeed(`Проект: ${chalk.cyan(analysis.name)} (${analysis.primaryLanguage}${analysis.framework ? ` + ${analysis.framework}` : ''})`);

      // Generate files
      const files: Array<{ path: string; content: string; label: string }> = [
        { path: 'CLAUDE.md', content: generateClaudeMd(analysis), label: 'CLAUDE.md' },
        { path: '.cursor/rules', content: generateCursorRules(analysis), label: '.cursor/rules' },
        { path: 'AGENTS.md', content: generateAgentsMd(analysis), label: 'AGENTS.md' },
        { path: '.github/copilot-instructions.md', content: generateCopilotInstructions(analysis), label: 'Copilot Instructions' },
      ];

      let created = 0;
      let skipped = 0;

      for (const file of files) {
        const fullPath = join(rootPath, file.path);
        const dirPath = join(fullPath, '..');

        if (!existsSync(dirPath)) {
          mkdirSync(dirPath, { recursive: true });
        }

        if (existsSync(fullPath) && !opts.force) {
          console.log(chalk.yellow(`  ⊘ ${file.label} — уже существует (--force для перезаписи)`));
          skipped++;
        } else {
          writeFileSync(fullPath, file.content, 'utf-8');
          console.log(chalk.green(`  ✓ ${file.label} — создан`));
          created++;
        }
      }

      console.log(`\n${chalk.bold('Результат:')} ${chalk.green(`${created} создано`)}, ${chalk.yellow(`${skipped} пропущено`)}\n`);

      // Auto-score
      const score = scoreProject(rootPath);
      printScore(score);

    } catch (err: any) {
      spinner.fail(`Ошибка: ${err.message}`);
      process.exit(1);
    }
  });

// ====== SCORE ======

program
  .command('score')
  .description('Оценивает качество AI-конфигов проекта')
  .option('-p, --path <path>', 'Путь к проекту', '.')
  .action(async (opts) => {
    const rootPath = join(process.cwd(), opts.path);
    console.log(chalk.bold(`\n⚡ AI-Setup Score\n`));

    const score = scoreProject(rootPath);
    printScore(score);
  });

// ====== REFRESH ======

program
  .command('refresh')
  .description('Обновляет AI-конфиги на основе текущего состояния кода')
  .option('-p, --path <path>', 'Путь к проекту', '.')
  .action(async (opts) => {
    const rootPath = join(process.cwd(), opts.path);
    console.log(chalk.bold(`\n⚡ AI-Setup Refresh\n`));

    const spinner = ora('Пересканирую проект...').start();
    const analysis = await analyzeProject(rootPath);
    spinner.succeed(`Проект обновлён: ${chalk.cyan(analysis.name)}`);

    const files = [
      { path: 'CLAUDE.md', content: generateClaudeMd(analysis) },
      { path: '.cursor/rules', content: generateCursorRules(analysis) },
      { path: 'AGENTS.md', content: generateAgentsMd(analysis) },
      { path: '.github/copilot-instructions.md', content: generateCopilotInstructions(analysis) },
    ];

    for (const file of files) {
      const fullPath = join(rootPath, file.path);
      const dirPath = join(fullPath, '..');
      if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
      writeFileSync(fullPath, file.content, 'utf-8');
      console.log(chalk.green(`  ✓ ${file.path} — обновлён`));
    }

    console.log(chalk.bold('\nВсе конфиги обновлены.\n'));
  });

// ====== HELPERS ======

function printScore(score: ReturnType<typeof scoreProject>) {
  const gradeColors: Record<string, (s: string) => string> = {
    A: chalk.green, B: chalk.cyan, C: chalk.yellow, D: chalk.hex('#ff8800'), F: chalk.red,
  };
  const colorFn = gradeColors[score.grade] || chalk.white;

  console.log(chalk.bold(`Грейд: ${colorFn(score.grade)}  Баллы: ${colorFn(String(score.total))}/100\n`));

  for (const cat of score.breakdown) {
    const pct = cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0;
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    const color = pct >= 80 ? chalk.green : pct >= 50 ? chalk.yellow : chalk.red;
    console.log(`  ${color(bar)} ${chalk.bold(cat.name.padEnd(25))} ${cat.score}/${cat.maxScore}`);
  }

  if (score.suggestions.length > 0) {
    console.log(chalk.bold('\nРекомендации:'));
    for (const s of score.suggestions.slice(0, 5)) {
      console.log(chalk.dim(`  → ${s}`));
    }
  }
  console.log('');
}

program.parse();
