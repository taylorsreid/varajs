import EventEmitter from "events";
import { createConnection as createNetConnection, type Socket } from "net";

export type Emit = 'command' | 'data' | 'CONNECTED' | 'DISCONNECTED' | 'PTT OFF' | 'PTT ON' | 'BUFFER' | 'PENDING' | 'CANCELPENDING' | 'BUSY OFF' | 'BUSY ON' | 'REGISTERED' | 'LINK REGISTERED' | 'LINK UNREGISTERED' | 'IAMALIVE' | 'MISSING SOUNDCARD' | 'CQFRAME' | 'SN' | 'BITRATE' | 'CLEANTXBUFFER' | 'ENCRYPTION DISABLED' | 'ENCRYPTION READY' | 'UNENCRYPTED LINK' | 'ENCRYPTED LINK' | 'OK' | 'WRONG'
export type EmitWithoutData = 'DISCONNECTED' | 'PTT OFF' | 'PTT ON' | 'PENDING' | 'CANCELPENDING' | 'BUSY OFF' | 'BUSY ON' | 'LINK REGISTERED' | 'LINK UNREGISTERED' | 'IAMALIVE' | 'MISSING SOUNDCARD' | 'ENCRYPTION DISABLED' | 'ENCRYPTION READY' | 'UNENCRYPTED LINK' | 'ENCRYPTED LINK' | 'OK' | 'WRONG'
export type HFBandwidth = 500 | 2300 | 2750
export type CleanTxBufferState = 'BUFFEREMPTY' | 'OK' | 'FAILED'

export interface ConnectionData {
    source: string,
    destination?: string,
    bw?: HFBandwidth,
    digi1?: string,
    digi2?: string
}

export interface BitrateData {
    speedLevel: number,
    bitsPerSecond: number
}

export class VaraBindings extends EventEmitter {
    private readonly commandPort: Socket
    private readonly dataPort: Socket
    private readonly varaType: 'HF' | 'FM' | 'SAT'

    // application -> vara
    private _listen: boolean = false
    private _compression: 'OFF' | 'TEXT' | 'FILES' = 'TEXT'
    private _bw: 500 | 2300 | 2750 = 2300
    private _chat: boolean | undefined // no default listed in dev doc
    private _session: 'WINLINK' | 'P2P' = 'WINLINK'
    private _tune: number | undefined
    private _tuneOn: boolean = false
    private _version: string | undefined

    // vara -> application
    private _command: string = ''
    private _data: any
    private _connected: ConnectionData | undefined
    private _ptt: boolean = false
    private _buffer: number = 0
    private _pending: boolean = false    
    private _busy: boolean = false
    private _myCallRegistered: string[] = []
    private _linkRegistered: boolean = false
    private _iAmAlive: number | undefined
    private _missingSoundcard: boolean = false
    private _cqFrame: ConnectionData | undefined
    private _sn: number | undefined
    private _bitrate: BitrateData | undefined
    private _cleanTxBuffer: CleanTxBufferState | undefined
    private _encryption: boolean = false
    private _encryptedLink: boolean = false
    private _ok: boolean = true
    private _wrong: boolean = false

    private StateGetters = class {

        private outer: VaraBindings // reference to parent class

        constructor(outerClass: VaraBindings) {
            this.outer = outerClass
        }

        // application -> vara

        public get listenOn(): boolean {
            return this.outer._listen
        }

        public get listenOff(): boolean {
            return !this.outer._listen
        }

        public get myCall(): string[] {
            return this.outer._myCallRegistered
        }

        public get compression(): 'OFF' | 'TEXT' | 'FILES' {
            return this.outer._compression
        }

        public get compressionOff(): boolean {
            return this.outer._compression === 'OFF'
        }

        public get compressionText(): boolean {
            return this.outer._compression === 'TEXT'
        }

        public get compressionFiles(): boolean {
            return this.outer._compression === 'FILES'
        }

        public get bw(): 500 | 2300 | 2750 | undefined {
            if (this.outer.varaType === 'HF') {
                return this.outer._bw
            }
            return undefined
        }

        public get bw500(): boolean | undefined {
            if (this.outer.varaType === 'HF') {
                return this.outer._bw === 500
            }
            return undefined
        }

        public get bw2300(): boolean | undefined {
            if (this.outer.varaType === 'HF') {
                return this.outer._bw === 2300
            }
            return undefined
        }

        public get bw2750(): boolean | undefined {
            if (this.outer.varaType === 'HF') {
                return this.outer._bw === 2750
            }
            return undefined
        }

        public get chatOn(): boolean | undefined {
            return this.outer._chat
        }

        public get chatOff(): boolean | undefined {
            // prevent falsy coercion
            if (typeof this.outer._chat !== 'undefined') {
                return !this.outer._chat
            }
        }

        public get winlinkSession(): boolean | undefined {
            // prevent falsy coercion
            if (this.outer.varaType !== 'FM') {
                return this.outer._session === 'WINLINK'
            }
        }

        public get p2pSession(): boolean | undefined {
            // prevent falsy coercion
            if (this.outer.varaType !== 'FM') {
                return this.outer._session === 'P2P'
            }
        }

        public get tune(): number | undefined {
            // prevent falsy coercion
            if (this.outer.varaType !== 'FM') {
                return this.outer._tune
            }
        }

        public get tuneOn(): boolean | undefined {
            if (this.outer.varaType !== 'FM') {
                return this.outer._tuneOn
            }
        }

        public get tuneOff(): boolean | undefined {
            if (this.outer.varaType !== 'FM') {
                return !this.outer._tuneOn
            }
        }

        public get version(): string | undefined {
            return this.outer._version
        }

        // vara -> application

        public get data(): any {
            return this.outer._data
        }

        public get command(): string | undefined {
            return this.outer._command
        }

        public get connected(): ConnectionData | undefined {
            return this.outer._connected
        }

        public get disconnected(): boolean {
            return typeof this.outer._connected === 'undefined'
        }

        public get pttOff(): boolean {
            return !this.outer._ptt
        }

        public get pttOn(): boolean {
            return this.outer._ptt
        }

        public get buffer(): number {
            return this.outer._buffer
        }

        public get pending(): boolean {
            return this.outer._pending;
        }

        public get busyOff(): boolean {
            return !this.outer._busy
        }

        public get busyOn(): boolean {
            return this.outer._busy
        }

        public get registered(): string[] {
            return this.outer._myCallRegistered
        }

        public get linkRegistered(): boolean {
            return this.outer._linkRegistered
        }

        public get linkUnregistered(): boolean {
            return !this.outer._linkRegistered
        }

        public get iAmAlive(): number | undefined {
            return this.outer._iAmAlive
        }

        public get missingSoundcard(): boolean {
            return this.outer._missingSoundcard
        }

        public get cqFrame(): ConnectionData | undefined {
            return this.outer._cqFrame
        }

        public get sn(): number | undefined {
            return this.outer._sn
        }

        public get bitrate(): BitrateData | undefined {
            return this.outer._bitrate
        }

        public get cleanTxBuffer(): CleanTxBufferState | undefined {
            return this.outer._cleanTxBuffer
        }

        public get encryptionDisabled(): boolean {
            return !this.outer._encryption
        }

        public get encryptionReady(): boolean {
            return this.outer._encryption
        }

        public get unencryptedLink(): boolean {
            return !this.outer._encryptedLink
        }

        public get encryptedLink(): boolean {
            return this.outer._encryptedLink
        }

        public get ok(): boolean {
            return this.outer._ok
        }

        public get wrong(): boolean {
            return this.outer._wrong
        }

        public toJSON() {
            return {
                listenOn: this.listenOn,
                listenOff: this.listenOff,
                myCall: this.myCall,
                compression: this.compression,
                compressionOff: this.compressionOff,
                compressionText: this.compressionText,
                compressionFiles: this.compressionFiles,
                bw: this.bw,
                bw500: this.bw500,
                bw2300: this.bw2300,
                bw2750: this.bw2750,
                chatOn: this.chatOn,
                chatOff: this.chatOff,
                winlinkSession: this.winlinkSession,
                p2pSession: this.p2pSession,
                tune: this.tune,
                tuneOn: this.tuneOn,
                tuneOff: this.tuneOff,
                version: this.version,
                data: this.data,
                command: this.command,
                connected: this.connected,
                disconnected: this.disconnected,
                pttOff: this.pttOff,
                pttOn: this.pttOn,
                buffer: this.buffer,
                pending: this.pending,
                busyOff: this.busyOff,
                busyOn: this.busyOn,
                registered: this.registered,
                linkRegistered: this.linkRegistered,
                linkUnregistered: this.linkUnregistered,
                iAmAlive: this.iAmAlive,
                missingSoundcard: this.missingSoundcard,
                cqFrame: this.cqFrame,
                sn: this.sn,
                bitrate: this.bitrate,
                cleanTxBuffer: this.cleanTxBuffer,
                encryptionDisabled: this.encryptionDisabled,
                encryptionReady: this.encryptionReady,
                unencryptedLink: this.unencryptedLink,
                encryptedLink: this.encryptedLink,
                ok: this.ok,
                wrong: this.wrong
            }
        }

    }
    public readonly state = new this.StateGetters(this); // readonly from outside this class

    constructor(host: string, commandPort: number, varaType: 'HF' | 'FM' | 'SAT', dataEncoding?: BufferEncoding) {

        super()

        this.setMaxListeners(Infinity)

        this.varaType = varaType

        this.dataPort = createNetConnection({
            host: host,
            port: commandPort + 1
        }).setEncoding('utf8').on('data', (data: string) => {
            this._data = data
            this.emit('data', data)
        })
        // this.setEncoding(dataEncoding)

        this.commandPort = createNetConnection({
            host: host,
            port: commandPort
        }).setEncoding('utf8').on('data', (rawCommands: string) => {

            rawCommands.trimEnd().split('\r').forEach((command) => {

                const asArray: string[] = command.split(' ')

                if (asArray[0] === 'CONNECTED') {
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
                    this._connected = cd
                    this.emit('CONNECTED', cd)
                }
                else if (asArray[0] === 'BUFFER') {
                    this._buffer = parseInt(asArray[1])
                    this.emit('BUFFER', parseInt(asArray[1]))
                }
                else if (asArray[0] === 'REGISTERED') {
                    const calls = asArray[1].split(' ').slice(1)
                    this._myCallRegistered = calls
                    this.emit('REGISTERED', calls)
                }
                else if (asArray[0] === 'CQFRAME') {
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
                    this._cqFrame = cq
                    this.emit('CQFRAME', cq)
                }
                else if (asArray[0] === 'SN') {
                    this._sn = parseInt(asArray[1])
                    this.emit('SN', parseInt(asArray[1]))
                }
                else if (asArray[0] === 'BITRATE') {
                    const br: BitrateData = {
                        speedLevel: parseInt(asArray[1].substring(1, asArray[1].length - 1)), // remove the surrounding parentheses
                        bitsPerSecond: parseInt(asArray[3]) // VARA adds an extra space between speed level and bps value for some reason which messes up the array split by ' '
                    }
                    this._bitrate = br
                    this.emit('BITRATE', br)
                }
                else if (asArray[0] === 'CLEANTXBUFFER') {
                    this._cleanTxBuffer = asArray[1] as CleanTxBufferState
                    this.emit('CLEANTXBUFFER', asArray[1] as CleanTxBufferState)
                }
                else {
                    if (command === 'DISCONNECTED') {
                        this._connected = undefined
                    }
                    else if (command === 'PTT OFF') {
                        this._ptt = false
                    }
                    else if (command === 'PTT ON') {
                        this._ptt = true
                    }
                    else if (command === 'PENDING') {
                        this._pending = true
                    }
                    else if (command === 'CANCELPENDING') {
                        this._pending = false
                    }
                    else if (command === 'BUSY OFF') {
                        this._busy = false
                    }
                    else if (command === 'BUSY ON') {
                        this._busy = true
                    }
                    else if (command === 'LINK REGISTERED') {
                        this._linkRegistered = true
                    }
                    else if (command === 'LINK UNREGISTERED') {
                        this._linkRegistered = false
                    }
                    else if (command === 'IAMALIVE') {
                        this._iAmAlive = Date.now()
                    }
                    else if (command === 'MISSING SOUNDCARD') {
                        this._missingSoundcard = true
                        // TODO: SHOULD THIS THROW?
                    }
                    else if (command === 'ENCRYPTION DISABLED') {
                        this._encryption = false
                    }
                    else if (command === 'ENCRYPTION READY') {
                        this._encryption = true
                    }
                    else if (command === 'UNENCRYPTED LINK') {
                        this._encryptedLink = false
                    }
                    else if (command === 'ENCRYPTED LINK') {
                        this._encryptedLink = true
                    }
                    else if (command === 'OK') {
                        this._ok = true
                        this._wrong = false
                    }
                    else if (command === 'WRONG') {
                        this._wrong = true
                        this._ok = false
                    }
                    this.emit(command as EmitWithoutData)
                }
                this._command = command
                this.emit('command', command)
            })
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
    public emit<K>(eventName: 'CLEANTXBUFFER', status: CleanTxBufferState): boolean
    public emit<K>(eventName: 'CONNECTED', cd: ConnectionData): boolean
    public emit<K>(eventName: 'BUFFER', bytes: number): boolean
    public emit<K>(eventName: 'REGISTERED', calls: string[]): boolean
    public emit<K>(eventName: 'CQFRAME', cd: ConnectionData): boolean
    public emit<K>(eventName: 'SN', sn: number): boolean
    public emit<K>(eventName: 'BITRATE', br: BitrateData): boolean
    public emit<K>(eventName: Emit, ...args: any[]): boolean {
        return super.emit(eventName, ...args)
    }

    public on<K>(eventName: 'data', listener: (data: any) => void): this
    public on<K>(eventName: 'command', listener: (command: string) => void): this
    public on<K>(eventName: EmitWithoutData, listener: () => void): this
    public on<K>(eventName: 'CLEANTXBUFFER', listener: (status: CleanTxBufferState) => void): this
    public on<K>(eventName: 'CONNECTED', listener: (cd: ConnectionData) => void): this
    public on<K>(eventName: 'BUFFER', listener: (bytes: number) => void): this
    public on<K>(eventName: 'REGISTERED', listener: (calls: string[]) => void): this
    public on<K>(eventName: 'CQFRAME', listener: (cd: ConnectionData) => void): this
    public on<K>(eventName: 'SN', listener: (sn: number) => void): this
    public on<K>(eventName: 'BITRATE', listener: (br: BitrateData) => void): this
    public on<K>(eventName: Emit, listener: (...args: any[]) => void): this {
        return super.on(eventName, listener)
    }

    public once<K>(eventName: 'data', listener: (data: any) => void): this
    public once<K>(eventName: 'command', listener: (command: string) => void): this
    public once<K>(eventName: EmitWithoutData, listener: () => void): this
    public once<K>(eventName: 'CLEANTXBUFFER', listener: (status: CleanTxBufferState) => void): this
    public once<K>(eventName: 'CONNECTED', listener: (cd: ConnectionData) => void): this
    public once<K>(eventName: 'BUFFER', listener: (bytes: number) => void): this
    public once<K>(eventName: 'REGISTERED', listener: (calls: string[]) => void): this
    public once<K>(eventName: 'CQFRAME', listener: (cd: ConnectionData) => void): this
    public once<K>(eventName: 'SN', listener: (sn: number) => void): this
    public once<K>(eventName: 'BITRATE', listener: (br: BitrateData) => void): this
    public once<K>(eventName: Emit, listener: (...args: any[]) => void): this {
        return super.once(eventName, listener)
    }

    // public setEncoding(encoding?: BufferEncoding): this {
    //     this.dataPort.setEncoding(encoding)
    //     this.dataPort.on('data', (data: string) => {
    //         if (encoding) {
    //             this.emit('data', data.trimEnd().split('\r'))
    //         }
    //         else {
    //             this.emit('data', data)
    //         }
    //     })
    //     return this
    // }

    public end(): void {
        return this.close()
    }

    public close(): void {
        this.commandPort.end()
        this.dataPort.end()
    }

    public async connect(source: string, destination: string, digi1?: string, digi2?: string): Promise<void> {
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
                if (command.startsWith('CONNECTED')) { // internal state mutation on 'CONNECTED' is handled above
                    resolve()
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

    public async listenOn(): Promise<void> {
        this.commandPort.write('LISTEN ON\r')
        this.wrongHandler(this.listenOn, arguments)
        this._listen = true
        return this.ok()
    }

    public async listenOff(): Promise<void> {
        this.commandPort.write('LISTEN OFF\r')
        this.wrongHandler(this.listenOff, arguments)
        this._listen = false
        return this.ok()
    }

    public async myCall(upToFiveCallsigns: string[]): Promise<void> {
        if (upToFiveCallsigns.length > 5) {
            throw new Error(`${upToFiveCallsigns.length} callsigns were passed to myCall(). VARA supports a maximum of 5 callsigns.`)
        }

        this.commandPort.write(`MYCALL ${upToFiveCallsigns.join(' ')}\r`)
        this.wrongHandler(this.myCall, arguments)
        // this._myCallRegistered is set in the this.registered method
        return this.registered().then()
    }

    public async disconnect(): Promise<void> {
        this.commandPort.write('DISCONNECT\r')
        this.wrongHandler(this.disconnect, arguments)
        return this.disconnected()
    }

    public async abort(): Promise<void> {
        this.commandPort.write('ABORT\r')
        this.wrongHandler(this.abort, arguments)
        return this.ok()
    }

    public async compressionOff(): Promise<void> {
        this.commandPort.write('COMPRESSION OFF\r')
        this.wrongHandler(this.compressionOff, arguments)
        this._compression = 'OFF'
        return this.ok()
    }

    public async compressionText(): Promise<void> {
        this.commandPort.write('COMPRESSION TEXT\r')
        this.wrongHandler(this.compressionText, arguments)
        this._compression = 'TEXT'
        return this.ok()
    }

    public async compressionFiles(): Promise<void> {
        this.commandPort.write('COMPRESSION FILES\r')
        this.wrongHandler(this.compressionFiles, arguments)
        this._compression = 'FILES'
        return this.ok()
    }

    public async bw500(): Promise<void> {
        this.commandPort.write('BW500\r')
        this.wrongHandler(this.bw500, arguments)
        this._bw = 500
        return this.ok()
    }

    public async bw2300(): Promise<void> {
        this.commandPort.write('BW2300\r')
        this.wrongHandler(this.bw2300, arguments)
        this._bw = 2300
        return this.ok()
    }

    public async bw2750(): Promise<void> {
        this.commandPort.write('BW2750\r')
        this.wrongHandler(this.bw2750, arguments)
        this._bw = 2750
        return this.ok()
    }

    public async chatOn(): Promise<void> {
        this.commandPort.write('CHAT ON\r')
        this.wrongHandler(this.chatOn, arguments)
        this._chat = true

        /**
         * Vara HF doesn't return ok like it's supposed to. Vara FM and Vara Sat do though.
         * This seems to be an upstream bug since the dev doc states that all Vara versions should return ok.
         * It does seem to return BUSY OFF when given the command, but I can't actually test this with a radio because I'm only a technician class operator.
         * 
         * Hoping that a future version of Vara HF fixes this and to avoid breaking the JS API when it does,
         * and in order to provide a consistent experience with all of the functions returning a promise,
         * we'll just return a resolved promise for now.
         */
        if (this.varaType === 'HF') {
            return Promise.resolve()
        }
        return this.ok()
    }

    public async chatOff(): Promise<void> {
        this.commandPort.write('CHAT OFF\r')
        this.wrongHandler(this.chatOff, arguments)
        this._chat = false

        // Oddly enough, it returns ok in HF and FM for chat off though...
        return this.ok()
    }

    public async cqFrameSend(source: string): Promise<void> // vara fm and vara sat
    public async cqFrameSend(source: string, bw: HFBandwidth): Promise<void> // vara hf
    public async cqFrameSend(source: string, digi1?: string, digi2?: string): Promise<void> // vara fm
    public async cqFrameSend(source: string, bwOrDigi1?: HFBandwidth | string, digi2?: string): Promise<void> {
        if (bwOrDigi1 && digi2) {
            this.commandPort.write(`CQFRAME ${source} ${bwOrDigi1} ${digi2}\r`)
        }
        else if (bwOrDigi1) {
            this.commandPort.write(`CQFRAME ${source} ${bwOrDigi1}\r`)
        }
        else {
            this.commandPort.write(`CQFRAME ${source}\r`)
        }
        this.wrongHandler(this.cqFrameSend, arguments)

        return this.pttOff() // final command after ok and pending that indicates that you're free to queue/send more data
    }

    public async winlinkSession(): Promise<void> {
        this.commandPort.write('WINLINK SESSION\r')
        this.wrongHandler(this.winlinkSession, arguments)
        this._session = 'WINLINK'
        return this.ok()
    }

    public async p2pSession(): Promise<void> {
        this.commandPort.write('P2P SESSION\r')
        this.wrongHandler(this.p2pSession, arguments)
        this._session = 'P2P'
        return this.ok()
    }

    public async setTune(negativeDecibels: number): Promise<void> {
        if (this._myCallRegistered.length < 1) {
            throw new Error('You must set at least one callsign with myCall() before calling setTune().')
        }
        if (negativeDecibels > 0 || negativeDecibels < -30) {
            throw new Error(`${negativeDecibels} is an invalid decibel value. Values must be between -30 and 0, inclusive.`)
        }
        this.commandPort.write(`TUNE ${negativeDecibels}\r`)
        this.wrongHandler(this.setTune, arguments)
        this._tune = negativeDecibels
        this._tuneOn = true
        return this.ok()
    }

    public async getTune(): Promise<number> {
        if (this._myCallRegistered.length < 1) {
            throw new Error('You must set at least one callsign with myCall() before calling getTune().')
        }
        this.commandPort.write('TUNE ?\r')
        this.wrongHandler(this.getTune, arguments)
        return new Promise((resolve) => {
            const isTune = (command: string) => {
                if (command.startsWith('TUNE')) {
                    const tune = parseInt(command.substring(5))
                    resolve(tune)
                    this._tune = tune
                    this.removeListener('command', isTune)
                }
            }
            this.on('command', isTune)
        })
    }

    public async tuneOff(): Promise<void> {
        if (this._myCallRegistered.length < 1) {
            throw new Error('You must set at least one callsign with myCall() before calling tuneOff().')
        }
        this.commandPort.write('TUNE OFF\r')
        this.wrongHandler(this.tuneOff, arguments)
        this._tuneOn = false
        return this.ok()
    }

    public async cleanTxBuffer(): Promise<CleanTxBufferState> {
        if (this._myCallRegistered.length < 1) {
            throw new Error('You must set at least one callsign with myCall() before calling cleanTxBuffer().')
        }
        this.commandPort.write('CLEANTXBUFFER\r')
        this.wrongHandler(this.cleanTxBuffer, arguments)
        return new Promise((resolve, reject) => {
            const response = (command: string) => {
                const status: CleanTxBufferState = command.substring(14) as CleanTxBufferState
                if (status === 'OK' || status === 'BUFFEREMPTY') {
                    resolve(status)
                    this.removeListener('command', response)
                }
                else if (status === 'FAILED') {
                    reject('Unable to erase the TX Buffer at the moment.')
                    this.removeListener('command', response)
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

    public async disconnected(): Promise<void> {
        return new Promise((resolve) => {
            this.once('DISCONNECTED', () => {
                resolve()
            })
        })
    }

    public async pttOff(): Promise<void> {
        return new Promise((resolve) => {
            this.once('PTT OFF', () => {
                resolve()
            })
        })
    }

    public async pttOn(): Promise<void> {
        return new Promise((resolve) => {
            this.once('PTT ON', () => {
                resolve()
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

    public async pending(): Promise<void> {
        return new Promise((resolve) => {
            this.once('PENDING', () => {
                resolve()
            })
        })
    }

    public async cancelPending(): Promise<void> {
        return new Promise((resolve) => {
            this.once('CANCELPENDING', () => {
                resolve()
            })
        })
    }

    public async busyOff(): Promise<void> {
        return new Promise((resolve) => {
            this.once('BUSY OFF', () => {
                resolve()
            })
        })
    }

    public async busyOn(): Promise<void> {
        return new Promise((resolve) => {
            this.once('BUSY ON', () => {
                resolve()
            })
        })
    }

    public async registered(): Promise<string[]> {
        return new Promise((resolve) => {
            this.once('REGISTERED', (calls) => {
                resolve(calls)
            })
        })
    }

    public async linkRegistered(): Promise<void> {
        return new Promise((resolve) => {
            this.once('LINK REGISTERED', () => {
                resolve()
            })
        })
    }

    public async linkUnregistered(): Promise<void> {
        return new Promise((resolve) => {
            this.once('LINK UNREGISTERED', () => {
                resolve()
            })
        })
    }

    public async iAmAlive(): Promise<void> {
        return new Promise((resolve) => {
            this.once('IAMALIVE', () => {
                resolve()
            })
        })
    }

    public async missingSoundcard(): Promise<void> {
        return new Promise((resolve) => {
            this.once('MISSING SOUNDCARD', () => {
                resolve()
            })
        })
    }

    public async cqFrameReceive(): Promise<ConnectionData> {
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

    public async encryptionDisabled(): Promise<void> {
        return new Promise((resolve) => {
            this.once('ENCRYPTION DISABLED', () => {
                resolve()
            })
        })
    }

    public async encryptionReady(): Promise<void> {
        return new Promise((resolve) => {
            this.once('ENCRYPTION READY', () => {
                resolve()
            })
        })
    }

    public async unencryptedLink(): Promise<void> {
        return new Promise((resolve) => {
            this.once('UNENCRYPTED LINK', () => {
                resolve()
            })
        })
    }

    public async encryptedLink(): Promise<void> {
        return new Promise((resolve) => {
            this.once('ENCRYPTED LINK', () => {
                resolve()
            })
        })
    }

    public async ok(): Promise<void> {
        return new Promise((resolve) => {
            this.once('OK', () => {
                resolve()
            })
        })
    }

    public async wrong(): Promise<void> {
        return new Promise((resolve) => {
            this.once('WRONG', () => {
                resolve()
            })
        })
    }

}