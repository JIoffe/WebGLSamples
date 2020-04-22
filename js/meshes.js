import { vec3, vec2 } from "gl-matrix";

export class MeshData{
    constructor(vertices, texCoords, normals, indices){
        this.vertices = vertices;
        this.texCoords = texCoords;
        this.normals = normals;
        this.indices = indices;


    }

    get vertexCount(){
        return this.vertices.length / 3;
    }

    getVertex(i){
        const i3 = i * 3;
        return new Float32Array(this.vertices.slice(i3, i3 + 3));
    }

    getUV(i){
        const i2 = i * 2;
        return new Float32Array(this.texCoords.slice(i2, i2 + 2));
    }

    getNormal(i){
        const i3 = i * 3;
        return new Float32Array(this.normals.slice(i3, i3 + 3));
    }

    static computeNormals(meshData){

    }

    computeTangents(){
        if(!this.normals || !this.normals.length){
            return;
        }

        if(!!this.tangents && this.tangents.length === this.vertexCount * 3){
            return;
        }

        console.log('Computing tangents per vertex...');

        //This might induce some memory overhead but I'll take that to be more intuitive
        //the idea is to accumulate the values per vertex and then average later
        const vCount = this.vertexCount;
        this.tangents = new Float32Array(vCount * 3); //x/y/z scaled for winding

        let tangents = new Array(vCount),
            bitangents = new Array(vCount);
        
        for(let i = vCount - 1; i >= 0; --i){
            tangents[i] = vec3.create();
            bitangents[i] = vec3.create();
        }

        let edge1 = vec3.create(),
            edge2 = vec3.create(),
            uv1   = vec2.create(),
            uv2   = vec2.create(),
            tan   = vec3.create(),
            bitan = vec3.create(),
            c     = vec3.create();

        //Loop over every triangle in the mesh
        for(let h = 0; h < this.indices.length; h += 3){
            const i0 = this.indices[h],
                  i1 = this.indices[h + 1],
                  i2 = this.indices[h + 2];

            let v0 = this.getVertex(i0),
                v1 = this.getVertex(i1),
                v2 = this.getVertex(i2);

            let t0 = this.getUV(i0),
                t1 = this.getUV(i1),
                t2 = this.getUV(i2);

            //Tangent is based on the UV 
            vec3.sub(edge1, v1, v0);
            vec3.sub(edge2, v2, v0);

            vec2.sub(uv1, t1, t0);
            vec2.sub(uv2, t2, t0);

            let r = 1.0 / (uv1[0] * uv2[1] - uv1[1] * uv2[0]);

            //Tangent is in the direction of uv Y
            tan[0] = ((edge1[0] * uv2[1]) - (edge2[0] * uv1[1])) * r,
            tan[1] = ((edge1[1] * uv2[1]) - (edge2[1] * uv1[1])) * r,
            tan[2] = ((edge1[2] * uv2[1]) - (edge2[2] * uv1[1])) * r;

            vec3.add(tangents[i0], tangents[i0], tan);
            vec3.add(tangents[i1], tangents[i1], tan);
            vec3.add(tangents[i2], tangents[i2], tan);

            //Bitangent is in the direction of uv x
            bitan[0] = ((edge1[0] * uv2[0]) - (edge2[0] * uv1[0])) * r;
            bitan[1] = ((edge1[1] * uv2[0]) - (edge2[1] * uv1[0])) * r;
            bitan[2] = ((edge1[2] * uv2[0]) - (edge2[2] * uv1[0])) * r;

            vec3.add(bitangents[i0], bitangents[i0], bitan);
            vec3.add(bitangents[i1], bitangents[i1], bitan);
            vec3.add(bitangents[i2], bitangents[i2], bitan);
        }


        //Normalize and compute winding
        for(let i = 0; i < vCount; ++i){
            let n = this.getNormal(i);
            let t0 = tangents[i];
            let t1 = bitangents[i];

            //tan = normalize(tan - (norm * dot(norm, tan)));
            vec3.scale(n, n, vec3.dot(n, t0));
            vec3.sub(t0, t0, n);
            vec3.normalize(t0, t0); //this gets the average

            //Correct for winding to properly match UVs
            vec3.cross(c, n, t0);
            let w = vec3.dot(c, t1) < 0 ? -1 : 1;
            vec3.scale(t0, t0, w);

            this.tangents[i * 3    ] = t0[0];
            this.tangents[i * 3 + 1] = t0[1];
            this.tangents[i * 3 + 2] = t0[2];
        }

        console.log('Computed tangents');
    }
}