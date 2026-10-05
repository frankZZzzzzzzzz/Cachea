import { type UUID }from "node:crypto"

namespace Cachea {
    // Client Receive Types
    export type TCPReturnStatus = "SUCCESS" | "FAILURE";
    export type TCPReturnData = string | Object | null;
    export type TCPReturnMessage = string | null;;
    export type ClientReceiveType = {
        requestID: UUID;
        status: TCPReturnStatus;
        message: TCPReturnMessage;
        data: TCPReturnData;
    }

    // Server Receive Types
    export type ActionTypes = "PING" | "SET" | "GET" | "SETEXPIRE" | "SHUTDOWN";
    export type SETSpecificType = Record<string, unknown> | string;
    export type GETSpecificType = string[];
    export type SETEXPIREType = number;
    export type anySpecifics = SETSpecificType | GETSpecificType | SETEXPIREType
    export type ServerReceiveType = {
        requestID: UUID;
        action: ActionTypes;
        key: string | null;
        specifics: anySpecifics;
    }
    export function encodeMessage(message: string){
        const data = Buffer.from(message);
        const header = Buffer.alloc(4);
        header.writeUInt32BE(data.length)

        return (Buffer.concat([header, data]));
    }
}
export { Cachea };