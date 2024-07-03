import EventEmitter from "events";
import { createConnection, type Socket } from "net";
import { resolve } from "path";
import { setTimeout } from "timers/promises";

interface Connected {
    source: string,
    destination: string,
    bw?: number,
    digi1?: string,
    digi2?: string
}

export class VaraBindings extends EventEmitter {

    private readonly commandPort: Socket
    private readonly dataPort: Socket
    private myCallIsSet: boolean = false

    // constructor(host: string, commandPort: number) {

    //     super()

    //     this.commandPort = createConnection({
    //         host: host,
    //         port: commandPort
    //     }).setEncoding('utf8').on('data', (command: string) => {
    //         this.emit('command', command.substring(0, command.indexOf('\r')))
    //     })

    //     this.dataPort = createConnection({
    //         host: host,
    //         port: commandPort + 1
    //     }).setEncoding('utf8').on('data', (data: string) => {
    //         this.emit('data', data.substring(0, data.indexOf('\r')))
    //     })

    // }

    private constructor(commandPort: Socket, dataPort: Socket) {

        super()

        this.commandPort = commandPort
        this.commandPort.on('data', (command: string) => {
            this.emit('command', command.substring(0, command.indexOf('\r')))
        })

        this.dataPort = dataPort
        this.dataPort.on('data', (data: string) => {
            this.emit('data', data.substring(0, data.indexOf('\r')))
        })

    }

    public static async open(host: string, commandPort: number): Promise<VaraBindings> {

        const c = createConnection({
            host: host,
            port: commandPort
        }).setEncoding('utf8')

        const d = createConnection({
            host: host,
            port: commandPort + 1
        }).setEncoding('utf8')

        return new Promise((resolve) => {
            const isReady = async () => {
                if (c.readyState === 'open' && d.readyState === 'open') {
                    // sometimes the ports still aren't ready even if they claim to be
                    // waiting anything less than ~100ms will occasionally leave the next function's returned promise unresolved
                    await setTimeout(100)
                    resolve(new VaraBindings(c, d))
                }
            }
            c.once('ready', isReady)
            d.once('ready', isReady)
        })
    }

    public close(): void {
        this.commandPort.end()
        this.dataPort.end()
    }

    private isOk(): Promise<this> {
        return new Promise((resolve) => {
            const _internal = (command: string) => {
                if (command === 'OK') {
                    resolve(this)
                    this.removeListener('command', _internal)
                }
            }
            this.on('command', _internal)
        })
    }

    private wrongHandler(fun: Function, args: IArguments): void {
        this.once('command', (c: string) => {
            if (c === 'WRONG') {
                throw new Error(`VARA returned "WRONG" for ${fun.name}(${Array.from(args)}).\nCheck your arguments, the order of your function calls, and that this command is compatible with the currently running version of VARA.`)
            }
        })
    }

    public async connect(source: string, destination: string, digi1?: string, digi2?: string): Promise<this> {
        if (digi1 && digi2) {
            this.commandPort.write(`CONNECT ${source} ${destination} VIA ${digi1} ${digi2}\r`)
        }
        else if (digi1) {
            this.commandPort.write(`CONNECT ${source} ${destination} VIA ${digi1}\r`)
        }
        else {
            this.commandPort.write(`CONNECT ${source} ${destination}\r`)
        }
        this.wrongHandler(this.connect, arguments)
        return new Promise((resolve, reject) => {
            const check = (command: string) => {
                if (command === 'PENDING' || command.startsWith('CONNECTED')) {
                    resolve(this)
                    this.removeListener('command', check)
                }
                else if (command === 'DISCONNECTED') {
                    reject(`VARA was unable to make a connection to ${destination}.`)
                    this.removeListener('command', check)
                }
            }
            this.on('command', check)
        })
    }

    public async listenOn(): Promise<this> {
        this.commandPort.write('LISTEN ON\r')
        this.wrongHandler(this.listenOn, arguments)
        return this.isOk()
    }

    public async listenOff(): Promise<this> {
        this.commandPort.write('LISTEN OFF\r')
        this.wrongHandler(this.listenOff, arguments)
        return this.isOk()
    }

    public async myCall(call1: string, call2?: string, call3?: string, call4?: string, call5?: string): Promise<this> {
        let callString = 'MYCALL '
        for (let i = 0; i < arguments.length; i++) {
            callString += arguments[i]

            if (i === arguments.length - 1) {
                callString += '\r'
            }
            else {
                callString += ' '
            }
        }
        this.commandPort.write(callString)
        this.wrongHandler(this.myCall, arguments)
        return new Promise((resolve) => {
            const isRegistered = (command: string) => {
                if (command.startsWith('REGISTERED')) {
                    this.myCallIsSet = true
                    resolve(this)
                    this.removeListener('command', isRegistered)
                }
            }
            this.on('command', isRegistered)
        })
    }

    public async disconnect(): Promise<this> {
        this.commandPort.write('DISCONNECT\r')
        this.wrongHandler(this.disconnect, arguments)
        return this.disconnected()
    }

    public async abort(): Promise<this> {
        this.commandPort.write('ABORT\r')
        this.wrongHandler(this.abort, arguments)
        return this.isOk()
    }

    public async compressionOff(): Promise<this> {
        this.commandPort.write('COMPRESSION OFF\r')
        this.wrongHandler(this.compressionOff, arguments)
        return this.isOk()
    }

    public async compressionText(): Promise<this> {
        this.commandPort.write('COMPRESSION TEXT\r')
        this.wrongHandler(this.compressionText, arguments)
        return this.isOk()
    }

    public async compressionFiles(): Promise<this> {
        this.commandPort.write('COMPRESSION FILES\r')
        this.wrongHandler(this.compressionFiles, arguments)
        return this.isOk()
    }

    public async bw500(): Promise<this> {
        this.commandPort.write('BW500\r')
        this.wrongHandler(this.bw500, arguments)
        return this.isOk()
    }

    public async bw2300(): Promise<this> {
        this.commandPort.write('BW2300\r')
        this.wrongHandler(this.bw2300, arguments)
        return this.isOk()
    }

    public async bw2750(): Promise<this> {
        this.commandPort.write('BW2750\r')
        this.wrongHandler(this.bw2750, arguments)
        return this.isOk()
    }

    public async chatOn(): Promise<this> {
        this.commandPort.write('CHAT ON\r')
        this.wrongHandler(this.chatOn, arguments)

        /**
         * Vara HF doesn't return ok like it's supposed to. Vara FM does though.
         * This seems to be an upstream bug since the dev doc states that all Vara versions should return ok.
         * 
         * Hoping that a future version of Vara HF fixes this and to avoid breaking the JS API when it does,
         * and in order to provide a consistent experience with all of the functions returning a promise,
         * we'll just return a resolved promise for now.
         */
        return Promise.resolve(this)
    }

    public async chatOff(): Promise<this> {
        this.commandPort.write('CHAT OFF\r')
        this.wrongHandler(this.chatOff, arguments)

        // Oddly enough, it returns ok in HF and FM for chat off though...
        return this.isOk()
    }

    public async cqFrame(source: string): Promise<this> // vara fm and vara sat
    public async cqFrame(source: string, bw: 500 | 2300 | 2750): Promise<this> // vara hf
    public async cqFrame(source: string, digi1?: string, digi2?: string): Promise<this> // vara fm
    public async cqFrame(source: string, bwOrDigi1?: 500 | 2300 | 2750 | string, digi2?: string): Promise<this> {
        if (bwOrDigi1 && digi2) {
            this.commandPort.write(`CQFRAME ${source} ${bwOrDigi1} ${digi2}\r`)
        }
        else if (bwOrDigi1) {
            this.commandPort.write(`CQFRAME ${source} ${bwOrDigi1}\r`)
        }
        else {
            this.commandPort.write(`CQFRAME ${source}\r`)
        }
        this.wrongHandler(this.cqFrame, arguments)
        return this.isOk()
    }

    public async winlinkSession(): Promise<this> {
        this.commandPort.write('WINLINK SESSION\r')
        this.wrongHandler(this.winlinkSession, arguments)
        return this.isOk()
    }

    public async p2pSession(): Promise<this> {
        this.commandPort.write('P2P SESSION\r')
        this.wrongHandler(this.p2pSession, arguments)
        return this.isOk()
    }

    public async setTune(negativeDecibels: number): Promise<this> {
        if (!this.myCallIsSet) {
            throw new Error('You must set at least one callsign with myCall() before calling setTune().')
        }
        if (negativeDecibels > 0 || negativeDecibels < -30) {
            throw new Error(`${negativeDecibels} is an invalid decibel value. Values must be between -30 and 0, inclusive.`)
        }
        this.commandPort.write(`TUNE ${negativeDecibels}\r`)
        this.wrongHandler(this.setTune, arguments)
        return this.isOk()
    }

    public async getTune(): Promise<number> {
        if (!this.myCallIsSet) {
            throw new Error('You must set at least one callsign with myCall() before calling getTune().')
        }
        this.commandPort.write('TUNE ?\r')
        this.wrongHandler(this.getTune, arguments)
        return new Promise((resolve) => {
            const isTune = (command: string) => {
                if (command.startsWith('TUNE')) {
                    resolve(parseInt(command.substring(5)))
                    this.removeListener('command', isTune)
                }
            }
            this.on('command', isTune)
        })
    }

    public async tuneOff(): Promise<this> {
        if (!this.myCallIsSet) {
            throw new Error('You must set at least one callsign with myCall() before calling tuneOff().')
        }
        this.commandPort.write('TUNE OFF\r')
        this.wrongHandler(this.tuneOff, arguments)
        return this.isOk()
    }

    public async cleanTxBuffer(): Promise<this> {
        if (!this.myCallIsSet) {
            throw new Error('You must set at least one callsign with myCall() before calling cleanTxBuffer().')
        }
        this.commandPort.write('CLEANTXBUFFER\r')
        this.wrongHandler(this.cleanTxBuffer, arguments)
        return new Promise((resolve, reject) => {
            const response = (command: string) => {
                if (command === 'CLEANTXBUFFEROK' || command === 'CLEANTXBUFFERBUFFEREMPTY') {
                    resolve(this)
                    this.removeListener('command', response)
                }
                else if (command === 'CLEANTXBUFFERFAILED') {
                    reject('Unable to erase the TX Buffer at the moment.')
                }
            }
            this.on('command', response)
        })
    }

    public async version(): Promise<string> {
        this.commandPort.write('VERSION\r')
        this.wrongHandler(this.version, arguments)

        return new Promise((resolve) => {
            const isVersion = (command: string) => {
                if (command.startsWith('VERSION VARA')) {
                    resolve(command)
                    this.removeListener('command', isVersion)
                }
            }

            this.on('command', isVersion)
        })
    }

    public send(payload: any): this {
        this.dataPort.write(payload)
        this.wrongHandler(this.send, arguments)
        return this
    }

    /////

    private async expect(expected: string, stream: 'command' | 'data' = 'command'): Promise<this> {
        return new Promise((resolve) => {
            const isExpected = (cOrD: string) => {
                if (cOrD === expected) {
                    resolve(this)
                    this.removeListener(stream, isExpected)
                }
            }
            this.on(stream, isExpected)
        })
    }

    public async getCommand(): Promise<string> {
        return new Promise((resolve) => {
            this.once('command', (c: string) => {
                resolve(c)
            })
        })
    }

    public async getData(): Promise<string> {
        return new Promise((resolve) => {
            this.once('data', (d: string) => {
                resolve(d)
            })
        })
    }

    public async connected(): Promise<Connected> {
        return new Promise((resolve) => {
            const isConnected = (command: string) => {
                if (command.startsWith('CONNECTED')) {
                    const asArray: string[] = command.split(' ')
                    const asObj: Connected = {
                        source: asArray[1],
                        destination: asArray[2]
                    }
                    if (asArray.length === 4) {
                        asObj.bw = parseInt(asArray[3])
                    }
                    else if (asArray.length === 6) {
                        asObj.bw = parseInt(asArray[5])
                        asObj.digi1 = asArray[4]
                    }
                    else if (asArray.length === 7) {
                        asObj.bw = parseInt(asArray[6])
                        asObj.digi1 = asArray[4]
                        asObj.digi2 = asArray[5]
                    }
                    resolve(asObj)
                    this.removeListener('command', isConnected)
                }
            }
            this.on('command', isConnected)
        })
    }

    public async disconnected(): Promise<this> {
        // return new Promise((resolve) => {
        //     const isDisconnected = (command: string) => {
        //         if (command === 'DISCONNECTED') {
        //             resolve(this)
        //             this.removeListener('command', isDisconnected)
        //         }
        //     }
        //     this.on('command', isDisconnected)
        // })
        return this.expect('DISCONNECTED')
    }

    public async pttOff(): Promise<this> {
        // return new Promise((resolve) => {
        //     const isOff = (command: string) => {
        //         if (command === 'PTT OFF') {
        //             resolve(this)
        //             this.removeListener('command', isOff)
        //         }
        //     }
        //     this.on('command', isOff)
        // })
        return this.expect('PTT OFF')
    }

    public async pttOn(): Promise<this> {
        // return new Promise((resolve) => {
        //     const isOn = (command: string) => {
        //         if (command === 'PTT ON') {
        //             resolve(this)
        //             this.removeListener('command', isOn)
        //         }
        //     }
        //     this.on('command', isOn)
        // })
        return this.expect('PTT ON')
    }

    public async buffer(): Promise<number> {
        return new Promise((resolve) => {
            const isBuffer = (command: string) => {
                if (command.startsWith('BUFFER')) {
                    resolve(parseInt(command.split(' ')[1]))
                    this.removeListener('command', isBuffer)
                }
            }
            this.on('command', isBuffer)
        })
    }

    public async pending(): Promise<this> {
        return this.expect('PENDING')
    }

    public async cancelPending(): Promise<this> {
        return this.expect('CANCELPENDING')
    }

}