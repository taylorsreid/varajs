import EventEmitter from "events";
import { createConnection, type Socket } from "net";
import { setTimeout } from "timers/promises";

type Emit = 'command' | 'data' | 'CONNECTED' | 'DISCONNECTED' | 'PTT OFF' | 'PTT ON' | 'BUFFER' | 'PENDING' | 'CANCELPENDING' | 'BUSY OFF' | 'BUSY ON' | 'REGISTERED' | 'LINK REGISTERED' | 'LINK UNREGISTERED' | 'IAMALIVE' | 'MISSING SOUNDCARD' | 'CQFRAME' | 'SN' | 'BITRATE' | 'CLEANTXBUFFER' | 'ENCRYPTION DISABLED' | 'ENCRYPTION READY' | 'UNENCRYPTED LINK' | 'ENCRYPTED LINK' | 'OK' | 'WRONG'
type EmitWithoutData = 'DISCONNECTED' | 'PTT OFF' | 'PTT ON' | 'PENDING' | 'CANCELPENDING' | 'BUSY OFF' | 'BUSY ON' | 'LINK REGISTERED' | 'LINK UNREGISTERED' | 'IAMALIVE' | 'MISSING SOUNDCARD' | 'ENCRYPTION DISABLED' | 'ENCRYPTION READY' | 'UNENCRYPTED LINK' | 'ENCRYPTED LINK' | 'OK' | 'WRONG'
type HFBandwidth = 500 | 2300 | 2750

interface ConnectionData {
    source: string,
    destination?: string,
    bw?: HFBandwidth,
    digi1?: string,
    digi2?: string
}

interface BitrateData {
    sl: number,
    bps: number
}

export class VaraBindings extends EventEmitter {

    private readonly commandPort: Socket
    private readonly dataPort: Socket

    private constructor(commandPort: Socket, dataPort: Socket) {

        super()

        this.setMaxListeners(Infinity)

        this.dataPort = dataPort
        this.dataPort.on('data', (data: string) => {
            this.emit('data', data.substring(0, data.indexOf('\r')))
        })

        this.commandPort = commandPort
        this.commandPort.on('data', (command: string) => {

            command = command.substring(0, command.indexOf('\r')); // trim off any junk

            this.emit('command', command)

            switch (command) {
                case 'DISCONNECTED':
                case 'PTT OFF':
                case 'PTT ON':
                case 'PENDING':
                case 'CANCELPENDING':
                case 'BUSY OFF':
                case 'BUSY ON':
                case 'LINK REGISTERED':
                case 'LINK UNREGISTERED':
                case 'IAMALIVE':
                case 'MISSING SOUNDCARD':
                case 'ENCRYPTION DISABLED':
                case 'ENCRYPTION READY':
                case 'UNENCRYPTED LINK':
                case 'ENCRYPTED LINK':
                case 'OK':
                case 'WRONG':
                    this.emit(command as EmitWithoutData)
                    break;
                default:
                    const asArray: string[] = command.split(' ')
                    switch (asArray[0]) {
                        case 'CLEANTXBUFFER':
                            this.emit('CLEANTXBUFFER', asArray[1] as 'BUFFEREMPTY' | 'OK' | 'FAILED')
                            break;
                        case 'CONNECTED':
                            const cd: ConnectionData = {
                                source: asArray[1],
                                destination: asArray[2]
                            }
                            if (asArray.length === 4) {
                                cd.bw = parseInt(asArray[3]) as HFBandwidth
                            }
                            else if (asArray.length === 6) {
                                cd.bw = parseInt(asArray[5]) as HFBandwidth
                                cd.digi1 = asArray[4]
                            }
                            else if (asArray.length === 7) {
                                cd.bw = parseInt(asArray[6]) as HFBandwidth
                                cd.digi1 = asArray[4]
                                cd.digi2 = asArray[5]
                            }
                            this.emit('CONNECTED', cd)
                            break;

                        case 'BUFFER':
                            this.emit('BUFFER', parseInt(asArray[1]))
                            break;

                        case 'REGISTERED':
                            this.emit('REGISTERED', asArray[1])
                            break;

                        case 'CQFRAME':
                            const cq: ConnectionData = {
                                source: asArray[1],
                                digi2: asArray[3] // possibly undefined but that's ok
                            }
                            if (isNaN(parseInt(asArray[2]))) {
                                cq.digi1 = asArray[2] // possibly undefined but that's ok
                            }
                            else { // if it's numeric then it's bandwidth
                                cq.bw = parseInt(asArray[2]) as HFBandwidth
                            }
                            this.emit('CQFRAME', cq)
                            break;

                        case 'SN':
                            this.emit('SN', parseInt(asArray[1]))
                            break;

                        case 'BITRATE':
                            this.emit('BITRATE', {
                                sl: parseInt(asArray[1].substring(1, asArray[1].length - 1)), // remove the surrounding parentheses
                                bps: parseInt(asArray[2])
                            })
                            break;
                    }
            }
        })
    }

    public static async create(host: string, commandPort: number): Promise<VaraBindings> {

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

    private wrongHandler(fun: Function, args: IArguments): void {
        this.once('WRONG', () => {
            throw new Error(`VARA returned "WRONG" for ${fun.name}(${Array.from(args)}).\nCheck your arguments, the order of your function calls, and that this command is compatible with the currently running version of VARA.`)
        })
    }

    public emit<K>(eventName: 'data', data: any): boolean
    public emit<K>(eventName: 'command', command: string): boolean
    public emit<K>(eventName: EmitWithoutData): boolean
    public emit<K>(eventName: 'CLEANTXBUFFER', status: 'BUFFEREMPTY' | 'OK' | 'FAILED'): boolean
    public emit<K>(eventName: 'CONNECTED', connData: ConnectionData): boolean
    public emit<K>(eventName: 'BUFFER', bytes: number): boolean
    public emit<K>(eventName: 'REGISTERED', call: string): boolean
    public emit<K>(eventName: 'CQFRAME', connData: ConnectionData): boolean
    public emit<K>(eventName: 'SN', snValue: number): boolean
    public emit<K>(eventName: 'BITRATE', brData: BitrateData): boolean
    public emit<K>(eventName: Emit, ...args: any[]): boolean {
        return super.emit(eventName, ...args)
    }

    public on<K>(eventName: 'data', listener: (data: any) => void): this
    public on<K>(eventName: 'command', listener: (command: string) => void): this
    public on<K>(eventName: EmitWithoutData, listener: () => void): this
    public on<K>(eventName: 'CLEANTXBUFFER', listener: (status: 'BUFFEREMPTY' | 'OK' | 'FAILED') => void): this
    public on<K>(eventName: 'CONNECTED', listener: (connData: ConnectionData) => void): this
    public on<K>(eventName: 'BUFFER', listener: (bytes: number) => void): this
    public on<K>(eventName: 'REGISTERED', listener: (call: string) => void): this
    public on<K>(eventName: 'CQFRAME', listener: (connData: ConnectionData) => void): this
    public on<K>(eventName: 'SN', listener: (snValue: number) => void): this
    public on<K>(eventName: 'BITRATE', listener: (brData: BitrateData) => void): this
    public on<K>(eventName: Emit, listener: (...args: any[]) => void): this {
        return super.on(eventName, listener)
    }

    public once<K>(eventName: 'data', listener: (data: any) => void): this
    public once<K>(eventName: 'command', listener: (command: string) => void): this
    public once<K>(eventName: EmitWithoutData, listener: () => void): this
    public once<K>(eventName: 'CLEANTXBUFFER', listener: (status: 'BUFFEREMPTY' | 'OK' | 'FAILED') => void): this
    public once<K>(eventName: 'CONNECTED', listener: (connData: ConnectionData) => void): this
    public once<K>(eventName: 'BUFFER', listener: (bytes: number) => void): this
    public once<K>(eventName: 'REGISTERED', listener: (call: string) => void): this
    public once<K>(eventName: 'CQFRAME', listener: (connData: ConnectionData) => void): this
    public once<K>(eventName: 'SN', listener: (snValue: number) => void): this
    public once<K>(eventName: 'BITRATE', listener: (brData: BitrateData) => void): this
    public once<K>(eventName: Emit, listener: (...args: any[]) => void): this {
        return super.once(eventName, listener)
    }

    public close(): void {
        this.commandPort.end()
        this.dataPort.end()
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
                else if (command === 'DISCONNECTED' || command === 'CANCELPENDING') {
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
        return this.ok()
    }

    public async listenOff(): Promise<this> {
        this.commandPort.write('LISTEN OFF\r')
        this.wrongHandler(this.listenOff, arguments)
        return this.ok()
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

        return this.registered().then(() => {
            return this
        })
    }

    public async disconnect(): Promise<this> {
        this.commandPort.write('DISCONNECT\r')
        this.wrongHandler(this.disconnect, arguments)
        return this.ok()
    }

    public async abort(): Promise<this> {
        this.commandPort.write('ABORT\r')
        this.wrongHandler(this.abort, arguments)
        return this.ok()
    }

    public async compressionOff(): Promise<this> {
        this.commandPort.write('COMPRESSION OFF\r')
        this.wrongHandler(this.compressionOff, arguments)
        return this.ok()
    }

    public async compressionText(): Promise<this> {
        this.commandPort.write('COMPRESSION TEXT\r')
        this.wrongHandler(this.compressionText, arguments)
        return this.ok()
    }

    public async compressionFiles(): Promise<this> {
        this.commandPort.write('COMPRESSION FILES\r')
        this.wrongHandler(this.compressionFiles, arguments)
        return this.ok()
    }

    public async bw500(): Promise<this> {
        this.commandPort.write('BW500\r')
        this.wrongHandler(this.bw500, arguments)
        return this.ok()
    }

    public async bw2300(): Promise<this> {
        this.commandPort.write('BW2300\r')
        this.wrongHandler(this.bw2300, arguments)
        return this.ok()
    }

    public async bw2750(): Promise<this> {
        this.commandPort.write('BW2750\r')
        this.wrongHandler(this.bw2750, arguments)
        return this.ok()
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
        // return this.resolveOnResponseOrTimeout(['OK'], 10)
        return this.ok()
    }

    public async sendCqFrame(source: string): Promise<this> // vara fm and vara sat
    public async sendCqFrame(source: string, bw: HFBandwidth): Promise<this> // vara hf
    public async sendCqFrame(source: string, digi1?: string, digi2?: string): Promise<this> // vara fm
    public async sendCqFrame(source: string, bwOrDigi1?: HFBandwidth | string, digi2?: string): Promise<this> {
        if (bwOrDigi1 && digi2) {
            this.commandPort.write(`CQFRAME ${source} ${bwOrDigi1} ${digi2}\r`)
        }
        else if (bwOrDigi1) {
            this.commandPort.write(`CQFRAME ${source} ${bwOrDigi1}\r`)
        }
        else {
            this.commandPort.write(`CQFRAME ${source}\r`)
        }
        this.wrongHandler(this.sendCqFrame, arguments)
        
        return this.pttOff() // final command after ok and pending that indicates that you're free to queue/send more data
    }

    public async winlinkSession(): Promise<this> {
        this.commandPort.write('WINLINK SESSION\r')
        this.wrongHandler(this.winlinkSession, arguments)
        return this.ok()
    }

    public async p2pSession(): Promise<this> {
        this.commandPort.write('P2P SESSION\r')
        this.wrongHandler(this.p2pSession, arguments)
        return this.ok()
    }

    public async setTune(negativeDecibels: number): Promise<this> {
        if (!this.registered) {
            throw new Error('You must set at least one callsign with myCall() before calling setTune().')
        }
        if (negativeDecibels > 0 || negativeDecibels < -30) {
            throw new Error(`${negativeDecibels} is an invalid decibel value. Values must be between -30 and 0, inclusive.`)
        }
        this.commandPort.write(`TUNE ${negativeDecibels}\r`)
        this.wrongHandler(this.setTune, arguments)
        return this.ok()
    }

    public async getTune(): Promise<number> {
        if (!this.registered) {
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
        if (!this.registered) {
            throw new Error('You must set at least one callsign with myCall() before calling tuneOff().')
        }
        this.commandPort.write('TUNE OFF\r')
        this.wrongHandler(this.tuneOff, arguments)
        return this.ok()
    }

    public async cleanTxBuffer(): Promise<'BUFFEREMPTY' | 'OK' | 'FAILED'> {
        if (!this.registered) {
            throw new Error('You must set at least one callsign with myCall() before calling cleanTxBuffer().')
        }
        this.commandPort.write('CLEANTXBUFFER\r')
        this.wrongHandler(this.cleanTxBuffer, arguments)
        return new Promise((resolve, reject) => {
            const response = (command: string) => {
                const status: 'BUFFEREMPTY' | 'OK' | 'FAILED' = command.substring(14) as 'BUFFEREMPTY' | 'OK' | 'FAILED'
                if (status === 'OK' || status === 'BUFFEREMPTY') {
                    resolve(status)
                    this.removeListener('command', response)
                }
                else if (status === 'FAILED') {
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

    //TODO: run on desktop and test
    public send(payload: any): this {
        this.dataPort.write(payload)
        this.wrongHandler(this.send, arguments)
        return this
    }

    /////

    public async command(): Promise<string> {
        return new Promise((resolve) => {
            this.once('command', (command: string) => {
                resolve(command)
            })
        })
    }

    public async data(): Promise<any> {
        return new Promise((resolve) => {
            this.once('data', (data: any) => {
                resolve(data)
            })
        })
    }

    public async connected(): Promise<ConnectionData> {
        return new Promise((resolve) => {
            this.once('CONNECTED', (cd) => {
                resolve(cd)
            })
        })
    }

    public async disconnected(): Promise<this> {
        return new Promise((resolve) => {
            this.once('DISCONNECTED', () => {
                resolve(this)
            })
        })
    }

    public async pttOff(): Promise<this> {
        return new Promise((resolve) => {
            this.once('PTT OFF', () => {
                resolve(this)
            })
        })
    }

    public async pttOn(): Promise<this> {
        return new Promise((resolve) => {
            this.once('PTT ON', () => {
                resolve(this)
            })
        })
    }

    public async buffer(): Promise<number> {
        return new Promise((resolve) => {
            this.once('BUFFER', (bytes) => {
                resolve(bytes)
            })
        })
    }

    public async pending(): Promise<this> {
        return new Promise((resolve) => {
            this.once('PENDING', () => {
                resolve(this)
            })
        })
    }

    public async cancelPending(): Promise<this> {
        return new Promise((resolve) => {
            this.once('CANCELPENDING', () => {
                resolve(this)
            })
        })
    }

    public async busyOff(): Promise<this> {
        return new Promise((resolve) => {
            this.once('BUSY OFF', () => {
                resolve(this)
            })
        })
    }

    public async busyOn(): Promise<this> {
        return new Promise((resolve) => {
            this.once('BUSY ON', () => {
                resolve(this)
            })
        })
    }

    public async registered(): Promise<string> {
        return new Promise((resolve) => {
            this.once('REGISTERED', (call) => {
                resolve(call)
            })
        })
    }

    public async linkRegistered(): Promise<this> {
        return new Promise((resolve) => {
            this.once('LINK REGISTERED', () => {
                resolve(this)
            })
        })
    }

    public async linkUnregistered(): Promise<this> {
        return new Promise((resolve) => {
            this.once('LINK UNREGISTERED', () => {
                resolve(this)
            })
        })
    }

    public async iAmAlive(): Promise<this> {
        return new Promise((resolve) => {
            this.once('IAMALIVE', () => {
                resolve(this)
            })
        })
    }

    public async missingSoundcard(): Promise<this> {
        return new Promise((resolve) => {
            this.once('MISSING SOUNDCARD', () => {
                resolve(this)
            })
        })
    }

    public async receiveCqFrame(): Promise<ConnectionData> {
        return new Promise((resolve) => {
            this.once('CQFRAME', (cd) => {
                resolve(cd)
            })
        })
    }

    public async sn(): Promise<number> {
        return new Promise((resolve) => {
            this.once('SN', (snValue) => {
                resolve(snValue)
            })
        })
    }

    public async bitrate(): Promise<BitrateData> {
        return new Promise((resolve) => {
            this.once('BITRATE', (br) => {
                resolve(br)
            })
        })
    }

    public async encryptionDisabled(): Promise<this> {
        return new Promise((resolve) => {
            this.once('ENCRYPTION DISABLED', () => {
                resolve(this)
            })
        })
    }

    public async encryptionReady(): Promise<this> {
        return new Promise((resolve) => {
            this.once('ENCRYPTION READY', () => {
                resolve(this)
            })
        })
    }

    public async unencryptedLink(): Promise<this> {
        return new Promise((resolve) => {
            this.once('UNENCRYPTED LINK', () => {
                resolve(this)
            })
        })
    }

    public async encryptedLink(): Promise<this> {
        return new Promise((resolve) => {
            this.once('ENCRYPTED LINK', () => {
                resolve(this)
            })
        })
    }

    public async ok(): Promise<this> {
        return new Promise((resolve) => {
            this.once('OK', () => {
                resolve(this)
            })
        })
    }

    public async wrong(): Promise<this> {
        return new Promise((resolve) => {
            this.once('WRONG', () => {
                resolve(this)
            })
        })
    }

}