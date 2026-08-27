(function () {
    const codeDollarToken = 'KATEXPREVIEWCODEDOLLARTOKEN';
    const mathTokenPrefix = 'KATEXPREVIEWMATHTOKEN';

    function isEscaped(source, index) {
        let slashCount = 0;

        for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
            if (source[cursor] !== '\\') {
                break;
            }
            slashCount += 1;
        }

        return slashCount % 2 === 1;
    }

    function protectInlineCodeDollars(line) {
        let cursor = 0;
        let result = '';

        while (cursor < line.length) {
            if (line[cursor] !== '`') {
                result += line[cursor];
                cursor += 1;
                continue;
            }

            let markerEnd = cursor;
            while (line[markerEnd] === '`') {
                markerEnd += 1;
            }

            const marker = line.slice(cursor, markerEnd);
            const closingIndex = line.indexOf(marker, markerEnd);

            if (closingIndex < 0) {
                result += marker;
                cursor = markerEnd;
                continue;
            }

            result +=
                marker +
                line
                    .slice(markerEnd, closingIndex)
                    .replace(/\$/g, codeDollarToken) +
                marker;
            cursor = closingIndex + marker.length;
        }

        return result;
    }

    function protectCodeDollars(source) {
        const lines = source.split('\n');
        let fence = null;

        return lines
            .map(function (line) {
                const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);

                if (fence) {
                    const closingMatch = line.match(
                        /^ {0,3}(`{3,}|~{3,})\s*$/,
                    );

                    if (
                        closingMatch &&
                        closingMatch[1][0] === fence.character &&
                        closingMatch[1].length >= fence.length
                    ) {
                        fence = null;
                        return line;
                    }

                    return line.replace(/\$/g, codeDollarToken);
                }

                if (fenceMatch) {
                    fence = {
                        character: fenceMatch[1][0],
                        length: fenceMatch[1].length,
                    };
                    return line;
                }

                if (/^( {4}|\t)/.test(line)) {
                    return line.replace(/\$/g, codeDollarToken);
                }

                return protectInlineCodeDollars(line);
            })
            .join('\n');
    }

    function protectMath(source) {
        source = protectCodeDollars(source);
        const expressions = [];
        let protectedSource = '';
        let cursor = 0;
        let searchIndex = 0;

        while (searchIndex < source.length) {
            if (source[searchIndex] !== '$' || isEscaped(source, searchIndex)) {
                searchIndex += 1;
                continue;
            }

            const display = source[searchIndex + 1] === '$';
            const delimiter = display ? '$$' : '$';
            const contentStart = searchIndex + delimiter.length;
            let closingIndex = contentStart;

            while (closingIndex < source.length) {
                if (!display && source[closingIndex] === '\n') {
                    closingIndex = -1;
                    break;
                }

                if (
                    source.startsWith(delimiter, closingIndex) &&
                    !isEscaped(source, closingIndex)
                ) {
                    break;
                }

                closingIndex += 1;
            }

            if (
                closingIndex < 0 ||
                closingIndex >= source.length ||
                closingIndex === contentStart
            ) {
                searchIndex += delimiter.length;
                continue;
            }

            const expressionEnd = closingIndex + delimiter.length;
            const token = `${mathTokenPrefix}${expressions.length}END`;

            protectedSource += source.slice(cursor, searchIndex) + token;
            expressions.push({
                display: display,
                source: source.slice(searchIndex, expressionEnd),
                value: source.slice(contentStart, closingIndex),
            });
            cursor = expressionEnd;
            searchIndex = expressionEnd;
        }

        protectedSource += source.slice(cursor);

        return { expressions: expressions, source: protectedSource };
    }

    function escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderMarkdown(source, getAsset) {
        const protectedMath = protectMath(source);

        if (typeof markdownit !== 'function') {
            return escapeHtml(source).replace(/\n/g, '<br />');
        }

        const parser = markdownit({
            breaks: false,
            html: false,
            linkify: true,
            typographer: false,
        });
        const defaultImageRenderer =
            parser.renderer.rules.image ||
            function (tokens, index, options, environment, renderer) {
                return renderer.renderToken(tokens, index, options);
            };

        parser.renderer.rules.image = function (
            tokens,
            index,
            options,
            environment,
            renderer,
        ) {
            const sourceValue = tokens[index].attrGet('src');
            const asset = sourceValue ? getAsset(sourceValue) : null;

            if (asset) {
                tokens[index].attrSet('src', asset.toString());
            }

            return defaultImageRenderer(
                tokens,
                index,
                options,
                environment,
                renderer,
            );
        };

        let rendered = parser.render(protectedMath.source);

        protectedMath.expressions.forEach(function (expression, index) {
            const replacement =
                typeof katex !== 'undefined'
                    ? katex.renderToString(expression.value, {
                          displayMode: expression.display,
                          throwOnError: false,
                      })
                    : escapeHtml(expression.source);

            rendered = rendered.replaceAll(
                `${mathTokenPrefix}${index}END`,
                replacement,
            );
        });

        rendered = rendered.replaceAll(codeDollarToken, '$');

        return rendered;
    }

    const PostPreview = createClass({
        render: function () {
            const entry = this.props.entry;
            const title = entry.getIn(['data', 'title']) || 'Untitled post';
            const description = entry.getIn(['data', 'description']);
            const coverImage = entry.getIn(['data', 'cover_image']);
            const coverAlt =
                entry.getIn(['data', 'cover_alt']) || title || 'Cover image';
            const rawDate = entry.getIn(['data', 'date']);
            const rawTags = entry.getIn(['data', 'tags']);
            const rawBody = entry.getIn(['data', 'body']) || '';
            const coverAsset = coverImage
                ? this.props.getAsset(coverImage)
                : null;
            const tags = rawTags && rawTags.toArray ? rawTags.toArray() : [];
            let displayDate = 'Publication date not set';

            if (rawDate) {
                const parsedDate = new Date(rawDate);
                if (!Number.isNaN(parsedDate.getTime())) {
                    displayDate = parsedDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    });
                }
            }

            return h(
                'article',
                { className: 'preview-shell' },
                h(
                    'header',
                    { className: 'preview-header' },
                    h('h1', {}, title),
                    h('p', { className: 'preview-date' }, displayDate),
                    description
                        ? h(
                              'p',
                              { className: 'preview-description' },
                              description,
                          )
                        : null,
                    tags.length
                        ? h(
                              'ul',
                              { className: 'preview-tags' },
                              tags.map(function (tag) {
                                  return h('li', { key: tag }, tag);
                              }),
                          )
                        : null,
                ),
                coverAsset
                    ? h('img', {
                          className: 'preview-cover',
                          src: coverAsset.toString(),
                          alt: coverAlt,
                      })
                    : null,
                h(
                    'div',
                    {
                        className: 'preview-body',
                        dangerouslySetInnerHTML: {
                            __html: renderMarkdown(
                                rawBody,
                                this.props.getAsset,
                            ),
                        },
                    },
                ),
            );
        },
    });

    CMS.registerPreviewStyle(
        'https://cdn.jsdelivr.net/npm/katex@0.18.4/dist/katex.min.css',
    );
    CMS.registerPreviewStyle('/admin/preview.css');
    CMS.registerPreviewTemplate('posts', PostPreview);
})();
