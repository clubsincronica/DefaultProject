const fs = require('fs');
const keys = JSON.parse(fs.readFileSync('club-sincronica/assets/credentials/buffer-keys.json', 'utf8'));
const q = 'query($id: PostId!) { post(input: { id: $id }) { id status text dueAt createdAt channel { id service } } }';
(async () => {
  for (const id of ['6abaaabc6219c00209b8f132', '6abaaabd6219c00209b8f183', '6abaaac76706f7fb0102099e']) {
    for (const key of [keys.cuenta1.apiKey, keys.cuenta2.apiKey]) {
      const r = await fetch('https://api.buffer.com/graphql', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, variables: { id } }),
      });
      const d = await r.json();
      const p = d?.data?.post;
      const who = key === keys.cuenta1.apiKey ? 'cuenta1' : 'cuenta2';
      console.log(id, who, JSON.stringify(p || d.errors || d).slice(0, 300));
      if (p) break;
    }
  }
})();

