(function () {
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
                    { className: 'preview-body' },
                    this.props.widgetFor('body'),
                ),
            );
        },
    });

    CMS.registerPreviewStyle('/admin/preview.css');
    CMS.registerPreviewTemplate('posts', PostPreview);
})();
