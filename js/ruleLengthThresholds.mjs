const FILE_WARNING_THRESHOLD = 200;
const FILE_ERROR_THRESHOLD = 400;
const FUNCTION_WARNING_THRESHOLD = 20;
const FUNCTION_ERROR_THRESHOLD = 40;

function getFunctionLabel(node) {
    if (node.id?.name) {
        return `'${node.id.name}'`;
    }

    const parent = node.parent;
    if (parent?.type === 'MethodDefinition' && parent.key?.type === 'Identifier') {
        return `'${parent.key.name}'`;
    }

    if (parent?.type === 'Property' && parent.key?.type === 'Identifier') {
        return `'${parent.key.name}'`;
    }

    if (parent?.type === 'VariableDeclarator' && parent.id?.type === 'Identifier') {
        return `'${parent.id.name}'`;
    }

    return 'anonymous function';
}

function getFunctionLength(node) {
    const start = node.loc?.start?.line;
    const end = node.loc?.end?.line;

    if (!start || !end) {
        return 0;
    }

    return end - start + 1;
}

export const ruleFileLengthWarning = {
    meta: {
        type: 'suggestion',
        docs: {
            description: `Warn when a TS file reaches ${FILE_WARNING_THRESHOLD}-${FILE_ERROR_THRESHOLD - 1} lines.`
        },
        schema: []
    },
    create(context) {
        return {
            'Program:exit'(node) {
                const lineCount = context.sourceCode.lines.length;
                if (lineCount >= FILE_WARNING_THRESHOLD && lineCount < FILE_ERROR_THRESHOLD) {
                    context.report({
                        node,
                        message: `File length warning: ${lineCount} lines (warning range is ${FILE_WARNING_THRESHOLD}-${FILE_ERROR_THRESHOLD - 1}; ${FILE_ERROR_THRESHOLD}+ is an error).`
                    });
                }
            }
        };
    }
};

export const ruleFileLengthError = {
    meta: {
        type: 'problem',
        docs: {
            description: `Error when a TS file reaches ${FILE_ERROR_THRESHOLD}+ lines.`
        },
        schema: []
    },
    create(context) {
        return {
            'Program:exit'(node) {
                const lineCount = context.sourceCode.lines.length;
                if (lineCount >= FILE_ERROR_THRESHOLD) {
                    context.report({
                        node,
                        message: `File length error: ${lineCount} lines (must stay under ${FILE_ERROR_THRESHOLD}).`
                    });
                }
            }
        };
    }
};

function createFunctionRule({ min, maxExclusive, messagePrefix }) {
    return {
        meta: {
            type: maxExclusive ? 'suggestion' : 'problem',
            docs: {
                description: `${messagePrefix} function/method length rule.`
            },
            schema: []
        },
        create(context) {
            function inspect(node) {
                const length = getFunctionLength(node);
                if (length < min) {
                    return;
                }

                if (Number.isFinite(maxExclusive) && length >= maxExclusive) {
                    return;
                }

                context.report({
                    node,
                    message: `${messagePrefix}: ${getFunctionLabel(node)} is ${length} lines (${min}${Number.isFinite(maxExclusive) ? `-${maxExclusive - 1}` : '+'} range).`
                });
            }

            return {
                FunctionDeclaration: inspect,
                FunctionExpression: inspect,
                ArrowFunctionExpression: inspect
            };
        }
    };
}

export const ruleFunctionLengthWarning = createFunctionRule({
    min: FUNCTION_WARNING_THRESHOLD,
    maxExclusive: FUNCTION_ERROR_THRESHOLD,
    messagePrefix: 'Function length warning'
});

export const ruleFunctionLengthError = createFunctionRule({
    min: FUNCTION_ERROR_THRESHOLD,
    maxExclusive: null,
    messagePrefix: 'Function length error'
});
