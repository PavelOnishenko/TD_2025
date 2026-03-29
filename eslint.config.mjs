import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { rule17CommaLayout } from './js/rule17CommaLayout.mjs';

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
            '@typescript-eslint': tseslint,
            'style-guide': {
                rules: {
                    'rule17-comma-layout': rule17CommaLayout
                }
            }
        },
        rules: {
            'max-len': ['warn', { code: 170, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
            indent: ['warn', 4, { SwitchCase: 1 }],
            curly: ['warn', 'all'],
            'no-lonely-if': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'style-guide/rule17-comma-layout': 'warn'
        }
    }
];
