export const Attributes = {
    Pos: 'aVertexPosition',
    Tex: 'aTexCoords',
    Norm: 'aNormal',
    Tangent: 'aTangent',
};

export const Uniforms = {
    matMVP: 'uModelViewProj',
    matProj: 'uProjection',
    matView: 'uView',
    matViewProj: 'uViewProj',
    matInvViewProj: 'uInvViewProj',
    matWorld: 'uWorld',
    matNormal: 'uNormalMatrix',
    diffuse: 'uDiffuse',
    depth: 'uDepth',
    ramp: 'uRamp',
    normalMap: 'uNormalMap',
    cubeMap: 'uCubeMap',
    cameraPos: 'uCameraPos',
    lightPos: 'uLightPos',
    reflection: 'uReflection',
    time: 'uTime',
    color: 'uColor',

    //For post process pipeline
    pipe: 'uPipe',
    forwardPass: 'uForwardPass'
};

export const VertexShaders = {
notransform:
`#version 300 es

in vec4 ${Attributes.Pos};

void main(){
    gl_Position = ${Attributes.Pos};
}
`,
post_process:
`#version 300 es

in vec4 ${Attributes.Pos};
in vec2 ${Attributes.Tex};
out vec2 texCoords;

void main(){
    gl_Position = ${Attributes.Pos};
    texCoords = ${Attributes.Tex};
}
`,
post_process_pos:
`#version 300 es

in vec4 ${Attributes.Pos};
in vec2 ${Attributes.Tex};

out vec4 position;
out vec2 texCoords;

void main(){
    position = ${Attributes.Pos};
    position.z = 1.0;

    gl_Position = position;
    texCoords = ${Attributes.Tex};
}
`,
// post_process_pos2:
// `#version 300 es

// uniform mat4 uModelViewProj;
// in vec4 aVertexPosition;
// in vec2 aTexCoords;

// out vec3 position;
// out vec2 texCoords;

// void main(){
//     position = (uModelViewProj * aVertexPosition).xyz;

//     gl_Position = aVertexPosition;
//     texCoords = aTexCoords;
// }
// `,
postransformtex:
`#version 300 es

in vec4 ${Attributes.Pos};
in vec2 ${Attributes.Tex};
uniform mat4 ${Uniforms.matMVP};
out vec2 texCoords;

void main(){
    gl_Position = ${Uniforms.matMVP} * ${Attributes.Pos};
    texCoords = ${Attributes.Tex};
}
`,
postransformtexnorm:
`#version 300 es

in vec4 ${Attributes.Pos};
in vec2 ${Attributes.Tex};
in vec3 ${Attributes.Norm};

uniform mat4 ${Uniforms.matMVP};
uniform mat4 ${Uniforms.matWorld};

out vec2 texCoords;
out vec3 norm;

void main(){
    gl_Position = ${Uniforms.matMVP} * ${Attributes.Pos};
    texCoords = ${Attributes.Tex};
    
    norm = normalize(mat3(${Uniforms.matWorld}) * ${Attributes.Norm});
}
`,
postransformtexnormworldpos:
`#version 300 es

in vec4 ${Attributes.Pos};
in vec2 ${Attributes.Tex};
in vec3 ${Attributes.Norm};

uniform mat4 ${Uniforms.matMVP};
uniform mat4 ${Uniforms.matWorld};

out vec3 worldPos;
out vec2 texCoords;
out vec3 norm;

void main(){
    gl_Position = ${Uniforms.matMVP} * ${Attributes.Pos};
    texCoords = ${Attributes.Tex};
    
    norm = normalize(mat3(${Uniforms.matWorld}) * ${Attributes.Norm});
    worldPos = (${Uniforms.matWorld} * ${Attributes.Pos}).xyz;
}
`,
postransformtexnormcamera:
`#version 300 es

in vec4 ${Attributes.Pos};
in vec2 ${Attributes.Tex};
in vec3 ${Attributes.Norm};

uniform mat4 ${Uniforms.matMVP};
uniform mat4 ${Uniforms.matWorld};
uniform vec3 ${Uniforms.cameraPos};

out vec2 texCoords;
out vec3 norm;
out vec3 vCamera;

void main(){
    gl_Position = ${Uniforms.matMVP} * ${Attributes.Pos};
    texCoords = ${Attributes.Tex};
    norm = normalize(mat3(${Uniforms.matWorld}) * ${Attributes.Norm});

    vec3 worldPos = (${Uniforms.matWorld} * ${Attributes.Pos}).xyz;
    vCamera = normalize(${Uniforms.cameraPos} - worldPos);
}
`,
postransform_tex_norm_camera_tangents:
`#version 300 es

//Using the light direction in the vertex shader this time
const vec3 vLight = normalize(vec3(1., 2., 1.3));

in vec4 ${Attributes.Pos};
in vec2 ${Attributes.Tex};
in vec3 ${Attributes.Norm};
in vec3 ${Attributes.Tangent};

uniform mat4 ${Uniforms.matMVP};
uniform mat4 ${Uniforms.matWorld};
uniform vec3 ${Uniforms.cameraPos};

out vec2 texCoords;
out vec3 norm;
out vec3 vCamera;

//For normal mapping
out vec3 vLightTBN;

void main(){
    //For normals / tangents / etc.
    mat3 matRotation = mat3(${Uniforms.matWorld});

    gl_Position = ${Uniforms.matMVP} * ${Attributes.Pos};
    texCoords = ${Attributes.Tex};
    norm = normalize(matRotation * ${Attributes.Norm});

    vec3 worldPos = (${Uniforms.matWorld} * ${Attributes.Pos}).xyz;
    vCamera = normalize(${Uniforms.cameraPos} - worldPos);

    //Set up the TBN matrix for normal mapping
    vec3 tangent = normalize(matRotation * ${Attributes.Tangent});
    vec3 bitangent = normalize(cross(tangent, norm));
    mat3 tangentSpace = transpose(mat3(tangent, bitangent, norm));

    //transform light and camera vectors into tangent space
    vLightTBN = tangentSpace * vLight;
    vCamera = tangentSpace * vCamera;
}
`,
wavy_plane:
`#version 300 es

const float maxHeight = 0.4;

in vec4 ${Attributes.Pos};
uniform mat4 ${Uniforms.matMVP};

out vec4 vertexColor;

void main(){
    vec4 vPos = ${Attributes.Pos};
    vPos.y = sin(vPos.x * 8.) * maxHeight;

    float m = smoothstep(-maxHeight, maxHeight, vPos.y);
    vertexColor = vec4(m,m,m,1);

    gl_Position = ${Uniforms.matMVP} * vPos;
}
`,
water:
`#version 300 es

in vec4 ${Attributes.Pos};
in vec2 ${Attributes.Tex};
uniform mat4 ${Uniforms.matMVP};

out vec4 clipSpacePos;
out vec2 texCoords;

void main(){
    gl_Position = ${Uniforms.matMVP} * ${Attributes.Pos};
    clipSpacePos = gl_Position;
    texCoords = ${Attributes.Tex};
}
`,
blur_sunbeams:
`#version 300 es

in vec4 ${Attributes.Pos};
in vec2 ${Attributes.Tex};

uniform float ${Uniforms.time};
uniform vec3 ${Uniforms.lightPos};
uniform mat4 ${Uniforms.matViewProj};

out vec4 lightPos;
out vec4 position;
out vec2 texCoords;

void main(){
    position = ${Attributes.Pos};
    position.z = 1.0;

    gl_Position = position;
    texCoords = ${Attributes.Tex};

    //To make comparison easier, convert the light into clip space
    lightPos = ${Uniforms.matViewProj} * vec4(${Uniforms.lightPos}, 1.0);
}
`,
sun_ball:
`#version 300 es

const float lightScale = 7.0;

uniform vec3 ${Uniforms.lightPos};
uniform float ${Uniforms.time};
in vec4 aVertexPosition;
in vec2 aTexCoords;
uniform mat4 ${Uniforms.matMVP};
out vec2 texCoords;

void main(){
    vec4 vPos = aVertexPosition;
    vPos.xy *= lightScale;
    vPos.xyz += ${Uniforms.lightPos}.xyz;

    gl_Position = ${Uniforms.matMVP} * vPos;
    texCoords = aTexCoords;
}

`
};

export const FragmentShaders = {
solidwhite:
`#version 300 es
precision mediump float;

out vec4 color;

void main() {
    color = vec4(1,1,1,1);
}
`,
skybox:
`#version 300 es
precision mediump float;

uniform samplerCube ${Uniforms.cubeMap};
uniform mat4 ${Uniforms.matInvViewProj};

in vec4 position;
in vec2 texCoords;
out vec4 color;

void main() {
    vec4 t = ${Uniforms.matInvViewProj} * position;
    color = texture(${Uniforms.cubeMap}, normalize(t.xyz / t.w));
}
`,
textured:
`#version 300 es
precision mediump float;

uniform sampler2D ${Uniforms.diffuse};
in vec2 texCoords;
out vec4 color;

void main() {
    color = texture(${Uniforms.diffuse}, texCoords);
}
`,
directlight:
`#version 300 es
precision mediump float;

const vec3 vLight = normalize(vec3(0.5, 0, 0.5));
const vec3 vLightColor = vec3(1,1,1);
const vec3 vAmbience = vec3(0.3, 0.3, 1.0) * 0.4;

uniform sampler2D uDiffuse;
in vec2 texCoords;
in vec3 norm;
out vec4 color;

void main() {
    float fLambertTerm = dot(normalize(norm), vLight);
    fLambertTerm = max(fLambertTerm, 0.);

    vec3 vDiffuse = vLightColor * fLambertTerm;
    vec3 vLighting = vDiffuse + vAmbience;

    color.rgb = vLighting;
    color.a = 1.;
}

`,
directlightpoint:
`#version 300 es
precision mediump float;

const vec3 vLightColor = vec3(1.0,1.0,0.8);
const vec3 vAmbience = vLightColor * 0.1;

uniform vec3 ${Uniforms.lightPos};
uniform sampler2D uDiffuse;

in vec3 worldPos;
in vec2 texCoords;
in vec3 norm;
out vec4 color;

void main() {
    vec3 vLight = normalize(${Uniforms.lightPos} - worldPos);

    float fLambertTerm = dot(normalize(norm), vLight);
    fLambertTerm = max(fLambertTerm, 0.);

    vec3 vDiffuse = vLightColor * fLambertTerm;
    vec3 vLighting = vDiffuse + vAmbience;

    color.rgb = vLighting;
    color.a = 1.;
}

`,
directlightspecular:
`#version 300 es
precision mediump float;

const vec3 vLight = normalize(vec3(1., 2., 1.3));
const vec3 vLightColor = vec3(1,1,1);
const vec3 vAmbience = vec3(0.3, 0.3, 1.0) * 0.4;
const vec3 vDiffuseColor = vec3(0.,0.7,0.);

uniform sampler2D uDiffuse;
in vec2 texCoords;
in vec3 norm;
in vec3 vCamera;
out vec4 color;

void main() {
    vec3 vNorm = normalize(norm);

    float fLambertTerm = dot(vNorm, vLight);
    fLambertTerm = max(fLambertTerm, 0.);

    vec3 vDiffuse = vLightColor * fLambertTerm;
    vec3 vLighting = vDiffuse + vAmbience;

    vec3 vReflect = reflect(-vLight, vNorm);
    float specular = max(dot(vReflect, vCamera), 0.);
    specular = pow(specular, 16.);

    color.rgb = vDiffuseColor * vLighting + specular;
    color.a = 1.;
}
`,
directlightrim:
`#version 300 es
precision mediump float;

const vec3 vLight = normalize(vec3(0.5, 0, 0.5));
const vec3 vLightColor = vec3(1,1,1);
const vec3 vAmbience = vec3(0.3, 0.3, 1.0) * 0.4;
const vec3 vDiffuseColor = vec3(0.75,0,0);

uniform sampler2D uDiffuse;
in vec2 texCoords;
in vec3 norm;
in vec3 vCamera;
out vec4 color;

void main() {
    vec3 vNorm = normalize(norm);

    float fLambertTerm = dot(vNorm, vLight);
    fLambertTerm = max(fLambertTerm, 0.);
    vec3 vDiffuse = vLightColor * fLambertTerm;

     float fresnel = 1. - max(dot(normalize(vCamera), vNorm), 0.);
    fresnel = pow(fresnel, 2.);
    vec3 vRimLight = vec3(0.5, 0.5, 1.0) * fresnel;

    vec3 vLighting = vDiffuse + vAmbience;
    
    color.rgb = vLighting * vDiffuseColor + vRimLight;
    color.a = 1.;
}

`,
phong_normalmapping:
`#version 300 es
precision mediump float;

const vec3 vLightColor = vec3(1,1,1);
const vec3 vAmbience = vec3(0.3, 0.3, 1.0) * 0.4;

uniform sampler2D ${Uniforms.diffuse};
uniform sampler2D ${Uniforms.normalMap};

in vec2 texCoords;
in vec3 norm;
in vec3 vCamera;

//For normal mapping
in vec3 vLightTBN;

out vec4 color;

void main() {
    vec3 vDiffuseColor = texture(${Uniforms.diffuse}, texCoords).rgb;
    vec3 vMappedNormal = texture(${Uniforms.normalMap}, texCoords).rgb;
    vMappedNormal = normalize(vMappedNormal * 2. - 1.);

    //The lighting calculations are then mostly similar
    //only need to swap for tangent space equivalents
    float fLambertTerm = dot(vMappedNormal, vLightTBN);
    fLambertTerm = max(fLambertTerm, 0.);
    vec3 vDiffuse = vLightColor * fLambertTerm;
    vec3 vLighting = vDiffuse + vAmbience;

    vec3 vReflect = reflect(-vLightTBN, vMappedNormal);
    float specular = max(dot(vReflect, vCamera), 0.);
    specular = pow(specular, 16.);

    color.rgb = vDiffuseColor * vLighting + specular;
    color.a = 1.;
}
`,
toon:
`#version 300 es
precision mediump float;

const vec3 vLight = normalize(vec3(0.5, 0, 1));
const vec3 vLightColor = vec3(1,1,1);
const vec3 vAmbience = vec3(0.3, 0.3, 1.0) * 0.35;
const vec3 vDiffuseColor = vec3(0.8, 0.3, 0.);

uniform sampler2D ${Uniforms.ramp};
in vec2 texCoords;
in vec3 norm;
out vec4 color;

void main() {
    float fLambertTerm = dot(normalize(norm), vLight);
    //in case the texture is on GL_REPEAT
    fLambertTerm = clamp(fLambertTerm, 0.01, 0.99);
    fLambertTerm = texture(${Uniforms.ramp}, vec2(fLambertTerm, 0.)).r;

    vec3 vDiffuse = vLightColor * fLambertTerm;
    vec3 vLighting = vDiffuse + vAmbience;

    color.rgb = vDiffuseColor * vLighting;
    color.a = 1.;
}

`,
vertexcolor:
`#version 300 es
precision mediump float;

in vec4 vertexColor;
out vec4 color;

void main() {
    color = vertexColor;
}
`,
planar_reflection_bump:
`#version 300 es
precision mediump float;

const float waveSpeed = 0.2;
const float texScale = 16.0;
const float waveStrength = 0.05;

uniform sampler2D ${Uniforms.reflection};
uniform sampler2D ${Uniforms.normalMap};
uniform float ${Uniforms.time};

in vec2 texCoords;
in vec4 clipSpacePos;

out vec4 color;

void main() {
    //Sample the displacement map at regular tex coords
    vec2 vTex = texCoords * texScale;
    vTex.x += uTime * waveSpeed;
    vec3 vMappedNormal = texture(${Uniforms.normalMap}, vTex).rgb;

    //Combine and average with a second scrolling texture
    vTex = texCoords * texScale + vec2(0.3, 0.3);
    vTex.y += uTime * waveSpeed * 0.42;
    vMappedNormal += texture(${Uniforms.normalMap}, vTex).rgb;
    vMappedNormal /= 2.0;

    vMappedNormal = normalize(vMappedNormal * 2. - 1.);

    //The clip space coordinates can be used to project the reflection
    //texture onto the planar surface properly, reglardless of orientation
    vec2 vClipSpaceCoords = (clipSpacePos.xy/clipSpacePos.w) * 0.5 + vec2(0.5, 0.5);

    //Flip y tex coord
    vClipSpaceCoords.y = 1. - vClipSpaceCoords.y;

    //Perturb the coordinates by the normal 
    vTex = vClipSpaceCoords + vMappedNormal.xz * waveStrength;
    vec4 reflection = texture(${Uniforms.reflection}, vTex);

    color = reflection;
}
`,
environmentmap_smooth:
`#version 300 es
precision mediump float;

const vec4 diffuseColor = vec4(0.8, 0.7, 0.7, 1.0);

uniform samplerCube ${Uniforms.cubeMap};

in vec2 texCoords;
in vec3 norm;
in vec3 vCamera;
out vec4 color;

void main() {
    vec3 vNorm = normalize(norm);
    vec3 vCam = normalize(vCamera);

    float fresnel = 1. - max(dot(vCam, vNorm), 0.);
    fresnel = pow(fresnel, 2.);

    vec3 vReflect = reflect(-vCam, vNorm);
    vec4 reflection = texture(uCubeMap, vReflect);
    color = reflection;
    //color = mix(diffuseColor, reflection, fresnel);
}
`,
environmentmap_normalmapping:
`#version 300 es
precision mediump float;

const float bumpMultiplier = 0.2;
const vec3 vLightColor = vec3(1,1,1);
const vec3 vAmbience = vec3(0.3, 0.3, 1.0) * 0.4;
const vec4 diffuseColor = vec4(0.8, 0.7, 0.7, 1.0);

uniform samplerCube ${Uniforms.cubeMap};
uniform sampler2D ${Uniforms.diffuse};
uniform sampler2D ${Uniforms.normalMap};

in vec2 texCoords;
in vec3 norm;
in vec3 vCamera;

out vec4 color;

void main() {
    vec3 vDiffuseColor = texture(${Uniforms.diffuse}, texCoords).rgb;
    vec3 vMappedNormal = texture(${Uniforms.normalMap}, texCoords).rgb;
    vMappedNormal = normalize(vMappedNormal * 2. - 1.);

    vec3 vNorm = normalize(norm + vMappedNormal.xzy * bumpMultiplier);
    vec3 vReflect = reflect(-vCamera, vNorm);
    vec4 reflection = texture(uCubeMap, vReflect);

    color = reflection;
}
`,
sun_ball:
`#version 300 es
precision mediump float;

const vec3 sunColor = vec3(1.0,1.0,0.8);

in vec2 texCoords;
out vec4 color;

void main() {
    float m = 1. - (length(texCoords - vec2(0.5, 0.5)) / 0.5);
    color = vec4(sunColor * m,1);
}
`,
};

export const PostProcessShaders = {
extract_sunbeam:
`#version 300 es
precision mediump float;

const vec3 luma = vec3(0.3, 0.6, 0.1);
float brightnessMultiplier = 2.;

uniform sampler2D ${Uniforms.forwardPass};
uniform sampler2D ${Uniforms.depth};
in vec2 texCoords;
out vec4 color;

void main() {
    //Convert depth into linear space
    float f = 100.0; //far plane
    float n = 0.1; //near plane
    float z = (2.0 * n) / (f + n - texture(uDepth, texCoords ).r * (f - n));
    
    //This is kind of hacky and relies on our scene beind what it is.
    //A real solution might have an extra pass to determine light and occluders
    if(z > 0.4){
       color = texture(uForwardPass, texCoords);
    }else{
       color = vec4(0,0,0,1);
    }
}
`,
extract_bright_spots:
`#version 300 es
precision mediump float;

const vec3 luma = vec3(0.3, 0.6, 0.1);
float brightnessMultiplier = 2.;

uniform sampler2D uForwardPass;
in vec2 texCoords;
out vec4 color;

void main() {
    color = texture(uForwardPass, texCoords);
    if(dot(color.rgb, luma) < 0.6){
        color.rgb = vec3(0);
    }else{
        color.rgb *= brightnessMultiplier;
    }
}
`,
blur_h:
`#version 300 es
precision mediump float;

const float w0 = 0.0162162162;
const float w1 = 0.0540540541;
const float w2 = 0.1216216216;
const float w3 = 0.1945945946;
const float w4 = 0.2270270270;
const float w5 = 0.1945945946;
const float w6 = 0.1216216216;
const float w7 = 0.0540540541;
const float w8 = 0.0162162162;

uniform sampler2D ${Uniforms.pipe};
in vec2 texCoords;
out vec4 color;

void main() {
    //Get size for a single texel
    vec2 pixelOffset = vec2(1.0 / float(textureSize(uPipe, 0).x), 0.);

    color =  texture(${Uniforms.pipe}, texCoords - pixelOffset * 4.) * w0;
    color += texture(${Uniforms.pipe}, texCoords - pixelOffset * 3.) * w1;
    color += texture(${Uniforms.pipe}, texCoords - pixelOffset * 2.) * w2;
    color += texture(${Uniforms.pipe}, texCoords - pixelOffset)      * w3;
    color += texture(${Uniforms.pipe}, texCoords)                    * w4;
    color += texture(${Uniforms.pipe}, texCoords + pixelOffset)      * w5;
    color += texture(${Uniforms.pipe}, texCoords + pixelOffset * 2.) * w6;
    color += texture(${Uniforms.pipe}, texCoords + pixelOffset * 3.) * w7;
    color += texture(${Uniforms.pipe}, texCoords + pixelOffset * 4.) * w8;

    color.a = 1.;
}
`,
blur_v:
`#version 300 es
precision mediump float;

const float w0 = 0.0162162162;
const float w1 = 0.0540540541;
const float w2 = 0.1216216216;
const float w3 = 0.1945945946;
const float w4 = 0.2270270270;
const float w5 = 0.1945945946;
const float w6 = 0.1216216216;
const float w7 = 0.0540540541;
const float w8 = 0.0162162162;

uniform sampler2D ${Uniforms.pipe};
in vec2 texCoords;
out vec4 color;

void main() {
    //Get size for a single texel
    vec2 pixelOffset = vec2(0., 1.0 / float(textureSize(uPipe, 0).y));

    color =  texture(${Uniforms.pipe}, texCoords - pixelOffset * 4.) * w0;
    color += texture(${Uniforms.pipe}, texCoords - pixelOffset * 3.) * w1;
    color += texture(${Uniforms.pipe}, texCoords - pixelOffset * 2.) * w2;
    color += texture(${Uniforms.pipe}, texCoords - pixelOffset)      * w3;
    color += texture(${Uniforms.pipe}, texCoords)                    * w4;
    color += texture(${Uniforms.pipe}, texCoords + pixelOffset)      * w5;
    color += texture(${Uniforms.pipe}, texCoords + pixelOffset * 2.) * w6;
    color += texture(${Uniforms.pipe}, texCoords + pixelOffset * 3.) * w7;
    color += texture(${Uniforms.pipe}, texCoords + pixelOffset * 4.) * w8;

    color.a = 1.;
}
`,
blur_sunbeams_naive:
`#version 300 es
precision mediump float;

const int nSamples = 32;
const float step = 0.03;

uniform sampler2D uForwardPass;
uniform sampler2D uPipe;

in vec4 lightPos;
in vec4 position;
in vec2 texCoords;
out vec4 color;

void main() {
    vec2 lightScreenSpace = (lightPos.xy/lightPos.z) * 0.5 + vec2(0.5, 0.5);

    vec2 direction = lightScreenSpace.xy - texCoords;
    vec2 offset = normalize(direction) * step * length(direction);
    color = vec4(0.);
   
    for(int i = 0; i < nSamples; ++i){
       vec2 vLookup = texCoords + offset * float(i);
       color += texture(uPipe, vLookup);
    }

    color /= float(nSamples);
    
    color.a = 1.;
}
`,
blur_sunbeams:
`#version 300 es
precision mediump float;

const float exposure = 0.18;
const float decay = 0.95;
const float density = 0.8;
const float weight = 0.8;

const int nSamples = 32;

uniform sampler2D uForwardPass;
uniform sampler2D uPipe;

in vec4 lightPos;
in vec4 position;
in vec2 texCoords;
out vec4 color;

void main() {
    color = vec4(0.);

    vec2 vLightScreenSpace = (lightPos.xy/lightPos.z) * 0.5 + vec2(0.5, 0.5);

    vec2 vTexDelta = vLightScreenSpace.xy - texCoords;
    vTexDelta *= 1.0 / float(nSamples) * density;

    float fDecay = 1.0;

    vec2 vLookup = texCoords;
    for(int i = 0; i < nSamples; ++i){
       vLookup += vTexDelta;
       color += texture(uPipe, vLookup) * (fDecay * weight);
       fDecay *= decay;
    }

    color.rgb *= exposure;    
    color.a = 1.;
}


`,
bloom_composite:
`#version 300 es
precision mediump float;

const float bloomMultiplier = 1.0;

uniform sampler2D ${Uniforms.pipe};
uniform sampler2D ${Uniforms.forwardPass};
in vec2 texCoords;
out vec4 color;

void main() {
    vec4 bloom = texture(${Uniforms.pipe}, texCoords);
    color = texture(${Uniforms.forwardPass}, texCoords);
    color += bloom * bloomMultiplier;
}
`,
passthrough:
`#version 300 es
precision mediump float;

uniform sampler2D ${Uniforms.pipe};
in vec2 texCoords;
out vec4 color;

void main() {
    color = texture(${Uniforms.pipe}, texCoords);
}
`,
passthrough_forward:
`#version 300 es
precision mediump float;

uniform sampler2D ${Uniforms.forwardPass};
in vec2 texCoords;
out vec4 color;

void main() {
    color = texture(${Uniforms.forwardPass}, texCoords);
}
`
};

/*
* Encapsulates a compiled shader program with attribute locations
*/
export class ShaderProgram{
    constructor(gl, vsSource, fsSource){
        const program = this.loadShaderProgram(gl, vsSource, fsSource);
        if(!program){
            throw 'Could not compile shader';
        }

        this.program = program;
        this.attribLocations = {};
        Object.keys(Attributes).forEach(k => this.attribLocations[k] = gl.getAttribLocation(program, Attributes[k]));

        this.uniformLocations = {};
        Object.keys(Uniforms).forEach(k => this.uniformLocations[k] = gl.getUniformLocation(program, Uniforms[k]));
    }

    get isReady(){
        return !!this.program;
    }

    loadShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
      
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
          console.error('Could not load shader program: ' + gl.getProgramInfoLog(shaderProgram));
          return null;
        }
      
        return shaderProgram;
    }

    loadShader(gl, type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);
      
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const shaderLog = gl.getShaderInfoLog(shader);
            alert(shaderLog);
            console.error('Could not compile shader: ' + shaderLog);
            gl.deleteShader(shader);
            return null;
        }
      
        return shader;
    }        
}