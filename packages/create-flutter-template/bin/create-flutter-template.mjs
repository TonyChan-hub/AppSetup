#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

const PACKAGE_PLACEHOLDER = 'flutter_template_app';
const DISPLAY_PLACEHOLDER = 'Flutter Template';

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function which(command) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(probe, [command], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

function parseArgs(argv) {
  const [projectName, ...flags] = argv;
  const skipInstall = flags.includes('--skip-install');
  const orgFlag = flags.find((flag) => flag.startsWith('--org='));
  const org = orgFlag ? orgFlag.replace('--org=', '') : 'com.example';
  return { projectName, skipInstall, org };
}

/** Directory / CLI name → valid Dart package name (snake_case). */
function toDartPackageName(raw) {
  const cleaned = raw
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  if (!cleaned) {
    throw new Error('Project name must contain letters or numbers');
  }
  const withPrefix = /^[a-z]/.test(cleaned) ? cleaned : `app_${cleaned}`;
  return withPrefix.replace(/_+/g, '_');
}

function toDisplayName(raw) {
  return raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function rewritePlaceholders(targetDir, packageName, displayName) {
  const walk = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.dart_tool', 'build', '.git'].includes(entry.name)) {
          continue;
        }
        await walk(full);
        continue;
      }
      if (!/\.(dart|yaml|yml|json|md|arb|plist|xml|gradle|kts|swift|kt|txt|js|mjs)$/i.test(entry.name)) {
        continue;
      }
      let content = await fs.readFile(full, 'utf8');
      if (!content.includes(PACKAGE_PLACEHOLDER) && !content.includes(DISPLAY_PLACEHOLDER)) {
        continue;
      }
      content = content
        .split(PACKAGE_PLACEHOLDER)
        .join(packageName)
        .split(DISPLAY_PLACEHOLDER)
        .join(displayName);
      await fs.writeFile(full, content, 'utf8');
    }
  };
  await walk(targetDir);
}

async function ensureIosUsageDescriptions(targetDir, displayName) {
  const infoPlist = path.join(targetDir, 'ios', 'Runner', 'Info.plist');
  if (!(await fs.pathExists(infoPlist))) return;

  let content = await fs.readFile(infoPlist, 'utf8');
  const entries = [
    [
      'NSCameraUsageDescription',
      `${displayName} needs camera access to capture photos.`,
    ],
    [
      'NSPhotoLibraryUsageDescription',
      `${displayName} can optionally pick a photo from your library.`,
    ],
    [
      'NSPhotoLibraryAddUsageDescription',
      `${displayName} can save images you choose to your photo library.`,
    ],
  ];

  for (const [key, value] of entries) {
    if (content.includes(`<key>${key}</key>`)) continue;
    content = content.replace(
      '</dict>\n</plist>',
      `\t<key>${key}</key>\n\t<string>${value}</string>\n</dict>\n</plist>`
    );
  }
  await fs.writeFile(infoPlist, content, 'utf8');
}

async function ensureAndroidPermissions(targetDir) {
  const manifestPath = path.join(
    targetDir,
    'android',
    'app',
    'src',
    'main',
    'AndroidManifest.xml'
  );
  if (!(await fs.pathExists(manifestPath))) return;

  let content = await fs.readFile(manifestPath, 'utf8');
  const inserts = [];
  for (const permission of [
    'android.permission.INTERNET',
    'android.permission.CAMERA',
    'android.permission.VIBRATE',
  ]) {
    if (!content.includes(permission)) {
      inserts.push(`    <uses-permission android:name="${permission}"/>`);
    }
  }
  if (!content.includes('android.hardware.camera')) {
    inserts.push(
      '    <uses-feature android:name="android.hardware.camera" android:required="false"/>'
    );
  }
  if (inserts.length === 0) return;

  content = content.replace(
    /(<manifest\b[^>]*>)/,
    `$1\n${inserts.join('\n')}`
  );
  await fs.writeFile(manifestPath, content, 'utf8');
}

/**
 * Install zippy_flutter into <app>/packages/zippy_flutter.
 * Prefer monorepo source when developing; otherwise unpack vendor/*.zip shipped with the CLI.
 */
async function installZippyFlutter(rootDir, targetDir) {
  const dest = path.join(targetDir, 'packages', 'zippy_flutter');
  await fs.remove(dest);
  await fs.ensureDir(path.join(targetDir, 'packages'));

  const monorepoSource = path.resolve(rootDir, '../zippy_flutter');
  const monorepoPubspec = path.join(monorepoSource, 'pubspec.yaml');
  if (await fs.pathExists(monorepoPubspec)) {
    console.log('Installing zippy_flutter (monorepo copy)...');
    await fs.copy(monorepoSource, dest, {
      filter: (src) => {
        const rel = path.relative(monorepoSource, src).split(path.sep).join('/');
        if (!rel) return true;
        return ![
          '.dart_tool',
          'build',
          'example',
          'dist',
          'scripts',
          '.idea',
          'pubspec.lock',
        ].some((entry) => rel === entry || rel.startsWith(`${entry}/`));
      },
    });
    return;
  }

  const vendorDir = path.join(rootDir, 'vendor');
  if (!(await fs.pathExists(vendorDir))) {
    throw new Error(
      'zippy_flutter vendor zip missing. Run: bash packages/create-flutter-template/scripts/sync-vendor-zippy.sh'
    );
  }
  const zips = (await fs.readdir(vendorDir)).filter(
    (name) => name.startsWith('zippy_flutter-') && name.endsWith('.zip')
  );
  if (zips.length === 0) {
    throw new Error(
      'No zippy_flutter-*.zip in vendor/. Run sync-vendor-zippy.sh before publish.'
    );
  }
  zips.sort();
  const zipPath = path.join(vendorDir, zips[zips.length - 1]);
  console.log(`Installing zippy_flutter from ${path.basename(zipPath)}...`);

  if (!which('unzip')) {
    throw new Error('unzip is required to extract zippy_flutter vendor zip');
  }
  const stage = await fs.mkdtemp(path.join(targetDir, '.zippy-'));
  try {
    run('unzip', ['-qo', zipPath, '-d', stage], process.cwd());
    const extracted = path.join(stage, 'zippy_flutter');
    if (!(await fs.pathExists(extracted))) {
      throw new Error(`Unexpected zip layout in ${zipPath}`);
    }
    await fs.move(extracted, dest);
  } finally {
    await fs.remove(stage);
  }
}

async function main() {
  const { projectName, skipInstall, org } = parseArgs(process.argv.slice(2));
  if (!projectName) {
    console.error(
      'Usage: create-flutter-template <project-name> [--org=com.example] [--skip-install]'
    );
    process.exit(1);
  }

  if (!which('flutter')) {
    console.error('Flutter SDK not found on PATH. Install Flutter and retry.');
    process.exit(1);
  }

  const currentDir = process.cwd();
  const targetDir = path.join(currentDir, projectName);
  if (await fs.pathExists(targetDir)) {
    console.error(`Target directory already exists: ${targetDir}`);
    process.exit(1);
  }

  const packageName = toDartPackageName(projectName);
  const displayName = toDisplayName(projectName);

  const here = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(here, '..');
  const templateDir = path.join(rootDir, 'template');

  console.log('Creating Flutter project...');
  run(
    'flutter',
    [
      'create',
      '--org',
      org,
      '--project-name',
      packageName,
      '--platforms',
      'android,ios',
      projectName,
    ],
    currentDir
  );

  console.log('Applying business-free template...');
  const excludedTemplateEntries = new Set([
    'node_modules',
    '.git',
    '.dart_tool',
    'build',
    'android/build',
    'ios/build',
    'ios/Pods',
    'ios/.symlinks',
  ]);
  await fs.copy(templateDir, targetDir, {
    overwrite: true,
    errorOnExist: false,
    filter: (src) => {
      const rel = path.relative(templateDir, src);
      if (!rel) return true;
      const normalized = rel.split(path.sep).join('/');
      return ![...excludedTemplateEntries].some(
        (entry) => normalized === entry || normalized.startsWith(`${entry}/`)
      );
    },
  });

  await rewritePlaceholders(targetDir, packageName, displayName);
  await ensureIosUsageDescriptions(targetDir, displayName);
  await ensureAndroidPermissions(targetDir);
  await installZippyFlutter(rootDir, targetDir);

  // flutter create already wrote a counter demo; remove leftover test that imports it.
  const widgetTest = path.join(targetDir, 'test', 'widget_test.dart');
  if (await fs.pathExists(widgetTest)) {
    await fs.writeFile(
      widgetTest,
      `import 'package:flutter_test/flutter_test.dart';\n\nvoid main() {\n  test('placeholder', () {\n    expect(1 + 1, 2);\n  });\n}\n`,
      'utf8'
    );
  }

  if (!skipInstall) {
    console.log('Installing Dart dependencies...');
    run('flutter', ['pub', 'get'], targetDir);
    console.log('Generating localizations...');
    run('flutter', ['gen-l10n'], targetDir);

    const packageJson = path.join(targetDir, 'package.json');
    if (await fs.pathExists(packageJson)) {
      console.log('Installing Node tooling (husky / commitlint)...');
      run('npm', ['install'], targetDir);
    }
  }

  console.log('\nDone.');
  console.log(`cd ${projectName}`);
  console.log('flutter run');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
