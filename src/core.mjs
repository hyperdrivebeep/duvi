export function timestamp(value) {
  const parts = value.replace(',', '.').split(':').map(Number);
  return parts.reduce((sum, n) => sum * 60 + n, 0);
}

export function parseVtt(text) {
  return text.replace(/\r/g, '').split(/\n\s*\n/).flatMap(block => {
    const lines = block.trim().split('\n');
    const i = lines.findIndex(line => line.includes(' --> '));
    if (i < 0) return [];
    const [start, rest] = lines[i].split(' --> ');
    const en = lines.slice(i + 1).join(' ').replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
    const cue = {start: timestamp(start), end: timestamp(rest.split(' ')[0]), en};
    return en && Number.isFinite(cue.start) && cue.end > cue.start ? [cue] : [];
  });
}

export function sentences(cues) {
  const result = [];
  for (const cue of cues) {
    const last = result.at(-1);
    if (last && !/[.!?\]]$/.test(last.en) && cue.start - last.end < 1.2
        && cue.end - last.start <= 15 && last.en.length + cue.en.length < 260) {
      last.en += ' ' + cue.en;
      last.end = cue.end;
    } else result.push({...cue});
  }
  return result;
}

export function cueAt(cues, time) {
  let lo = 0, hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start > time) hi = mid - 1;
    else lo = mid + 1;
  }
  return hi >= 0 && time < cues[hi].end ? hi : -1;
}
