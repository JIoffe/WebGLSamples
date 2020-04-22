import { MeshData } from "./meshes";

export class PrimitiveLoader{
    static async loadPrimitive(primitive){
        let meshData;

        switch(primitive.type){
            case 'plane':
                meshData = makePlane(primitive.width, primitive.resolution);
                break;
            case 'quad':
                meshData = makeQuad(primitive.width);
                break;
            default:
                meshData = {};
                console.error('Unsupported primitive type: ' + primitive.type);
                break;
        }

        meshData.name = primitive.name;
        return meshData;
    }
}

/**
 * Creates a tesselated square with given width and vertex resolution per side
 * @param {number} width 
 * @param {number} resolution 
 */
export function makePlane(width, resolution){
    //In reality, this could be rendered as a TRIANGLE STRIP
    //rather than as an indexed mesh, but this fits with our pipeline more
    //...additionally, we could save memory by unbinding the normals/tangents and using default attributes
    // or only encoding the x and z of the position

    const halfWidth = width * 0.5,
          factor = width / resolution;

    const vertices = [],
          texCoords = [],
          indices = [];

    for(let i = 0; i <= resolution; ++i){
        for(let j = 0; j <= resolution; ++j){
            const x = i * factor - halfWidth,
                  y = 0,
                  z = j * factor - halfWidth;

            vertices.push(x,y,z);
            texCoords.push(i/resolution, j/resolution);
        }
    }

    for(let i = 0; i < resolution; ++i){
        for(let j = 0; j < resolution; ++j){
            const row1 = i * (resolution + 1),
                  row2 = (i+1) * (resolution+1);

            indices.push(row1+j, row1+j+1, row2+j+1,
                         row1+j, row2+j+1, row2+j);
        }
    }
    
    const mesh = new MeshData(vertices, texCoords, [], indices);
    return mesh;
}

export function makeQuad(width = 1.0){
    const vertices = [
        -0.5 * width, 0.5 * width, 0.0,
        -0.5 * width, -0.5 * width, 0.0,
        0.5 * width, -0.5 * width, 0.0,
        0.5 * width, 0.5 * width, 0.0
    ];

    const texCoords = [
        0, 1,
        0, 0,
        1, 0,
        1, 1
    ];

    const normals = [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
    ];

    const indices = [
        0, 1, 2,
        2, 3, 0
    ];

    const mesh = new MeshData(vertices, texCoords, normals, indices);
    return mesh;
}