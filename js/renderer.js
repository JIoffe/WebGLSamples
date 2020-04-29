import {ShaderProgram} from './shaders'
import {MeshLoader} from './io'
import {Textures} from './textures'
import {MeshZipper, Mutex} from './util'

import {mat4, vec3, quat, mat3} from 'gl-matrix'
import * as math_ex from './math'
import { PrimitiveLoader } from './primitives'

const NEAR_CLIP = 0.1;
const FAR_CLIP = 100;
const FOV = 60;

//VERTEX DATA
//Interleaved: 3 * 4 bytes for POSITION (12)
//             2 * 2 bytes, normalized for TEX COORDS (4) => 16
//             4 * 1 byte, signed byte for NORMAL (4) => 20 (3 bytes data, 1 byte padding)
//             4 * 1 byte, signed byte for TANGENT (4) => 24 (3 bytes data, 1 byte padding)
//-------------------------------------------------------
// TOTAL: 16 BYTES
const V_STRIDE = 24;
const V_TEX_OFFSET = 12;
const V_NORM_OFFSET = 16;
const V_TANGENT_OFFSET = 20;

export class Renderer{
    constructor(canvas){
        this.canvas = canvas;
        this.gl = this.getRenderingContext(canvas);
        this.initializeRenderState(this.gl);
        this.shaders = [];
        this.objectTexturesMap = new Map();
        this.cubemapMap = new Map(); //sounds funny

        //Assume all graphics share a VBO
        this.buffers = [];

        this.projectionMatrix = mat4.create();
        this.viewMatrix = mat4.create();
        this.viewProjMatrix = mat4.create();
        this.invViewProjMatrix = mat4.create();
        this.modelViewProj = mat4.create();
        this.modelMatrix = mat4.create();

        //buffers for transforms
        this.rot = quat.create();
        this.scale = vec3.create();

        this.cameraPos = vec3.create();

        //For post processing 
        //First frame buffer is to draw the scene's forward pass
        //then the other two are for ping ponging through a pipeline
        this.frameBuffers = this.buildFrameBuffers();
        this.lastFrameBuffer = 1;

        this.fsq = this.buildFullScreenQuad();

        console.log('Initialized WebGL Renderer');
    }

    getRenderingContext(canvas){
        const gl = canvas.getContext("webgl2");
        if(!gl){
            console.error('Canvas does not support WebGL2');
            return null;
        }

        return gl;
    }

    initializeRenderState(gl){
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        //gl.enable(gl.BLEND);
        //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
    }

    render(scene, time){
        //Rebuild the projection and viewport with every
        //frame, just in case of resize.
        //This causes a small performance hit but is always correct.
        const rect = this.canvas.getBoundingClientRect(),
              w    = rect.right - rect.left,
              h    = rect.bottom - rect.top,
              
              gl = this.gl;

        this.canvas.setAttribute('width', '' + w);
        this.canvas.setAttribute('height', '' + h);

        //Rebuild the projection matrix as well
        math_ex.buildProjectionMatrix(this.projectionMatrix, FOV, w, h, NEAR_CLIP, FAR_CLIP);

        if(!!scene.planarReflection){
            this.renderPlanarReflection(scene, time, w, h);
        }

        //Rebuild the camera matrix and then multiply with projection to project to screen
        vec3.copy(this.cameraPos, scene.camera);
        if(!!scene.cameraOrbitSpeed){
            mat4.rotateY(this.modelMatrix, this.modelMatrix, time * scene.cameraOrbitSpeed);
            vec3.transformMat4(this.cameraPos, this.cameraPos, this.modelMatrix);
        }
        mat4.lookAt(this.viewMatrix, this.cameraPos, math_ex.VEC3_ZERO, math_ex.VEC3_UP);
        mat4.multiply(this.viewProjMatrix, this.projectionMatrix, this.viewMatrix);

        //Use the scene's clear color, if there is one
        if(!!scene.clearColor){
            gl.clearColor(scene.clearColor[0], scene.clearColor[1], scene.clearColor[2], 1.0);
        }else{
            gl.clearColor(0.3, 0.3, 1.0, 1.0);
        }

        //In case it's downsampled
        const postProcessW = w * (scene.postProcessScaleFactor || 1),
              postProcessH = h * (scene.postProcessScaleFactor || 1);

        if(!!scene.postProcess){
            //Resize the frame buffers in realtime... this can't be good for performance, can it?
            //The first one holds our forward pass but the other two might be downsampled
            for(let i = 0; i < 3; ++i){
                let fb = this.frameBuffers[i];
                gl.bindTexture(gl.TEXTURE_2D, fb.tex);
                if(i == 0){
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);                   
                }else{
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, postProcessW, postProcessH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); 
                }

                if(!!fb.depthTex){
                    gl.bindTexture(gl.TEXTURE_2D, fb.depthTex);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
                }
            }

            //Render to hte first frame buffer with depth component - which also needs to be resized :)       
            this.lastFrameBuffer = 0;
            this.setFrameBuffer(this.frameBuffers[0].fbo, w, h);
            // gl.bindRenderbuffer(gl.RENDERBUFFER, fb.dbo);
            // gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
        }else{
            //Let WebGL render directly to canvas if there is no post processing in this scene
            this.setFrameBuffer(null, w, h);
        }

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //FORWARD PASS
        if(!!scene.bg){
            gl.disable(gl.DEPTH_TEST);
            const shader = this.shaders[scene.bg.shader];
            gl.useProgram(shader.program);
            
            this.applyAttribsAndUniforms(shader, scene.bg, time, this.cameraPos);
            this.drawFullScreenQuad();
            gl.enable(gl.DEPTH_TEST);
        }

        if(!!scene.objects){
            //all objects share one VBO
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers[1]);

            for(let i = scene.objects.length - 1; i >= 0; --i){
                const o = scene.objects[i];
                const shader = this.shaders[o.shader];
                gl.useProgram(shader.program);

                //Bind VBO and enable attributes for shader
                //these can also be queued up to restore at once in a vertex array object
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[0]);
                gl.enableVertexAttribArray(0);
                gl.vertexAttribPointer(0, 3, gl.FLOAT, false, V_STRIDE, 0);

                //Everything needs position, see what's needed for this shader
                this.applyAttribsAndUniforms(shader, o, time, this.cameraPos, scene.lightPos);

                const range = this.meshIndexMap.get(o.mesh || o.primitive.name);
                gl.drawElements(gl.TRIANGLES, range[0], gl.UNSIGNED_SHORT, range[1]);
            }
        }

        if(!!scene.postProcess){
            const n = scene.postProcess.length;
            for(let i = 0; i < n; ++i){
                let tex;
                if(i === n - 1){
                    tex = this.endPostProcessPipeline(w, h);
                }else{
                    tex = this.toggleFrameBuffer(postProcessW, postProcessH);
                }

                let shader = this.shaders[scene.postProcess[i]];
                gl.useProgram(shader.program);

                this.applyPostProcessUniforms(shader, tex, time, scene.lightPos);
                this.drawFullScreenQuad();
            }
        }
    }



    async loadScene(scene){
        this.clearGraphicsResources();

        if(!!scene.objects){
            this.shaders = scene.shaders.map(s => new ShaderProgram(this.gl, s.vs, s.fs));
            await this.loadMeshesForScene(scene);

            //Prepare object textures
            const promises = scene.objects.concat(scene.bg || {}).filter(o => !!o.textures).map(async o => {
                const textures = {};
                const targets = Object.keys(o.textures);
                for(let i = 0; i < targets.length; ++i){
                    const target = targets[i];
                    const src = `/img/${o.textures[target]}`;
                    const tex = await Textures.load(this.gl, src, true, true);
                    textures[target] = tex;
                }
                this.objectTexturesMap.set(o, textures);
            })
            .concat(scene.objects.concat(scene.bg || {}).filter(o => !!o.cubemap).map(async o => {
                let sources = o.cubemap.imgs.map(src => `/img/${src}`);
                const tex = await Textures.loadCubemap(this.gl, ...sources);
                this.cubemapMap.set(o.cubemap.name, tex);
            }));

            await Promise.all(promises);
        }
    }

    replaceActiveShader(i, vshader, fshader){
        try{
            this.shaders[i] = new ShaderProgram(this.gl, vshader, fshader);
            return true;
        }catch(e){
            console.error(e);
            return false;
        }
    }

    async loadMeshesForScene(scene){
        let promises = [...new Set(scene.objects.map(o => o.mesh).filter(m => !!m))].map(mesh => MeshLoader.loadMesh(mesh))
            .concat(scene.objects.map(o => o.primitive).filter(p => !!p).map(p => PrimitiveLoader.loadPrimitive(p)));

        const meshDataList = await Promise.all(promises);
        const aggregatedIndices = MeshZipper.ZipIndices(...meshDataList);
        const aggregatedVertexData = MeshZipper.Zip(...meshDataList);

        //Create a map of objects to their indices in the shared VBO
        this.meshIndexMap = new Map();
        let startingIndex = 0;
        meshDataList.forEach(m => {
            this.meshIndexMap.set(m.name, [
                m.indices.length,
                startingIndex
            ]);

            startingIndex += m.indices.length * 2;
        });

        this.buffers = [
            this.buildVBO(aggregatedVertexData),
            this.buildIndexBuffer(aggregatedIndices)
        ];
        
    }

    buildIndexBuffer(indices){
        if(!indices)
            return null;
    
        var buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
        return buffer;
    }
    
    buildVBO(dataBuffer){
        const vbo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, dataBuffer, this.gl.STATIC_DRAW);
        
        return vbo;
    }

    buildFullScreenQuad(){
        //Yes this could be made to be more efficient but...it's just one quad :)
        //Note: OpenGL's image origin is in the lower left corner
        const data = new Float32Array([
            -1, 1,
            0, 1,

            -1, -1,
            0, 0,

            1, 1,
            1, 1,

            1, -1,
            1, 0
        ]);

        return this.buildVBO(data);
    }

    drawFullScreenQuad(){
        //assumes attrib positions will be consistent
        const gl = this.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.fsq);

        //clear everything but pos and texture unit
        for(let i = 2; i < gl.getParameter(gl.MAX_VERTEX_ATTRIBS); ++i) {
            gl.disableVertexAttribArray(i);
        }

        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    clearGraphicsResources(){
        this.shaders.forEach(shader => {
            this.gl.deleteProgram(shader.program);
        });
        this.shaders = [];

        this.objectTexturesMap.forEach((textures, k, m) => {
            Object.keys(textures).forEach(k => this.gl.deleteTexture(textures[k]));
        });
        this.objectTexturesMap.clear();
        
        this.cubemapMap.forEach((tex, k, m) => {
            this.gl.deleteTexture(tex);
        });
        this.cubemapMap.clear();
        Textures.clearCache();

        if(!!this.buffers.length){
            this.buffers.forEach(b => this.gl.deleteBuffer(b));
            this.buffers = [];
        }
    }

    applyAttribsAndUniforms(shader, o, time, cameraPos, lightPos){
        const gl = this.gl;
        o = o || {};

        //Clear lingering attributes
        //Not super efficient but safe
        for(let i = 1; i < gl.getParameter(gl.MAX_VERTEX_ATTRIBS); ++i) {
            gl.disableVertexAttribArray(i);
        }

        let textures = this.objectTexturesMap.get(o);
        
        //Update model / world matrix
        if(!!o.pos){
            if(!!o.rotVelocity){
                const x = math_ex.clampDegrees(o.rotVelocity[0] * time),
                    y = math_ex.clampDegrees(o.rotVelocity[1] * time),
                    z = math_ex.clampDegrees(o.rotVelocity[2] * time);
                
                quat.fromEuler(this.rot, x, y, z)
            }else{
                quat.identity(this.rot);
            }
            {
                const s = o.scale || 1;
                this.scale[0] = this.scale[1] = this.scale[2] = s;
                mat4.fromRotationTranslationScale(this.modelMatrix, this.rot, o.pos, this.scale);
            }
        }else{
            mat4.identity(this.modelMatrix);
        }

        //UNIFORMS
        if(shader.uniformLocations.matWorld != null){
            gl.uniformMatrix4fv(shader.uniformLocations.matWorld, false, this.modelMatrix);
        }

        if(shader.uniformLocations.matMVP != null){
            mat4.multiply(this.modelViewProj, this.viewProjMatrix, this.modelMatrix);
            gl.uniformMatrix4fv(shader.uniformLocations.matMVP, false, this.modelViewProj);
        }

        if(shader.uniformLocations.matInvViewProj != null){
            mat4.invert(this.invViewProjMatrix, this.viewProjMatrix);
            gl.uniformMatrix4fv(shader.uniformLocations.matInvViewProj, false, this.invViewProjMatrix);
        }

        //Time after time
        if(shader.uniformLocations.time != null){
            gl.uniform1f(shader.uniformLocations.time, time);
        }

        if(shader.uniformLocations.cameraPos != null){
            gl.uniform3fv(shader.uniformLocations.cameraPos, cameraPos);
        }

        if(!!lightPos && shader.uniformLocations.lightPos != null){
            gl.uniform3fv(shader.uniformLocations.lightPos, lightPos);
        }

        let texIndex = gl.TEXTURE0;
        if(!!textures){
            Object.keys(textures).forEach(k => {
                if(shader.uniformLocations[k] != null){
                    gl.uniform1i(shader.uniformLocations[k], texIndex - gl.TEXTURE0);
                    gl.activeTexture(texIndex);
                    gl.bindTexture(gl.TEXTURE_2D, textures[k]);
                    texIndex++;
                }
            });
        }

        if(!!o.cubemap && !!this.cubemapMap.has(o.cubemap.name)){
            if(shader.uniformLocations.cubeMap != null){
                gl.uniform1i(shader.uniformLocations.cubeMap, texIndex - gl.TEXTURE0);
                gl.activeTexture(texIndex);
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubemapMap.get(o.cubemap.name));
                texIndex++;
            }
        }

        if(shader.uniformLocations.reflection != null){
            gl.uniform1i(shader.uniformLocations.reflection, texIndex - gl.TEXTURE0);
            gl.activeTexture(texIndex);
            gl.bindTexture(gl.TEXTURE_2D, this.frameBuffers[3].tex);
            texIndex++;
        }

        //ATTRIBUTES
        if(shader.attribLocations.Tex != -1){
            gl.enableVertexAttribArray(shader.attribLocations.Tex);
            gl.vertexAttribPointer(shader.attribLocations.Tex, 2, gl.UNSIGNED_SHORT, true, V_STRIDE, V_TEX_OFFSET);
        }

        if(shader.attribLocations.Norm != -1){
            gl.enableVertexAttribArray(shader.attribLocations.Norm);
            gl.vertexAttribPointer(shader.attribLocations.Norm, 4, gl.BYTE, true, V_STRIDE, V_NORM_OFFSET);
        }

        if(shader.attribLocations.Tangent != -1){
            gl.enableVertexAttribArray(shader.attribLocations.Tangent);
            gl.vertexAttribPointer(shader.attribLocations.Tangent, 4, gl.BYTE, true, V_STRIDE, V_TANGENT_OFFSET);
        }
    }

    applyPostProcessUniforms(shader, pipe, time, lightPos){
        const gl = this.gl;
        
        let texIndex = gl.TEXTURE0;
        if(shader.uniformLocations.pipe != null){
            gl.uniform1i(shader.uniformLocations.pipe, texIndex - gl.TEXTURE0);
            gl.activeTexture(texIndex);
            gl.bindTexture(gl.TEXTURE_2D, pipe);
            texIndex++;
        }

        if(shader.uniformLocations.matInvViewProj != null){
            mat4.invert(this.invViewProjMatrix, this.viewProjMatrix);
            gl.uniformMatrix4fv(shader.uniformLocations.matInvViewProj, false, this.invViewProjMatrix);
        }

        if(shader.uniformLocations.matViewProj != null){
            gl.uniformMatrix4fv(shader.uniformLocations.matViewProj, false, this.viewProjMatrix);
        }

        if(shader.uniformLocations.forwardPass != null){
            gl.uniform1i(shader.uniformLocations.forwardPass, texIndex - gl.TEXTURE0);
            gl.activeTexture(texIndex);
            gl.bindTexture(gl.TEXTURE_2D, this.frameBuffers[0].tex);
            texIndex++;
        }

        if(shader.uniformLocations.depth != null){
            gl.uniform1i(shader.uniformLocations.depth, texIndex - gl.TEXTURE0);
            gl.activeTexture(texIndex);
            gl.bindTexture(gl.TEXTURE_2D, this.frameBuffers[0].depthTex);
            texIndex++;
        }

        if(shader.uniformLocations.time != null){
            gl.uniform1f(shader.uniformLocations.time, time);
        }

        if(!!lightPos && shader.uniformLocations.lightPos != null){
            gl.uniform3fv(shader.uniformLocations.lightPos, lightPos);
        }
    }

    buildFrameBuffers(){
        //Three frame buffers are reserved...
        //one to use as a steady reference for the forward pass
        //and two to ping pong to use as a pipeline alongside it.
        //this allows for effects to be composited later
        const gl = this.gl;

        let frameBuffers = new Array(4);
        for(let i = 0; i < 4; ++i){
            const tex = Textures.reserveRenderTargetTexture(gl);
            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

            //let dbo = null;
            let depthTex = null;

            //For forward pass and reflections/shadowmaps
            if(i === 0 || i === 3){
                depthTex = Textures.reserveDepthTexture(gl);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);

                // dbo = gl.createRenderbuffer();
                // gl.bindRenderbuffer(gl.RENDERBUFFER, dbo);
                // gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dbo);
            }

            frameBuffers[i] = {
                tex: tex,
                fbo: fbo,
                //dbo: dbo,
                depthTex: depthTex
            };
        }

        return frameBuffers;
    }

    setFrameBuffer(fbo, w, h){
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
        this.gl.viewport(0, 0, w, h);
    }

    toggleFrameBuffer(w, h){
        //Switches to the next frame buffer and returns the texture ID of the previous page
        if(this.lastFrameBuffer === 2){
            this.setFrameBuffer(this.frameBuffers[1].fbo, w, h);
            this.lastFrameBuffer = 1;
            return this.frameBuffers[2].tex;
        }else{
            this.setFrameBuffer(this.frameBuffers[2].fbo, w, h);
            this.lastFrameBuffer = 2;
            return this.frameBuffers[1].tex;
        }
    }

    endPostProcessPipeline(w, h){
        this.setFrameBuffer(null, w, h);
        if(this.lastFrameBuffer === 2){
            return this.frameBuffers[2].tex;
        }else{
            return this.frameBuffers[1].tex;
        }
    }

    //A lot of this is copy and paste... I guess it could be refactored for reuse :) 
    renderPlanarReflection(scene, time, w, h){
        const gl = this.gl;
        //Rebuild the camera matrix and then multiply with projection to project to screen
        vec3.copy(this.cameraPos, scene.camera);
        this.cameraPos[1] = -this.cameraPos[1];
        if(!!scene.cameraOrbitSpeed){
            mat4.rotateY(this.modelMatrix, this.modelMatrix, time * scene.cameraOrbitSpeed);
            vec3.transformMat4(this.cameraPos, this.cameraPos, this.modelMatrix);
        }
        mat4.lookAt(this.viewMatrix, this.cameraPos, math_ex.VEC3_ZERO, math_ex.VEC3_UP);
        mat4.multiply(this.viewProjMatrix, this.projectionMatrix, this.viewMatrix);

        //Use the scene's clear color, if there is one
        if(!!scene.clearColor){
            gl.clearColor(scene.clearColor[0], scene.clearColor[1], scene.clearColor[2], 1.0);
        }else{
            gl.clearColor(0.3, 0.3, 1.0, 1.0);
        }

        //Ensure render target is scaled correctly
        const fb = this.frameBuffers[3];
        gl.bindTexture(gl.TEXTURE_2D, fb.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.bindTexture(gl.TEXTURE_2D, fb.depthTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);

        //Render to hte first frame buffer with depth component - which also needs to be resized :)       
        this.setFrameBuffer(fb.fbo, w, h);
        // gl.bindRenderbuffer(gl.RENDERBUFFER, fb.dbo);
        // gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //FORWARD PASS
        if(!!scene.bg){
            gl.disable(gl.DEPTH_TEST);
            const shader = this.shaders[scene.bg.shader];
            gl.useProgram(shader.program);
            
            this.applyAttribsAndUniforms(shader, scene.bg, time, this.cameraPos, scene.lightPos);
            this.drawFullScreenQuad();
            gl.enable(gl.DEPTH_TEST);
        }

        if(!!scene.objects){
            //all objects share one VBO
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers[1]);

            for(let i = scene.objects.length - 1; i >= 0; --i){
                const o = scene.objects[i];
                if(!!o.noReflect){
                    continue;
                }
                
                const shader = this.shaders[o.shader];
                gl.useProgram(shader.program);

                //Bind VBO and enable attributes for shader
                //these can also be queued up to restore at once in a vertex array object
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[0]);
                gl.enableVertexAttribArray(0);
                gl.vertexAttribPointer(0, 3, gl.FLOAT, false, V_STRIDE, 0);

                //Everything needs position, see what's needed for this shader
                this.applyAttribsAndUniforms(shader, o, time, this.cameraPos);

                const range = this.meshIndexMap.get(o.mesh || o.primitive.name);
                gl.drawElements(gl.TRIANGLES, range[0], gl.UNSIGNED_SHORT, range[1]);
            }
        }
    }
}