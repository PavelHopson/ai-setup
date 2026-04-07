/**
 * Codebase Analyzer — сканирует проект и определяет стек, структуру, паттерны
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { glob } from 'glob';

export interface ProjectAnalysis {
  name: string;
  rootPath: string;
  languages: Record<string, number>;
  primaryLanguage: string;
  framework: string | null;
  buildTool: string | null;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'cargo' | 'pip' | 'dotnet' | null;
  hasTests: boolean;
  hasDocker: boolean;
  hasCI: boolean;
  entryPoints: string[];
  keyFiles: string[];
  dependencies: string[];
  scripts: Record<string, string>;
  structure: string[];
  description: string;
}

const LANG_EXTENSIONS: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript',
  '.py': 'Python', '.rs': 'Rust', '.go': 'Go', '.java': 'Java',
  '.cs': 'C#', '.cpp': 'C++', '.c': 'C', '.rb': 'Ruby',
  '.php': 'PHP', '.swift': 'Swift', '.kt': 'Kotlin', '.dart': 'Dart',
  '.vue': 'Vue', '.svelte': 'Svelte', '.html': 'HTML', '.css': 'CSS',
};

const FRAMEWORK_DETECTORS: Record<string, (deps: string[], files: string[]) => boolean> = {
  // PHP frameworks (check before JS to handle monorepos with both)
  'Laravel': (_, files) => files.some(f => f === 'artisan' || f.endsWith('/artisan')) || files.some(f => f.includes('laravel')),
  'Symfony': (_, files) => files.some(f => f.includes('symfony')),
  'WordPress': (_, files) => files.some(f => f.includes('wp-config.php')),
  // JS frameworks
  'Next.js': (deps) => deps.includes('next'),
  'React': (deps) => deps.includes('react') && !deps.includes('next'),
  'Vue 3': (deps) => deps.includes('vue'),
  'Svelte': (deps) => deps.includes('svelte'),
  'Angular': (deps) => deps.includes('@angular/core'),
  'Express': (deps) => deps.includes('express'),
  'Fastify': (deps) => deps.includes('fastify'),
  'NestJS': (deps) => deps.includes('@nestjs/core'),
  'FastAPI': (_, files) => files.some(f => f.includes('fastapi')),
  'Django': (_, files) => files.some(f => f.includes('manage.py') || f.includes('django')),
  'Flask': (_, files) => files.some(f => f.includes('flask')),
  'ASP.NET': (_, files) => files.some(f => f.endsWith('.csproj')),
  'Tauri': (deps) => deps.includes('@tauri-apps/api'),
  'Electron': (deps) => deps.includes('electron'),
};

export async function analyzeProject(rootPath: string): Promise<ProjectAnalysis> {
  const allFiles = await glob('**/*', {
    cwd: rootPath,
    ignore: [
      'node_modules/**', '**/node_modules/**', '.git/**', 'dist/**', 'build/**',
      '.next/**', 'target/**', '__pycache__/**', '*.lock', 'vendor/**', '**/vendor/**',
      'storage/**', 'bootstrap/cache/**', '.vite/**', 'coverage/**',
    ],
    nodir: true,
    maxDepth: 5,
  });

  // Languages
  const languages: Record<string, number> = {};
  for (const f of allFiles) {
    const ext = extname(f);
    const lang = LANG_EXTENSIONS[ext];
    if (lang) languages[lang] = (languages[lang] || 0) + 1;
  }
  const primaryLanguage = Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  // Package info
  let dependencies: string[] = [];
  let scripts: Record<string, string> = {};
  let name = basename(rootPath);

  const pkgPath = join(rootPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      name = pkg.name || name;
      dependencies = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
      ];
      scripts = pkg.scripts || {};
    } catch {}
  }

  // composer.json (PHP/Laravel)
  const composerPaths = ['composer.json', 'backend/composer.json'];
  for (const cp of composerPaths) {
    const composerPath = join(rootPath, cp);
    if (existsSync(composerPath)) {
      try {
        const composer = JSON.parse(readFileSync(composerPath, 'utf-8'));
        const phpDeps = [
          ...Object.keys(composer.require || {}),
          ...Object.keys(composer['require-dev'] || {}),
        ];
        dependencies.push(...phpDeps);
        if (!scripts['test'] && phpDeps.includes('phpunit/phpunit')) {
          scripts['test:php'] = 'php artisan test';
        }
      } catch {}
      break;
    }
  }

  // Framework detection (check all, collect multiple for monorepos)
  let framework: string | null = null;
  const detectedFrameworks: string[] = [];
  for (const [name, detect] of Object.entries(FRAMEWORK_DETECTORS)) {
    if (detect(dependencies, allFiles)) { detectedFrameworks.push(name); }
  }
  // For monorepos: "Laravel + React", otherwise first match
  framework = detectedFrameworks.length > 1
    ? detectedFrameworks.slice(0, 2).join(' + ')
    : detectedFrameworks[0] || null;

  // Build tool
  const buildTool = dependencies.includes('vite') ? 'Vite'
    : dependencies.includes('webpack') ? 'Webpack'
    : dependencies.includes('esbuild') ? 'esbuild'
    : existsSync(join(rootPath, 'Cargo.toml')) ? 'Cargo'
    : existsSync(join(rootPath, 'Makefile')) ? 'Make'
    : null;

  // Package manager
  const packageManager = existsSync(join(rootPath, 'bun.lockb')) ? 'bun'
    : existsSync(join(rootPath, 'pnpm-lock.yaml')) ? 'pnpm'
    : existsSync(join(rootPath, 'yarn.lock')) ? 'yarn'
    : existsSync(join(rootPath, 'package-lock.json')) ? 'npm'
    : (existsSync(join(rootPath, 'composer.json')) || existsSync(join(rootPath, 'backend/composer.json'))) ? 'npm' as const
    : existsSync(join(rootPath, 'Cargo.toml')) ? 'cargo'
    : existsSync(join(rootPath, 'requirements.txt')) ? 'pip'
    : existsSync(join(rootPath, '*.csproj')) ? 'dotnet'
    : null;

  // Key files
  const keyFiles = allFiles.filter(f =>
    f.includes('App.tsx') || f.includes('main.ts') || f.includes('index.ts') ||
    f.includes('app.py') || f.includes('main.rs') || f.includes('Program.cs') ||
    f.includes('Dockerfile') || f.includes('docker-compose') ||
    f === 'artisan' || f.endsWith('/artisan') ||
    f.includes('routes/api.php') || f.includes('routes/web.php') ||
    f.includes('composer.json')
  ).slice(0, 15);

  // Structure (top-level dirs)
  const structure = [...new Set(allFiles.map(f => f.split('/')[0]))].filter(d => !d.includes('.')).sort().slice(0, 20);

  // Description
  let description = '';
  const readmePath = join(rootPath, 'README.md');
  if (existsSync(readmePath)) {
    const readme = readFileSync(readmePath, 'utf-8');
    const lines = readme.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('!')).slice(0, 3);
    description = lines.join(' ').substring(0, 200);
  }

  return {
    name,
    rootPath,
    languages,
    primaryLanguage,
    framework,
    buildTool,
    packageManager,
    hasTests: allFiles.some(f => f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__')),
    hasDocker: allFiles.some(f => f.includes('Dockerfile') || f.includes('docker-compose')),
    hasCI: allFiles.some(f => f.includes('.github/workflows') || f.includes('.gitlab-ci')),
    entryPoints: keyFiles.slice(0, 5),
    keyFiles,
    dependencies: dependencies.slice(0, 30),
    scripts,
    structure,
    description,
  };
}
