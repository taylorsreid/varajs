/**
 * @author Taylor Reid aka KO4LCM
 */

import EventEmitter from "events";
import { createConnection as createNetConnection, type Socket } from "net";

type Emit = 'command' | 'data' | 'CONNECTED' | 'DISCONNECTED' | 'PTT OFF' | 'PTT ON' | 'BUFFER' | 'PENDING' | 'CANCELPENDING' | 'BUSY OFF' | 'BUSY ON' | 'REGISTERED' | 'LINK REGISTERED' | 'LINK UNREGISTERED' | 'IAMALIVE' | 'MISSING SOUNDCARD' | 'CQFRAME' | 'SN' | 'BITRATE' | 'CLEANTXBUFFER' | 'VERSION' | 'ENCRYPTION DISABLED' | 'ENCRYPTION READY' | 'UNENCRYPTED LINK' | 'ENCRYPTED LINK' | 'OK' | 'WRONG'
type EmitWithoutData = 'DISCONNECTED' | 'PTT OFF' | 'PTT ON' | 'PENDING' | 'CANCELPENDING' | 'BUSY OFF' | 'BUSY ON' | 'LINK REGISTERED' | 'LINK UNREGISTERED' | 'ENCRYPTION DISABLED' | 'ENCRYPTION READY' | 'UNENCRYPTED LINK' | 'ENCRYPTED LINK' | 'OK'

/**
 * An object representing the details of a new connection that has been made.
 */
export interface ConnectionData {
    /**
     * The callsign and SSID of the initiating station.
     */
    source: string,
    /**
     * The callsign and SSID of the receiving station.
     */
    destination: string,
    /**
     * The bandwidth that the connection was made at or the CQ frame was sent at.
     * 
     * For VARA HF: 500, 2300, or 2750
     * 
     * For VARA FM: 'NARROW' or 'WIDE'
     * 
     * For VARA SAT: undefined
     */
    bw?: 500 | 2300 | 2750 | 'NARROW' | 'WIDE',
    /**
     * The first digipeater (if applicable) in the path between stations.
     */
    digi1?: string,
    /**
     * The second digipeater (if applicable) in the path between stations.
     */
    digi2?: string
}

/**
 * An object representing the details of CQ frame that was received.
 */
export interface CQFrameData extends Omit<ConnectionData, 'destination'> {}

/**
 * An object representing bitrate and speed information about a connection to a remote station.
 */
export interface BitrateData {
    /**
     * The current VARA speed level that is in use.
     */
    sl: number,
    /**
     * The current bitrate between the stations in bits per second.
     */
    bps: number
}

/**
 * TODO:
 */
export class VaraJS extends EventEmitter {

    private _connection: ConnectionData | undefined;
    /**
     * Information about the current connection. If there is no active connection then it is undefined.
     * 
     * Use the asynchronous connect() and disconnect() methods to change this.
     * @see {@link ConnectionData}
     * @see {@link connect()}
     * @see {@link disconnect()}
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
     * 
     * To change this value, use the asynchronous listenOn() and listenOff() methods.
     * @see {@link listenOn()}
     * @see {@link listenOff()}
     */
    public get listening(): boolean {
        return this._listening
    }
    private set listening(value: boolean) {
        this._listening = value;
    }

    /**
     * If VARA is currently disconnected.
     * 
     * To disconnect, use the asynchronous disconnect() method.
     * @see {@link disconnect()}
     * @see {@link connect()}
     */
    public get disconnected(): boolean {
        return !this.connection
    }

    private _compression: 'OFF' | 'TEXT' | 'FILES' = 'TEXT';
    /**
     * The compression setting that is currently enabled. Default is TEXT.
     * 
     * Use the asynchronous compressionOff(), compressionText(), and compressionFiles() methods to change this.
     * @see {@link compressionOff()}
     * @see {@link compressionText()}
     * @see {@link compressionFiles()}
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
      * 
      * If using VARA HF, use the asynchronous bw500(), bw2300(), and bw2750() methods to change this. If using VARA FM, this is set automatically by the modem.
      * @see {@link bw500()}
      * @see {@link bw2300()}
      * @see {@link bw2750()}
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
     * 
     * Use the asynchronous chatOn() and chatOff() methods to change this.
     * @see {@link chatOn()}
     * @see {@link chatOff()}
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
     * 
     * Use the asynchronous p2pSession() and winlinkSession() methods to change this.
     * @see {@link p2pSession()}
     * @see {@link winlinkSession()}
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
     * Whether PTT is currently on if using VARA FM, or should be in the turned on state by the client if using VARA HF or VARA SAT.
     * 
     * This value is updated automatically by the modem.
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
     * 
     * This value is updated automatically by the modem. Use the asynchronous cleanTxBuffer() method if you wish to clear this.
     * @see {@link cleanTxBuffer()}
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
     * 
     * This value is updated automatically by the modem.
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
     * 
     * This value is updated automatically by the modem.
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
     * 
     * Use the asynchronous myCall() method to change this.
     * @see {@link myCall()}
     */
    public get registered(): string[] {
        return this._registered
    }
    private set registered(value: string[]) {
        this._registered = value;
    }

    private _linkRegistered: boolean = false;
    /**
     * If the current client station is registered in VARA, and therefore supports higher speeds.
     * 
     * This value is changed automatically by the modem.
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
     * 
     * This value is changed automatically by the modem.
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
     * 
     * This value is changed automatically by the modem.
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
     * 
     * This value is changed automatically by the modem and depends on the callsign that you have entered in the modems settings.
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
     * 
     * This value is changed automatically by the modem.
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
     * 
     * You can change this value if it was improperly set in the constructor. Otherwise, it's not usually necessary to change.
     * This can be avoided entirely by simply not defining the varaType property in the factory function and awaiting the result.
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
     * In most cases you can simply use the built in functions and event listeners of this class instead of interacting with the command socket directly,
     * but it is left exposed for edge cases.
     */
    public commandSocket: Socket

    /**
     * The Socket object that is connected to the data port in use by VARA. Its port number is the port number of the command port + 1, usually 8301.
     * 
     * Data sent between stations is written to and read from this socket. The end of an individual transmission or complete "thought"
     * by many programs such as Winlink is usually marked by an "\r" aka carriage return. Note that when writing directly to this socket,
     * you must remember to add the "\r" yourself. The send() method appends it automatically if necessary for convenience.
     */
    public dataSocket: Socket;

    /**
     * Many applications like Winlink use an "\r" aka a carriage return to signify the end of an individual transmission or a complete "thought".
     * Setting this to true and setting an encoding (usually utf8) will cause data that is in string format to only be emitted fully assembled
     * after a carriage return has been received. This makes working with small amounts of data much easier but should be used with caution
     * as it can be more memory intensive. If memory is a concern, consider working with the dataSocket directly using Node's streams API instead.
     */
    public concatenateData: boolean

    /**
     * @privateRemarks
     * used for building concatenated strings from the data port
     */
    private tempData: string = ''

    /**
     * @privateRemarks
     * used interally for error handling
     */
    private lastFunctionName: string = ''
    private lastFunctionArgs: any[] = []
    private lastFunctionMessage: string | undefined

    /**
     * Factory function to bind to a VARA software modem.
     * 
     * All properties are optional, but if you don't specify varaType, a promise is returned while the varaType is determined automatically.
     */
    public static bindModem(args: {
        /**
         * The IP address or domain name of the VARA modem.
         * @default 'localhost'
         */
        host?: string
        /**
         * The port number of the VARA modem's command port.
         * @default 8300
         */
        commandPort?: number
        /**
         * Which type of VARA modem is in use.
         * While this property is optional, if you choose not to specify it then a promise is returned while the type is requested from the modem.
         */
        varaType: 'HF' | 'FM' | 'SAT'
        /**
         * Which BufferEncoding type is being used on the dataSocket.
         * Specifying the type will cause data on the socket and emitted in the events to be string type.
         * Not specifying will cause data on the socket, emitted in events, and returned by promises to be Buffer objects.
         * @default undefined
         */
        encoding?: BufferEncoding
        /**
         * Many applications like Winlink use an "\r" aka a carriage return to signify the end of an individual transmission or a complete "thought".
         * Setting this to true and setting an encoding (usually utf8) will cause data that is in string format to only be emitted fully assembled
         * after a carriage return has been received. This makes working with small amounts of data much easier but should be used with caution
         * as it can be more memory intensive. If memory is a concern, consider working with the dataSocket directly using Node's streams API instead.
         * @default false
         */
        concatenateData?: boolean
    }): VaraJS
    public static async bindModem(args: {
        /**
         * The IP address or domain name of the VARA modem.
         * @default 'localhost'
         */
        host?: string
        /**
         * The port number of the VARA modem's command port.
         * @default 8300
         */
        commandPort?: number
        /**
         * Which type of VARA modem is in use.
         * While this property is optional, if you choose not to specify it then a promise is returned while the type is requested from the modem.
         */
        varaType?: 'HF' | 'FM' | 'SAT'
        /**
         * Which BufferEncoding type is being used on the dataSocket.
         * Specifying the type will cause data on the socket and emitted in the events to be string type.
         * Not specifying will cause data on the socket, emitted in events, and returned by promises to be Buffer objects.
         * @default undefined
         */
        encoding?: BufferEncoding
        /**
         * Many applications like Winlink use an "\r" aka a carriage return to signify the end of an individual transmission or a complete "thought".
         * Setting this to true and setting an encoding (usually utf8) will cause data that is in string format to only be emitted fully assembled
         * after a carriage return has been received. This makes working with small amounts of data much easier but should be used with caution
         * as it can be more memory intensive. If memory is a concern, consider working with the dataSocket direcly using Node's streams API instead.
         * @default false
         */
        concatenateData?: boolean
    }): Promise<VaraJS>
    public static bindModem(args: {
        /**
         * The IP address or domain name of the VARA modem.
         * @default 'localhost'
         */
        host?: string
        /**
         * The port number of the VARA modem's command port.
         * @default 8300
         */
        commandPort?: number
        /**
         * Which type of VARA modem is in use.
         * While this property is optional, if you choose not to specify it then a promise is returned while the type is requested from the modem.
         */
        varaType?: 'HF' | 'FM' | 'SAT'
        /**
         * Which BufferEncoding type is being used on the dataSocket.
         * Specifying the type will cause data on the socket and emitted in the events to be string type.
         * Not specifying will cause data on the socket, emitted in events, and returned by promises to be Buffer objects.
         * @default undefined
         */
        encoding?: BufferEncoding
        /**
         * Many applications like Winlink use an "\r" aka a carriage return to signify the end of an individual transmission or a complete "thought".
         * Setting this to true and setting an encoding (usually utf8) will cause data that is in string format to only be emitted fully assembled
         * after a carriage return has been received. This makes working with small amounts of data much easier but should be used with caution
         * as it can be more memory intensive. If memory is a concern, consider working with the dataSocket directly using Node's streams API instead.
         * @default false
         */
        concatenateData?: boolean
    }): VaraJS | Promise<VaraJS> {

        const vj: VaraJS = new VaraJS(args.host ?? 'localhost', args.commandPort ?? 8300, args.concatenateData ?? false, args.encoding)

        if (args.varaType) {
            vj.varaType = args.varaType
            return vj
        }

        return vj.version().then(() => { // calling version() has the side effect of updating the internal varaType
            return vj
        })

    }

    private constructor(host: string, commandPort: number, concatenateData: boolean, encoding?: BufferEncoding) {

        super()
        this.setMaxListeners(27) // raise the warning threshold to the number of emitted events from this class, which is 27

        this.concatenateData = concatenateData

        this.dataSocket = createNetConnection({
            host: host,
            port: commandPort + 1
        }).setEncoding(encoding)

        this.dataSocket.on('data', (rawData: string | Buffer) => {
            if (this.concatenateData && typeof rawData === 'string') {
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
            // otherwise just emit whatever we got
            else {
                this.emit('data', rawData)
            }
        })

        this.commandSocket = createNetConnection({
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
                        this.linkRegistered = false
                        this.encryptedLink = false
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
     * @param digi1 An optional first digipeater in your path. Only for VARA FM, will be ignored if varaType property is not set to FM.
     * @param digi2 An optional second digipeater in your path. Only for VARA FM, will be ignored if varaType property is not set to FM.
     * @returns A Promise\<void\> that resolves upon successful connection to the remote station, or rejects if connection was unsuccessful.
     */
    public async connect(source: string, destination: string, digi1?: string, digi2?: string): Promise<void> {
        this.wrongHandler(this.connect, arguments)
        if (this.varaType === 'FM' && digi1 && digi2) {
            this.commandSocket.write(`CONNECT ${source} ${destination} VIA ${digi1} ${digi2}\r`)
        }
        else if (this.varaType === 'FM' && digi1) {
            this.commandSocket.write(`CONNECT ${source} ${destination} VIA ${digi1}\r`)
        }
        else {
            this.commandSocket.write(`CONNECT ${source} ${destination}\r`)
        }

        // return new Promise((resolve, reject) => {
        //     const check = (command: string) => {
        //         if (command.startsWith('CONNECTED')) { // internal state mutation on 'CONNECTED' is handled above
        //             resolve()
        //             this.removeListener('command', check)
        //         }
        //         else if (command === 'DISCONNECTED') {
        //             reject(`VARA was unable to make a connection from ${source} to ${destination}.`)
        //             this.removeListener('command', check)
        //         }
        //     }
        //     this.on('command', check)
        // })

        // TODO: TEST THIS MORE CONCISE VERSION AND SEE IF IT WORKS
        const result = await Promise.race([this.promise('CONNECTED'), this.promise('DISCONNECTED')])
        if (typeof result === 'object') {
            return Promise.resolve()
        }
        return Promise.reject(`VARA was unable to make a connection from ${source} to ${destination}.`)
    }

    /**
     * Set incoming connections to enabled.
     * 
     * This command will cause a disconnection if it is received in the middle of a VARA connection
     * @returns a \<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async listenOn(): Promise<void> {
        this.wrongHandler(this.listenOn, arguments)
        this.commandSocket.write('LISTEN ON\r')
        return this.promise('OK').then(() => {
            this.listening = true
        })
    }

    /**
     * Incomming connections disabled.
     * 
     * This command will cause a disconnection if it is received in the middle of a VARA connection.
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async listenOff(): Promise<void> {
        this.wrongHandler(this.listenOff, arguments)
        this.commandSocket.write('LISTEN OFF\r')
        return this.promise('OK').then(() => {
            this.listening = false
        })
    }

    /**
     * Set current call sign (maximum 5 call signs).
     * 
     * Legitimate call signs include from 3 to 7 ASCII characters (A-Z, 0-9) followed by an optional “-“ and an SSID of -1 to -15, -T, and -R. 
     * @param upToFiveCallsigns a string or array of strings containing the callsign(s) to set.
     * @returns a Promise\<string\> that resolves to the callsigns that were registered.
     */
    public async myCall(upToFiveCallsigns: string | string[]): Promise<string[]> {
        if ((Array.isArray(upToFiveCallsigns) && upToFiveCallsigns.length > 5) || (typeof upToFiveCallsigns === 'string' && upToFiveCallsigns.split(' ').length > 5)) {
            this.wrongHandler(this.myCall, arguments, `${Array.isArray(upToFiveCallsigns) ? upToFiveCallsigns.length : upToFiveCallsigns.split(' ').length} callsigns were passed to myCall(). VARA supports a maximum of 5 callsigns.`)
        }
        else {
            this.wrongHandler(this.myCall, arguments)
        }
        this.commandSocket.write(`MYCALL ${Array.isArray(upToFiveCallsigns) ? upToFiveCallsigns.join(' ') : upToFiveCallsigns}\r`)
        return this.promise('REGISTERED')
    }

    /**
     * Disconnect the link, once the TX buffer is empty. 
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async disconnect(): Promise<void> {
        this.wrongHandler(this.disconnect, arguments)
        this.commandSocket.write('DISCONNECT\r')
        // interal state is reset by event handlers defined in the constructor
        return this.promise('DISCONNECTED')
    }

    /**
     * Disconnect the link immediately. (dirty disconnect)
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async abort(): Promise<void> {
        this.wrongHandler(this.abort, arguments)
        this.commandSocket.write('ABORT\r')
        return this.promise('OK').then(() => {
            this.connection = undefined
            this.sn = undefined
            this.bitrate = undefined
            this.buffer = 0
        })
    }

    /**
     * Set compression to disabled.
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async compressionOff(): Promise<void> {
        this.wrongHandler(this.compressionOff, arguments)
        this.commandSocket.write('COMPRESSION OFF\r')
        return this.promise('OK').then(() => {
            this.compression = 'OFF'
        })
    }

    /**
     * Huffman compression enabled, designed for text type information. Recommended for Winlink.
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async compressionText(): Promise<void> {
        this.wrongHandler(this.compressionText, arguments)
        this.commandSocket.write('COMPRESSION TEXT\r')
        return this.promise('OK').then(() => {
            this.compression = 'TEXT'
        })
    }

    /**
     * Compression designed for file transfers
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async compressionFiles(): Promise<void> {
        this.wrongHandler(this.compressionFiles, arguments)
        this.commandSocket.write('COMPRESSION FILES\r')
        return this.promise('OK').then(() => {
            this.compression = 'FILES'
        })
    }

    /**
     * Set VARA HF to 500Hz Narrow mode
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async bw500(): Promise<void> {
        this.wrongHandler(this.bw500, arguments)
        this.commandSocket.write('BW500\r')
        return this.promise('OK').then(() => {
            this.bw = 500
        })
    }

    /**
     * Set VARA HF to 2300Hz Standard mode (default)
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async bw2300(): Promise<void> {
        this.wrongHandler(this.bw2300, arguments)
        this.commandSocket.write('BW2300\r')
        return this.promise('OK').then(() => {
            this.bw = 2300
        })
    }

    /**
     * Set VARA HF to 2750Hz Tactical mode 
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async bw2750(): Promise<void> {
        this.wrongHandler(this.bw2750, arguments)
        this.commandSocket.write('BW2750\r')
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
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async chatOn(): Promise<void> {
        this.wrongHandler(this.chatOn, arguments)
        this.commandSocket.write('CHAT ON\r')

        /**
         * @privateRemarks
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
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async chatOff(): Promise<void> {
        this.wrongHandler(this.chatOff, arguments)
        this.commandSocket.write('CHAT OFF\r')
        return this.promise('OK').then(() => {
            this.chat = false
        })
    }

    /**
     * Send a CQ frame via VARA FM (without digipeaters) or via VARA SAT.
     * @param source The callsign and optional SSID that you wish the frame to be from.
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     * @overload
     */
    public async cqFrame(source: string): Promise<void>
    /**
     * Send a CQ frame via VARA HF.
     * @param source The callsign and optional SSID that you wish the frame to be from.
     * @param bandwidth The bandwidth that you wish to chat at.
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     * @overload
     */
    public async cqFrame(source: string, bandwidth: 500 | 2300 | 2750): Promise<void>
    /**
     * Send a CQ frame via VARA FM with up to 2 optional digipeaters.
     * @param source The callsign and optional SSID that you wish the frame to be from.
     * @param digi1 The first digipeater's callsign and optional SSID that you wish to use in your path.
     * @param digi2 The second digipeater's callsign and optional SSID that you wish to use in your path.
     * @returns a Promise<\void\> that resolves upon VARA's acknowledgment of the command.
     * @overload
     */
    public async cqFrame(source: string, digi1?: string, digi2?: string): Promise<void> // send a cq frame with vara fm
    public async cqFrame(source: string, bandwidthOrDigi1?: 500 | 2300 | 2750 | string, digi2?: string): Promise<void> {
        this.wrongHandler(this.cqFrame, arguments)
        if (bandwidthOrDigi1 && digi2) {
            this.commandSocket.write(`CQFRAME ${source} ${bandwidthOrDigi1} ${digi2}\r`)
        }
        else if (bandwidthOrDigi1) {
            this.commandSocket.write(`CQFRAME ${source} ${bandwidthOrDigi1}\r`)
        }
        else {
            this.commandSocket.write(`CQFRAME ${source}\r`)
        }
        return this.promise('PTT OFF') // final command after ok and pending that indicates that you're free to queue/send more data
    }

    /**
     * VARA HF and VARA SAT only
     * 
     * VARA sends retries following a 4.0 second cycle, necessary to connect with the RMS Gateways (DWELL time 4s) (DEFAULT)
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async winlinkSession(): Promise<void> {
        this.wrongHandler(this.winlinkSession, arguments)
        this.commandSocket.write('WINLINK SESSION\r')
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
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async p2pSession(): Promise<void> {
        this.wrongHandler(this.p2pSession, arguments)
        this.commandSocket.write('P2P SESSION\r')
        return this.promise('OK').then(() => {
            this.session = 'P2P'
        })
    }

    /**
     * VARA HF and VARA SAT only
     * 
     * Get the drive level value.
     * @returns a Promise<number> that resolves to a drive level number between -30 and 0, inclusive.
     * @overload
     */
    public async tune(): Promise<number>
    /**
     * VARA HF and VARA SAT only
     * 
     * Set TUNE Button to ON and drive level to X dB. The tune button will only be set to ON if at least one callsign is registered.
     * @param negativeDecibels The amount of decibles to set the drive level to. Must be between -30 and 0, inclusive.
     * @returns A Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     * @overload
     */
    public async tune(negativeDecibels: number): Promise<void>
    public async tune(negativeDecibels?: number): Promise<number | void> {
        this.wrongHandler(this.tune, arguments, this.varaType === 'FM' ? 'Tune functions can only be called when using VARA HF and VARA SAT' : undefined)
        if (typeof negativeDecibels !== 'undefined') {
            this.commandSocket.write(`TUNE ${negativeDecibels}\r`)
            return this.promise('OK')
        }
        this.commandSocket.write('TUNE ?\r')
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

    /**
     * VARA HF and VARA SAT only
     * 
     * Set TUNE button to OFF
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async tuneOff(): Promise<void> {
        this.wrongHandler(this.tuneOff, arguments, this.varaType === 'FM' ? 'Tune functions can only be called when using VARA HF and VARA SAT' : undefined)
        this.commandSocket.write('TUNE OFF\r')
        return this.promise('OK')
    }

    /**
     * Erase the transmission buffer, in case transmission has not started yet. 
     * @returns a Promise\<'BUFFEREMPTY' | 'OK' | 'FAILED'\> that resolves to 'OK' or 'BUFFEREMPTY', or rejects if the status is 'FAILED'
     */
    public async cleanTxBuffer(): Promise<'BUFFEREMPTY' | 'OK' | 'FAILED'> {
        this.wrongHandler(this.cleanTxBuffer, arguments)
        this.commandSocket.write('CLEANTXBUFFER\r')
        // return new Promise((resolve, reject) => {
        //     this.once('CLEANTXBUFFER', (status) => {
        //         if (status === 'OK' || status === 'BUFFEREMPTY') {
        //             resolve(status)
        //             this.buffer = 0
        //         }
        //         else if (status === 'FAILED') {
        //             reject('Unable to erase the TX Buffer at the moment.')
        //         }
        //     })
        // })

        // TODO: TEST THIS MORE CONCISE VERSION AND SEE IF IT WORKS
        const status = await this.promise('CLEANTXBUFFER')
        if (status === 'FAILED') {
            return Promise.reject('Unable to erase the TX Buffer at the moment.')
        }
        this.buffer = 0
        return Promise.resolve(status)
    }

    /**
     * Get the VARA version.
     * @returns a Promise<string> that resolves to a string containing the current version of VARA.
     */
    public async version(): Promise<string> {
        this.wrongHandler(this.version, arguments)
        this.commandSocket.write('VERSION\r')
        return this.promise('VERSION')
    }


    /**
     * Writes data to the VARA dataSocket. The second parameter specifies the encoding in the case of a string. It defaults to UTF8 encoding.
     * 
     * Returns true if the entire data was flushed successfully to the kernel buffer. Returns false if all or part of the data was queued in user memory.
     * 
     * The optional callback parameter will be executed when the data is finally written out, which may not be immediately.
     * 
     * If an error occurs, the callback will be called with the error as its first argument. The callback is called asynchronously.
     * 
     * See Writable stream write() method for more information.
     * 
     * In addition to the usual stream behavior, this method also appends a "\r" aka carriage return to the end of strings passed to it if necessary.
     * To avoid this behavior, write directly to the dataSocket object, or pass a Buffer to this method instead of a string.
     * @param buffer the data to write to the socket either as a string or a Uint8Array
     * @param encoding the encoding if using a string. Default is 'utf8'
     * @param cb an optional callback to execute after finishing writing the data. If an error occurs, it will be the first argument.
     */
    public send(buffer: Uint8Array | string, encoding?: BufferEncoding, cb?: (err?: Error) => void): boolean {
        this.wrongHandler(this.send, arguments)
        if (typeof buffer === 'string' && !buffer.endsWith('\r')) {
            buffer += '\r'
        }
        return this.dataSocket.write(buffer, encoding, cb)
    }

    /**
     * Half-closes the commandSocket and dataSocket. i.e., it sends a FIN packet. It is possible the server will still send some data.
     * @see Writable.end() in the streams API for further details.
     */
    public end(): void {
        this.commandSocket.end()
        this.dataSocket.end()
    }

    /**
     * Alias for the end() method.
     * @alias {@link end()}
     */
    public close(): void {
        return this.end()
    }

    /**
     * Adds an event listener for data being received by the modem.
     * @param listener a callback function that provides the data received in the form of a Buffer.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('data', (data: Buffer) => {
     *     console.log(data.toString('utf8'))
     * })
     * ```
     */
    public on(eventName: 'data', listener: (data: Buffer) => void): this
    /**
     * Adds an event listener for data being received by the modem.
     * @param listener a callback function that provides the data received in the form of a string.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('data', (data: string) => {
     *     console.log(data)
     * })
     * ```
     * @overload
     */
    public on(eventName: 'data', listener: (data: string) => void): this
    /**
     * Adds an event listener for a command or status change being announced by the modem.
     * @param listener a callback function that provides the command or status change received in the form of a string.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('command', (command: string) => {
     *     console.log(command)
     * })
     * ```
     */
    public on(eventName: 'command', listener: (command: string) => void): this
    /**
     * Adds an event listener for a WRONG event. VARA emits these when an unprocessable command is issued to it.
     * Error handling style is left up to the individual developer and errors are not thrown automatically when this event is emitted.
     * @param listener a callback function that provides a standard Error object with the cause of the error.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('WRONG', (err: Error) => {
     *     throw err
     * })
     * ```
     */
    public on(eventName: 'WRONG', listener: (err: Error) => void): this
    /**
     * Adds an event listener for the event. 
     * @param listener a callback function to execute every time the event happens.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     */
    public on(eventName: EmitWithoutData, listener: () => void): this
    /**
     * Adds an event listener for the IAMALIVE event, which is emitted by VARA approximately every 60 seconds.
     * @param listener a callback function that provides the unix time in milliseconds of when the command was received from VARA.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('IAMALIVE', (timestamp: number) => {
     *     console.log(`VARA alive and well @ ${new Date(timestamp).toLocaleTimeString()}`)
     * })
     * ```
     */
    public on(eventName: 'IAMALIVE', listener: (timestamp: number) => void): this
    /**
     * Adds an event listener for the missing soundcard event, you should check your settings and hardware.
     * @param listener a callback function that provides a standard Error object.
     * @return a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('MISSING SOUNDCARD', (err: Error) => {
     *     throw err
     * })
     * ```
     */
    public on(eventName: 'MISSING SOUNDCARD', listener: (err: Error) => void): this
    /**
     * Adds an event listener for the CLEANTXBUFFER event, which is emitted as a response to the cleanTxBuffer() method.
     * @see {@link cleanTxBuffer()}
     * @param listener a callback function that provides the status of the tx buffer.
     * @return a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('CLEANTXBUFFER', (status: 'BUFFEREMPTY' | 'OK' | 'FAILED') => {
     *     if (status === 'FAILED') {
     *         console.log('Failed to clean the tx buffer.')
     *     }
     * })
     * 
     * vj.cleanTxBuffer()
     * ```
     */
    public on(eventName: 'CLEANTXBUFFER', listener: (status: 'BUFFEREMPTY' | 'OK' | 'FAILED') => void): this
    /**
     * Adds an event listener for the VERSION event, which is emitted as a response to calling the version() method.
     * @see {@link version()}
     * @param listener a callback function that provides the current version of VARA as a string.
     * @return a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('VERSION', (version: string) => {
     *     console.log(`${version} is currently running.`)
     * })
     * 
     * vj.version()
     * ```
     */
    public on(eventName: 'VERSION', listener: (version: string) => void): this
    /**
     * Adds an event listener for the CONNECTED event, which is emitted upon a successful inbound or outbound connection to a remote station.
     * @param listener a callback function that provides a ConnectionData object containing address, bandwidth, and routing information. 
     * @see {@link ConnectionData}
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type ConnectionData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('CONNECTED', (cd: ConnectionData) => {
     *     console.log('Connection made from ' + cd.source + (cd.digi1 ? ' via ' + cd.digi1 : '') + (cd.digi2 ? ', ' + cd.digi2 : ''))
     * })
     * 
     * vj.listenOn()
     * ```
     */
    public on(eventName: 'CONNECTED', listener: (cd: ConnectionData) => void): this
    /**
     * Adds an event listener for the BUFFER event, which is emitted by VARA when VARA adds data to queue or VARA removes acked bytes from queue.
     * @param listener a callback function that provides a number representing the amount of bytes currently in the transmit buffer queue.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('BUFFER', (bytes: number) => {
     *     if (bytes > 10_000_000) {
     *         console.log('There are currently over 10 MB of data in the transfer buffer queue. Consider reducing file sizes prior to sending them.')
     * })
     * ```
     */
    public on(eventName: 'BUFFER', listener: (bytes: number) => void): this
    /**
     * Adds an event listener for the REGISTERED event, which is emitted by VARA when callsigns have successfully been registered in VARA.
     * @param listener a callback function that provides an array of callsigns that were successfully registered in VARA.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('REGISTERED', (calls: string[]) => {
     *     console.log(`Successfully registered callsigns ${calls.join(', ')} in VARA ${vj.varaType}.`)
     * })
     * 
     * vj.myCall(['KO4LCM', 'KO4LCM-1'])
     * vj.myCall('KO4LCM KO4LCM-1') // also acceptable
     * ```
     */
    public on(eventName: 'REGISTERED', listener: (calls: string[]) => void): this
    /**
     * Adds an event listener for the CQFRAME event, which is emitted by VARA when it has received a CQ from another station.
     * @param listener a callback function that provides a CQFrameData object containing address, bandwidth, and routing information.
     * @see {@link CQFrameData}
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type CQFrameData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('CQFRAME', (cq: CQFrameData) => {
     *     if (vj.varaType !== 'SAT') {
     *         console.log(`Received a CQ from ${cq.source} at ${cq.bw} bandwidth.`)
     *     }
     *     else {
     *         console.log(`Received a CQ from ${cq.source}.`) // bandwidth is undefined on VARA SAT
     *     }
     * })
     * ```
     */
    public on(eventName: 'CQFRAME', listener: (cq: CQFrameData) => void): this
    /**
     * Adds an event listener for the SN event, which is emitted by VARA when it has received a frame.
     * @param listener a callback function that provides a number representing the signal to noise ratio of the most recently received frame.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('SN', (sn: number) => {
     *     console.log(`The current signal to noise ratio is ${sn}`)
     * })
     * ```
     */
    public on(eventName: 'SN', listener: (sn: number) => void): this
    /**
     * Adds an event listener for the BITRATE event, which is emitted by VARA when it has an updated current bitrate and/or speed level.
     * @param listener a callback function that provides a BitrateData object, containing an sl and bps property representing the current speed level and bits per second, respectively.
     * @see {@link BitrateData}
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type BitrateData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('BITRATE', (br: BitrateData) => {
     *     console.log(`Data is currently being transferred at ${br.bps} bits per second, speed level ${br.sl}.`)
     * })
     * ```
     */
    public on(eventName: 'BITRATE', listener: (br: BitrateData) => void): this
    public on(eventName: Emit, listener: (...args: any) => void): this {
        return super.on(eventName, listener)
    }

    /**
     * Adds **one-time** event listener for data being received by the modem.
     * @param listener a callback function that provides the data received in the form of a Buffer.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('data', (data: Buffer) => {
     *     console.log(data.toString('utf8'))
     * })
     * ```
     */
    public once(eventName: 'data', listener: (data: Buffer) => void): this
    /**
     * Adds a **one-time** event listener for data being received by the modem.
     * @param listener a callback function that provides the data received in the form of a string.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('data', (data: string) => {
     *     console.log(data)
     * })
     * ```
     */
    public once(eventName: 'data', listener: (data: string) => void): this
    /**
     * Adds a **one-time** event listener for a command or status change being announced by the modem.
     * @param listener a callback function that provides the command or status change received in the form of a string.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('command', (command: string) => {
     *     console.log(command)
     * })
     * ```
     */
    public once(eventName: 'command', listener: (command: string) => void): this
    /**
     * Adds a **one-time** event listener for a WRONG event. VARA emits these when an unprocessable command is issued to it.
     * Error handling style is left up to the individual developer and errors are not thrown automatically when this event is emitted.
     * @param listener a callback function that provides a standard Error object with the cause of the error.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('WRONG', (err: Error) => {
     *     throw err
     * })
     * ```
     */
    public once(eventName: 'WRONG', listener: (err: Error) => void): this
    /**
     * Adds a **one-time** event listener for the event. 
     * @param listener a callback function to execute every time the event happens.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     */
    public once(eventName: EmitWithoutData, listener: () => void): this
    /**
     * Adds a **one-time** event listener for the IAMALIVE event, which is emitted by VARA approximately every 60 seconds.
     * @param listener a callback function that provides the unix time in milliseconds of when the command was received from VARA.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('IAMALIVE', (timestamp: number) => {
     *     console.log(`VARA alive and well @ ${new Date(timestamp).toLocaleTimeString()}`)
     * })
     * ```
     */
    public once(eventName: 'IAMALIVE', listener: (timestamp: number) => void): this
    /**
     * Adds a **one-time** event listener for the missing soundcard event, you should check your settings and hardware.
     * @param listener a callback function that provides a standard Error object.
     * @return a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('MISSING SOUNDCARD', (err: Error) => {
     *     throw err
     * })
     * ```
     */
    public once(eventName: 'MISSING SOUNDCARD', listener: (err: Error) => void): this
    /**
     * Adds a **one-time** event listener for the CLEANTXBUFFER event, which is emitted as a response to the cleanTxBuffer() method.
     * @param listener a callback function that provides the status of the tx buffer.
     * @return a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('CLEANTXBUFFER', (status: 'BUFFEREMPTY' | 'OK' | 'FAILED') => {
     *     if (status === 'FAILED') {
     *         console.log('Failed to clean the tx buffer.')
     *     }
     * })
     * 
     * vj.cleanTxBuffer()
     * ```
     */
    public once(eventName: 'CLEANTXBUFFER', listener: (status: 'BUFFEREMPTY' | 'OK' | 'FAILED') => void): this
    /**
     * Adds a **one-time** event listener for the VERSION event, which is emitted as a response to calling the version() method.
     * @param listener a callback function that provides the current version of VARA as a string.
     * @return a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('VERSION', (version: string) => {
     *     console.log(`${version} is currently running.`)
     * })
     * 
     * vj.version()
     * ```
     */
    public once(eventName: 'VERSION', listener: (version: string) => void): this
    /**
     * Adds a **one-time** event listener for the CONNECTED event, which is emitted upon a successful inbound or outbound connection to a remote station.
     * @param listener a callback function that provides a ConnectionData object containing address, bandwidth, and routing information. 
     * @see {@link ConnectionData}
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type ConnectionData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('CONNECTED', (cd: ConnectionData) => {
     *     console.log('Connection made from ' + cd.source + (cd.digi1 ? ' via ' + cd.digi1 : '') + (cd.digi2 ? ', ' + cd.digi2 : ''))
     * })
     * 
     * vj.listenOn()
     * ```
     */
    public once(eventName: 'CONNECTED', listener: (cd: ConnectionData) => void): this
    /**
     * Adds a **one-time** event listener for the BUFFER event, which is emitted by VARA when VARA adds data to queue or VARA removes acked bytes from queue.
     * @param listener a callback function that provides a number representing the amount of bytes currently in the transmit buffer queue.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('BUFFER', (bytes: number) => {
     *     if (bytes > 10_000_000) {
     *         console.log('There are currently over 10 MB of data in the transfer buffer queue. Consider slowing down the rate at which you are sending data or reduce file sizes.')
     * })
     * ```
     */
    public once(eventName: 'BUFFER', listener: (bytes: number) => void): this
    /**
     * Adds a **one-time** event listener for the REGISTERED event, which is emitted by VARA when callsigns have successfully been registered in VARA.
     * @param listener a callback function that provides an array of callsigns that were successfully registered in VARA.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('REGISTERED', (calls: string[]) => {
     *     console.log(`Successfully registered callsigns ${calls.join(', ')} in VARA ${vj.varaType}.`)
     * })
     * 
     * vj.myCall(['KO4LCM', 'KO4LCM-1'])
     * vj.myCall('KO4LCM KO4LCM-1') // also acceptable
     * ```
     */
    public once(eventName: 'REGISTERED', listener: (calls: string[]) => void): this
    /**
     * Adds a **one-time** event listener for the CQFRAME event, which is emitted by VARA when it has received a CQ from another station.
     * @param listener a callback function that provides a CQFrameData object containing address, bandwidth, and routing information.
     * @see {@link CQFrameData}
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type CQFrameData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('CQFRAME', (cq: CQFrameData) => {
     *     if (vj.varaType !== 'SAT') {
     *         console.log(`Received a CQ from ${cq.source} at ${cq.bw} bandwidth.`)
     *     }
     *     else {
     *         console.log(`Received a CQ from ${cq.source}.`) // bandwidth is undefined on VARA SAT
     *     }
     * })
     * ```
     */
    public once(eventName: 'CQFRAME', listener: (cq: CQFrameData) => void): this
    /**
     * Adds a **one-time** event listener for the SN event, which is emitted by VARA when it has received a frame.
     * @param listener a callback function that provides a number representing the signal to noise ratio of the most recently received frame.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('SN', (sn: number) => {
     *     console.log(`The current signal to noise ratio is ${sn}`)
     * })
     * ```
     */
    public once(eventName: 'SN', listener: (sn: number) => void): this
    /**
     * Adds a **one-time** event listener for the BITRATE event, which is emitted by VARA when it has an updated current bitrate and/or speed level.
     * @param listener a callback function that provides a BitrateData object, containing an sl and bps property representing the current speed level and bits per second, respectively.
     * @see {@link BitrateData}
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type BitrateData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('BITRATE', (br: BitrateData) => {
     *     console.log(`Data is currently being transferred at ${br.bps} bits per second, speed level ${br.sl}.`)
     * })
     * ```
     */
    public once(eventName: 'BITRATE', listener: (br: BitrateData) => void): this
    public once(eventName: Emit, listener: (...args: any) => void): this {
        return super.once(eventName, listener)
    }

    /**
     * An asynchronous function to get the next command sent by VARA.
     * @returns a Promise\<string\> that resolves to the most recent command sent from VARA.
     * @overload
     */
    public async promise(event: 'command'): Promise<string>
    /**
     * An asynchronous function to get the next chunk of data sent by VARA.
     * @returns a Promise\<string | Buffer\> that resolves to the most recent data sent from VARA.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * await vjs.promise('CONNECTED')
     * 
     * const nextData: string | Buffer = await vjs.promise('data')
     * 
     * if (typeof nextData === 'string') {
     *     switch (nextData) {
     *         case 'time':
     *             vjs.send(new Date().toLocaleTimeString())
     *             vjs.disconnect()
     *             break;
     *         case 'date':
     *             vjs.send(new Date().toLocaleDateString())
     *             vjs.disconnect()
     *             break;
     *         // etc
     *         default:
     *             vjs.send(`Command "${nextData}" was not recognized.`)
     *             vjs.disconnect()
     *             break;
     *     }
     * }
     * ```
     */
    public async promise(event: 'data'): Promise<string | Buffer>
    /**
     * An asynchronous function to await the next connection event.
     * @returns a Promise\<ConnectionData\> that resolves to an object containing address, bandwidth, and routing information.
     * @see {@link ConnectionData}
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type ConnectionData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * const approvedList: string[] = ['KO4LCM', 'WW1USA']
     * 
     * const cd: ConnectionData = await vjs.promise('CONNECTED')
     * 
     * if (approvedList.includes(cd.source)) {
     *     vjs.send('Hello my friend!')
     * }
     * else {
     *     vjs.send('You are not on the list of authorized callsigns.')
     *     await vjs.disconnect()
     * }
     * ```
     */
    public async promise(event: 'CONNECTED'): Promise<ConnectionData>
    /**
     * An asynchronous function that resolves when VARA adds data to queue or VARA removes acked bytes from queue.
     * 
     * To check the current amount of bytes in the queue without using promises, use the .buffer property.
     * @returns a Promise\<number\> that resolves to the number bytes that are currently in the transmit buffer queue.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     *
     * vjs.promise('CONNECTED').then((cd: ConnectionData) => {
     *     vjs.promise('BUFFER').then((bytes: number) => {
     *         console.log(`There are ${bytes} in the transfer queue.`)
     *     })
     *     vjs.send('some data')
     * }) 
     * ```
     */
    public async promise(event: 'BUFFER'): Promise<number>
    /**
     * An asynchronous function that resolves after VARA registers callsigns using the myCall() method.
     * It's recomended to await / .then() the myCall() method instead of calling this method as it is mostly for internal use and called automatically by myCall().
     * @returns a Promise\<string[]\> that resolves to the callsigns that were registered in VARA.
     * @overload
     */
    public async promise(event: 'REGISTERED'): Promise<string[]>
    /**
     * An asynchronous function that resolves upon the 'IAMALIVE' command that is sent every ~60 seconds by VARA.
     * @returns a Promise\<number\> that resolves to the unix time in milliseconds of when the command was sent from VARA.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * console.log(`VARA alive and well @ ${new Date(await vjs.promise('IAMALIVE')).toLocaleTimeString()}`)
     * ```
     */
    public async promise(event: 'IAMALIVE'): Promise<number>
    /**
     * An asynchronous function that resolves when VARA has detected that the soundcard is missing.
     * @returns a Promise\<Error\> that resolves to a standard Error object.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     *
     * vjs.promise('MISSING SOUNDCARD').then((err: Error) => {
     *     console.log('VARA has reported that there is a soundcard issue. Please check your settings and hardware.')
     * })
     * ```
     */
    public async promise(event: 'MISSING SOUNDCARD'): Promise<Error>
    /**
     * An asynchronous function that resolves upon reception of a CQ Frame from another station.
     * @returns a Promise\<CQFrameData\> that resolves to a object containing address, bandwidth, and routing information
     * @see {@link CQFrameData}
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type CQFrameData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     *
     * while(true) {
     *     const cq: CQFrameData = await vjs.promise('CQFRAME')
     *     console.log(`Received a CQ frame from ${cq.source}`)
     * }
     * ```
     */
    public async promise(event: 'CQFRAME'): Promise<CQFrameData>
    /**
     * An asynchronous function that resolves when VARA updates the current signal to noise ratio.
     * 
     * To check the current signal to noise ratio without using promises, use the sn property.
     * @returns a Promise\<number\> that resolves to the updated signal to noise ratio.
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type ConnectionData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     *
     * vjs.on('CONNECTED', (cd: ConnectionData) => {
     *     vjs.promise('SN').then((sn: number) => {
     *         console.log(`The initial signal to noise ratio is ${sn}`)
     *     })
     *     // do some more stuff
     * })
     * ```
     */
    public async promise(event: 'SN'): Promise<number>
    /**
     * An asynchronous function that resolves when VARA updates the bitrate data.
     * 
     * To check the most recent bitrate data without using promises, use the bitrate property.
     * @returns a Promise\<BitrateData\> that resolves to an object which has 2 properties: sl (speed level) and bps (bits per second).
     * @see {@link BitrateData}
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type ConnectionData, type BitrateData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     *
     * vjs.on('CONNECTED', (cd: ConnectionData) => {
     *     vjs.promise('BITRATE').then((br: BitrateData) => {
     *         console.log(`The initial bitrate is ${br.bps} and the speed level is ${br.sl}`)
     *     })
     *     // do some more stuff
     * })
     * ```
     */
    public async promise(event: 'BITRATE'): Promise<BitrateData>
    /**
     * An asynchronous function that resolves when VARA finishes attempting to erase the transmission buffer.
     * 
     * This method does not tell VARA to clean the transmission buffer. To do that, call the cleanTxBuffer() method instead.
     * 
     * It's recomended to await / .then() the cleanTxBuffer() method instead of calling this method as it is mostly for internal use and called automatically by cleanTxBuffer().
     * @returns a Promise\<'BUFFEREMPTY' | 'OK' | 'FAILED'\> that resolves to the status.
     * @overload
     */
    public async promise(event: 'CLEANTXBUFFER'): Promise<'BUFFEREMPTY' | 'OK' | 'FAILED'>
    /**
     * An asynchronous function that resolves when VARA emits the version string.
     * 
     * This method does not tell VARA to get the version string, use the version() method instead.
     * 
     * It's recomended to await / .then() the version() method instead of calling this method as it is mostly for internal use and called automatically by version().
     * @returns a Promise\<string\> that resolves to the VARA version string.
     * @overload
     */
    public async promise(event: 'VERSION'): Promise<string>
    /**
     * An asynchronous function that resolves when VARA emits a wrong / error event.
     * @returns a Promise\<Error\> that resolves to a standard error object.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     *
     * vjs.promise('WRONG').then((err: Error) => {
     *     throw err
     * })
     * ```
     */
    public async promise(event: 'WRONG'): Promise<Error>
    /**
     * An asynchronous function that resolves when VARA emits a disconnection event.
     * 
     * This method does not tell VARA to disconnect from the remote station, use the disconnect() method instead.
     * @returns a Promise\<void\> that resolves when the VARA modem has disconnected from the remote station.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * await vjs.connect('MY1CALL', 'THEIR0CALL')
     * 
     * // do some stuff
     *
     * vjs.promise('DISCONNECTED').then(() => {
     *     console.log('Disconnected from remote station. Thank you for using VaraJS.')
     * })
     * 
     * await vjs.disconnect()
     * ```
     */
    public async promise(event: 'DISCONNECTED'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a PTT OFF event.
     * 
     * This method does not turn PTT off, that is controlled automatically by VARA.
     * @returns a Promise\<void\> that resolves when the PTT is turned off by VARA.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.promise('PTT OFF').then(() => console.log('Transmission has ended.'))
     * 
     * vjs.cqFrame('MY1CALL')
     * ```
     */
    public async promise(event: 'PTT OFF'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a PTT ON event.
     * 
     * This method does not turn PTT on, that is controlled automatically by VARA.
     * @returns a Promise\<void\> that resolves when the PTT is turned oN by VARA.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.promise('PTT ON').then(() => console.log('Transmission has begun.'))
     * 
     * vjs.cqFrame('MY1CALL')
     * ```
     */
    public async promise(event: 'PTT ON'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a PENDING event.
     * @returns a Promise\<void\> that resolves when a pending connection has begun.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.promise('PENDING').then(() => console.log('A pending connection has been made.'))
     * ```
     */
    public async promise(event: 'PENDING'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a CANCELPENDING event.
     * @returns a Promise\<void\> that resolves when a pending connection has been canceled.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.promise('CANCELPENDING').then(() => console.log('A pending connection has been cancelled. Guess they didn't want to talk.'))
     * ```
     */
    public async promise(event: 'CANCELPENDING'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a BUSY OFF event.
     * @returns a Promise\<void\> that resolves when VARA has indicated that the channel is free.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.promise('BUSY OFF').then(() => console.log('The current channel is free.'))
     * ```
     */
    public async promise(event: 'BUSY OFF'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a BUSY ON event.
     * @returns a Promise\<void\> that resolves when VARA has indicated that the channel is busy.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.promise('BUSY ON').then(() => console.log('The current channel is busy.'))
     * ```
     */
    public async promise(event: 'BUSY ON'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a LINK REGISTERED event.
     * @returns a Promise \<void\> that resolves when VARA has indicated that the remote station is a registered user capable of full speed.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.promise('LINK REGISTERED').then(() => console.log('The remote station is a registered user and capable of full speed.'))
     * ```
     */
    public async promise(event: 'LINK REGISTERED'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits a LINK UNREGISTERED event.
     * @returns a Promise \<void\> that resolves when VARA has indicated that the remote station is an unregistered user only capable of limited speeds.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.promise('LINK UNREGISTERED').then(() => console.log('The remote station is an unregistered user only capable of limited speeds.'))
     * ```
     */
    public async promise(event: 'LINK UNREGISTERED'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits an ENCRYPTION DISABLED event.
     * 
     * This should always be the case when using VARA for amateur use.
     * @returns a Promise\<void\> that resolves when VARA has indicated that encryption is disabled for any potential connections.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.promise('ENCRYPTION DISABLED').then(() => console.log('Encryption is currently disabled based off your callsign.'))
     * ```
     */
    public async promise(event: 'ENCRYPTION DISABLED'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits an ENCRYPTION READY event.
     * 
     * This should only be the case if you are licensed to use VARA for commercial use and/or encryption is legal in your area.
     * @returns a Promise\<void\> that resolves when VARA has indicated that encryption is enabled for any potential connections.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.promise('ENCRYPTION READY').then(() => console.log('Encryption is ready to use based off your callsign.'))
     * ```
     */
    public async promise(event: 'ENCRYPTION READY'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits an UNENCRYPTED LINK event.
     * 
     * This should always be the case when using VARA for amateur use.
     * @returns a Promise\<void\> that resolves when VARA indicates that the connection to the remote station is NOT currently encrypted.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.promise('UNENCRYPTED LINK').then(() => console.log('WARNING: THIS LINK IS UNENCRYPTED AND INSECURE.'))
     * ```
     */
    public async promise(event: 'UNENCRYPTED LINK'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits an ENCRYPTED LINK event.
     * 
     * This should only be the case if you are licensed to use VARA for commercial use and/or encryption is legal in your area.
     * @returns a Promise\<void\> that resolves when VARA indicates that the connection to the remote station is currently encrypted.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * await vjs.connect('MYCALL', 'THEIRCALL')
     * 
     * await vjs.promise('ENCRYPTED LINK')
     * console.log('Encryption enabled, using secure comms.')
     * vjs.send(db.secretData)
     * ```
     */
    public async promise(event: 'ENCRYPTED LINK'): Promise<void>
    /**
     * An asynchronous function that resolves when VARA emits an OK event. The opposite of promise('WRONG').
     * 
     * This method is used internally to resolve other promises, it is not normally necessary to call this method.
     * @returns a Promise\<void\> that resolves when VARA has indicated that a command was acceptable.
     * @overload
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

    // // left in place because they make type checking during library development easier
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