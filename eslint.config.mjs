import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const tsFiles = ['**/*.ts'];
const ignoredPaths = ['dist/**', 'node_modules/**', '**/*.d.ts'];

export default [
    {
        ignores: ignoredPaths
    },
    {
        files: tsFiles,
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 'latest',
            sourceType: 'module'
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            'max-len': ['warn', { code: 170, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
            indent: ['warn', 4, { SwitchCase: 1 }],
            curly: ['warn', 'all'],
            'no-lonely-if': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
        }
    }
];
