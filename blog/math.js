(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const postBody = document.querySelector('.post-body');

        if (!postBody || typeof renderMathInElement !== 'function') {
            return;
        }

        renderMathInElement(postBody, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '\\[', right: '\\]', display: true },
                { left: '\\(', right: '\\)', display: false },
                { left: '$', right: '$', display: false },
            ],
            preProcess: function (math) {
                return math
                    .replace(/^\s*\\begin\{displaymath\}/, '')
                    .replace(/\\end\{displaymath\}\s*$/, '');
            },
            throwOnError: false,
        });
    });
})();
