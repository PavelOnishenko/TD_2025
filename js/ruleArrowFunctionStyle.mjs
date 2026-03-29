function isSingleReturnOrAssignmentBlock(functionNode) {
    if (!functionNode.body || functionNode.body.type !== 'BlockStatement') {
        return false;
    }

    if (functionNode.body.body.length !== 1) {
        return false;
    }

    const statement = functionNode.body.body[0];
    if (statement.type === 'ReturnStatement') {
        return true;
    }

    return statement.type === 'ExpressionStatement' && statement.expression.type === 'AssignmentExpression';
}

function isConstructorLike(functionNode) {
    const parent = functionNode.parent;
    if (!parent) {
        return false;
    }

    if (parent.type === 'MethodDefinition') {
        return parent.kind === 'constructor' || parent.kind === 'get' || parent.kind === 'set';
    }

    if (parent.type === 'Property' && parent.method) {
        return parent.kind === 'get' || parent.kind === 'set';
    }

    return false;
}

function getFunctionLabel(functionNode) {
    if (functionNode.id?.name) {
        return `'${functionNode.id.name}'`;
    }

    const parent = functionNode.parent;
    if (parent?.type === 'MethodDefinition' && parent.key?.type === 'Identifier') {
        return `'${parent.key.name}'`;
    }

    if (parent?.type === 'Property' && parent.key?.type === 'Identifier') {
        return `'${parent.key.name}'`;
    }

    return 'this function';
}

export const ruleArrowFunctionStyle = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Warn when simple regular functions can be rewritten as arrows, and when block-body arrows can be concise expressions.'
        },
        schema: []
    },
    create(context) {
        return {
            FunctionDeclaration(node) {
                if (isSingleReturnOrAssignmentBlock(node)) {
                    context.report({
                        node,
                        message: `Arrow style: ${getFunctionLabel(node)} has a single return/assignment statement; prefer an arrow function when possible.`
                    });
                }
            },
            FunctionExpression(node) {
                if (isConstructorLike(node)) {
                    return;
                }

                if (isSingleReturnOrAssignmentBlock(node)) {
                    context.report({
                        node,
                        message: `Arrow style: ${getFunctionLabel(node)} has a single return/assignment statement; prefer an arrow function when possible.`
                    });
                }
            },
            ArrowFunctionExpression(node) {
                if (!node.body || node.body.type !== 'BlockStatement' || node.body.body.length !== 1) {
                    return;
                }

                const statement = node.body.body[0];
                if (statement.type !== 'ReturnStatement') {
                    return;
                }

                context.report({
                    node,
                    message: 'Arrow style: this arrow has braces with only a return statement; use concise body syntax (`=> expression`) instead.'
                });
            }
        };
    }
};
