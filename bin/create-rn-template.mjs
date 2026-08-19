#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

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

function parseArgs(argv) {
  const [projectName, ...flags] = argv;
  const skipInstall = flags.includes('--skip-install');
  const appIdFlag = flags.find((flag) => flag.startsWith('--package='));
  const packageName = appIdFlag ? appIdFlag.replace('--package=', '') : undefined;
  return { projectName, skipInstall, packageName };
}

const XCODE26_PODS_FIX = `
    # Must run after react_native_post_install.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        # Xcode 26 turns on explicit Swift modules by default, which breaks
        # CocoaPods Swift targets such as openiap / NitroIap.
        config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'

        # Xcode 26.4+ Apple Clang rejects fmt 11.0.2 consteval format strings.
        if target.name == 'fmt'
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end

        # Xcode 26 treats netinet6/in6.h as a private Darwin module header.
        if target.name == 'AFNetworking'
          config.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
          config.build_settings['DEFINES_MODULE'] = 'NO'
        end
      end
    end

    Dir.glob(File.join(installer.sandbox.root, 'AFNetworking/**/*.{h,m,mm}')).each do |path|
      next unless File.file?(path)
      contents = File.read(path)
      next unless contents.include?('#import <netinet6/in6.h>')
      File.chmod(0644, path)
      File.write(path, contents.gsub("#import <netinet6/in6.h>\\n", ''))
    end`;

const EXTRA_PODS = `
  # MMKVCore 2.4.1 fails on Xcode 26 (\`memset_s\` undeclared). 2.4.0 is the last good release.
  pod 'MMKV', '2.4.0'
  pod 'MMKVCore', '2.4.0'

  # Prefer targeted modular headers over global \`use_modular_headers!\`,
  # which breaks AFNetworking (react-native-ssl-pinning) on Xcode 26.
  pod 'GoogleUtilities', :modular_headers => true
  pod 'GoogleSignIn', :modular_headers => true
  pod 'GTMSessionFetcher', :modular_headers => true
  pod 'AppAuth', :modular_headers => true
  pod 'AppCheckCore', :modular_headers => true
  pod 'GTMAppAuth', :modular_headers => true
  pod 'RecaptchaInterop', :modular_headers => true
`;

async function ensureIosPodfileCompatibility(targetDir) {
  const podfilePath = path.join(targetDir, 'ios', 'Podfile');
  if (!(await fs.pathExists(podfilePath))) return;

  let content = await fs.readFile(podfilePath, 'utf8');
  let changed = false;

  if (content.includes('use_modular_headers!')) {
    content = content.replace(/\nuse_modular_headers!\n/, '\n');
    changed = true;
  }

  if (!content.includes("pod 'MMKVCore'")) {
    const replaced = content.replace(
      /use_react_native!\([\s\S]*?\)\n/,
      (match) => `${match}${EXTRA_PODS}`
    );
    if (replaced !== content) {
      content = replaced;
      changed = true;
    }
  }

  if (!content.includes('SWIFT_ENABLE_EXPLICIT_MODULES')) {
    const replaced = content.replace(
      /react_native_post_install\([\s\S]*?\)\n/,
      (match) => `${match}${XCODE26_PODS_FIX}\n`
    );
    if (replaced !== content) {
      content = replaced;
      changed = true;
    }
  }

  if (changed) {
    await fs.writeFile(podfilePath, content, 'utf8');
  }
}

async function main() {
  const { projectName, skipInstall, packageName } = parseArgs(process.argv.slice(2));
  if (!projectName) {
    console.error('Usage: create-rn-template <project-name> [--package=com.example.app] [--skip-install]');
    process.exit(1);
  }

  const currentDir = process.cwd();
  const targetDir = path.join(currentDir, projectName);
  if (await fs.pathExists(targetDir)) {
    console.error(`Target directory already exists: ${targetDir}`);
    process.exit(1);
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(here, '..');
  const templateDir = path.join(rootDir, 'template');

  const initArgs = ['@react-native-community/cli@latest', 'init', projectName, '--version', '0.81.6'];
  if (packageName) {
    initArgs.push('--package-name', packageName);
  }

  console.log('Creating React Native project...');
  run('npx', initArgs, currentDir);

  console.log('Applying business-free template...');
  const excludedTemplateEntries = new Set([
    'node_modules',
    '.git',
    '.cursor',
    'android/build',
    'ios/build',
    'build',
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
  await ensureIosPodfileCompatibility(targetDir);

  if (!skipInstall) {
    console.log('Installing dependencies...');
    run('npm', ['install'], targetDir);
  }

  console.log('\nDone.');
  console.log(`cd ${projectName}`);
  console.log('npm run start');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
