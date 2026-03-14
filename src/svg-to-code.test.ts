import { describe, test, expect } from 'bun:test'
import {
  parseStyle,
  isColor,
  parseSvgXml,
  rawToElementData,
  extractSvgFromString,
  collectColors,
  generateCode,
} from '../bin/svg-to-code'

describe('parseStyle', () => {
  test('parses simple style string', () => {
    const result = parseStyle('fill:#ff0000;stroke:#000000;stroke-width:2')
    expect(result).toEqual({
      fill: '#ff0000',
      stroke: '#000000',
      'stroke-width': '2',
    })
  })

  test('handles spaces around colons and semicolons', () => {
    const result = parseStyle('fill : #fff ; opacity : 0.5')
    expect(result).toEqual({ fill: '#fff', opacity: '0.5' })
  })

  test('handles empty string', () => {
    expect(parseStyle('')).toEqual({})
  })

  test('handles trailing semicolon', () => {
    const result = parseStyle('fill:#000;')
    expect(result).toEqual({ fill: '#000' })
  })
})

describe('isColor', () => {
  test('detects hex colors', () => {
    expect(isColor('#ff0000')).toBe(true)
    expect(isColor('#fff')).toBe(true)
    expect(isColor('#aabbcc')).toBe(true)
  })

  test('detects rgb/rgba', () => {
    expect(isColor('rgb(255,0,0)')).toBe(true)
    expect(isColor('rgba(0,0,0,0.5)')).toBe(true)
  })

  test('detects hsl', () => {
    expect(isColor('hsl(120,100%,50%)')).toBe(true)
  })

  test('detects named colors', () => {
    expect(isColor('none')).toBe(true)
    expect(isColor('white')).toBe(true)
    expect(isColor('transparent')).toBe(true)
  })

  test('rejects non-colors', () => {
    expect(isColor('10')).toBe(false)
    expect(isColor('butt')).toBe(false)
    expect(isColor('miter')).toBe(false)
    expect(isColor('evenodd')).toBe(false)
  })
})

describe('parseSvgXml', () => {
  test('parses self-closing element', () => {
    const result = parseSvgXml('<path d="M0,0 L10,10" id="test"/>')
    expect(result.tag).toBe('path')
    expect(result.attrs.d).toBe('M0,0 L10,10')
    expect(result.attrs.id).toBe('test')
    expect(result.children).toEqual([])
  })

  test('parses element with children', () => {
    const result = parseSvgXml(
      '<svg viewBox="0 0 100 100"><path id="a" d="M0,0"/><path id="b" d="M1,1"/></svg>'
    )
    expect(result.tag).toBe('svg')
    expect(result.attrs.viewBox).toBe('0 0 100 100')
    expect(result.children.length).toBe(2)
    expect(result.children[0].attrs.id).toBe('a')
    expect(result.children[1].attrs.id).toBe('b')
  })

  test('parses nested groups', () => {
    const result = parseSvgXml(
      '<svg><g id="layer"><path id="p1" d="M0,0"/></g></svg>'
    )
    expect(result.children.length).toBe(1)
    expect(result.children[0].tag).toBe('g')
    expect(result.children[0].attrs.id).toBe('layer')
    expect(result.children[0].children.length).toBe(1)
    expect(result.children[0].children[0].attrs.id).toBe('p1')
  })

  test('strips XML declaration and comments', () => {
    const result = parseSvgXml(
      '<?xml version="1.0"?>\n<!-- comment -->\n<svg><path id="x" d="M0,0"/></svg>'
    )
    expect(result.tag).toBe('svg')
    expect(result.children.length).toBe(1)
  })
})

describe('rawToElementData', () => {
  test('extracts id, attrs, styles, and colors', () => {
    const raw = parseSvgXml(
      '<path id="myBtn" style="fill:#ff0000;stroke-width:2" d="M0,0"/>'
    )
    const data = rawToElementData(raw)
    expect(data.tag).toBe('path')
    expect(data.id).toBe('myBtn')
    expect(data.attrs.d).toBe('M0,0')
    expect(data.styles.fill).toBe('#ff0000')
    expect(data.styles['stroke-width']).toBe('2')
    expect(data.colors.fill).toBe('#ff0000')
    expect(data.colors['stroke-width']).toBeUndefined()
  })

  test('strips xmlns attributes', () => {
    const raw = parseSvgXml(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M0,0"/></svg>'
    )
    const data = rawToElementData(raw)
    expect(data.attrs.xmlns).toBeUndefined()
    expect(data.attrs['xmlns:xlink']).toBeUndefined()
  })
})

describe('extractSvgFromString', () => {
  test('parses a complete SVG', () => {
    const svg = `<?xml version="1.0"?>
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g id="Layer_1">
    <path id="btn_A" style="fill:#ff0000;stroke:#000000" d="M10,10 L20,20"/>
    <circle id="dot" style="fill:#00ff00" cx="50" cy="50" r="5"/>
  </g>
</svg>`
    const data = extractSvgFromString(svg)
    expect(data.tag).toBe('svg')
    expect(data.children.length).toBe(1) // g
    const g = data.children[0]
    expect(g.children.length).toBe(2)
    expect(g.children[0].id).toBe('btn_A')
    expect(g.children[0].colors.fill).toBe('#ff0000')
    expect(g.children[0].colors.stroke).toBe('#000000')
    expect(g.children[1].id).toBe('dot')
    expect(g.children[1].tag).toBe('circle')
  })
})

describe('collectColors', () => {
  test('collects colors from tree', () => {
    const data = extractSvgFromString(
      '<svg><path id="A" style="fill:#ff0000;stroke:#000"/><path id="B" style="fill:#0000ff"/></svg>'
    )
    const colors = collectColors(data)
    expect(colors.size).toBe(3)
    expect(colors.get('A:fill')!.paramName).toBe('fillA')
    expect(colors.get('A:fill')!.defaultValue).toBe('#ff0000')
    expect(colors.get('A:stroke')!.paramName).toBe('strokeA')
    expect(colors.get('B:fill')!.paramName).toBe('fillB')
  })

  test('generates camelCase param names for multi-word ids', () => {
    const data = extractSvgFromString(
      '<svg><path id="left_bumper" style="fill:#fff"/></svg>'
    )
    const colors = collectColors(data)
    expect(colors.get('left_bumper:fill')!.paramName).toBe('fillLeftBumper')
  })
})

describe('generateCode', () => {
  test('generates valid TypeScript with imports', () => {
    const data = extractSvgFromString(
      '<svg viewBox="0 0 100 100"><path id="A" style="fill:#ff0000" d="M0,0"/></svg>'
    )
    const code = generateCode(data, { functionName: 'testSvg' })
    expect(code).toContain("import { svgElements } from 'tosijs'")
    expect(code).toContain('const { svg, path } = svgElements')
    expect(code).toContain('export default function testSvg')
    expect(code).toContain("fillA: '#ff0000'")
    expect(code).toContain('colors.fillA')
  })

  test('uses data-part when option is set', () => {
    const data = extractSvgFromString('<svg><path id="myBtn" d="M0,0"/></svg>')
    const code = generateCode(data, { dataPart: true })
    expect(code).toContain("'data-part': 'myBtn'")
    expect(code).not.toContain("id: 'myBtn'")
  })

  test('uses id when data-part is not set', () => {
    const data = extractSvgFromString('<svg><path id="myBtn" d="M0,0"/></svg>')
    const code = generateCode(data)
    expect(code).toContain("id: 'myBtn'")
    expect(code).not.toContain('data-part')
  })

  test('generates type alias for colors', () => {
    const data = extractSvgFromString(
      '<svg><path id="X" style="fill:#00ff00" d="M0,0"/></svg>'
    )
    const code = generateCode(data, { functionName: 'myWidget' })
    expect(code).toContain('export type MyWidgetColors')
  })

  test('inlines children of bare g elements', () => {
    const data = extractSvgFromString(
      '<svg><g id="Layer_1"><path id="a" d="M0,0"/><path id="b" d="M1,1"/></g></svg>'
    )
    // The g with only an id (no styles/attrs) should be unwrapped
    const code = generateCode(data)
    // Both paths should be direct children of svg()
    expect(code).toContain("id: 'a'")
    expect(code).toContain("id: 'b'")
    expect(code).not.toContain("id: 'Layer_1'")
  })
})

describe('gamepad.svg integration', () => {
  test('parses the actual gamepad SVG', async () => {
    const svgString = await Bun.file('static/gamepad.svg').text()
    const data = extractSvgFromString(svgString)
    expect(data.tag).toBe('svg')

    // Should find all the expected parts
    const ids = new Set<string>()
    function collectIds(el: typeof data) {
      if (el.id) ids.add(el.id)
      el.children.forEach(collectIds)
    }
    collectIds(data)

    expect(ids.has('controller')).toBe(true)
    expect(ids.has('A')).toBe(true)
    expect(ids.has('B')).toBe(true)
    expect(ids.has('X')).toBe(true)
    expect(ids.has('Y')).toBe(true)
    expect(ids.has('left_stick')).toBe(true)
    expect(ids.has('right_stick')).toBe(true)
    expect(ids.has('left_stick_travel')).toBe(true)
    expect(ids.has('right_stick_travel')).toBe(true)
    expect(ids.has('dpad_up')).toBe(true)
    expect(ids.has('left_bumper')).toBe(true)
    expect(ids.has('left_trigger')).toBe(true)
  })

  test('generates code for gamepad SVG', async () => {
    const svgString = await Bun.file('static/gamepad.svg').text()
    const data = extractSvgFromString(svgString)
    const code = generateCode(data, {
      dataPart: true,
      functionName: 'gamepadSvg',
    })

    expect(code).toContain("import { svgElements } from 'tosijs'")
    expect(code).toContain('export default function gamepadSvg')
    expect(code).toContain("'data-part': 'A'")
    expect(code).toContain("'data-part': 'left_stick'")
    // Face button colors should be parameterized
    expect(code).toContain('fillA')
    expect(code).toContain('fillB')
    expect(code).toContain('fillX')
    expect(code).toContain('fillY')
  })
})
