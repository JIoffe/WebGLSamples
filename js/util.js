export class RegexUtils{
    /**
     * Extracts all individual int values from a string
     * @param {string} s 
     */
    static getInts(s){
        const regex = /(-?\d+)/g;
        const matches = RegexUtils.getAllMatches(regex, s);
        return matches.map(m => parseInt(m, 10));       
    }

    /**
     * Extracts all individual float values from a string
     * @param {string} s 
     */
    static getFloats(s){
        const regex = /(-?[\d\.]+)/g;
        const matches = RegexUtils.getAllMatches(regex, s);
        return matches.map(m => parseFloat(m));
    }

    /**
     * Returns all regex matching groups against a string
     * @param {RegExp} regex 
     * @param {string} s 
     */
    static getAllMatches(regex, s){
        const matches = [];
        let m;

        while(!!(m = regex.exec(s))){
            matches.push(m[0]);
        };
        
        return matches;
    }
}

export class MeshZipper{
    /**
     * Combines processed mesh data into a single interleaved array buffer
     * @param  {...any} meshes 
     */
    static ZipIndices(...meshes){
        let indexOffset = 0;
        return new Uint16Array(meshes.flatMap(m => {
            const indices = m.indices.map(i => i + indexOffset);
            indexOffset += m.vertexCount;
            return indices;
        }));
    }
    static Zip(...meshes){
        //This is not ideal for all scenarios and may present data
        //that is not always relevant. But the idea is that 
        //the shaders will always have what they need.


        //Determine buffer size
        const n = meshes.reduce((p,c) => p + c.vertexCount, 0);

        console.log(`Allocating buffer for ${n} vertices`);
        const stride = 24;
        
        const buffer = new ArrayBuffer(stride * n),
              dv = new DataView(buffer);

        let skip = 0;  //cursor into dv
        meshes.forEach(m => {
            let verts = m.vertexCount;
            let j;
            for(let i = 0; i < verts; ++i){
                //Verts
                j = i * 3;
                dv.setFloat32(skip, m.vertices[j], true);
                dv.setFloat32(skip + 4, m.vertices[j+1], true);
                dv.setFloat32(skip + 8, m.vertices[j+2], true);

                //TexCoords
                j = i * 2;
                dv.setUint16(skip + 12, (m.texCoords[j] || 0) * 0xFFFF, true);
                dv.setUint16(skip + 14, (m.texCoords[j+1] || 0) * 0xFFFF, true);

                //Norms
                const normals = m.normals || [];
                j = i * 3;
                dv.setInt8(skip + 16, (normals[j] || 0) * 0x7F);
                dv.setInt8(skip + 17, (normals[j + 1] || 0) * 0x7F);
                dv.setInt8(skip + 18, (normals[j + 2] || 0) * 0x7F);
                dv.setInt8(skip + 19, 0);

                //tangents
                const tangents = m.tangents||[];
                j = i * 3;
                dv.setInt8(skip + 20, (tangents[j] || 0) * 0x7F);
                dv.setInt8(skip + 21, (tangents[j + 1] || 0) * 0x7F);
                dv.setInt8(skip + 22, (tangents[j + 2] || 0) * 0x7F);
                dv.setInt8(skip + 23, 0);

                skip += stride;        
            }
        });

        return buffer;
    }
}

export class MutexLock{
    constructor(){
        this.queue = [];
    }

    //Should have some kind of timeout / rejection / cancel mechanism
    acquire(){
        const ref = {};
        this.queue.push(ref);
        return new Promise((resolve, reject) => {
            //My bones tell me that this is better than a while(True)
            //equivalent but who knows. Maybe JS sleeps on its own.
            const _this = this;
            function tick(){
                if(_this.queue[0] === ref){
                    resolve(_this);
                }
                setTimeout(tick, 2);
            }
            tick();
        });
    }

    release(){
        this.queue.shift();
    }
}
export class KeyedMutex{
    constructor(){
        this.locks = new Map();
    }

    async acquire(key){
        if(this.locks.has(key)){
            return await this.locks.get(key).acquire();
        }

        let lock = new MutexLock();
        this.locks.set(key, lock);
        return await lock.acquire();
    }
}