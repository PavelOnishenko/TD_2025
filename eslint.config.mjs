import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { ruleArrowFunctionStyle } from './js/ruleArrowFunctionStyle.mjs';
import { rule17CommaLayout } from './js/rule17CommaLayout.mjs';
import {
    ruleFileLengthWarning,
    ruleFileLengthError,
    ruleFunctionLengthWarning,
    ruleFunctionLengthError
} from './js/ruleLengthThresholds.mjs';

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
                    'arrow-function-style': ruleArrowFunctionStyle,
                    'rule17-comma-layout': rule17CommaLayout,
                    'file-length-warning': ruleFileLengthWarning,
                    'file-length-error': ruleFileLengthError,
                    'function-length-warning': ruleFunctionLengthWarning,
                    'function-length-error': ruleFunctionLengthError
                }
            }
        },
        rules: {
            'max-len': ['warn', { code: 170, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
            indent: ['warn', 4, { SwitchCase: 1 }],
            curly: ['warn', 'all'],
            'no-lonely-if': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'style-guide/arrow-function-style': 'warn',
            'style-guide/rule17-comma-layout': 'warn',
            'style-guide/file-length-warning': 'warn',
            'style-guide/file-length-error': 'error',
            'style-guide/function-length-warning': 'warn',
            'style-guide/function-length-error': 'error'
        }
    }
];
