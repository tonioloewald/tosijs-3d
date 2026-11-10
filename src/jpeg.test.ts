import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { decodeImage, jpegDecode } from './jpeg.js'
import { pngEncode } from './png.js'

// 37 × 29 (partial blocks and MCUs on both edges): red ramps across, green
// down, blue a 6-pixel checker of 255 and 40. Written by libjpeg-turbo's
// cjpeg at quality 95: baseline 4:2:0 with a restart every 2 MCU rows,
// progressive 4:2:0, progressive 4:2:2 restarting every row, baseline 4:4:4
// and grey.
const W = 37
const H = 29
const FIXTURES: Record<string, string> = {
  base420:
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUG' +
    'BgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYH' +
    'CgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAAR' +
    'CAAdACUDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAA' +
    'AgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkK' +
    'FhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWG' +
    'h4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl' +
    '5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREA' +
    'AgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYk' +
    'NOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOE' +
    'hYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk' +
    '5ebn6Onq8vP09fb3+Pn6/90ABAAC/9oADAMBAAIRAxEAPwD8nfh18ANX8L6vb67ruleRawbv' +
    'Nl3K23cpUcKSTyQOnevUJfg//wAJz9l/4Ra0+1fZd3n8bNu7bt+/jOdp6ele0eGfBS+Odvhb' +
    '+xPsouv+W/mb9u35/u4Gc7cde9eh+GPg7/wq/b/on277d7eVs2f99Zzv9ulf05i+LOFcPwpi' +
    'MpynFTqcJVJqWMxkrrEUsQnDlp048kZODlHCptYWorVJ++rN0/ieAPEeu69OpUlauvhjfRru' +
    '9f8AF9pbbd/JPhz8PtJ8L6Tb6Frp8i7g3ebF5TNt3MWHKgg8EdDXWfDr9n/V/C2r2+u67pXk' +
    'WsG7zZdytt3KVHCkk8kdq9y8M/s4Dxzt8U+b9l+1f8sPJ37dvyfeyM5256d69F8M+Cl8chfC' +
    '39i/ZftX/Lx5m/bt+fpgZztx1718BxDxv9Z/sz+2Jey+qcv9gcuv17l5PY/Wrc/Jz8mE5ub6' +
    'pb2s/hs/Z/3B4eeItr+znfm/i/3e/L/5N/Nsvn//0PMtV+D/APwnNtb/APCLW32r7Lu8/jZt' +
    '3Y2/fxnO09PSivqvR/g8PhdbcWn277d/s+Vs2f8AfWc7/bpRXTxNxF4VZ3nlbG+JGY1sDnU+' +
    'X6xQoJypQtGMaXK40cQnzUVTnK1afvSa934Y/wCq+W+JGNp4GnHBtSp20ber79V1v0PLoP2f' +
    'dI8L6S+u6FpXkXUG3ypd7Nt3MFPDEg8EjkV2/wALPg4PHPnf8JTbfavsuzyONm3du3fcxnO0' +
    'dfSu/wDg14E0j/hLLI4/v/w/9M2r13xj4D0fGmnH/PX+H/cr5bF+J+DzjhXEcf4bBRoZbg5q' +
    'jVyqNvq+JqScEq9RqEaXPF16clzYeo74eHvr3XD/AJg+AOOsTTr08LKbc5aqet0uy69H1W5/' +
    '/9H3uD4eat4W1h9C0I+RawbfKh8lW27lDHlgT1JPXvXrsH7P2keF9JfXdC0owXcG3ypdzNt3' +
    'MFPDEg8EjpXsfwa8B6P/AMIjZHH/AD0/h/6aNWn8GvAmkf8ACXWXH9/+H/pm1fj/ABDxjVyb' +
    '+zPrTeI/t/l+pc3/ADJ/aez5Pqt+a/svrFPl9l9V/wB3hbl93k/O/Dzj+vUvytr2Xxf9PLfz' +
    'etnvzbv5+dfDv4OjxzbXH/CU2v2r7Ls8jjZt3bt33MZztHX0or6b+IXgTRxa6ecf89f4f9yi' +
    'vyvibxtyHwyzytw1n2TUs4xeH5efGV+T2tb2kY1Y83tKVef7uE40o3qy92Ctyq0V/VuW8a4z' +
    'GYGnWpVZU4taRV7K2nRre19up//Z',
  prog420:
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUG' +
    'BgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYH' +
    'CgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wgAR' +
    'CAAdACUDASIAAhEBAxEB/8QAGQABAAMBAQAAAAAAAAAAAAAABgAFBwQI/8QAFwEBAQEBAAAA' +
    'AAAAAAAAAAAABwYFCf/aAAwDAQACEAMQAAAB8nKGiFOxCVs5RT7gImrSVVi15fr8vmCMXseq' +
    'fcTk06Sqt//EAB0QAAMAAgMBAQAAAAAAAAAAAAMEBQAUAQIGFRL/2gAIAQEAAQUCnQCql5j7' +
    '2Tp4lRTvPlVKWPvdVkt7Fo/y8W85vYslvYGP8vrx58SopcfezieVU3HnxKinR97rGRFtuIBy' +
    'MgHUjIi26CIfz//EACkRAAECAwUIAwAAAAAAAAAAAAIBAwAFBgQhMUFREiIyQlJhcfBigaH/' +
    '2gAIAQMBAT8BkFRntiRLv5J795xT1RdK48Xbx+6xZqkeFgUZvGJBPXBMWlW9c4p6fmWHLj8v' +
    'PqxZp088wJiSimkf/8QAKREAAAQFAwMEAwAAAAAAAAAAAQIDEQQFEhMhBhQxIjIzACNBQ0JE' +
    'Uv/aAAgBAgEBPwFWbSpOVKQkIqJpSYXWWHyFUwxSgwCzgl9Ru4c/zMJ3c228Gm02wb72ai7y' +
    'zsk72u4ePxmcx0rGxx1tSRB0I0WuEJkoYACsxFOSUiPWOR+OAV1OjGSpSfpogSGRGg0KHjUM' +
    'LdZsAVwrKOUzeMM8NMJwaD2133N+1l/06qWtc9twrU2vGHGGmetoDTMceWx8GWMVTZ1jtUeo' +
    'AMD1FOPSAgUOocB8cev/xAAjEAAABQQCAwEBAAAAAAAAAAAAAQIDEhETFDFBgSEy8EKx/9oA' +
    'CAEBAAY/AkvvtUSWzCcVMo7CWH/Ci2VAl99qiS2YTiplHYxbMZc1HrOfQyqxlxQYtmMv1Ues' +
    '59C+w1RRaMHlJlHQsMeEloqC+w1RRaMKykyjoI+4DfYR3/Qj7gN9j//EACEQAAEDBAIDAQAA' +
    'AAAAAAAAABEAASExQVGRYXGBwdHh/9oACAEBAAE/IZaHkZwWFlyL4ggV6VajyHBc2UlDyM4L' +
    'CyyA8QaV6TQbeAmnhRvnDeVG2eBFfCaDbgE+l6DwG8p+wPI7guLrjTxBJp0n5Q8NwWN09YHk' +
    'dwXF1hD4gk06W2W5L8F0vgnJbdbkvmnS/9oADAMBAAIAAwAAABAQbOmjH//EAB8RAQACAgIC' +
    'AwAAAAAAAAAAAAERQSExAFGBscHw8f/aAAgBAwEBPxB8QNmE7c+jWu45y/q+mh5SAgwrl7su' +
    'a41FzGch0XTZvk9JPU+UO7PlQYMCYIxSbidXz//EAB0RAQEBAQABBQAAAAAAAAAAAAERIQCh' +
    'UWGBkdH/2gAIAQIBAT8QIhWgCdhGBQJji88+a9ifHz6Z5hlE2OiAwi1DgYdMaoRi2JRceu78' +
    '/qha+onj5UtLhHayZEH/xAAiEAABBAICAwADAAAAAAAAAAABABEhMUFRYZFxgfDB0eH/2gAI' +
    'AQEAAT8Q569YAQRJkgVldVj1C7urSKHz3AEgQYIorm71gBBEmSML1bHE0u7q0qVv4pB3heV+' +
    'In75/GkH6ymQd5VlBfkEhg7wvKDH9H2fxpcU+uAoIgwSJCH6s+oXdl6R1+KgCkCbJN5R5+uw' +
    'CgiDBIpA8aPqF3Zek/WUNCZV4sgrqgIjK//Z',
  prog422:
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUG' +
    'BgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYH' +
    'CgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wgAR' +
    'CAAdACUDASEAAhEBAxEB/8QAGgABAAIDAQAAAAAAAAAAAAAABgAFAwQHCP/EABoBAQEAAgMA' +
    'AAAAAAAAAAAAAAcGAgUDBAj/3QAEAAP/2gAMAwEAAhADEAAAAfJyhf5FFtp29JIdZ//Q5Uhv' +
    'IREimXK/mjVP/9HNebkFu18Y6XExUP/S6CvhPKi3a6jarhau/wD/xAAdEAADAAIDAQEAAAAA' +
    'AAAAAAADBAUAFAECBhUS/90ABAAF/9oACAEBAAEFAp0AqpeY+9k6eJUU7z5VSlj73X//0Fkt' +
    '7Fo/y8W85vYslvYGP8vr/9Hjz4lRS4+9nE8qpuPPiVFOj73X/9KMiLbcQDkZAOpGRFt0EQ/n' +
    '/8QAKxEAAAMGBAQHAAAAAAAAAAAAAAEDAgQFBhESFCEx8BMiQnEVIzNRgaHR/90ABAAD/9oA' +
    'CAEDAQE/AYDFGWl2ViPlIS7Ebbq9egdIumg7MsNnmP/Ql99so711zrvsJfiN9M/T+90CL1ik' +
    'iVupUf/Rl2KNNI8Yz5iEBiNvDp167+R4uogVjB5D/9KBPamOT7folt7U83fuIc9qYJgf/8QA' +
    'NhEAAAQDBQQHBwUAAAAAAAAAAQIREgMEIQUGExUyABQxYRYiIyYzYmMHF0JzgYKhg5Gxs8P/' +
    '2gAIAQIBAT8Bw5ySurMXbjFSdjmeSGoVKDBVwdQPDPQTANOYLa07v2WYFctbvPptY7jrTDPo' +
    'dw5gt5LKtm9ltRbVsqHiQIiNMpSq0oFGhhKbUUQqH42//9CbvNmffNjd27LCVXLRXoCeLwYO' +
    'njWk3O5X5s5+mC/98RMbyK3nQ1/ugI5Dg42D8bmK/tNLTIjk1DwXlt//0bVJJyV6oF24JUko' +
    '5ROeGo1MDxVw9cPDJQDAFOYqE9v2aY9ctdu3pte3hrTDJrdw5it37Lse9lkQ7VtWHiR4iuMp' +
    'iq0wlChRKXSUAoH52//SlZg/uqn/AJofzB2vDMH7s/p/4be0eZP0zmvs/rJt/8QAIxAAAAUE' +
    'AgMBAQAAAAAAAAAAAAECAxIRExQxQYEhMvBCsf/dAAQABf/aAAgBAQAGPwJL77VElswnFTKO' +
    'wlh/wotlQJffaoktmE4qZR2P/9DFsxlzUes59DKrGXFBi2Yy/VR6zn0P/9G+w1RRaMHlJlHQ' +
    'sMeEloqC+w1RRaMKykyjof/SR9wG+wjv+hH3Ab7H/8QAIRAAAQMEAgMBAAAAAAAAAAAAEQAB' +
    'ITFBUZFhcYHB0eH/2gAIAQEAAT8hloeRnBYWXIviCBXpVqPIcFzZSUPIzgsLLIDxBpXpf//Q' +
    'aDbwE08KN84byo2zwIr4TQbcAn0vQeA3lf/RfsDyO4Li6408QSadJ+UPDcFjdPWB5HcFxdYQ' +
    '+IJNOl//0tstyX4LpfBOS263JfNOl//dAAQAA//aAAwDAQACAAMAAAAQMe//0HYf/9G47//S' +
    'qA//xAAiEQABBAIBBAMAAAAAAAAAAAABABExQSFRcWGBkbGhwfD/2gAIAQMBAT8QxCBidHNT' +
    'Yq1JPtd24kSyaDiMjJkk04gr/9B9n+J0a+61rWHh68p6KghDOzYlxrS//9GUgAB0MVFmlPmw' +
    '5uz8ShpQFNwAYYMh5LmSv//S/AUnyCdoH2V//8QAHhEAAgICAwEBAAAAAAAAAAAAAREhgQAx' +
    'QVHwEJH/2gAIAQIBAT8Qhyl4eM0UAnSIwNsqK5ZerxVE/IPxQS0wyBP/0JfhTYs9mCZS58Hw' +
    'XDIp/Cp+kzgaf//Rn5SwsBooJO0Rg2Sorll7vFTI8g/FBLTLIk//0srp/wAhh//EACIQAAEE' +
    'AgIDAAMAAAAAAAAAAAEAESExQVFhkXGB8MHR4f/dAAQABf/aAAgBAQABPxDnr1gBBEmSBWV1' +
    'WPULu6tIofPcASBBgiiubvWAEESZIwvVscTS7urS/9Clb+KQd4XlfiJ++fxpB+spkHeVZQX5' +
    'BIYO8Lygx/R9n8aX/9Hin1wFBEGCRIQ/Vn1C7svSOvxUAUgTZJvKPP12AUEQYJFIHjR9Qu7L' +
    '0v/SfrKGhMq8WQV1QERlf//Z',
  base444:
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUG' +
    'BgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYH' +
    'CgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAAR' +
    'CAAdACUDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAA' +
    'AgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkK' +
    'FhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWG' +
    'h4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl' +
    '5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREA' +
    'AgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYk' +
    'NOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOE' +
    'hYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk' +
    '5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD8nfh18ANX8L6vb67ruleRawbvNl3K23cp' +
    'UcKSTyQOnev634F4V4y8J+MsNxVxVhvq2Aw3P7Wpz06nL7SnOlD3KU6lR3qVIR92Dte7tFNr' +
    '5TKuLsPjsP7ChO83ay1Wzv1stkeoS/B//hOfsv8Awi1p9q+y7vP42bd23b9/Gc7T09K9Dxtz' +
    'v/iPv1L/AFDf136l7X23/Lnk9t7P2f8AH9lzc3sqnwc1uX3rXjf9o4O4i/su/wBafLzWt12v' +
    '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',
  grey:
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUG' +
    'BgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/wAALCAAdACUBAREA/8QAHwAA' +
    'AQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQR' +
    'BRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RF' +
    'RkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ip' +
    'qrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEB' +
    'AAA/APyb+HP7P+r+F9Xt9d13SfItIN3my7lbbuUqOFJJ5IHAr1CX4P8A/CcfZf8AhFrX7V9l' +
    '3ef8uzbuxt+/jOdp6eleofDr4f6R4X0i30LXT5F1Bu82LymbbuYsOVBB4IPB711fw5/Z/wBX' +
    '8L6tb69ruk+RaQbvNl3K2NylRwpJPJA4Felap8Hj45tbf/hFrQXX2Xd5/wAuzbuxt+/jOdp6' +
    'eleQ+GfBI8c7fC39i/ZftX/LfzN+3b8/3cDOduOvevRPC/wdX4Xbf9F+3fbvbytmz/vrOd/t' +
    '0r0Twz+ziPHO3xT5v2X7V/yw8jft2/J97Iznbnp3r0Twz4J/4Tkr4W/sX7L9q/5b+Zv27fn+' +
    '7gZ+7jr3rvdH+Di/C625tft32728rZs/76znf7dK8ug/Z90fwtpEmu6FpXkXUG3ypdzNt3MF' +
    'PDEg8Ejkd67f4V/B0eORMPFNqbr7Ls8j5fL27t277mM52jr6V28Hw81bwvqz6FoR8i0g2+VF' +
    '5Stt3KGPLAk8k969dg/Z90fwvpEmu6FpfkXcG3ypdzNt3MFPDEjoSOneux+HfwdHjm1n/wCE' +
    'ptvtX2XZ5Hy7Nu7du+5jP3R19K+efg14D0f/AIS6yGP+en8P/TNq9c8ZeBNIH9ncf89f4f8A' +
    'cr134NeA9I/4ROyH+/8Aw/8ATRq0/g14C0f/AIS6yGP7/wDD/wBM2r1X4g+A9H+zafx/z1/h' +
    '/wByv//Z',
}
const bytes = (name: string) =>
  Uint8Array.from(atob(FIXTURES[name]), (c) => c.charCodeAt(0))
const source = (x: number, y: number) => [
  Math.floor((255 * x) / (W - 1)),
  Math.floor((255 * y) / (H - 1)),
  (Math.floor(x / 6) + Math.floor(y / 6)) % 2 ? 255 : 40,
]
const luma = (r: number, g: number, b: number) =>
  0.299 * r + 0.587 * g + 0.114 * b

/** Mean and worst difference from the source, per channel or in luma. */
function error(data: Uint8Array, inLuma: boolean) {
  let sum = 0
  let worst = 0
  let n = 0
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4
      const want = source(x, y)
      const pairs = inLuma
        ? [
            [
              luma(data[o], data[o + 1], data[o + 2]),
              luma(want[0], want[1], want[2]),
            ],
          ]
        : [0, 1, 2].map((c) => [data[o + c], want[c]])
      for (const [a, b] of pairs) {
        sum += Math.abs(a - b)
        worst = Math.max(worst, Math.abs(a - b))
        n++
      }
    }
  return { mean: sum / n, worst }
}

describe('jpeg', () => {
  test('every kind decodes to the picture it was made from', () => {
    for (const name of Object.keys(FIXTURES)) {
      const img = jpegDecode(bytes(name))
      expect([img.width, img.height]).toEqual([W, H])
      for (let i = 3; i < img.data.length; i += 4) expect(img.data[i]).toBe(255)
      if (name === 'grey') {
        const { mean, worst } = error(img.data, true)
        expect(img.data[0]).toBe(img.data[1])
        expect(mean).toBeLessThan(2)
        expect(worst).toBeLessThan(8)
      } else if (name === 'base444') {
        const { mean, worst } = error(img.data, false)
        expect(mean).toBeLessThan(3)
        expect(worst).toBeLessThan(16)
      } else {
        // Chroma is halved, so the checker's colour bleeds at its edges;
        // brightness is kept at full resolution.
        const { mean, worst } = error(img.data, true)
        expect(mean).toBeLessThan(3)
        expect(worst).toBeLessThan(24)
      }
    }
  })

  test('progressive and baseline coding of the same picture agree exactly', () => {
    const a = jpegDecode(bytes('base420')).data
    const b = jpegDecode(bytes('prog420')).data
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true)
  })

  test('decodeImage reads either format', () => {
    const jpg = decodeImage(bytes('grey'))
    const png = decodeImage(pngEncode(jpg.data, W, H))
    expect(Buffer.from(png.data).equals(Buffer.from(jpg.data))).toBe(true)
    expect(() => decodeImage(new Uint8Array([1, 2, 3]))).toThrow(/neither/)
    expect(() =>
      jpegDecode(new Uint8Array([0xff, 0xd8, 0xff, 0xc9, 0, 2]))
    ).toThrow(/arithmetic/)
  })

  // MakeHuman's garment textures, where static-assets is checked out: all
  // decode, and where libjpeg-turbo's djpeg is installed (what browsers
  // decode with), a sample agrees with it to a few levels.
  const MH = join(import.meta.dir, '../../static-assets/assets/makehuman')
  const djpeg = spawnSync('djpeg', ['-version']).status === 0
  test.skipIf(!existsSync(MH))(
    "MakeHuman's JPEGs, against libjpeg-turbo",
    () => {
      const files: string[] = []
      const walk = (dir: string) => {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f)
          if (statSync(p).isDirectory()) walk(p)
          else if (/\.jpe?g$/i.test(f)) files.push(p)
        }
      }
      walk(MH)
      expect(files.length).toBeGreaterThan(0)
      let worst = 0
      files.forEach((f, i) => {
        const bytes = new Uint8Array(readFileSync(f))
        const img = jpegDecode(bytes)
        expect(img.width * img.height * 4).toBe(img.data.length)
        if (!djpeg || i % 25) return
        const ppm = spawnSync('djpeg', ['-ppm'], {
          input: bytes,
          maxBuffer: 1 << 28,
        }).stdout as Buffer
        // P6 or P5, width, height, 255, then the samples.
        let p = 0
        const fields: string[] = []
        while (fields.length < 4) {
          while (ppm[p] <= 32) p++
          let s = ''
          while (ppm[p] > 32) s += String.fromCharCode(ppm[p++])
          fields.push(s)
        }
        p++
        const channels = fields[0] === 'P6' ? 3 : 1
        let sum = 0
        for (let k = 0; k < img.width * img.height; k++)
          for (let c = 0; c < 3; c++)
            sum += Math.abs(
              img.data[k * 4 + c] -
                ppm[p + k * channels + (channels === 3 ? c : 0)]
            )
        worst = Math.max(worst, sum / (img.width * img.height * 3))
      })
      expect(worst).toBeLessThan(0.5)
    },
    120000
  )
})
