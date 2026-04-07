/**
 * Config Generator — создаёт CLAUDE.md, .cursor/rules, AGENTS.md из анализа
 */

import { ProjectAnalysis } from './analyzer.js';

export function generateClaudeMd(analysis: ProjectAnalysis): string {
  const { name, primaryLanguage, framework, buildTool, packageManager, hasTests, hasDocker, structure, dependencies, scripts, description } = analysis;

  const stack = [primaryLanguage, framework, buildTool].filter(Boolean).join(' + ');
  const installCmd = packageManager === 'bun' ? 'bun install'
    : packageManager === 'pnpm' ? 'pnpm install'
    : packageManager === 'yarn' ? 'yarn'
    : packageManager === 'cargo' ? 'cargo build'
    : packageManager === 'pip' ? 'pip install -r requirements.txt'
    : packageManager === 'dotnet' ? 'dotnet restore'
    : 'npm install';

  const buildCmd = scripts.build ? `${packageManager || 'npm'} run build` : null;
  const devCmd = scripts.dev ? `${packageManager || 'npm'} run dev` : null;
  const testCmd = scripts.test ? `${packageManager || 'npm'} run test` : hasTests ? 'pytest' : null;

  let md = `# ${name}\n\n`;

  if (description) {
    md += `${description}\n\n`;
  }

  md += `## Tech Stack\n\n`;
  md += `- **Primary:** ${stack}\n`;
  if (packageManager) md += `- **Package Manager:** ${packageManager}\n`;
  if (hasDocker) md += `- **Docker:** Yes\n`;
  md += `\n`;

  md += `## Commands\n\n`;
  md += `\`\`\`bash\n`;
  md += `# Install\n${installCmd}\n\n`;
  if (devCmd) md += `# Dev\n${devCmd}\n\n`;
  if (buildCmd) md += `# Build\n${buildCmd}\n\n`;
  if (testCmd) md += `# Test\n${testCmd}\n\n`;
  md += `\`\`\`\n\n`;

  md += `## Project Structure\n\n`;
  md += `\`\`\`\n`;
  for (const dir of structure) {
    md += `${dir}/\n`;
  }
  md += `\`\`\`\n\n`;

  md += `## Code Style\n\n`;
  if (primaryLanguage === 'TypeScript' || primaryLanguage === 'JavaScript') {
    md += `- Use TypeScript strict mode when available\n`;
    md += `- Prefer functional components and hooks in React\n`;
    md += `- Use named exports over default exports\n`;
    md += `- Keep files under 300 lines\n`;
  } else if (primaryLanguage === 'Python') {
    md += `- Follow PEP 8\n`;
    md += `- Use type hints\n`;
    md += `- Docstrings for public functions\n`;
  } else if (primaryLanguage === 'Rust') {
    md += `- Follow Rust conventions (snake_case, ownership)\n`;
    md += `- Run clippy before committing\n`;
  } else if (primaryLanguage === 'C#') {
    md += `- Follow C# naming conventions (PascalCase for public)\n`;
    md += `- Use dependency injection\n`;
  }
  md += `\n`;

  md += `## Key Dependencies\n\n`;
  const topDeps = dependencies.filter(d => !d.startsWith('@types/')).slice(0, 15);
  for (const dep of topDeps) {
    md += `- ${dep}\n`;
  }

  return md;
}

export function generateCursorRules(analysis: ProjectAnalysis): string {
  const { name, primaryLanguage, framework, buildTool } = analysis;
  const stack = [primaryLanguage, framework, buildTool].filter(Boolean).join(', ');

  let rules = `# Cursor Rules for ${name}\n\n`;
  rules += `You are working on "${name}", a ${stack} project.\n\n`;
  rules += `## Guidelines\n\n`;
  rules += `- Write clean, readable code with minimal comments\n`;
  rules += `- Follow existing patterns in the codebase\n`;
  rules += `- Prefer editing existing files over creating new ones\n`;
  rules += `- Run tests after making changes\n`;
  rules += `- Keep imports organized\n`;

  if (primaryLanguage === 'TypeScript') {
    rules += `- Use strict TypeScript — no \`any\` types\n`;
    rules += `- Prefer interfaces over type aliases for objects\n`;
  }
  if (framework === 'React' || framework === 'Next.js') {
    rules += `- Use functional components with hooks\n`;
    rules += `- Prefer server components in Next.js App Router\n`;
  }

  return rules;
}

export function generateAgentsMd(analysis: ProjectAnalysis): string {
  const { name, primaryLanguage, framework, hasTests, hasDocker, scripts } = analysis;

  let md = `# AGENTS.md — ${name}\n\n`;
  md += `## Available Agents\n\n`;

  // Code agent
  md += `### Code Agent\n`;
  md += `Handles code changes, refactoring, and feature implementation.\n`;
  md += `- Language: ${primaryLanguage}\n`;
  if (framework) md += `- Framework: ${framework}\n`;
  md += `\n`;

  // Test agent
  if (hasTests || scripts.test) {
    md += `### Test Agent\n`;
    md += `Runs and maintains test suite.\n`;
    md += `- Command: \`${scripts.test || 'npm test'}\`\n\n`;
  }

  // Build agent
  if (scripts.build) {
    md += `### Build Agent\n`;
    md += `Handles build and deployment.\n`;
    md += `- Command: \`${scripts.build}\`\n\n`;
  }

  // Docker agent
  if (hasDocker) {
    md += `### Docker Agent\n`;
    md += `Manages containerized environment.\n`;
    md += `- Uses Dockerfile and docker-compose\n\n`;
  }

  return md;
}

export function generateCopilotInstructions(analysis: ProjectAnalysis): string {
  const { name, primaryLanguage, framework } = analysis;
  const stack = [primaryLanguage, framework].filter(Boolean).join(' + ');

  return `# GitHub Copilot Instructions — ${name}

This is a ${stack} project.

## Preferences

- Write concise, production-ready code
- Follow existing patterns in the codebase
- Use ${primaryLanguage} idioms and best practices
- Add types/annotations where applicable
- Keep functions small and focused
`;
}
