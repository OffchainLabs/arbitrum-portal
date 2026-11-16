// Measures the uncompressed size of the scripts a page loaded, by package or source file, from
// their source maps. Lighthouse's treemap does the same, but drops the whole map of a chunk when
// Turbopack maps a segment past the end of a line, which leaves about half the bridge unattributed.
const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const base64Values = Object.fromEntries([...base64].map((character, index) => [character, index]));

// Values of a source map segment, encoded in base64 VLQ
function decodeSegment(segment) {
  const values = [];
  let value = 0;
  let shift = 0;
  for (const character of segment) {
    const digit = base64Values[character];
    value += (digit & 31) << shift;
    if (digit & 32) {
      shift += 5;
    } else {
      values.push(value & 1 ? -(value >>> 1) : value >>> 1);
      value = 0;
      shift = 0;
    }
  }
  return values;
}

// The package or source file a source belongs to, e.g.
// turbopack:///[project]/node_modules/.pnpm/viem@2.47.4_.../node_modules/viem/chains/index.ts is viem
function getModule(source) {
  const dependency = source.match(
    /node_modules\/\.pnpm\/[^/]+\/node_modules\/((?:@[^/]+\/)?[^/]+)/,
  );
  if (dependency) {
    return dependency[1];
  }
  return source.match(/\[project\]\/(.+)/)?.[1] ?? source;
}

// Adds the characters of each line to the source of the segment they belong to. Code without a
// source, like Turbopack's runtime and imported JSON files, goes to `unmapped`.
function addScript({ content, map, add, unmapped }) {
  const lines = content.split('\n');
  const mappings = map.mappings.split(';');
  let sourceIndex = 0;
  lines.forEach((line, lineIndex) => {
    let column = 0;
    const segments = (mappings[lineIndex] ?? '')
      .split(',')
      .filter(Boolean)
      .map((segment) => {
        const values = decodeSegment(segment);
        column += values[0];
        if (values.length > 1) {
          sourceIndex += values[1];
          return { column, source: map.sources[sourceIndex] };
        }
        return { column };
      });
    let mapped = 0;
    segments.forEach(({ column: start, source }, index) => {
      const end = Math.min(segments[index + 1]?.column ?? line.length, line.length);
      if (source && end > start) {
        add(getModule(source), end - start);
        mapped += end - start;
      }
    });
    // The newline counts as unmapped
    add(unmapped, line.length - mapped + (lineIndex < lines.length - 1 ? 1 : 0));
  });
}

// Takes the artifacts of a Lighthouse navigation
export function measureModules({ Scripts, SourceMaps, URL }) {
  const modules = {};
  const add = (module, size) => {
    modules[module] = (modules[module] ?? 0) + size;
  };
  for (const script of Scripts) {
    const map = SourceMaps.find(({ scriptId }) => scriptId === script.scriptId)?.map;
    if (script.content && map?.mappings && map.sources) {
      addScript({ content: script.content, map, add, unmapped: 'Code without source map' });
    } else {
      const isInline = script.url === URL.mainDocumentUrl;
      add(isInline ? 'Inline scripts' : 'Scripts without source maps', script.length ?? 0);
    }
  }
  return modules;
}
