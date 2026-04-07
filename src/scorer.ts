/**
 * Config Scorer — оценивает качество AI-конфигов без LLM (детерминистически)
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface ScoreResult {
  total: number;      // 0-100
  breakdown: ScoreCategory[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  suggestions: string[];
}

interface ScoreCategory {
  name: string;
  score: number;
  maxScore: number;
  details: string;
}

export function scoreProject(rootPath: string): ScoreResult {
  const categories: ScoreCategory[] = [];
  const suggestions: string[] = [];

  // 1. CLAUDE.md (25 pts)
  const claudeScore = scoreFile(rootPath, 'CLAUDE.md', 25, [
    { check: (c) => c.length > 100, pts: 5, label: 'Content exists' },
    { check: (c) => c.includes('## ') || c.includes('# '), pts: 5, label: 'Has sections' },
    { check: (c) => c.includes('```'), pts: 5, label: 'Has code blocks' },
    { check: (c) => c.toLowerCase().includes('install') || c.includes('npm') || c.includes('pip'), pts: 5, label: 'Has install instructions' },
    { check: (c) => c.length > 500, pts: 5, label: 'Comprehensive (500+ chars)' },
  ]);
  categories.push(claudeScore.category);
  suggestions.push(...claudeScore.suggestions);

  // 2. Cursor Rules (20 pts)
  const cursorPath = existsSync(join(rootPath, '.cursor/rules')) ? '.cursor/rules'
    : existsSync(join(rootPath, '.cursorrules')) ? '.cursorrules' : null;
  if (cursorPath) {
    const cs = scoreFile(rootPath, cursorPath, 20, [
      { check: (c) => c.length > 50, pts: 10, label: 'Content exists' },
      { check: (c) => c.length > 200, pts: 10, label: 'Detailed rules' },
    ]);
    categories.push(cs.category);
    suggestions.push(...cs.suggestions);
  } else {
    categories.push({ name: 'Cursor Rules', score: 0, maxScore: 20, details: 'Missing' });
    suggestions.push('Создайте .cursor/rules — Cursor станет лучше понимать проект');
  }

  // 3. AGENTS.md (15 pts)
  const agentsScore = scoreFile(rootPath, 'AGENTS.md', 15, [
    { check: (c) => c.length > 50, pts: 5, label: 'Content exists' },
    { check: (c) => c.includes('Agent') || c.includes('agent'), pts: 5, label: 'Defines agents' },
    { check: (c) => c.includes('Command') || c.includes('command') || c.includes('```'), pts: 5, label: 'Has commands' },
  ]);
  categories.push(agentsScore.category);
  suggestions.push(...agentsScore.suggestions);

  // 4. Copilot Instructions (10 pts)
  const copilotPath = existsSync(join(rootPath, '.github/copilot-instructions.md'))
    ? '.github/copilot-instructions.md' : null;
  if (copilotPath) {
    const cs = scoreFile(rootPath, copilotPath, 10, [
      { check: (c) => c.length > 50, pts: 5, label: 'Content exists' },
      { check: (c) => c.length > 200, pts: 5, label: 'Detailed' },
    ]);
    categories.push(cs.category);
  } else {
    categories.push({ name: 'Copilot Instructions', score: 0, maxScore: 10, details: 'Missing' });
    suggestions.push('Добавьте .github/copilot-instructions.md для GitHub Copilot');
  }

  // 5. README.md (15 pts)
  const readmeScore = scoreFile(rootPath, 'README.md', 15, [
    { check: (c) => c.length > 100, pts: 5, label: 'Content exists' },
    { check: (c) => c.includes('```'), pts: 5, label: 'Has code examples' },
    { check: (c) => c.length > 1000, pts: 5, label: 'Comprehensive' },
  ]);
  categories.push(readmeScore.category);
  suggestions.push(...readmeScore.suggestions);

  // 6. Project Quality (15 pts)
  const qualityScore = scoreProjectQuality(rootPath);
  categories.push(qualityScore.category);
  suggestions.push(...qualityScore.suggestions);

  // Total
  const total = categories.reduce((sum, c) => sum + c.score, 0);
  const grade = total >= 90 ? 'A' : total >= 75 ? 'B' : total >= 60 ? 'C' : total >= 40 ? 'D' : 'F';

  return { total, breakdown: categories, grade, suggestions: suggestions.filter(Boolean) };
}

function scoreFile(rootPath: string, filename: string, maxScore: number, checks: Array<{ check: (c: string) => boolean; pts: number; label: string }>) {
  const filePath = join(rootPath, filename);
  const category: ScoreCategory = { name: filename, score: 0, maxScore, details: '' };
  const suggestions: string[] = [];

  if (!existsSync(filePath)) {
    category.details = 'Файл не найден';
    suggestions.push(`Создайте ${filename} — запустите \`ai-setup init\``);
    return { category, suggestions };
  }

  const content = readFileSync(filePath, 'utf-8');
  let score = 0;
  const details: string[] = [];

  for (const c of checks) {
    if (c.check(content)) {
      score += c.pts;
      details.push(`✓ ${c.label}`);
    } else {
      details.push(`✗ ${c.label}`);
    }
  }

  category.score = score;
  category.details = details.join(', ');
  return { category, suggestions };
}

function scoreProjectQuality(rootPath: string) {
  let score = 0;
  const suggestions: string[] = [];
  const details: string[] = [];

  if (existsSync(join(rootPath, '.gitignore'))) { score += 3; details.push('✓ .gitignore'); }
  else { details.push('✗ .gitignore'); suggestions.push('Добавьте .gitignore'); }

  if (existsSync(join(rootPath, 'LICENSE')) || existsSync(join(rootPath, 'LICENSE.md'))) { score += 3; details.push('✓ LICENSE'); }
  else { details.push('✗ LICENSE'); suggestions.push('Добавьте LICENSE'); }

  if (existsSync(join(rootPath, '.env.example'))) { score += 3; details.push('✓ .env.example'); }
  else { details.push('✗ .env.example'); }

  if (existsSync(join(rootPath, 'docker-compose.yml')) || existsSync(join(rootPath, 'Dockerfile'))) { score += 3; details.push('✓ Docker'); }

  if (existsSync(join(rootPath, '.github/workflows'))) { score += 3; details.push('✓ CI/CD'); }
  else { details.push('✗ CI/CD'); }

  return {
    category: { name: 'Project Quality', score: Math.min(score, 15), maxScore: 15, details: details.join(', ') },
    suggestions,
  };
}
