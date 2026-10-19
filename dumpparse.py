import struct, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def parse_dump(path):
    d = open(path, 'rb').read()
    if d[:4] != b'MDMP':
        return {'err': 'not a minidump'}
    nstreams, = struct.unpack_from('<I', d, 8)
    dir_rva, = struct.unpack_from('<I', d, 12)
    streams = [struct.unpack_from('<III', d, dir_rva + i * 12) for i in range(nstreams)]
    mods, exc = [], {}
    for stype, dsize, drva in streams:
        if stype == 4:
            cnt, = struct.unpack_from('<I', d, drva)
            base = drva + 4
            for _ in range(cnt):
                baseaddr, size = struct.unpack_from('<QI', d, base)
                nameoff, = struct.unpack_from('<I', d, base + 20)
                end = d.find(b'\0', nameoff)
                name = d[nameoff:end].decode('utf-8', 'replace').split('\\')[-1]
                mods.append((baseaddr, size, name))
                base += 92
        elif stype == 6:
            code, = struct.unpack_from('<I', d, drva + 8)
            addr, = struct.unpack_from('<Q', d, drva + 24)
            nparams, = struct.unpack_from('<I', d, drva + 32)
            p0 = struct.unpack_from('<Q', d, drva + 40)[0] if nparams else None
            p1 = struct.unpack_from('<Q', d, drva + 48)[0] if nparams > 1 else None
            exc = {'code': hex(code), 'addr': hex(addr), 'params': [hex(x) for x in (p0, p1) if x is not None]}
    def which(a):
        for b, s, n in mods:
            if b <= a < b + s:
                return f'{n}+0x{a - b:x}'
        return 'unknown'
    res = {'exception': exc, 'fault': which(int(exc['addr'], 16)) if exc else 'n/a'}
    # crash strings: search dump for our known markers
    markers = [b'je-veux', b'MidiNoteEvent', b'KeyTracks', b'template.als', b'_fixture', b'p0-donor', b'je-veux-midi-only', b'audio-only']
    hits = [m.decode() for m in markers if m in d]
    res['marker_hits'] = hits
    return res

for p in sys.argv[1:]:
    print('====', p.split('/')[-1].split('\\')[-1])
    for k, v in parse_dump(p).items():
        print('  ', k, '=', v)
