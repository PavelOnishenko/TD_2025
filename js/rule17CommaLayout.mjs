const MAX_LINE_LENGTH = 170;

function getCommaListDetails(node) {
    switch (node.type) {
        case 'ObjectExpression':
        case 'ObjectPattern':
            return { opener: '{', closer: '}', items: node.properties, kind: 'initializer', boundaryNoun: 'brace/bracket' };
        case 'ArrayExpression':
        case 'ArrayPattern':
            return {
                opener: '[',
                closer: ']',
                items: node.elements.filter((element) => element !== null),
                kind: 'initializer',
                boundaryNoun: 'brace/bracket'
            };
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
        case 'TSDeclareFunction':
        case 'TSCallSignatureDeclaration':
        case 'TSConstructSignatureDeclaration':
        case 'TSMethodSignature':
        case 'TSFunctionType':
            return { opener: '(', closer: ')', items: node.params ?? [], kind: 'parameter list', boundaryNoun: 'parenthesis' };
        default:
            return null;
    }
}

function getListBoundaryTokens(sourceCode, node, details) {
    if (details.kind !== 'parameter list') {
        return {
            openingToken: sourceCode.getFirstToken(node, (token) => token.value === details.opener),
            closingToken: sourceCode.getLastToken(node, (token) => token.value === details.closer)
        };
    }

    if (details.items.length === 0) {
        return { openingToken: null, closingToken: null };
    }

    const firstItemToken = sourceCode.getFirstToken(details.items[0]);
    const lastItemToken = sourceCode.getLastToken(details.items[details.items.length - 1]);

    if (!firstItemToken || !lastItemToken) {
        return { openingToken: null, closingToken: null };
    }

    return {
        openingToken: sourceCode.getTokenBefore(firstItemToken, (token) => token.value === details.opener),
        closingToken: sourceCode.getTokenAfter(lastItemToken, (token) => token.value === details.closer)
    };
}

function getMemberStartLines(items) {
    const lines = new Set();

    for (const item of items) {
        const startLine = item.loc?.start.line;
        if (!startLine) {
            continue;
        }
        lines.add(startLine);
    }

    return Array.from(lines).sort((a, b) => a - b);
}


function toCompactSingleLine(text) {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\s*([,])\s*/g, '$1 ')
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        .replace(/\[\s+/g, '[')
        .replace(/\s+\]/g, ']')
        .replace(/\{\s+/g, '{ ')
        .replace(/\s+\}/g, ' }')
        .trim();
}

function checkRule17Layout(node, context) {
    const details = getCommaListDetails(node);
    if (!details || details.items.length < 2) {
        return;
    }

    const sourceCode = context.sourceCode;
    const { openingToken, closingToken } = getListBoundaryTokens(sourceCode, node, details);

    if (!openingToken || !closingToken) {
        return;
    }

    const startLine = openingToken.loc.start.line;
    const endLine = closingToken.loc.end.line;

    if (startLine === endLine) {
        return;
    }

    const lines = sourceCode.lines;
    const listText = sourceCode.text.slice(openingToken.range[0], closingToken.range[1]);
    const compactCandidate = toCompactSingleLine(listText);

    const lineStartText = lines[startLine - 1] || '';
    const endLineText = lines[endLine - 1] || '';
    const prefixLength = lineStartText.slice(0, openingToken.loc.start.column).length;
    const suffixLength = endLineText.slice(closingToken.loc.end.column).length;
    const projectedSingleLineLength = details.kind === 'parameter list'
        ? compactCandidate.length
        : prefixLength + compactCandidate.length + suffixLength;

    if (projectedSingleLineLength <= MAX_LINE_LENGTH) {
        context.report({
            node,
            message: `Rule 17: this comma-separated ${details.kind} can fit on one line (${projectedSingleLineLength} chars with indentation/context); use the most compact one-line form.`
        });
        return;
    }

    const itemLines = getMemberStartLines(details.items);
    if (itemLines.length === 0) {
        return;
    }

    const minItemLine = itemLines[0];
    const maxItemLine = itemLines[itemLines.length - 1];

    if (minItemLine <= startLine || maxItemLine >= endLine) {
        context.report({
            node,
            message: `Rule 17: multiline comma-separated members must be placed between surrounding opening and closing ${details.boundaryNoun} lines.`
        });
        return;
    }


    for (const lineNumber of itemLines) {
        const lineText = lines[lineNumber - 1] || '';
        if (lineText.length > MAX_LINE_LENGTH) {
            context.report({
                node,
                message: `Rule 17: each internal member line must stay within ${MAX_LINE_LENGTH} characters.`
            });
            break;
        }
    }
}

export const rule17CommaLayout = {
    meta: {
        type: 'layout',
        docs: {
            description: 'Enforce Style Guide Rule 17 for comma-separated collection/object initialization formatting.'
        },
        schema: []
    },
    create(context) {
        return {
            ObjectExpression(node) {
                checkRule17Layout(node, context);
            },
            ObjectPattern(node) {
                checkRule17Layout(node, context);
            },
            ArrayExpression(node) {
                checkRule17Layout(node, context);
            },
            ArrayPattern(node) {
                checkRule17Layout(node, context);
            },
            FunctionDeclaration(node) {
                checkRule17Layout(node, context);
            },
            FunctionExpression(node) {
                checkRule17Layout(node, context);
            },
            ArrowFunctionExpression(node) {
                checkRule17Layout(node, context);
            },
            TSDeclareFunction(node) {
                checkRule17Layout(node, context);
            },
            TSCallSignatureDeclaration(node) {
                checkRule17Layout(node, context);
            },
            TSConstructSignatureDeclaration(node) {
                checkRule17Layout(node, context);
            },
            TSMethodSignature(node) {
                checkRule17Layout(node, context);
            },
            TSFunctionType(node) {
                checkRule17Layout(node, context);
            }
        };
    }
};
