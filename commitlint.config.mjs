/** Conventional Commits, with scopes limited to the project's modules and areas. */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'core',
        'inventory',
        'procurement',
        'reporting',
        'ui',
        'db',
        'auth',
        'test',
        'ci',
        'deps',
        'docs',
      ],
    ],
  },
};

export default config;
