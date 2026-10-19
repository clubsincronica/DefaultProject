const fs = require('fs');
const keys = JSON.parse(fs.readFileSync('club-sincronica/assets/credentials/buffer-keys.json', 'utf8'));
const edit = 'mutation($input: EditPostInput!) { editPost(input: $input) { ... on PostActionSuccess { post { id text } } ... on InvalidInputError { message } ... on UnauthorizedError { message } ... on RestProxyError { message } } }';

function descBlock(date) {
  const md = fs.readFileSync(`pipeline-viral/content/meditation-output/${date}/publicacion.md`, 'utf8');
  const sec = md.split('## 1.')[1] || '';
  return sec.match(/\*\*Descripci\u00f3n:\*\*\s*\n```\s*\n([\s\S]*?)\n```/)[1].trim();
}

const text9 = descBlock('2026-09-29') + '\n\nhttps://youtu.be/wiNpOSdGwaI';
const posts = [
  ['6abaaabc6219c00209b8f132', text9],
  ['6abaaabd6219c00209b8f183', text9],
];
(async () => {
  for (const [id, text] of posts) {
    const r = await fetch('https://api.buffer.com/graphql', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + keys.cuenta1.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: edit, variables: { input: { id, text } } }),
    });
    const d = await r.json();
    const ok = d?.data?.editPost?.post?.id;
    console.log(id, '->', ok ? 'EDITED: ' + JSON.stringify(d.data.editPost.post.text.slice(0, 70)) : JSON.stringify(d).slice(0, 250));
  }
})();
