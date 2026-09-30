import { defineConfig } from 'vitepress'

const repo = 'https://github.com/TonyChan-hub/AppSetup'
const npmRn = 'https://www.npmjs.com/package/@bear1210/create-rn-template'
const npmFlutter = 'https://www.npmjs.com/package/@bear1210/create-flutter-template'

export default defineConfig({
  title: 'AppSetup',
  description: 'Business-free React Native & Flutter scaffolds, plus macOS mobile toolchain helpers.',
  base: '/AppSetup/',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/AppSetup/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#0b1f1c' }],
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'AppSetup',
      description:
        'Business-free React Native & Flutter scaffolds, plus macOS mobile toolchain helpers.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'React Native', link: '/guide/create-rn' },
          { text: 'Flutter', link: '/guide/create-flutter' },
          { text: 'Environment', link: '/guide/env-setup' },
          {
            text: 'npm',
            items: [
              { text: 'create-rn-template', link: npmRn },
              { text: 'create-flutter-template', link: npmFlutter },
            ],
          },
        ],
        sidebar: [
          {
            text: 'Introduction',
            items: [
              { text: 'What is AppSetup?', link: '/guide/getting-started' },
              { text: 'Packages', link: '/guide/packages' },
            ],
          },
          {
            text: 'CLI',
            items: [
              { text: 'Create React Native app', link: '/guide/create-rn' },
              { text: 'Create Flutter app', link: '/guide/create-flutter' },
              { text: 'Setup Android / iOS env', link: '/guide/env-setup' },
              { text: 'Check mobile environment', link: '/guide/check-env' },
            ],
          },
          {
            text: 'Templates',
            items: [
              { text: 'RN template features', link: '/guide/rn-template' },
              { text: 'Flutter template features', link: '/guide/flutter-template' },
            ],
          },
          {
            text: 'Toolkit',
            items: [{ text: 'Zippy inspector', link: '/guide/zippy' }],
          },
        ],
        editLink: {
          pattern: `${repo}/edit/main/docs/:path`,
          text: 'Edit this page on GitHub',
        },
        footer: {
          message: 'Released under the MIT License.',
          copyright: 'Copyright © AppSetup contributors',
        },
      },
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      title: 'AppSetup',
      description: '无业务逻辑的 React Native / Flutter 脚手架，以及 macOS 移动端环境工具。',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/getting-started' },
          { text: 'React Native', link: '/zh/guide/create-rn' },
          { text: 'Flutter', link: '/zh/guide/create-flutter' },
          { text: '环境配置', link: '/zh/guide/env-setup' },
          {
            text: 'npm',
            items: [
              { text: 'create-rn-template', link: npmRn },
              { text: 'create-flutter-template', link: npmFlutter },
            ],
          },
        ],
        sidebar: [
          {
            text: '介绍',
            items: [
              { text: '什么是 AppSetup？', link: '/zh/guide/getting-started' },
              { text: '包一览', link: '/zh/guide/packages' },
            ],
          },
          {
            text: '命令行',
            items: [
              { text: '创建 RN 项目', link: '/zh/guide/create-rn' },
              { text: '创建 Flutter 项目', link: '/zh/guide/create-flutter' },
              { text: '配置 Android / iOS 环境', link: '/zh/guide/env-setup' },
              { text: '检查移动端环境', link: '/zh/guide/check-env' },
            ],
          },
          {
            text: '模板能力',
            items: [
              { text: 'RN 模板功能', link: '/zh/guide/rn-template' },
              { text: 'Flutter 模板功能', link: '/zh/guide/flutter-template' },
            ],
          },
          {
            text: '工具',
            items: [{ text: 'Zippy 调试器', link: '/zh/guide/zippy' }],
          },
        ],
        editLink: {
          pattern: `${repo}/edit/main/docs/:path`,
          text: '在 GitHub 上编辑此页',
        },
        footer: {
          message: '基于 MIT 协议发布。',
          copyright: 'Copyright © AppSetup contributors',
        },
        outlineTitle: '本页目录',
        lastUpdatedText: '最后更新',
        docFooter: {
          prev: '上一页',
          next: '下一页',
        },
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色',
        darkModeSwitchTitle: '切换到深色',
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
      },
    },
  },

  themeConfig: {
    logo: { src: '/logo.svg', alt: 'AppSetup' },
    socialLinks: [{ icon: 'github', link: repo }],
    search: {
      provider: 'local',
      options: {
        locales: {
          zh: {
            translations: {
              button: { buttonText: '搜索', buttonAriaLabel: '搜索文档' },
              modal: {
                noResultsText: '无结果',
                resetButtonTitle: '清除',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },
  },
})
