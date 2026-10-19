import sys, io, re, struct
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

INTEREST = re.compile(rb'(Ableton|\.als|Operator|AutoFilter|Echo|Simpler|Eq8|Saturator|Compressor|Limiter|Reverb|Delay|Roar|Instruments|MaxMSP|Null|C:\\|template|je-veux|donor|AudioEffect|MidiToAudio|DeviceChain|Pointee|10 Vocals|Bass|Lead|Strings|Texture|Mic|Return)', re.I)

def strings_ascii(d, minlen=5):
    for m in re.finditer(rb'[\x20-\x7e]{%d,}' % minlen, d):
        yield m.start(), m.group()

def strings_utf16(d, minlen=5):
    for m in re.finditer(rb'(?:[\x20-\x7e]\x00){%d,}' % minlen, d):
        yield m.start(), m.group().decode('utf-16le', 'replace')

path = sys.argv[1]
d = open(path, 'rb').read()
seen = set()
count = 0
for off, s in list(strings_ascii(d)) + list(strings_utf16(d)):
    if isinstance(s, str): b = s.encode('utf-8', 'replace')
    else: b = s
    if INTEREST.search(b):
        key = (s[:120],)
        if key in seen: continue
        seen.add(key)
        print(f'{off:08x} {s[:160]}')
        count += 1
        if count > 120: break
