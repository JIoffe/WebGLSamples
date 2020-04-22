import {RegexUtils} from './util';
import { MeshData } from './meshes';

export class ObjParser{
    static async parseStream(reader){
        const streamReader = new StreamReader(reader);

        const vertices = [],
              texCoords = [],
              normals = [],
              faces = [];

        const indices = [],
              realNormals = [],
              realTexCoords = [];

        const indexTracking = [];

        for await (let line of streamReader.lines()) {
            //No support for materials/mtllib
            //assumes single group per model
            const token = line.split(/\s/g)[0];
            if(token === 'v'){
                vertices.push(RegexUtils.getFloats(line));
            }else if(token === 'vt'){
                //flip V
                const uv = RegexUtils.getFloats(line).slice(0,2); //Ignore third if it exists
                uv[1] = 1.0 - uv[1];
                texCoords.push(uv);
            }else if(token === 'vn'){
                normals.push(RegexUtils.getFloats(line));
            }else if(token === 'f'){
                //Faces define 1-based indices into the data
                //each group is the index of the v/vt/n for each vertex in a tri
                let indexGroups = RegexUtils.getAllMatches(/[\d\/]+/gm, line);
                if(indexGroups.length === 4){
                    //QUAD - split into two triangles
                    indexGroups = [
                        indexGroups[0], indexGroups[1], indexGroups[2],
                        indexGroups[0], indexGroups[2], indexGroups[3]
                    ];
                }
                indexGroups.forEach(faceGroup => {
                    const rawIndices = faceGroup.split('/');
                    //Assume the order is: v/vt/vn

                    //First one is the vertex position
                    //Assume we usually have vertices and tex coords
                    //we may not always have normals
                    const vIndex = +rawIndices[0] - 1;
                    const texIndex = +(rawIndices[1]||0) - 1;
                    const normIndex = +(rawIndices[2]||0) - 1;

                    let realIndex;

                    if(!indexTracking[vIndex]){
                        indexTracking[vIndex] = [{t: texIndex, n: normIndex, r: vIndex}];
                        realIndex = vIndex;
                        realTexCoords[realIndex] = texCoords[texIndex];
                        if(!!normals.length)
                            realNormals[realIndex] = normals[normIndex];
                    }else{
                        let entry = indexTracking[vIndex].find(e => e.t === texIndex && e.n === normIndex);
                        if(!!entry){
                            realIndex = entry.r;
                        }else{
                            realIndex = vertices.length;
                            entry = {
                                t: texIndex,
                                n: normIndex,
                                r: realIndex
                            };
                            indexTracking[vIndex].push(entry);

                            //Double everything
                            vertices.push(vertices[vIndex]);
                            if(!!texCoords.length){
                                realTexCoords[realIndex] = texCoords[texIndex];
                            }

                            if(!!normals.length){
                                realNormals[realIndex] = normals[normIndex];
                            }
                        }
                    }
                    indices.push(realIndex);
                });
                
            }
        }

        return new MeshData(vertices.flat(), 
            realTexCoords.flat().filter(x => !isNaN(x)),
            realNormals.flat().filter(x => !isNaN(x)),
            indices);
    }
}

export class MeshLoader{
    static async loadMesh(meshName){
        console.log(`Downloading mesh: ${meshName}`);
        const response = await fetch(`/models/${meshName}.obj`);
        const meshData = await ObjParser.parseStream(response.body.getReader());
        meshData.name = meshName;

        //Make sure we always have what we need for lighting
        meshData.computeTangents();

        console.log('mesh', meshData);

        return meshData;
    }
}

export class StreamReader{
    constructor(reader){
        this.reader = reader;
    }

    async *lines(){
        //Based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators
        //Changed to handle multiple new lines in a single chunk
        const decoder = new TextDecoder('utf-8');
        const re = /[\n\r]+/gm;

        let { value: chunk, done: readerDone } = await this.reader.read();
        chunk = chunk ? decoder.decode(chunk) : '';

        let startIndex = 0;
        let i = 0;
        for (;;) 
        {
            //Go over each result, it's possible that a single 'read' might have multiple lines
            let result;
            while(!!(result = re.exec(chunk))){
                yield chunk.substring(startIndex, result.index);
                startIndex = re.lastIndex;
            }

            if (readerDone) {
                break;
            }

            let remainder = chunk.substr(startIndex);
            ({ value: chunk, done: readerDone } = await this.reader.read());
            chunk = remainder + (chunk ? decoder.decode(chunk) : '');
            startIndex = re.lastIndex = 0;
        }

        if (startIndex < chunk.length) {
          // last line didn't end in a newline char
          yield chunk.substr(startIndex);
        }

        return;
    }
}