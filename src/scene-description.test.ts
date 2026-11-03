import { describe, expect, test } from 'bun:test'
import {
  clockWords,
  compassWord,
  describeScene,
  directionWords,
  distanceWords,
} from './scene-description.js'

describe('scene description', () => {
  test('a drive at dusk, in sentences', () => {
    expect(
      describeScene({
        title: 'City Drive',
        you: { name: 'car', kind: 'car', heading: 45 },
        entities: [
          { name: 'car', kind: 'car', focused: true, distance: 0 },
          {
            name: 'end of the street',
            kind: 'beacon',
            distance: 58.2,
            bearing: 3,
          },
          { name: 'harbour', kind: 'beacon', distance: 121, bearing: 140 },
        ],
        timeOfDay: 17.5,
        daylight: 0.3,
      })
    ).toBe(
      'City Drive. You are in the car, facing north-east. It is 17:30, dusk. Nearby: end of the street, 60 metres ahead; harbour, 120 metres behind you to the right.'
    )
  })

  test('no one driving, nothing named', () => {
    expect(describeScene({ camera: { heading: 270 } })).toBe(
      'You are looking west. Nothing nearby has a name.'
    )
  })

  test('the words', () => {
    expect(compassWord(-90)).toBe('west')
    expect(directionWords(-80)).toBe('to your left')
    expect(directionWords(30)).toBe('ahead to the right')
    expect(distanceWords(1)).toBe('right here')
    expect(distanceWords(12.4)).toBe('12 metres')
    expect(distanceWords(2345)).toBe('2.3 kilometres')
    expect(clockWords(23.999)).toBe('00:00')
    expect(clockWords(6.25)).toBe('06:15')
  })
})
