import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { VaraBindings } from '../index.js';
import config from './config.test.js';
import { spawnVara } from './setup.test.js';
import { Socket } from 'net';

let vb: VaraBindings

beforeAll(async () => {
    vb = await spawnVara()
    expect(vb).toBeInstanceOf(VaraBindings)
    // expect(vb.encoding).toBe(ENCODING) // fails in bun due to an upstream bug, but works in node
    expect(vb.connection).toBeUndefined()
    expect(vb.listening).toBeFalse()
    expect(vb.disconnected).toBeTrue()
    expect(vb.compression).toBe('TEXT')
    if (vb.varaType === 'HF') {
        expect(vb.bw).toBe(2300)
    }
    else {
        expect(vb.bw).toBeUndefined()
    }
    expect(vb.chat).toBeFalse()
    if (vb.varaType === 'FM') {
        expect(vb.session).toBeUndefined()
    }
    else {
        expect(vb.session).toBe('WINLINK')
    }
    expect(vb.ptt).toBeFalse()
    expect(vb.buffer).toBe(0)
    expect(vb.pending).toBeFalse()
    expect(vb.busy).toBeBoolean()
    expect(vb.registered).toBeArrayOfSize(0)
    expect(vb.linkRegistered).toBeFalse()
    expect(vb.sn).toBeUndefined()
    expect(vb.bitrate).toBeUndefined()
    expect(vb.encryption).toBeFalse()
    expect(vb.encryptedLink).toBeFalse()
    expect(vb.varaType).toBe(config.varaType as "HF" | "FM" | "SAT")
    expect(vb.commandPort).toBeInstanceOf(Socket)
    expect(vb.dataPort).toBeInstanceOf(Socket)
    // expect(vb.commandPort.localPort).toBe(config.PORT)
    // expect(vb.dataPort.localPort).toBe(config.PORT + 1)
})

afterAll(() => {
    vb.end()
})

describe(`listen functions`, () => {
    test(`listenOn() mutates internal state correctly`, async () => {
        await vb.listenOn()
        expect(vb.listening).toBeTrue()
    })
    test(`listenOff() mutates internal state correctly`, async () => {
        await vb.listenOff()
        expect(vb.listening).toBeFalse()
    })
})

describe(`myCall()`, () => {
    test(`accepts a single callsign as a string`, async () => {
        await vb.myCall(config.clientCallsign)
        expect(vb.registered).toEqual([config.clientCallsign])
    }, 10_000) // vara is very slow to register callsigns, set a very long timeout or else the test may fail
    test(`accepts multiple callsigns as strings`, async () => {
        await vb.myCall(`${config.serverCallsign} ${config.clientCallsign}`)
        expect(vb.registered).toEqual([config.serverCallsign, config.clientCallsign])
    }, 10_000)
    test(`accepts a single callsign as an array`, async () => {
        await vb.myCall([config.clientCallsign])
        expect(vb.registered).toEqual([config.clientCallsign])
    }, 10_000)
    test(`accepts multiple callsigns as an array`, async () => {
        await vb.myCall([config.serverCallsign, config.clientCallsign])
        expect(vb.registered).toEqual([config.serverCallsign, config.clientCallsign])
    }, 10_000)
})

describe(`compression functions`, () => {
    test(`compressionFiles() mutates internal state correctly`, async () => {
        await vb.compressionFiles()
        expect(vb.compression).toBe('FILES')
    })
    test(`compressionOff() mutates internal state correctly`, async () => {
        await vb.compressionOff()
        expect(vb.compression).toBe('OFF')
    })
    test(`compressionText() mutates internal state correctly`, async () => {
        await vb.compressionText()
        expect(vb.compression).toBe('TEXT')
    })
})

describe.if(config.varaType === 'HF')(`bandwidth functions`, () => {
    test(`bw500() mutates internal state correctly`, async () => {
        await vb.bw500()
        expect(vb.bw).toBe(500)
    })
    test(`bw2750() mutates internal state correctly`, async () => {
        await vb.bw2750()
        expect(vb.bw).toBe(2750)
    })
    test(`bw2300() mutates internal state correctly`, async () => {
        await vb.bw2300()
        expect(vb.bw).toBe(2300)
    })
})

describe(`chat functions`, () => {
    test(`chatOn() mutates internal state correctly`, async () => {
        await vb.chatOn()
        expect(vb.chat).toBeTrue()
    })
    test(`chatOff() mutates internal state correctly`, async () => {
        await vb.chatOff()
        expect(vb.chat).toBeFalse()
    })
})

describe.if(config.varaType === 'HF' || config.varaType === 'SAT')(`session functions`, () => {
    test.if(config.varaType === 'HF' || config.varaType === 'SAT')(`p2pSession() mutates internal state correctly`, async () => {
        await vb.p2pSession()
        expect(vb.session).toBe('P2P')
    })
    test.if(config.varaType === 'HF' || config.varaType === 'SAT')(`winlinkSession() mutates internal state correctly`, async () => {
        await vb.winlinkSession()
        expect(vb.session).toBe('WINLINK')
    })
})

describe.if(config.varaType === 'HF' || config.varaType === 'SAT')(`tune functions`, async () => {
    if (vb.registered.length < 1) {
        await vb.myCall(config.clientCallsign)
    }
    let originalTune: number
    if (config.varaType === 'HF' || config.varaType === 'SAT') {
        originalTune = await vb.tune()
    }
    test.if(config.varaType === 'HF' || config.varaType === 'SAT')(`drive level is between -30 and 0`, () => {
        expect(originalTune).toBeGreaterThanOrEqual(-30)
        expect(originalTune).toBeLessThanOrEqual(0)
    })
    test.if(config.varaType === 'HF' || config.varaType === 'SAT')(`throw on setting an invalid drive level`, () => {
        expect(async () => { await vb.tune(-31) }).toThrow()
        expect(async () => { await vb.tune(1) }).toThrow()
    })
    test.if(config.varaType === 'HF' || config.varaType === 'SAT')(`set in VARA`, async () => {
        await vb.tune(-5)
        await vb.tuneOff()
        expect(await vb.tune()).toBe(-5)
        await vb.tune(originalTune)
        await vb.tuneOff()
    })
})

test(`cleanTxBuffer()`, async () => {
    if (vb.registered.length < 1) {
        await vb.myCall(config.clientCallsign)
    }
    expect(vb.cleanTxBuffer()).resolves.toBeOneOf(['BUFFEREMPTY', 'OK', 'FAILED'])
})

test(`version() returns a version string`, async () => {
    expect(await vb.version()).toStartWith(`VARA ${config.varaType} v`)
})
