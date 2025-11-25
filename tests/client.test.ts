import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { VaraJS } from '../index.js';
import { setTimeout } from 'timers/promises';
import { Socket } from 'net';

// 
const HOST: string = '127.0.0.1'
// 
const PORT: number = 8300
// 
const VARA_PATH: string = 'C:\\VARA FM\\VARAFM.exe'
// 
const VARA_TYPE: 'fm' | 'hf' | 'sat' = 'fm'
// 
const CLIENT_CALL: string = 'KO4LCM'
// 
const CLIENT_STRING: string = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam sed congue orci, eget tempus purus. Sed faucibus nisi sit amet faucibus blandit. Etiam vitae varius nisl, vel porttitor neque. Nulla ullamcorper lorem sollicitudin convallis ornare. Sed eleifend dui quis pharetra ullamcorper. Nam rhoncus, libero vel aliquam ornare, sem velit mattis quam, at euismod libero dolor id nunc. Curabitur dui ex, posuere vitae urna ut, ultrices elementum mi. Fusce at aliquam ex.'
// 
const SERVER_CALL: string = 'KO4LCM-1'
// 
const SERVER_STRING: string = 'Praesent semper odio quis posuere luctus. Ut eleifend ornare congue. Sed egestas ullamcorper metus quis convallis. Quisque maximus imperdiet fermentum. Ut id pellentesque sapien. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque et elit ut eros ultrices scelerisque. In nec enim non metus varius tristique. Nullam et magna mauris. Nulla consectetur elit lectus, quis vulputate ex consectetur accumsan. Phasellus ac nisl rutrum, convallis nibh a, laoreet velit. Vestibulum at rhoncus orci. Aenean pharetra consectetur posuere. Nam non viverra nibh, in commodo sem.'
//
const ENCODING: BufferEncoding = 'utf8'
// 
const STARTUP_TIMEOUT: number = 2000
// 
const VERBOSE: boolean = false
//
const HAS_SERVER: boolean = false

/////////////////////////////////////////////////////////////////////

let vjs: VaraJS

beforeAll(async () => {

    // 
    Bun.spawn([VARA_PATH])
    await setTimeout(STARTUP_TIMEOUT)
    vjs = await VaraJS.bindModem({
        host: HOST,
        commandPort: PORT,
        encoding: ENCODING,
        concatenateData: true
    })
    if (VERBOSE) {
        vjs.on('command', (c: string) => {
            console.log('Command: ' + c)
        })
        vjs.on('data', (data: Buffer | string) => {
            console.log('Data: ' + data)
        })
    }

    // 
    test('initial state', () => {
        expect(vjs).toBeInstanceOf(VaraJS)
        // expect(vb.encoding).toBe(ENCODING) // fails in bun due to an upstream bug, but works in node
        expect(vjs.connection).toBeUndefined()
        expect(vjs.listening).toBeFalse()
        expect(vjs.disconnected).toBeTrue()
        expect(vjs.compression).toBe('text')
        if (vjs.varaType === 'hf') {
            expect(vjs.bw).toBe(2300)
        }
        else {
            expect(vjs.bw).toBeUndefined()
        }
        expect(vjs.chat).toBeFalse()
        if (vjs.varaType === 'fm') {
            expect(vjs.session).toBeUndefined()
        }
        else {
            expect(vjs.session).toBe('winlink')
        }
        expect(vjs.ptt).toBeFalse()
        expect(vjs.buffer).toBe(0)
        expect(vjs.pending).toBeFalse()
        expect(vjs.busy).toBeBoolean()
        expect(vjs.registered).toBeArrayOfSize(0)
        expect(vjs.linkRegistered).toBeFalse()
        expect(vjs.sn).toBeUndefined()
        expect(vjs.bitrate).toBeUndefined()
        expect(vjs.encryption).toBeFalse()
        expect(vjs.encryptedLink).toBeFalse()
        expect(vjs.varaType).toBe(VARA_TYPE)

        expect(vjs.commandSocket).toBeInstanceOf(Socket)
        expect(vjs.commandSocket.remoteAddress).toBe(HOST)
        expect(vjs.commandSocket.remotePort).toBe(PORT)
        expect(vjs.commandSocket.readableEncoding).toBe('utf8')

        expect(vjs.dataSocket).toBeInstanceOf(Socket)
        expect(vjs.dataSocket.remoteAddress).toBe(HOST)
        expect(vjs.dataSocket.remotePort).toBe(PORT + 1)
        expect(vjs.dataSocket.readableEncoding).toBe(ENCODING)
        expect(vjs.concatenateData).toBeTrue()
    })

    await vjs.myCall(CLIENT_CALL)
})



describe('state mutations', () => {

    describe(`listen functions and .listening`, () => {
        test(`listenOn()`, async () => {
            await vjs.listenOn()
            expect(vjs.listening).toBeTrue()
        })
        test(`listenOff()`, async () => {
            await vjs.listenOff()
            expect(vjs.listening).toBeFalse()
        })
    })

    describe(`compression functions and .compression`, () => {
        test(`compressionFiles()`, async () => {
            await vjs.compressionFiles()
            expect(vjs.compression).toBe('files')
        })
        test(`compressionOff()`, async () => {
            await vjs.compressionOff()
            expect(vjs.compression).toBe('off')
        })
        test(`compressionText()`, async () => {
            await vjs.compressionText()
            expect(vjs.compression).toBe('text')
        })
    })

    // @ts-ignore
    describe.if(VARA_TYPE === 'HF')(`bandwidth functions and .bw`, () => {
        test(`bw500()`, async () => {
            await vjs.bw500()
            expect(vjs.bw).toBe(500)
        })
        test(`bw2750()`, async () => {
            await vjs.bw2750()
            expect(vjs.bw).toBe(2750)
        })
        test(`bw2300()`, async () => {
            await vjs.bw2300()
            expect(vjs.bw).toBe(2300)
        })
    })

    describe(`chat functions and .chat`, () => {
        test(`chatOn()`, async () => {
            await vjs.chatOn()
            expect(vjs.chat).toBeTrue()
        })
        test(`chatOff()`, async () => {
            await vjs.chatOff()
            expect(vjs.chat).toBeFalse()
        })
    })

    // @ts-ignore
    describe.if(VARA_TYPE === 'HF' || VARA_TYPE === 'SAT')(`session functions and .session`, () => {
        // @ts-ignore
        test.if(VARA_TYPE === 'HF' || VARA_TYPE === 'SAT')(`p2pSession()`, async () => {
            await vjs.p2pSession()
            expect(vjs.session).toBe('p2p')
        })
        // @ts-ignore
        test.if(VARA_TYPE === 'HF' || VARA_TYPE === 'SAT')(`winlinkSession()`, async () => {
            await vjs.winlinkSession()
            expect(vjs.session).toBe('winlink')
        })
    })

    // PTT, BUFFER, PENDING, BUSY CHANGED AUTOMATICALLY BY MODEM
    
    describe(`myCall() and .registered`, () => {
        // vara is very slow to register callsigns, set a very long timeout or else the test may fail
        test(`accepts multiple callsigns as strings`, async () => {
            await vjs.myCall(`${CLIENT_CALL} ${CLIENT_CALL}-15`)
            expect(vjs.registered).toEqual([CLIENT_CALL, `${CLIENT_CALL}-15`])
        }, 10_000)
        test(`accepts a single callsign as an array`, async () => {
            await vjs.myCall([CLIENT_CALL])
            expect(vjs.registered).toEqual([CLIENT_CALL])
        }, 10_000)
        test(`accepts multiple callsigns as an array`, async () => {
            await vjs.myCall([CLIENT_CALL, `${CLIENT_CALL}-14`])
            expect(vjs.registered).toEqual([CLIENT_CALL, `${CLIENT_CALL}-14`])
        }, 10_000)
        test(`accepts a single callsign as a string`, async () => {
            await vjs.myCall(CLIENT_CALL)
            expect(vjs.registered).toEqual([CLIENT_CALL])
        }, 10_000)
    })
    
    // @ts-ignore
    describe.if(VARA_TYPE === 'HF' || VARA_TYPE === 'SAT')(`tune functions`, async () => {

        let originalTune: number
        beforeAll(async () => {
            // if (vjs.registered.length < 1) {
            //     await vjs.myCall(CLIENT_CALL)
            // }
            originalTune = await vjs.tune()
            test(`drive level is between -30 and 0`, () => {
                expect(originalTune).toBeGreaterThanOrEqual(-30)
                expect(originalTune).toBeLessThanOrEqual(0)
            })
        })
        
        test(`tune(-5)`, async () => {
            await vjs.tune(-5)
            await vjs.tuneOff()
            expect(await vjs.tune()).toBe(-5) // TODO: PERHAPS ADD CACHED TUNE PROPERTY TO CLASS?
        })

        afterAll(async () => {
            await vjs.tune(originalTune)
            await vjs.tuneOff()
            expect(await vjs.tune()).toBe(originalTune)
        })
    })
    
    test(`cleanTxBuffer()`, async () => {
        // if (vjs.registered.length < 1) {
        //     await vjs.myCall(CLIENT_CALL)
        // }
        expect(vjs.cleanTxBuffer()).resolves.toBeOneOf(['BUFFEREMPTY', 'OK', 'FAILED'])
    })
    
    test(`version() returns a version string`, async () => {
        expect(await vjs.version()).toStartWith(`VARA ${VARA_TYPE} v`)
    })
})

// test.if(VARA_TYPE === 'FM' || VARA_TYPE === 'SAT')(`sending cq frame`, async () => {
//     await vjs.cqFrame(CLIENT_CALL)
// })

// // @ts-ignore
// test.if(VARA_TYPE === 'HF')(`sending cq frame`, async () => {
//     await vjs.cqFrame(CLIENT_CALL, 2300)
// })

// describe(`connection`, () => {

//     test(`connect(${CLIENT_CALL}, ${SERVER_CALL})`, async () => {
//         await vjs.connect(CLIENT_CALL, SERVER_CALL)
//             expect(vjs.connection?.source).toBe(CLIENT_CALL)
//             expect(vjs.connection?.destination).toBe(SERVER_CALL)
//             expect(vjs.disconnected).toBeFalse()
//             expect(vjs.pending).toBeTrue()
//     }, 10_000)

//     test(`Sending request and awaiting response...`, async () => {
//         vjs.send(CLIENT_STRING)
//         const rx: string | Buffer = await vjs.promise('data')
//         expect(rx).toBeString()
//         expect(rx).toBe(SERVER_STRING)
//         console.log(`Received: ${rx}`)
//     })
//     test(`connection quality`, () => {
//         if (VARA_TYPE === 'FM') {
//             expect(vjs.connection?.bw).toBeOneOf(['NARROW', 'WIDE'])
//             expect(vjs.bitrate?.bps).toBeGreaterThanOrEqual(566)
//         }
//         else if (VARA_TYPE === 'HF') {
//             expect(vjs.connection?.bw).toBeOneOf([500, 2300, 2750])
//             expect(vjs.bitrate?.bps).toBeGreaterThanOrEqual(18)
//         }
//         else {
//             expect(vjs.bitrate?.bps).toBeGreaterThanOrEqual(41)
//         }
//         expect(vjs.bitrate?.sl).toBeGreaterThanOrEqual(1)
//         // expect(vb.bw).toBe(vb.connection?.bw!) // not necessarily
//     })
//     test(`disconnect()`, async () => {
//         await vjs.disconnect()
//         expect(vjs.pending).toBeFalse()
//         expect(vjs.connection).toBeUndefined()
//         expect(vjs.disconnected).toBeTrue()
//     }, 30_000)
// })

afterAll(() => {
    vjs.end()
})