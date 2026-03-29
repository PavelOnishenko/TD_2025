const MAX_LINE_LENGTH = 170;

function getContainerDetails(node) {
    switch (node.type) {
        case 'ObjectExpression':
        case 'ObjectPattern':
            return { opener: '{', closer: '}', items: node.properties };
        case 'ArrayExpression':
        case 'ArrayPattern':
            return { opener: '[', closer: ']', items: node.elements.filter((element) => element !== null) };
        default:
            return null;
    }
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
    const details = getContainerDetails(node);
    if (!details || details.items.length < 2) {
        return;
    }

    const sourceCode = context.sourceCode;
    const openingToken = sourceCode.getFirstToken(node, (token) => token.value === details.opener);
    const closingToken = sourceCode.getLastToken(node, (token) => token.value === details.closer);

    if (!openingToken || !closingToken) {
        return;
    }

    const startLine = openingToken.loc.start.line;
    const endLine = closingToken.loc.end.line;

    if (startLine === endLine) {
        return;
    }

    const lines = sourceCode.lines;
    const compactCandidate = toCompactSingleLine(sourceCode.getText(node));

    const prefixLength = node.loc?.start.column ?? 0;
    const endLineText = lines[(node.loc?.end.line ?? endLine) - 1] || '';
    const suffixLength = endLineText.slice(node.loc?.end.column ?? 0).length;
    const projectedSingleLineLength = prefixLength + compactCandidate.length + suffixLength;

    if (projectedSingleLineLength <= MAX_LINE_LENGTH) {
        context.report({
            node,
            message: `Rule 17: this comma-separated initializer can fit on one line (${projectedSingleLineLength} chars with indentation/context); use the most compact one-line form.`
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
            message: 'Rule 17: multiline comma-separated members must be placed between surrounding opening and closing brace/bracket lines.'
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
            }
        };
    }
};
