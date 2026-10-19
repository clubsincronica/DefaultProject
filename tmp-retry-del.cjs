const fs = require('fs');
const keys = JSON.parse(fs.readFileSync('club-sincronica/assets/credentials/buffer-keys.json', 'utf8'));
const del = 'mutation DeletePost($input: DeletePostInput!) { deletePost(input: $input) { ... on DeletePostSuccess { id } ... on VoidMutationError { message } } }';
const qProfile = 'query($id:String!){ profile(id:$id){ id service posts(schedulingStatuses:[pending]){ edges{ node{ id status text dueAt } } } } }';
(async () => {
  for (const id of ['6abaaabc6219c00209b8f132', '6abaaabd6219c00209b8f183']) {
    const r = await fetch('https://api.buffer.com/graphql', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + keys.cuenta1.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: del, variables: { input: { id } } }),
    });
    const d = await r.json();
    console.log(id, '->', d?.data?.deletePost?.id ? 'deleted' : JSON.stringify(d).slice(0, 200));
  }
  // Inspect pending posts on cuenta1 profiles
  const profiles = JSON.parse(fs.readFileSync('club-sincronica/assets/credentials/buffer-profiles.json', 'utf8'));
  for (const [name, p] of Object.entries(profiles)) {
    const id = p.id || p;
    if (typeof id !== 'string') continue;
    const r = await fetch('https://api.buffer.com/graphql', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + keys.cuenta1.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: qProfile, variables: { id } }),
    });
    const d = await r.json();
    const posts = d?.data?.profile?.posts?.edges?.map(e => ({ id: e.node.id, status: e.node.status, due: e.node.dueAt, text: (e.node.text || '').slice(0, 40) }));
    console.log(name, JSON.stringify(posts || d, null, 1));
  }
})();
