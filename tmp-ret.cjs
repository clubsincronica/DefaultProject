const fs = require('fs');
const keys = JSON.parse(fs.readFileSync('club-sincronica/assets/credentials/buffer-keys.json', 'utf8'));
const q = '{__type(name:"Mutation"){fields{name type{kind name ofType{kind name possibleTypes{name}}}}}}';
(async () => {
  const r = await fetch('https://api.buffer.com/graphql', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + keys.cuenta1.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const d = await r.json();
  const f = d.data.__type.fields.find(x => x.name === 'editPost');
  console.log(JSON.stringify(f.type));
})();
