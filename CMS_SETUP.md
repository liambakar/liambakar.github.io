# Blog admin setup

The site now serves a Decap CMS editor at `/admin/`. Posts created there are
stored as Markdown in `_posts`, uploaded images are stored in `images/blog`,
and GitHub Pages renders the published posts with Jekyll.

The remaining setup is authentication. GitHub Pages can serve the editor, but
it cannot safely store the GitHub OAuth client secret. Use a small Cloudflare
Worker as the OAuth proxy; the secret stays in Cloudflare and is never shipped
to a browser or committed to this repository.

## One-time authentication setup

1. Deploy the Cloudflare Worker from the Decap-documented template:
   <https://github.com/sterlingwes/decap-proxy>. Its README has the current
   deployment commands. A free `workers.dev` URL is sufficient; a custom
   domain is optional.
2. In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth
   App**. Use the Worker URL as the homepage and
   `https://YOUR-WORKER.workers.dev/callback` as the callback URL.
3. Add the OAuth app credentials to the Worker as encrypted secrets named
   `GITHUB_OAUTH_ID` and `GITHUB_OAUTH_SECRET`. Do not add either value to this
   repository. The Worker template also supports the public/private repository
   flag; this repository is currently public.
4. In `admin/config.yml`, replace
   `https://REPLACE-WITH-YOUR-DECAP-OAUTH-WORKER.workers.dev` with the deployed
   Worker URL. Keep `auth_endpoint: auth`.
5. Commit and push the site changes, wait for GitHub Pages to deploy, then open
   <https://liambakar.github.io/admin/> and choose **Login with GitHub**.

Only GitHub accounts with write access to `liambakar/liambakar.github.io` can
edit or publish through this configuration. Open Authoring is intentionally not
enabled. The OAuth request uses GitHub's `public_repo` scope because the CMS
must create post branches and pull requests in this public repository.

## Publishing workflow

1. Open `/admin/` and select **New Blog Post**.
2. Fill in the title, date, short description, optional cover image and tags,
   then write the body in Markdown. The editor supports links and image uploads.
   For footnotes, use `[^1]` in the text and add `[^1]: The note` at the end.
3. Choose **Save** to create a draft pull request. Move the post through the
   editorial workflow and choose **Publish** when it is ready. Decap squash
   merges the draft into `main`; GitHub Pages then rebuilds the site.

The older hand-authored files in `blog-posts/` are unchanged. New Markdown posts
appear above them on the homepage and are also listed at `/blog/`.

## Security notes

- Never put a GitHub token, OAuth client secret, or Cloudflare API token in the
  repository or in `admin/config.yml`.
- Keep repository write access limited to trusted accounts and enable two-factor
  authentication on the GitHub account.
- Revoke the OAuth app in GitHub immediately if its Worker secrets may have been
  exposed, then rotate the credentials in Cloudflare.
- The `/admin/` HTML is public by design; authentication protects repository
  access and publishing. `noindex` prevents normal search indexing but is not an
  access control.

Official references:

- Decap CMS GitHub OAuth proxy overview: <https://decapcms.org/docs/backends-overview/#using-github-with-an-oauth-proxy>
- Decap CMS editorial workflow: <https://decapcms.org/docs/editorial-workflows/>
- Decap CMS Jekyll integration: <https://decapcms.org/docs/jekyll/>
