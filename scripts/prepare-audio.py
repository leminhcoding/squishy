"""Prepare small, mono Foley extracts from CC0 sources (see THIRD_PARTY.md).
Run after downloading and decoding the originals listed in docs/material-research.md.
No synthetic oscillators or generated noise are used in these assets.
"""
from pathlib import Path
from array import array
import math
import wave

ROOT = Path(__file__).resolve().parent.parent
CUTS = {'foam': ('sponge', .48, 4.72), 'rubber': ('rubber', .02, .59), 'squelch': ('squelch', 19.6, 23.6)}
for target, (source, start, stop) in CUTS.items():
    with wave.open(str(ROOT / 'qa/audio-originals' / (source + '.wav'))) as f:
        rate, channels = f.getframerate(), f.getnchannels()
        f.setpos(int(start * rate))
        samples = array('h', f.readframes(int((stop - start) * rate)))
    mono = [sum(samples[i:i+channels]) / channels / 32768 for i in range(0, len(samples), channels)]
    # Remove DC and low rumble, retain the recording's natural transients.
    filtered=[]
    previous=last=0
    decay=math.exp(-2*math.pi*85/rate)
    for x in mono:
        y=decay*(last+x-previous)
        filtered.append(y)
        previous,last=x,y
    peak=max(abs(x) for x in filtered) or 1
    gain=.66/peak
    # Resample to 24 kHz, with a simple 3-tap low-pass before decimation.
    output=array('h')
    count=int(len(filtered)*24000/rate)
    for i in range(count):
        at=i*rate/24000
        k=int(at)
        frac=at-k
        x=filtered[k]*(1-frac)+filtered[min(k+1,len(filtered)-1)]*frac
        x=(x*2+filtered[max(0,k-1)]+filtered[min(k+1,len(filtered)-1)])/4
        fade=min(1,i/(24000*.018),(count-1-i)/(24000*.028))
        output.append(int(max(-.95,min(.95,x*gain*fade))*32767))
    path=ROOT/'dist/audio'/(target+'.wav')
    with wave.open(str(path),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(24000);f.writeframes(output.tobytes())
    print(target, str(path), len(output)/24000, 'seconds')
