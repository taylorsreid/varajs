import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { VaraBindings } from '../index.js';
import config from './config.test.js';
import { spawnVara } from './setup.test.js';

let vb: VaraBindings

beforeAll(async () => {
    vb = await spawnVara()
})

afterAll(() => {
    vb.end()
})

test.if(config.varaType === 'FM' || config.varaType === 'SAT')(`sending cq frame`, async () => {
    await vb.cqFrame(config.clientCallsign)
})

test.if(config.varaType === 'HF')(`sending cq frame`, async () => {
    await vb.cqFrame(config.clientCallsign, 2300)
})

describe(`connection`, () => {
    test(`connect(${config.clientCallsign, config.serverCallsign})`, async () => {
        await vb.connect(config.clientCallsign, config.serverCallsign)
        expect(vb.connection?.source).toBe(config.clientCallsign)
        expect(vb.connection?.destination).toBe(config.serverCallsign)
        expect(vb.disconnected).toBeFalse()
        expect(vb.pending).toBeTrue()
        // expect(vb.promise('command')).resolves.toBeString()
    }, 10_000)
    test(`Sending request and awaiting response...`, async () => {
        vb.send(config.clientString)
        const rx: string | Buffer = await vb.promise('data')
        expect(rx).toBeString()
        expect(rx).toBe(config.serverString)
        console.log(`Received: ${rx}`)
    })
    test(`connection quality`, () => {
        if (config.varaType === 'FM') {
            expect(vb.connection?.bw).toBeOneOf(['NARROW', 'WIDE'])
            expect(vb.bitrate?.bps).toBeGreaterThanOrEqual(566)
        }
        else if (config.varaType === 'HF') {
            expect(vb.connection?.bw).toBeOneOf([500, 2300, 2750])
            expect(vb.bitrate?.bps).toBeGreaterThanOrEqual(18)
        }
        else {
            expect(vb.bitrate?.bps).toBeGreaterThanOrEqual(41)
        }
        expect(vb.bitrate?.sl).toBeGreaterThanOrEqual(1)
        // TODO: these are duplicate values, clean them up?
        expect(vb.bw).toBe(vb.connection?.bw!)
    })
    test(`disconnect()`, async () => {
        await vb.disconnect()
        expect(vb.pending).toBeFalse()
        expect(vb.connection).toBeUndefined()
        expect(vb.disconnected).toBeTrue()
    }, 30_000)
})