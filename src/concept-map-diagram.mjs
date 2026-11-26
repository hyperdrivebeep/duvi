import {conceptCounts, conceptIndex, directNeighbours, materialLabel} from './concept-map-model.mjs';

// Positions follow the selected overview: connected domains are in the top lanes,
// with room for two distinct directions between the mathematics domains.
const positions = {
  s2: [0, 1], s3: [0, 3], s4: [1, 2], s5: [0, 5], s6: [1, 0],
  s7: [1, 5], s8: [2, 5], s9: [2, 6], g1: [2, 1], g2: [2, 3],
};
const shortNames = {s2: '함수와 미분', s3: '벡터와 텐서', s6: '학습·손실·최적화', s8: '아키텍처', s9: '실무'};
const vectors = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};

// Native Tab/Enter remain available. Arrows move to a node in that direction;
// favour the same lane where it contains a candidate.
function wireKeys(nodes) {
  nodes.forEach(({button, x, y}, index) => button.addEventListener('keydown', event => {
    const vector = vectors[event.key];
    if (!vector && !['Home', 'End'].includes(event.key)) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let target;
    if (vector) {
      const [dx, dy] = vector, score = node => {
        const a = node.x - x, b = node.y - y, forward = a * dx + b * dy;
        return forward > 0 ? forward + 2 * Math.abs(a * dy - b * dx) : Infinity;
      };
      target = nodes.reduce((best, node) => score(node) < (best ? score(best) : Infinity) ? node : best, null);
    } else target = nodes[event.key === 'Home' ? 0 : nodes.length - 1];
    event.preventDefault();
    if (target !== nodes[index]) target?.button.focus?.();
  }));
}

function arrowLayer(svg, id, width, height, paths) {
  const layer = svg('svg', {class: 'cmap-diagram-lines', viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', 'aria-hidden': 'true'});
  const defs = svg('defs'), marker = svg('marker', {id, viewBox: '0 0 8 8', refX: 8, refY: 4, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse'});
  marker.append(svg('path', {d: 'M0 0L8 4L0 8Z', class: 'cmap-arrowhead'}));
  defs.append(marker); layer.append(defs);
  for (const {d, from, to} of paths) layer.append(svg('path', {
    d, class: 'cmap-diagram-edge', 'marker-end': `url(#${id})`, 'data-from': from, 'data-to': to,
  }));
  return layer;
}

function overviewRoute(from, to) {
  const [fc, fr] = from, [tc, tr] = to;
  // SVG normalized to the same three columns and seven rows as the domain grid.
  const cx = col => 50 + col * 135, cy = row => 27 + row * 60;
  let x1 = cx(fc), x2 = cx(tc), y1 = cy(fr), y2 = cy(tr);
  if (fc === tc) {
    const sign = Math.sign(y2 - y1);
    x1 += 15 * sign; x2 = x1; y1 += sign * 27; y2 -= sign * 27;
    return {d: `M${x1},${y1} L${x2},${y2}`, x: x1 + 8 * sign, y: (y1 + y2) / 2};
  }
  const sign = Math.sign(x2 - x1);
  x1 += 50 * sign; x2 -= 51 * sign;
  // Two departures on the same side of a node (above/below) have distinct ports.
  y1 += Math.sign(tr - fr) * 8; y2 -= Math.sign(tr - fr) * 8;
  const x = (x1 + x2) / 2, y = (y1 + y2) / 2;
  return {d: `M${x1},${y1} C${x},${y1} ${x},${y2} ${x2},${y2}`, x, y};
}

export function renderConceptDiagram(root, {h, svg, data, state, overview: {domains, edges}, selected, query, matches, openDomain,
  onDomain, onSelect, onOverview, onFull, returnId, focus, focusConceptIds}) {
  const {byId} = conceptIndex(data);
  const names = new Map(domains.map(domain => [domain.id, shortNames[domain.id] || domain.name]));
  const fieldNames = new Map(domains.map(domain => [domain.name, names.get(domain.id)]));
  const focused = byId.get(selected);
  const legend = h('p', {className: 'cmap-diagram-legend'},
    '→ 선수 개념에서 그 선수가 필요한 개념으로. 데이터에는 선수 관계만 있습니다.',
    !focused && !query ? ' 숫자는 분야 사이의 개념 연결 수이며, 분야 전체가 선수라는 뜻은 아닙니다.' : null);
  const back = h('button', {type: 'button', className: 'cmap-diagram-action', onClick: () => onOverview(false)}, '← 분야 개요');
  const full = h('button', {type: 'button', className: 'cmap-diagram-action', onClick: onFull}, '전체 그래프');
  const fit = h('button', {type: 'button', className: 'cmap-diagram-action', onClick: () => onOverview(true)}, '화면 맞춤');
  const lectureIds = (focusConceptIds || []).filter(id => byId.has(id));
  const lecture = lectureIds.length ? h('button', {type: 'button', className: 'cmap-diagram-action',
    onClick: () => onSelect(lectureIds[0])}, '지금 강의 개념으로') : null;
  let focusTarget, content, status, title, intro;

  const conceptButton = (concept, relation) => {
    const material = materialLabel(data, concept), {marked} = conceptCounts(data, concept, state);
    const details = [fieldNames.get(concept.field), material, marked && `내가 표시 ${marked.done}/${marked.total}`].filter(Boolean);
    return h('button', {type: 'button', className: 'cmap-diagram-node', 'data-id': concept.id,
      'aria-label': [concept.name, relation, ...details].filter(Boolean).join(', '), onClick: () => onSelect(concept.id)},
    h('span', {className: 'cmap-diagram-name', text: concept.name}),
    h('span', {className: 'cmap-diagram-meta'}, ...details.map((text, index) =>
      h('span', {className: index === 2 ? 'cmap-diagram-marked' : null, text: `${index ? ' · ' : ''}${text}`}))));
  };
  const list = (concepts, relation) => {
    const nodes = concepts.map((concept, y) => ({x: 0, y, id: concept.id, button: conceptButton(concept, relation)}));
    wireKeys(nodes);
    focusTarget ??= nodes.find(node => node.id === returnId)?.button;
    return h('div', {className: 'cmap-diagram-list'}, ...nodes.map(node => node.button));
  };

  if (focused && !query) {
    title = '이 개념의 직접 연결';
    intro = '선수와 후속 개념만 표시합니다. 개념을 고르면 그 개념의 연결을 봅니다.';
    const {before, after} = directNeighbours(data, selected);
    status = `${focused.name} 선택. 직접 선수 ${before.length}개, 직접 후속 ${after.length}개.`;
    const rows = Math.max(before.length, after.length, 1), height = rows * 68, cy = height / 2;
    const paths = [], nodes = [];
    const side = (concepts, incoming) => {
      const x = incoming ? 0 : 2;
      return h('div', {className: `cmap-focus-side cmap-focus-${incoming ? 'before' : 'after'}`},
        concepts.length ? concepts.map((concept, index) => {
          const y = (index + .5) * 68, port = cy + (index - (concepts.length - 1) / 2) * Math.min(5, 36 / concepts.length);
          const mid = incoming ? 325 : 675;
          paths.push(incoming
            ? {from: concept.id, to: selected, d: `M270,${y} C${mid},${y} ${mid},${port} 380,${port}`}
            : {from: selected, to: concept.id, d: `M620,${port} C${mid},${port} ${mid},${y} 730,${y}`});
          const button = conceptButton(concept, incoming ? `${focused.name}의 직접 선수` : `${focused.name}을(를) 직접 선수로 쓰는 후속 개념`);
          nodes.push({button, x, y});
          return h('div', {className: 'cmap-focus-row'}, button);
        }) : h('p', {className: 'cmap-empty-side', text: incoming
          ? '지도에 연결된 직접 선수가 없습니다. 지도 밖 선수는 개념 상세에서 확인할 수 있습니다.'
          : '이 지도에 기록된 직접 후속 개념이 없습니다.'}));
    };
    const left = side(before, true);
    const centre = h('button', {type: 'button', className: 'cmap-diagram-node cmap-focus-centre', 'aria-current': 'true',
      'aria-label': `${focused.name}, 선택한 개념, 상세로 이동`, onClick: () => root.parentNode?.querySelector?.('#cmap-inspector-title')?.focus()},
    h('span', {className: 'cmap-diagram-name', text: focused.name}),
    h('span', {className: 'cmap-diagram-meta', text: '선택한 개념'}));
    focusTarget = centre; nodes.push({button: centre, x: 1, y: cy});
    const right = side(after, false);
    // Keyboard coordinates use the same rows as the node ports.
    wireKeys(nodes.map(node => ({...node, y: node.y / 68})));
    content = h('div', {className: 'cmap-focus'},
      h('div', {className: 'cmap-focus-heads'}, h('h3', {text: `직접 선수 · ${before.length}`}),
        h('h3', {text: '선택한 개념'}), h('h3', {text: `직접 후속 · ${after.length}`})),
      h('div', {className: 'cmap-focus-body', style: `--cmap-rows:${rows}`},
        arrowLayer(svg, 'cmap-focus-arrow', 1000, height, paths), left, centre, right));
  } else if (query) {
    title = '검색 결과';
    intro = '개념을 고르면 직접 선수와 후속 개념을 봅니다.';
    status = '';
    content = list(data.concepts.filter(concept => matches.has(concept.id)));
  } else {
    title = '분야로 보는 전체 지도';
    intro = '분야를 펼쳐 개념을 확인하세요. 화살표 키 또는 Tab으로 이동할 수 있습니다.';
    status = `${domains.length}개 분야, 분야 간 선수 연결 ${edges.reduce((sum, edge) => sum + edge.count, 0)}개.`;
    const selectedDomain = domains.find(domain => domain.id === openDomain);
    if (selectedDomain) status += ` ${selectedDomain.name}, 개념 ${selectedDomain.concepts.length}개 펼침.`;
    const locations = new Map(domains.map((domain, i) => [domain.id, positions[domain.id] || [i % 3, Math.floor(i / 3)]]));
    const routes = edges.map(edge => ({...edge, ...overviewRoute(locations.get(edge.from), locations.get(edge.to))}));
    const buttons = domains.map(domain => {
      const [x, y] = locations.get(domain.id), open = domain.id === openDomain;
      const progress = domain.marked ? `자료 ${domain.marked.done}/${domain.marked.total} 완료 표시` : '자료 완료 표시 미확인';
      const summary = `개념 ${domain.concepts.length}개 · ${progress}`;
      const button = h('button', {type: 'button', className: 'cmap-diagram-node cmap-domain-node',
        'data-domain': domain.id, 'aria-expanded': String(open), 'aria-controls': open ? 'cmap-domain-concepts' : null,
        'aria-label': `${names.get(domain.id)}, ${summary}`,
        style: `grid-column:${x + 1};grid-row:${y + 1}`, onClick: () => onDomain(domain.id)},
      h('span', {className: 'cmap-diagram-name', text: names.get(domain.id)}),
      h('span', {className: 'cmap-diagram-meta', text: summary}),
      h('span', {className: 'cmap-domain-chevron', 'aria-hidden': 'true', text: open ? '⌄' : '›'}));
      return {x, y, button, id: domain.id};
    });
    wireKeys(buttons);
    const grid = h('div', {className: 'cmap-domain-grid'}, arrowLayer(svg, 'cmap-domain-arrow', 370, 414, routes),
      ...routes.map(edge => h('span', {className: 'cmap-domain-count', 'aria-hidden': 'true', text: edge.count,
        style: `left:${edge.x / 3.7}%;top:${edge.y / 4.14}%`})), ...buttons.map(node => node.button));
    const detail = selectedDomain ? h('div', {className: 'cmap-domain-concepts', id: 'cmap-domain-concepts'},
      h('h3', {text: `${selectedDomain.name} · ${selectedDomain.concepts.length}개`}), list(selectedDomain.concepts, `${selectedDomain.name} 분야`)) : null;
    focusTarget ??= buttons.find(node => node.id === returnId || node.id === openDomain)?.button ?? fit;
    const descriptions = h('ul', {className: 'cmap-sr', 'aria-label': '분야 간 방향별 선수 연결'},
      ...edges.map(({from, to, count}) => h('li', {text: `${names.get(from)}에서 ${names.get(to)}로 선수 연결 ${count}개`})));
    content = [grid, descriptions, detail];
  }
  const heading = h('h2', {className: 'cmap-diagram-title', tabindex: '-1', text: title});
  root.replaceChildren(h('section', {className: 'cmap-diagram'},
    h('header', {className: 'cmap-diagram-header'}, h('div', {}, heading, h('p', {className: 'cmap-muted', text: intro})),
      h('div', {className: 'cmap-diagram-actions'}, focused || query ? back : fit, lecture, full)),
    content, legend));
  if (focus) (focusTarget || heading).focus?.();
  return status;
}
