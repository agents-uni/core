import chalk from 'chalk';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const TEMPLATES: Record<string, { label: string; file: string }> = {
  government: { label: '三省六部 (Hierarchical governance)', file: 'government.yaml' },
  corporation: { label: '现代企业 (Corporate hierarchy)', file: 'corporation.yaml' },
  competitive: { label: '竞技场 (Competitive arena)', file: 'competitive.yaml' },
  flat: { label: '扁平团队 (Flat team)', file: 'flat.yaml' },
  military: { label: '军事指挥 (Military command)', file: 'military.yaml' },
};

export async function initCommand(name?: string, opts?: { template?: string }): Promise<void> {
  const projectName = name ?? 'my-universe';
  const templateKey = opts?.template && opts.template in TEMPLATES ? opts.template : 'competitive';

  console.log(chalk.bold(`\n  Creating universe: ${projectName}\n`));

  // Show available templates
  console.log(chalk.underline('  Available templates:'));
  for (const [key, val] of Object.entries(TEMPLATES)) {
    const marker = key === templateKey ? chalk.green(' ←') : '';
    console.log(`    ${chalk.cyan(key.padEnd(15))} ${val.label}${marker}`);
  }
  console.log('');

  console.log(chalk.gray(`  Using template: ${templateKey}`));

  // Create project directory
  const projectDir = join(process.cwd(), projectName);
  mkdirSync(projectDir, { recursive: true });

  // Copy template
  try {
    const templateDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');
    const templatePath = join(templateDir, TEMPLATES[templateKey].file);
    const templateContent = readFileSync(templatePath, 'utf-8');

    // Replace name in template
    const customized = templateContent.replace(/^name: ".*"$/m, `name: "${projectName}"`);
    writeFileSync(join(projectDir, 'universe.yaml'), customized);
  } catch {
    // Fallback: generate minimal template
    const minimal = generateMinimalTemplate(projectName);
    writeFileSync(join(projectDir, 'universe.yaml'), minimal);
  }

  // Create package.json
  const packageJson = {
    name: projectName,
    version: '0.1.0',
    description: `Agent universe: ${projectName}`,
    type: 'module',
    scripts: {
      validate: 'uni validate universe.yaml',
      visualize: 'uni visualize universe.yaml',
      deploy: 'uni deploy universe.yaml',
    },
    dependencies: {
      '@agents-uni/core': '^0.1.0',
    },
  };
  writeFileSync(join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Create README
  const readme = `# ${projectName}\n\nAn agent universe built with [agents-uni-core](https://github.com/agents-uni/core).\n\n## Commands\n\n\`\`\`bash\nnpm run validate   # Validate universe spec\nnpm run visualize  # Visualize relationships\nnpm run deploy     # Deploy to OpenClaw\n\`\`\`\n`;
  writeFileSync(join(projectDir, 'README.md'), readme);

  console.log(chalk.green(`\n✓ Created universe project at ./${projectName}`));
  console.log(chalk.gray('  Files:'));
  console.log(chalk.gray('    universe.yaml   — Universe specification'));
  console.log(chalk.gray('    package.json    — Project config'));
  console.log(chalk.gray('    README.md       — Documentation'));
  console.log(chalk.blue(`\n  Next steps:`));
  console.log(chalk.white(`    cd ${projectName}`));
  console.log(chalk.white(`    npm install`));
  console.log(chalk.white(`    uni validate universe.yaml`));
}

function generateMinimalTemplate(name: string): string {
  return `name: "${name}"
version: "0.1.0"
description: "A custom agent universe"
type: hybrid

agents:
  - id: leader
    name: Leader
    role:
      title: Team Lead
      duties:
        - Coordinate team activities
        - Review outputs
      permissions: [call, assign, review]
    rank: 80

  - id: worker-1
    name: Worker 1
    role:
      title: Worker
      duties:
        - Execute assigned tasks
      permissions: [submit_work]
    rank: 40

  - id: worker-2
    name: Worker 2
    role:
      title: Worker
      duties:
        - Execute assigned tasks
      permissions: [submit_work]
    rank: 40

relationships:
  - { from: leader, to: worker-1, type: superior }
  - { from: leader, to: worker-2, type: superior }
  - { from: worker-1, to: worker-2, type: peer }

protocols:
  - name: task-flow
    description: "Basic task execution flow"
    states:
      - { name: Open, label: Open }
      - { name: InProgress, label: In Progress }
      - { name: Done, label: Done, terminal: true }
    transitions:
      - { from: Open, to: InProgress, requiredRole: leader }
      - { from: InProgress, to: Done }
    roles:
      leader: [Open]

governance:
  decisionModel: autocratic
  permissionMatrix:
    - { actor: leader, target: worker-1, actions: [call, assign] }
    - { actor: leader, target: worker-2, actions: [call, assign] }
  reviewPolicy:
    mandatory: false
    reviewers: [leader]
    maxRounds: 1
  escalationRules: []
`;
}
