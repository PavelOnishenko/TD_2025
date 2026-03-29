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

function getDistinctLines(items) {
    const lines = new Set();
    for (const item of items) {
        const startLine = item.loc?.start.line;
        const endLine = item.loc?.end.line;

        if (!startLine || !endLine) {
            continue;
        }

        for (let line = startLine; line <= endLine; line += 1) {
            lines.add(line);
        }
    }
    return Array.from(lines).sort((a, b) => a - b);
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
    const openLineText = lines[startLine - 1] || '';
    const closeLineText = lines[endLine - 1] || '';

    if (openLineText.trim() !== details.opener || closeLineText.trim() !== details.closer) {
        context.report({
            node,
            message: 'Rule 17: multiline collections/initializers must place opening and closing braces/brackets on dedicated surrounding lines.'
        });
        return;
    }

    const itemLines = getDistinctLines(details.items);
    if (itemLines.length === 0) {
        return;
    }

    const minItemLine = itemLines[0];
    const maxItemLine = itemLines[itemLines.length - 1];

    if (minItemLine <= startLine || maxItemLine >= endLine) {
        context.report({
            node,
            message: 'Rule 17: all comma-separated members must stay between the surrounding brace/bracket lines.'
        });
        return;
    }

    if (itemLines.length > 2 && itemLines.length !== details.items.length) {
        context.report({
            node,
            message: 'Rule 17: internal member lines should be 1 line, 2 lines, or one member per line.'
        });
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
