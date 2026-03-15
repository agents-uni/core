import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getTemplate } from './prompts.js';

export async function generate(name: string, template: string): Promise<void> {
  const projectDir = join(process.cwd(), name);

  console.log(chalk.gray(`  Creating directory: ${projectDir}`));
  mkdirSync(projectDir, { recursive: true });

  // Generate universe.yaml from template
  const universeYaml = getTemplate(template, name);
  writeFileSync(join(projectDir, 'universe.yaml'), universeYaml);
  console.log(chalk.gray('  Created universe.yaml'));

  // Generate package.json
  const pkg = {
    name,
    version: '0.1.0',
    description: `Agent universe: ${name}`,
    type: 'module',
    scripts: {
      validate: 'uni validate universe.yaml',
      visualize: 'uni visualize universe.yaml',
      deploy: 'uni deploy universe.yaml',
      'deploy:dry': 'uni deploy universe.yaml --dry-run',
    },
    dependencies: {
      'agents-uni-core': '^0.1.0',
    },
  };
  writeFileSync(join(projectDir, 'package.json'), JSON.stringify(pkg, null, 2));
  console.log(chalk.gray('  Created package.json'));

  // Generate README.md
  const readme = generateReadme(name, template);
  writeFileSync(join(projectDir, 'README.md'), readme);
  console.log(chalk.gray('  Created README.md'));

  // Generate .gitignore
  writeFileSync(join(projectDir, '.gitignore'), 'node_modules/\ndist/\ndata/\n.env\n');
  console.log(chalk.gray('  Created .gitignore'));

  // Create data directory
  mkdirSync(join(projectDir, 'data'), { recursive: true });
}

function generateReadme(name: string, template: string): string {
  return `# ${name}

An agent universe built with [agents-uni-core](https://github.com/agents-uni-core).

Template: **${template}**

## Quick Start

\`\`\`bash
npm install
npm run validate    # Validate universe spec
npm run visualize   # Visualize agent relationships
npm run deploy      # Deploy to OpenClaw
\`\`\`

## Universe Spec

Edit \`universe.yaml\` to customize your agent organization:

- **agents** — Define agent identities, roles, and capabilities
- **relationships** — Define social connections between agents
- **protocols** — Define state machine workflows
- **governance** — Define permission matrices and review policies
- **resources** — Define shared resources (optional)
- **evolution** — Define promotion/demotion rules (optional)

## Architecture

This universe uses the **${template}** organizational model.
See the [agents-uni-core documentation](https://github.com/agents-uni-core) for details.
`;
}
