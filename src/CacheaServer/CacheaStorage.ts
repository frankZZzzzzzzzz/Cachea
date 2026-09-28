import dotenv from "dotenv"
dotenv.config();

//Milliseconds
const CLEANUP_INTERVAL: number = Number(process.env.CLEANUP_INTERVAL) || 60_000;

type CacheaValue = {
    data: string | Object;
    expires: number | null;
};

export class CacheaStorage{
    storage: Map<string, CacheaValue> = new Map<string, CacheaValue>();
    cleanupDataIntervalID: NodeJS.Timeout;
    constructor(){
        this.cleanupDataIntervalID = setInterval(()=>{
            this.cleanupData();
        }, CLEANUP_INTERVAL);
    }
    setData(key: string, data: Record<string, unknown> | string){
        const cached = this.storage.get(key);
        if (cached && typeof cached !== typeof data)
            throw new Error(`Type Mismatch: New Data (${typeof data}) | Cached Data (${typeof cached})`);

        if (!cached || typeof cached === "string")
            this.storage.set(key, {
                data,
                expires: null
            });
        else
            this.storage.set(key, {
                data: {
                    ...(cached?.data as object),
                    ...(data as object)
                },
                expires: null
            });
    }
    getData(key: string, specifics: string[]){
        const cached = this.storage.get(key);
        if (!cached)
            return (null);

        if (cached.expires && cached.expires < Date.now()){
            this.storage.delete(key);
            throw new Error("Data has expired");
        }

        const specificsKeys = Object.keys(specifics);

        if (specifics === null || specificsKeys.length === 0)
            return (cached.data);
        if (specificsKeys.length !== 0 && typeof cached === "string")
            throw new Error(`Type Mismatch: Attempt of specifics (${specifics}) on string type`);

        const returnData: Record<string, unknown> = {};

        for (const specific of specifics)
            if (specific in cached)
                returnData[specific] = cached[specific as keyof typeof cached];

        return (returnData);
    }
    setExpire(key: string, expirationDuration: number){
        const cached = this.storage.get(key);
        if (cached)
            cached.expires = Date.now() + expirationDuration;
        else
            throw new Error("Cannot SETEXPIRE on entry that does not exist");
    }
    cleanupData(){
        const current = Date.now();
        for (const [key, value] of this.storage){
            if (value.expires !== null && value.expires < current)
                this.storage.delete(key);
        }
    }
    shutDown(){
        clearInterval(this.cleanupDataIntervalID);
    }
}