import EventEmitter from "events";
import { createConnection as createNetConnection, type Socket } from "net";

type Emit = 'command' | 'data' | 'CONNECTED' | 'DISCONNECTED' | 'PTT OFF' | 'PTT ON' | 'BUFFER' | 'PENDING' | 'CANCELPENDING' | 'BUSY OFF' | 'BUSY ON' | 'REGISTERED' | 'LINK REGISTERED' | 'LINK UNREGISTERED' | 'IAMALIVE' | 'MISSING SOUNDCARD' | 'CQFRAME' | 'SN' | 'BITRATE' | 'CLEANTXBUFFER' | 'VERSION' | 'ENCRYPTION DISABLED' | 'ENCRYPTION READY' | 'UNENCRYPTED LINK' | 'ENCRYPTED LINK' | 'OK' | 'WRONG'
type EmitWithoutData = 'DISCONNECTED' | 'PTT OFF' | 'PTT ON' | 'PENDING' | 'CANCELPENDING' | 'BUSY OFF' | 'BUSY ON' | 'LINK REGISTERED' | 'LINK UNREGISTERED' | 'ENCRYPTION DISABLED' | 'ENCRYPTION READY' | 'UNENCRYPTED LINK' | 'ENCRYPTED LINK' | 'OK'

export interface ConnectionData {
    source: string,
    destination: string,
    bw?: 500 | 2300 | 2750 | 'NARROW' | 'WIDE',
    digi1?: string,
    digi2?: string
}

export interface CQFrameData extends Omit<ConnectionData, 'destination'> {}

export interface BitrateData {
    sl: number,
    bps: number
}

export function createConnection(args: {
    host: string
    commandPort: number
    varaType: 'HF' | 'FM' | 'SAT'
    encoding?: BufferEncoding
}): VaraBindings
export async function createConnection(args: {
    host: string
    commandPort: number
    varaType?: 'HF' | 'FM' | 'SAT'
    encoding?: BufferEncoding
}): Promise<VaraBindings>
export function createConnection(args: {
    host: string
    commandPort: number
    varaType?: 'HF' | 'FM' | 'SAT'
    encoding?: BufferEncoding
}): VaraBindings | Promise<VaraBindings> {
    return VaraBindings.createConnection(args)
}

/**
 * TODO:
 */
export class VaraBindings extends EventEmitter {

    private _connection: ConnectionData | undefined;
    /**
     * Information about the current connection. If there is no active connection then it is undefined.
     */
    public get connection(): ConnectionData | undefined {
        return this._connection;
    }
    private set connection(value: ConnectionData | undefined) {
        this._connection = value;
    }

    private _listening: boolean = false;
    /**
     * Whether vara is currently listening for incoming connections or not.
     */
    public get listening(): boolean {
        return this._listening
    }
    private set listening(value: boolean) {
        this._listening = value;
    }

    /**
     * If VARA is currently disconnected.
     */
    public get disconnected(): boolean {
        return !this.connection
    }

    private _compression: 'OFF' | 'TEXT' | 'FILES' = 'TEXT';
    /**
     * The compression setting that is currently enabled. Default is TEXT.
     */
    public get compression(): 'OFF' | 'TEXT' | 'FILES' {
        return this._compression
    }
    private set compression(value: 'OFF' | 'TEXT' | 'FILES') {
        this._compression = value;
    }

    private _bw: 500 | 2300 | 2750 | 'NARROW' | 'WIDE' | undefined;
    /**
      * The bandwidth setting that is currently in use. Will be undefined if using VARA SAT, or if using VARA FM and a connection has not been made.
      */
    public get bw(): 500 | 2300 | 2750 | 'NARROW' | 'WIDE' | undefined {
        return this._bw
    }
    private set bw(value: 500 | 2300 | 2750 | 'NARROW' | 'WIDE' | undefined) {
        this._bw = value;
    }

    private _chat: boolean = false;
    /**
     * Whether or not VARA is currently set to chat mode. Default is false.
     */
    public get chat(): boolean {
        return this._chat
    }
    private set chat(value: boolean) {
        this._chat = value;
    }

    private _session: 'WINLINK' | 'P2P' | undefined;
    /**
     * What session type is in use (VARA HF and VARA SAT only). WINLINK is default. Undefined if using VARA FM.
     */
    public get session(): 'WINLINK' | 'P2P' | undefined {
        if (this.varaType !== 'FM') {
            return this._session
        }
    }
    private set session(value: 'WINLINK' | 'P2P' | undefined) {
        this._session = value;
    }

    private _ptt: boolean = false;
    /**
     * Whether PTT is on if using VARA FM, or should be turned on if using VARA HF or VARA SAT.
     */
    public get ptt(): boolean {
        return this._ptt
    }
    private set ptt(value: boolean) {
        this._ptt = value;
    }

    private _buffer: number = 0;
    /**
     * The most recent amount of bytes that VARA stated was in the transmit buffer queue. 0 on startup.
     */
    public get buffer(): number {
        return this._buffer
    }
    private set buffer(value: number) {
        this._buffer = value;
    }

    private _pending: boolean = false;
    /**
     * If a pending connect request has been detected.
     * 
     * This provides an early warning to the host that a connection may be in process so it can hold any scanning activity. 
     */
    public get pending(): boolean {
        return this._pending;
    }
    private set pending(value: boolean) {
        this._pending = value;
    }

    private _busy: boolean = false;
    /**
     * If the current channel is busy or not.
     */
    public get busy(): boolean {
        return this._busy
    }
    private set busy(value: boolean) {
        this._busy = value;
    }

    private _registered: string[] = [];
    /**
     * Callsigns that are currently registered in the VARA modem.
     */
    public get registered(): string[] {
        return this._registered
    }
    private set registered(value: string[]) {
        this._registered = value;
    }

    private _linkRegistered: boolean = false;
    /**
     * If the client station is registered in VARA.
     */
    public get linkRegistered(): boolean {
        return this._linkRegistered
    }
    private set linkRegistered(value: boolean) {
        this._linkRegistered = value;
    }

    private _sn: number | undefined;
    /**
     * The most recent signal to noise value.
     * VARA sends these periodically and they are cached in this property for convenience.
     * Undefined if not currently connected to a remote station.
     */
    public get sn(): number | undefined {
        return this._sn
    }
    private set sn(value: number | undefined) {
        this._sn = value;
    }

    private _bitrate: BitrateData | undefined;
    /**
     * An object containing the most recent bitrate information emitted by VARA, cached in this property for convenience.
     * Contains an sl (speed level) property and a bps (bits per second) property.
     * Undefined if not currently connected to a remote station.
     */
    public get bitrate(): BitrateData | undefined {
        return this._bitrate
    }
    private set bitrate(value: BitrateData | undefined) {
        this._bitrate = value;
    }

    private _encryption: boolean = false;
    /**
     * Whether encryption is currently enabled or not. Only for commercial use, not for amateur use.
     */
    public get encryption(): boolean {
        return this._encryption
    }
    private set encryption(value: boolean) {
        this._encryption = value;
    }

    private _encryptedLink: boolean = false;
    /**
     * Whether data flow is currently being encrypted. True if encryption is in use, false if not.
     * Only for commercial use, not for amateur use.
     */
    public get encryptedLink(): boolean {
        return this._encryptedLink
    }
    private set encryptedLink(value: boolean) {
        this._encryptedLink = value;
    }

    private _varaType!: 'HF' | 'FM' | 'SAT'
    /**
     * Which version of the VARA modem you are using. Certain functions are only available to specific VARA modem types.
     * 
     * For example, bandwidth setting functions are only applicable to VARA HF.
     */
    public get varaType(): 'HF' | 'FM' | 'SAT' {
        return this._varaType;
    }
    public set varaType(value: 'HF' | 'FM' | 'SAT') {
        if (value === 'HF' && (this.bw === 'NARROW' || this.bw === 'WIDE' || typeof this.bw === 'undefined')) {
            this.bw = 2300
        }
        if ((value === 'HF' || value === 'SAT') && typeof this.session === 'undefined') {
            this.session = 'WINLINK'
        }
        else if (value === 'FM') {
            this.session = undefined
        }
        this._varaType = value;
    }

    /**
     * The Socket object that is connected to the command port in use by VARA. Usually 8300.
     * 
     * In most cases it should not be necessary to interact with this, but it is left exposed for use in edge cases.
     */
    public commandPort: Socket

    /**
     * The Socket object that is connected to the data port in use by VARA.
     * 
     * Its port number is the port number of the command port + 1, which is usually 8301.
     * 
     * In most cases it should not be necessary to interact with this, but it is left exposed for use in edge cases.
     */
    public dataPort: Socket;

    private tempData: string = ''
    private lastFunctionName: string = ''
    private lastFunctionArgs: any[] = []
    private lastFunctionMessage: string | undefined

    /**
     * A factory function, which creates new Vara bindings, initiates connection, then returns the connection.
     * @param args 
     */
    public static createConnection(args: {
        host: string
        commandPort: number
        varaType: 'HF' | 'FM' | 'SAT'
        encoding?: BufferEncoding
    }): VaraBindings
    public static async createConnection(args: {
        host: string
        commandPort: number
        varaType?: 'HF' | 'FM' | 'SAT'
        encoding?: BufferEncoding
    }): Promise<VaraBindings>
    public static createConnection(args: {
        host: string
        commandPort: number
        varaType?: 'HF' | 'FM' | 'SAT'
        encoding?: BufferEncoding
    }): VaraBindings | Promise<VaraBindings> {

        const vb: VaraBindings = new VaraBindings(args.host, args.commandPort, args.encoding)

        if (args.varaType) {
            vb.varaType = args.varaType
            return vb
        }

        return vb.version().then(() => { // calling version() has the side effect of updating the internal varaType
            return vb
        })

    }

    private constructor(host: string, commandPort: number, encoding?: BufferEncoding) {

        super()
        this.setMaxListeners(27) // raise the warning threshold to the number of emitted events from this class, which is 27

        this.dataPort = createNetConnection({
            host: host,
            port: commandPort + 1
        }).setEncoding(encoding)

        this.dataPort.on('data', (rawData: string | Buffer) => {
            if (typeof rawData === 'string') { // if the user has set an encoding
                const dataArray: string[] = rawData.split('\r').filter((e) => { return e !== '' }) // remove empty strings, they serve no purpose

                // if temp data is awaiting concatenation or the current raw data doesn't contain the delimiter
                if (this.tempData.length > 0 || !rawData.includes('\r')) {
                    this.tempData += dataArray.shift() // pop it out of the array and concatenate it to the temp data holder
                    if (rawData.includes('\r')) { // if it does contain the delimiter emit it
                        this.emit('data', this.tempData)
                        this.tempData = ''
                    }
                }

                // check for greater than 0 length because we used shift earlier, if the final command doesn't end with the delimiter then add it to the temp data holder
                if (dataArray.length > 0 && !rawData.endsWith('\r')) {
                    this.tempData += dataArray.pop()
                }

                // if there's any remaining elements after possibly removing the first and last elements, then emit them
                dataArray.map((d) => {
                    this.emit('data', d)
                })
            }
            else {
                this.emit('data', rawData)
            }
        })

        this.commandPort = createNetConnection({
            host: host,
            port: commandPort
        }).setEncoding('utf8').on('data', (rawCommands: string) => {

            rawCommands.trim().split('\r').map((command) => {

                const asArray: string[] = command.split(' ')

                if (asArray[0] === 'IAMALIVE') {
                    this.emit('IAMALIVE', Date.now())
                }
                else if (asArray[0] === 'WRONG') {
                    this.emit('WRONG', new Error(this.lastFunctionMessage ?? `VARA returned "WRONG" for ${this.lastFunctionName}(${Array.from(this.lastFunctionArgs)}).\nCheck your arguments, the order of your function calls, and that this command is compatible with the currently running version of VARA.`))
                }
                else if (command === 'MISSING SOUNDCARD') {
                    this.emit('MISSING SOUNDCARD', new Error('Vara has detected that the soundcard is missing. Please check your settings and hardware connections and reconnect.'))
                }
                else if (asArray[0] === 'CONNECTED') {
                    this.connection = {
                        source: asArray[1],
                        destination: asArray[2]
                    }
                    if (asArray.length === 4) { // VARA HF and VARA FM with no digipeaters
                        if (!isNaN(parseInt(asArray[3]))) {
                            this.connection.bw = parseInt(asArray[3]) as 500 | 2300 | 2750
                        }
                        else {
                            this.connection.bw = asArray[3] as 'NARROW' | 'WIDE'
                        }
                    }
                    else if (asArray.length === 6) { // VARA FM with one digipeater
                        this.connection.bw = asArray[5] as 'NARROW' | 'WIDE'
                        this.connection.digi1 = asArray[4]
                    }
                    else if (asArray.length === 7) { // VARA FM with two digipeaters
                        this.connection.bw = asArray[6] as 'NARROW' | 'WIDE'
                        this.connection.digi1 = asArray[4]
                        this.connection.digi2 = asArray[5]
                    }
                    this.bw = this.connection.bw
                    this.emit('CONNECTED', this.connection)
                }
                else if (asArray[0] === 'BUFFER') {
                    this.buffer = parseInt(asArray[1])
                    this.emit('BUFFER', this.buffer)
                }
                else if (asArray[0] === 'REGISTERED') {
                    this.registered = asArray.slice(1)
                    this.emit('REGISTERED', this.registered)
                }
                else if (asArray[0] === 'CQFRAME') {
                    const cq: CQFrameData = {
                        source: asArray[1],
                        digi2: asArray[3] // possibly undefined but that's ok
                    }
                    if (!isNaN(parseInt(asArray[2]))) { // if it's numeric then it's bandwidth
                        cq.bw = parseInt(asArray[2]) as 500 | 2300 | 2750
                    }
                    else {
                        cq.digi1 = asArray[2] // possibly undefined but that's ok
                    }
                    this.emit('CQFRAME', cq)
                }
                else if (asArray[0] === 'SN') {
                    this.sn = parseFloat(asArray[1])
                    this.emit('SN', this.sn)
                }
                else if (asArray[0] === 'BITRATE') {
                    this.bitrate = {
                        sl: parseInt(asArray[1].substring(1, asArray[1].length - 1)), // remove the surrounding parentheses
                        bps: parseInt(asArray[3]) // VARA adds an extra space between speed level and bps value for some reason which messes up the array split by ' '
                    }
                    this.emit('BITRATE', this.bitrate)
                }
                else if (asArray[0] === 'CLEANTXBUFFER') {
                    this.emit('CLEANTXBUFFER', asArray[1] as 'BUFFEREMPTY' | 'OK' | 'FAILED')
                }
                else if (asArray[0] === 'VERSION') {
                    this.varaType = asArray[2] as 'HF' | 'FM' | 'SAT'
                    this.emit('VERSION', asArray.slice(1).join(' '))
                }
                else {
                    if (command === 'DISCONNECTED') {
                        this.connection = undefined
                        this.sn = undefined
                        this.bitrate = undefined
                        this.buffer = 0
                    }
                    else if (command === 'PTT OFF') {
                        this.ptt = false
                    }
                    else if (command === 'PTT ON') {
                        this.ptt = true
                    }
                    else if (command === 'PENDING') {
                        this.pending = true
                    }
                    else if (command === 'CANCELPENDING') {
                        this.pending = false
                    }
                    else if (command === 'BUSY OFF') {
                        this.busy = false
                    }
                    else if (command === 'BUSY ON') {
                        this.busy = true
                    }
                    else if (command === 'LINK REGISTERED') {
                        this.linkRegistered = true
                    }
                    else if (command === 'LINK UNREGISTERED') {
                        this.linkRegistered = false
                    }
                    else if (command === 'ENCRYPTION DISABLED') {
                        this.encryption = false
                    }
                    else if (command === 'ENCRYPTION READY') {
                        this.encryption = true
                    }
                    else if (command === 'UNENCRYPTED LINK') {
                        this.encryptedLink = false
                    }
                    else if (command === 'ENCRYPTED LINK') {
                        this.encryptedLink = true
                    }
                    this.emit(command as EmitWithoutData)
                }
                this.emit('command', command)
            })
        })
    }

    private wrongHandler(fun: Function, args: IArguments, message?: string): void {
        this.lastFunctionName = fun.name
        this.lastFunctionArgs = Array.from(args)
        this.lastFunctionMessage = message
    }

    /**
     * Connect to a remote VARA station.
     * @param source Your station's callsign and optional SSID.
     * @param destination The remote station's callsign and optional SSID.
     * @param digi1 An optional first digipeater in your path. Only for VARA FM, will be ignored if .varaType is not set to FM.
     * @param digi2 An optional second digipeater in your path. Only for VARA FM, will be ignored if .varaType is not set to FM.
     * @returns A promise that resolves upon successful connection to the remote station, or rejects if connection was unsuccessful.
     */
    public async connect(source: string, destination: string, digi1?: string, digi2?: string): Promise<void> {
        this.wrongHandler(this.connect, arguments)
        if (this.varaType === 'FM' && digi1 && digi2) {
            this.commandPort.write(`CONNECT ${source} ${destination} VIA ${digi1} ${digi2}\r`)
        }
        else if (this.varaType === 'FM' && digi1) {
            this.commandPort.write(`CONNECT ${source} ${destination} VIA ${digi1}\r`)
        }
        else {
            this.commandPort.write(`CONNECT ${source} ${destination}\r`)
        }
        return new Promise((resolve, reject) => {
            const check = (command: string) => {
                if (command.startsWith('CONNECTED')) { // internal state mutation on 'CONNECTED' is handled above
                    resolve()
                    this.removeListener('command', check)
                }
                else if (command === 'DISCONNECTED') {
                    reject(`VARA was unable to make a connection from ${source} to ${destination}.`)
                    this.removeListener('command', check)
                }
            }
            this.on('command', check)
        })
    }

    /**
     * Incoming connections enabled.
     * 
     * This command will cause a disconnection if it is received in the middle of a VARA connection
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async listenOn(): Promise<void> {
        this.wrongHandler(this.listenOn, arguments)
        this.commandPort.write('LISTEN ON\r')
        return this.promise('OK').then(() => {
            this.listening = true
        })
    }

    /**
     * Incomming connections disabled.
     * 
     * This command will cause a disconnection if it is received in the middle of a VARA connection.
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async listenOff(): Promise<void> {
        this.wrongHandler(this.listenOff, arguments)
        this.commandPort.write('LISTEN OFF\r')
        return this.promise('OK').then(() => {
            this.listening = false
        })
    }

    /**
     * Set current call sign (maximum 5 call signs).
     * 
     * Legitimate call signs include from 3 to 7 ASCII characters (A-Z, 0-9) followed by an optional “-“ and an SSID of -1 to -15, -T, and -R. 
     * @param upToFiveCallsigns a string or array of strings containing the callsign(s) to set.
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async myCall(upToFiveCallsigns: string | string[]): Promise<string[]> {
        if ((Array.isArray(upToFiveCallsigns) && upToFiveCallsigns.length > 5) || (typeof upToFiveCallsigns === 'string' && upToFiveCallsigns.split(' ').length > 5)) {
            this.wrongHandler(this.myCall, arguments, `${Array.isArray(upToFiveCallsigns) ? upToFiveCallsigns.length : upToFiveCallsigns.split(' ').length} callsigns were passed to myCall(). VARA supports a maximum of 5 callsigns.`)
        }
        else {
            this.wrongHandler(this.myCall, arguments)
        }
        this.commandPort.write(`MYCALL ${Array.isArray(upToFiveCallsigns) ? upToFiveCallsigns.join(' ') : upToFiveCallsigns}\r`)
        return this.promise('REGISTERED')
    }

    /**
     * Disconnect the link, once the TX buffer is empty. 
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async disconnect(): Promise<void> {
        this.wrongHandler(this.disconnect, arguments)
        this.commandPort.write('DISCONNECT\r')
        // interal state is reset by event handlers defined in the constructor
        return this.promise('DISCONNECTED')
    }

    /**
     * Disconnect the link immediately. (dirty disconnect)
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async abort(): Promise<void> {
        this.wrongHandler(this.abort, arguments)
        this.commandPort.write('ABORT\r')
        return this.promise('OK').then(() => {
            this.connection = undefined
            this.sn = undefined
            this.bitrate = undefined
            this.buffer = 0
        })
    }

    /**
     * Set compression to disabled.
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async compressionOff(): Promise<void> {
        this.wrongHandler(this.compressionOff, arguments)
        this.commandPort.write('COMPRESSION OFF\r')
        return this.promise('OK').then(() => {
            this.compression = 'OFF'
        })
    }

    /**
     * Huffman compression enabled, designed for text type information. Recommended for Winlink.
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async compressionText(): Promise<void> {
        this.wrongHandler(this.compressionText, arguments)
        this.commandPort.write('COMPRESSION TEXT\r')
        return this.promise('OK').then(() => {
            this.compression = 'TEXT'
        })
    }

    /**
     * Compression designed for file transfers
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async compressionFiles(): Promise<void> {
        this.wrongHandler(this.compressionFiles, arguments)
        this.commandPort.write('COMPRESSION FILES\r')
        return this.promise('OK').then(() => {
            this.compression = 'FILES'
        })
    }

    /**
     * Set VARA HF to 500Hz Narrow mode
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async bw500(): Promise<void> {
        this.wrongHandler(this.bw500, arguments)
        this.commandPort.write('BW500\r')
        return this.promise('OK').then(() => {
            this.bw = 500
        })
    }

    /**
     * Set VARA HF to 2300Hz Standard mode (default)
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async bw2300(): Promise<void> {
        this.wrongHandler(this.bw2300, arguments)
        this.commandPort.write('BW2300\r')
        return this.promise('OK').then(() => {
            this.bw = 2300
        })
    }

    /**
     * Set VARA HF to 2750Hz Tactical mode 
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async bw2750(): Promise<void> {
        this.wrongHandler(this.bw2750, arguments)
        this.commandPort.write('BW2750\r')
        return this.promise('OK').then(() => {
            this.bw = 2750
        })
    }

    /**
     * Optimizes VARA timing for using with chat type apps like VARA Chat, VarAC, vARIM ....
     * 
     * Support high latency to connect two FlexRadio: SDR<->SDR
     * 
     * Infinite Idle loop. Allows both stations to be in sync forever, until the path dies
     * 
     * Optimize the handover interchange for keyboard to keyboard.
     * 
     * This command should not be used with Winlink or B2F protocol apps.
     * 
     * Includes the LISTEN ON command 
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async chatOn(): Promise<void> {
        this.wrongHandler(this.chatOn, arguments)
        this.commandPort.write('CHAT ON\r')

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
            return Promise.resolve().then(() => {
                this.chat = true
            })
        }
        return this.promise('OK').then(() => {
            this.chat = true
        })
    }

    /**
     * Optimize the handover interchange for Winlink, B2F protocol, BBS, etc...
     * 
     * Limited Idle Loops. Avoids the stations staying connected forever in a loop.
     * 
     * Latency limited according Trimode Scan time of 4 seconds. Only one Flexradio can be used in
     * the link: SDR<->Analog Rig or Analog Rig<->SDR 
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async chatOff(): Promise<void> {
        this.wrongHandler(this.chatOff, arguments)
        this.commandPort.write('CHAT OFF\r')

        // Oddly enough, it returns ok in HF and FM for chat off though...
        return this.promise('OK').then(() => {
            this.chat = false
        })
    }

    /**
     * Send a CQ frame via VARA FM (without digipeaters) or via VARA SAT.
     * @param source The callsign and optional SSID that you wish the frame to be from.
     */
    public async cqFrame(source: string): Promise<void>
    /**
     * Send a CQ frame via VARA HF.
     * @param source The callsign and optional SSID that you wish the frame to be from.
     * @param bandwidth The bandwidth that you wish to chat at.
     */
    public async cqFrame(source: string, bandwidth: 500 | 2300 | 2750): Promise<void>
    /**
     * Send a CQ frame via VARA FM with up to 2 optional digipeaters.
     * @param source The callsign and optional SSID that you wish the frame to be from.
     * @param digi1 The first digipeater's callsign and optional SSID that you wish to use in your path.
     * @param digi2 The second digipeater's callsign and optional SSID that you wish to use in your path.
     */
    public async cqFrame(source: string, digi1?: string, digi2?: string): Promise<void> // send a cq frame with vara fm
    public async cqFrame(source: string, bandwidthOrDigi1?: 500 | 2300 | 2750 | string, digi2?: string): Promise<void> {
        this.wrongHandler(this.cqFrame, arguments)
        if (bandwidthOrDigi1 && digi2) {
            this.commandPort.write(`CQFRAME ${source} ${bandwidthOrDigi1} ${digi2}\r`)
        }
        else if (bandwidthOrDigi1) {
            this.commandPort.write(`CQFRAME ${source} ${bandwidthOrDigi1}\r`)
        }
        else {
            this.commandPort.write(`CQFRAME ${source}\r`)
        }
        return this.promise('PTT OFF') // final command after ok and pending that indicates that you're free to queue/send more data
    }

    /**
     * VARA HF and VARA SAT only
     * 
     * VARA sends retries following a 4.0 second cycle, necessary to connect with the RMS Gateways (DWELL time 4s) (DEFAULT)
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async winlinkSession(): Promise<void> {
        this.wrongHandler(this.winlinkSession, arguments)
        this.commandPort.write('WINLINK SESSION\r')
        return this.promise('OK').then(() => {
            this.session = 'WINLINK'
        })
    }

    /**
     * VARA HF and VARA SAT only
     * 
     * Set the retry cycle to 4.6 seconds to allow connecting two SDR's at maximum latency (worst case)
     * 
     * This command must be used for P2P connections, not for gateway connections. 
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async p2pSession(): Promise<void> {
        this.wrongHandler(this.p2pSession, arguments)
        this.commandPort.write('P2P SESSION\r')
        return this.promise('OK').then(() => {
            this.session = 'P2P'
        })
    }

    /**
     * VARA HF and VARA SAT only
     * 
     * Get the drive level value.
     * @returns A promise that resolves to a drive level number between -30 and 0, inclusive.
     */
    public async tune(): Promise<number>
    /**
     * VARA HF and VARA SAT only
     * 
     * Set TUNE Button to ON and drive level to X dB. The tune button will only be set to ON if at least one callsign is registered.
     * @param negativeDecibels The amount of decibles to set the drive level to. Must be between -30 and 0, inclusive.
     * @returns A promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async tune(negativeDecibels: number): Promise<void>
    public async tune(negativeDecibels?: number): Promise<number | void> {

        if (typeof negativeDecibels !== 'undefined') {
            this.commandPort.write(`TUNE ${negativeDecibels}\r`)
            return this.promise('OK')
        }
        this.commandPort.write('TUNE ?\r')
        return new Promise((resolve) => {
            const isTune = (command: string) => {
                if (command.startsWith('TUNE')) {
                    const tune = parseInt(command.substring(5))
                    resolve(tune)
                    this.removeListener('command', isTune)
                }
            }
            this.on('command', isTune)
        })
    }

    /**
     * VARA HF and VARA SAT only
     * 
     * Set TUNE button to OFF
     * @returns a promise that is fulfilled upon VARA's acknowledgment of the command.
     */
    public async tuneOff(): Promise<void> {
        this.wrongHandler(this.tuneOff, arguments)
        this.commandPort.write('TUNE OFF\r')
        return this.promise('OK')
    }

    /**
     * Erase the transmission buffer, in case transmission has not started yet. 
     * @returns a promise that resolves to 'OK' or 'BUFFEREMPTY', or rejects if the status is 'FAILED'
     */
    public async cleanTxBuffer(): Promise<'BUFFEREMPTY' | 'OK' | 'FAILED'> {
        this.wrongHandler(this.cleanTxBuffer, arguments)
        this.commandPort.write('CLEANTXBUFFER\r')
        return new Promise((resolve, reject) => {
            this.once('CLEANTXBUFFER', (status) => {
                if (status === 'OK' || status === 'BUFFEREMPTY') {
                    resolve(status)
                    this.buffer = 0
                }
                else if (status === 'FAILED') {
                    reject('Unable to erase the TX Buffer at the moment.')
                }
            })
        })
    }

    /**
     * Get the VARA version.
     * @returns a promise that resolves to a string containing the current version of VARA.
     */
    public async version(): Promise<string> {
        this.wrongHandler(this.version, arguments)
        this.commandPort.write('VERSION\r')
        return this.promise('VERSION')
    }

    /**
     * Writes data to the VARA socket. The second parameter specifies the encoding in the case of a string. It defaults to UTF8 encoding.
     * 
     * Returns true if the entire data was flushed successfully to the kernel buffer. Returns false if all or part of the data was queued in user memory.
     * 
     * The optional callback parameter will be executed when the data is finally written out, which may not be immediately.
     * 
     * If an error occurs, the callback will be called with the error as its first argument. The callback is called asynchronously.
     * 
     * See Writable stream write() method for more information.
     */
    public write(buffer: Uint8Array | string, encoding?: BufferEncoding, cb?: (err?: Error) => void): boolean {
        this.wrongHandler(this.write, arguments)
        if (typeof buffer === 'string' && !buffer.endsWith('\r')) {
            buffer += '\r'
        }
        return this.dataPort.write(buffer, encoding, cb)
    }

    /**
     * Alias for the write() method.
     */
    public send(buffer: Uint8Array | string, encoding?: BufferEncoding, cb?: (err?: Error) => void): boolean {
        return this.write(buffer, encoding, cb)
    }

    /**
     * Half-closes the command and data sockets. i.e., it sends a FIN packet. It is possible the server will still send some data.
     * 
     * See writable.end() for further details.
     */
    public end(): void {
        this.commandPort.end()
        this.dataPort.end()
    }

    /**
     * Alias for the end() method.
     */
    public close(): void {
        return this.end()
    }

    public on<K>(eventName: 'data', listener: (data: Buffer) => void): this
    public on<K>(eventName: 'data', listener: (data: string) => void): this
    public on<K>(eventName: 'command', listener: (command: string) => void): this
    public on<K>(eventName: 'WRONG', listener: (err: Error) => void): this
    public on<K>(eventName: EmitWithoutData, listener: () => void): this
    public on<K>(eventName: 'IAMALIVE', listener: (timestamp: number) => void): this
    public on<K>(eventName: 'MISSING SOUNDCARD', listener: (err: Error) => void): this
    public on<K>(eventName: 'CLEANTXBUFFER', listener: (status: 'BUFFEREMPTY' | 'OK' | 'FAILED') => void): this
    public on<K>(eventName: 'VERSION', listener: (version: string) => void): this
    public on<K>(eventName: 'CONNECTED', listener: (cd: ConnectionData) => void): this
    public on<K>(eventName: 'BUFFER', listener: (bytes: number) => void): this
    public on<K>(eventName: 'REGISTERED', listener: (calls: string[]) => void): this
    public on<K>(eventName: 'CQFRAME', listener: (cq: CQFrameData) => void): this
    public on<K>(eventName: 'SN', listener: (sn: number) => void): this
    public on<K>(eventName: 'BITRATE', listener: (br: BitrateData) => void): this
    public on<K>(eventName: Emit, listener: (...args: any) => void): this {
        return super.on(eventName, listener)
    }

    public once<K>(eventName: 'data', listener: (data: Buffer) => void): this
    public once<K>(eventName: 'data', listener: (data: string) => void): this
    public once<K>(eventName: 'command', listener: (command: string) => void): this
    public once<K>(eventName: 'WRONG', listener: (err: Error) => void): this
    public once<K>(eventName: EmitWithoutData, listener: () => void): this
    public once<K>(eventName: 'IAMALIVE', listener: (timestamp: number) => void): this
    public once<K>(eventName: 'MISSING SOUNDCARD', listener: (err: Error) => void): this
    public once<K>(eventName: 'CLEANTXBUFFER', listener: (status: 'BUFFEREMPTY' | 'OK' | 'FAILED') => void): this
    public once<K>(eventName: 'VERSION', listener: (version: string) => void): this
    public once<K>(eventName: 'CONNECTED', listener: (cd: ConnectionData) => void): this
    public once<K>(eventName: 'BUFFER', listener: (bytes: number) => void): this
    public once<K>(eventName: 'REGISTERED', listener: (calls: string[]) => void): this
    public once<K>(eventName: 'CQFRAME', listener: (cq: CQFrameData) => void): this
    public once<K>(eventName: 'SN', listener: (sn: number) => void): this
    public once<K>(eventName: 'BITRATE', listener: (br: BitrateData) => void): this
    public once<K>(eventName: Emit, listener: (...args: any) => void): this {
        return super.once(eventName, listener)
    }

    /**
     * An asynchronous function to get the next command sent by VARA.
     * @returns a promise that resolves to a string containing the most recent command sent from VARA.
     */
    public async promise(event: 'command'): Promise<string>
    /**
     * An asynchronous function to get the next chunk of data sent by VARA.
     * @returns a promise that resolves to a string or a buffer containing the most recent data sent from VARA.
     */
    public async promise(event: 'data'): Promise<string | Buffer>
    /**
     * An asynchronous function to await the next connection event.
     * @returns a promise that resolves to a ConnectionData object containing address, bandwidth, and routing information.
     * @see interface ConnectionData
     */
    public async promise(event: 'CONNECTED'): Promise<ConnectionData>
    /**
     * An asynchronous function that resolves when VARA adds data to queue or VARA removes acked bytes from queue.
     * 
     * To check the current amount of bytes in the queue without using promises, use the .buffer property.
     * @returns a promise that resolves to the number of bytes that are currently in the transmit buffer queue.
     */
    public async promise(event: 'BUFFER'): Promise<number>
    /**
     * An asynchronous function that resolves after VARA registers callsigns using the myCall() method.
     * 
     * Mostly for internal use and called automatically by myCall().
     * @returns a promise that resolves to an array of strings of callsigns that were registered in VARA.
     */
    public async promise(event: 'REGISTERED'): Promise<string[]>
    /**
     * An asynchronous function that resolves upon the 'IAMALIVE' command that is sent every ~60 seconds by VARA.
     * @returns a promise that resolves to the unix time in milliseconds of when the command was sent from VARA.
     */
    public async promise(event: 'IAMALIVE'): Promise<number>
    /**
     * An asynchronous function that resolves when VARA has detected that the soundcard is missing.
     * @returns a promise that resolves to a standard Error object.
     */
    public async promise(event: 'MISSING SOUNDCARD'): Promise<Error>
    /**
     * An asynchronous function that resolves upon reception of a CQ Frame from another station.
     * @returns a promise that resolves to a CQFrameData object.
     * @see interface CQFrameData
     */
    public async promise(event: 'CQFRAME'): Promise<CQFrameData>
    /**
     * An asynchronous function that resolves when VARA updates the current signal to noise ratio.
     * 
     * To check the current signal to noise ratio without using promises, use the sn property.
     * @returns a promise that resolves to a number representing the updated signal to noise ratio.
     */
    public async promise(event: 'SN'): Promise<number>
    /**
     * An asynchronous function that resolves when VARA updates the bitrate data.
     * 
     * To check the current bitrate data without using promises, use the bitrate property.
     * @returns a promise that resolves to a BitrateData object, which has 2 properties: sl (speed level) and bps (bits per second).
     * @see interface BitrateData
     */
    public async promise(event: 'BITRATE'): Promise<BitrateData>
    /**
     * An asynchronous function that resolves when VARA finishes attempting to erase the transmission buffer.
     * 
     * This method does not tell VARA to clear the transmission buffer. To do that, call the cleanTxBuffer() method instead.
     * @returns a promise that resolves to a string representing the status. The status can be: 'BUFFEREMPTY', 'OK', or 'FAILED'
     */
    public async promise(event: 'CLEANTXBUFFER'): Promise<'BUFFEREMPTY' | 'OK' | 'FAILED'>
    /**
     * An asynchronous function that resolves when VARA emits the version string.
     * 
     * This method does not tell VARA to get the version string, use the version() method instead.
     * @returns a promise that resolves to the VARA version string.
     */
    public async promise(event: 'VERSION'): Promise<string>
    /**
     * An asynchronous function that resolves when VARA emits a wrong / error event.
     * @example
     * ```
     * vb.promise('WRONG').then((myError: Error) => {
     *      console.log(myError)
     * })
     * ```
     * @returns a promise that resolves to a standard error object.
     */
    public async promise(event: 'WRONG'): Promise<Error>
    /**
     * An asynchronous function that resolves when VARA emits a disconnection event.
     * 
     * This method does not tell VARA to disconnect from the remote station, use the disconnect() method instead.
     */
    public async promise(event: 'DISCONNECTED'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a PTT OFF event.
     */
    public async promise(event: 'PTT OFF'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a PTT ON event.
     */
    public async promise(event: 'PTT ON'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a PENDING event.
     */
    public async promise(event: 'PENDING'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a CANCELPENDING event.
     */
    public async promise(event: 'CANCELPENDING'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a BUSY OFF event.
     */
    public async promise(event: 'BUSY OFF'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a BUSY ON event.
     */
    public async promise(event: 'BUSY ON'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a LINK REGISTERED event.
     */
    public async promise(event: 'LINK REGISTERED'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a LINK UNREGISTERED event.
     */
    public async promise(event: 'LINK UNREGISTERED'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits an ENCRYPTION DISABLED event.
     */
    public async promise(event: 'ENCRYPTION DISABLED'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits an ENCRYPTION READY event.
     */
    public async promise(event: 'ENCRYPTION READY'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits an UNENCRYPTED LINK event.
     */
    public async promise(event: 'UNENCRYPTED LINK'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits an ENCRYPTED LINK event.
     */
    public async promise(event: 'ENCRYPTED LINK'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits an OK event.
     */
    public async promise(event: 'OK'): Promise<void>
    public async promise(event: Emit): Promise<any> {
        switch (event) {
            case "command":
                return new Promise((resolve) => {
                    this.once('command', (command: string) => {
                        resolve(command)
                    })
                })
            case "data":
                return new Promise((resolve) => {
                    this.once('data', (data: string | Buffer) => {
                        resolve(data)
                    })
                })
            case "CONNECTED":
                return new Promise((resolve) => {
                    this.once('CONNECTED', (cd: ConnectionData) => {
                        resolve(cd)
                    })
                })
            case "BUFFER":
                return new Promise((resolve) => {
                    this.once('BUFFER', (bytes: number) => {
                        resolve(bytes)
                    })
                })
            case "REGISTERED":
                return new Promise((resolve) => {
                    this.once('REGISTERED', (calls: string[]) => {
                        resolve(calls)
                    })
                })
            case "IAMALIVE":
                return new Promise((resolve) => {
                    this.once('IAMALIVE', (timestamp: number) => {
                        resolve(timestamp)
                    })
                })
            case "MISSING SOUNDCARD":
                return new Promise((resolve) => {
                    this.once('MISSING SOUNDCARD', (err: Error) => {
                        resolve(err)
                    })
                })
            case "CQFRAME":
                return new Promise((resolve) => {
                    this.once('CQFRAME', (cq: CQFrameData) => {
                        resolve(cq)
                    })
                })
            case "SN":
                return new Promise((resolve) => {
                    this.once('SN', (sn: number) => {
                        resolve(sn)
                    })
                })
            case "BITRATE":
                return new Promise((resolve) => {
                    this.once('BITRATE', (br: BitrateData) => {
                        resolve(br)
                    })
                })
            case "CLEANTXBUFFER":
                return new Promise((resolve) => {
                    this.once('CLEANTXBUFFER', (status: 'BUFFEREMPTY' | 'OK' | 'FAILED') => {
                        resolve(status)
                    })
                })
            case "VERSION":
                return new Promise((resolve) => {
                    this.once('VERSION', (version: string) => {
                        resolve(version)
                    })
                })
            case "WRONG":
                return new Promise((resolve) => {
                    this.once('WRONG', (err: Error) => {
                        resolve(err)
                    })
                })
            case "DISCONNECTED":
            case "PTT OFF":
            case "PTT ON":
            case "PENDING":
            case "CANCELPENDING":
            case "BUSY OFF":
            case "BUSY ON":
            case "LINK REGISTERED":
            case "LINK UNREGISTERED":
            case "ENCRYPTION DISABLED":
            case "ENCRYPTION READY":
            case "UNENCRYPTED LINK":
            case "ENCRYPTED LINK":
            case "OK":
                return new Promise<void>((resolve) => {
                    this.once(event, () => {
                        resolve()
                    })
                })
        }
    }

    // public emit<K>(eventName: 'data', data: Buffer): boolean
    // public emit<K>(eventName: 'data', data: string): boolean
    // public emit<K>(eventName: 'command', command: string): boolean
    // public emit<K>(eventName: 'WRONG', err: Error): boolean
    // public emit<K>(eventName: EmitWithoutData): boolean
    // public emit<K>(eventName: 'IAMALIVE', timestamp: number): boolean
    // public emit<K>(eventName: 'MISSING SOUNDCARD', err: Error): boolean
    // public emit<K>(eventName: 'CLEANTXBUFFER', status: CleanTxBufferState): boolean
    // public emit<K>(eventName: 'VERSION', version: string): boolean
    // public emit<K>(eventName: 'CONNECTED', cd: ConnectionData): boolean
    // public emit<K>(eventName: 'BUFFER', bytes: number): boolean
    // public emit<K>(eventName: 'REGISTERED', calls: string[]): boolean
    // public emit<K>(eventName: 'CQFRAME', cd: CQFrameData): boolean
    // public emit<K>(eventName: 'SN', sn: number): boolean
    // public emit<K>(eventName: 'BITRATE', br: BitrateData): boolean
    // public emit<K>(eventName: Emit, ...args: any): boolean {
    //     return super.emit(eventName, ...args)
    // }

}