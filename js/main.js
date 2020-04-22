import { Renderer } from './renderer';
import { scenes } from './scenes';

(function(d){
    let renderer, lastTime, activeScene;
    let editorShaders = [];

    d.addEventListener('DOMContentLoaded', async () => {
        const canvas = d.getElementById('c');
        renderer = new Renderer(canvas);
        lastTime = new Date();

        d.getElementById('shaderSelect').addEventListener('change', onShaderSelected);
        d.getElementById('sampleSelect').addEventListener('change', onSampleSelected);
        scenes.forEach(s => {
            const option = d.createElement('option');
            option.value = s.label;
            option.text = s.label;
            d.getElementById('sampleSelect').appendChild(option);
        });

        //Allow shaders to be manipulated
        d.getElementById('fshader-update-btn').addEventListener('click', ev => {
            const fshader = d.getElementById('fshader-ta').value;
            const i = getActiveShaderIndex();
            const editorShader = editorShaders[i];
            if(!!renderer.replaceActiveShader(i, editorShader.vs, fshader)){
                editorShader.fs = fshader;
            }
        });
        d.getElementById('vshader-update-btn').addEventListener('click', ev => {
            const vshader = d.getElementById('vshader-ta').value;
            const i = getActiveShaderIndex();
            const editorShader = editorShaders[i];
            if(!!renderer.replaceActiveShader(i, vshader, editorShader.fs)){
                editorShader.vs = vshader;
            }
        });

        d.getElementById('glViewMaximize').addEventListener('click', ev => {
            d.getElementsByTagName('main')[0].classList.toggle('gl-fullscreen');
        });


        await loadScene(scenes[0]);
        window.requestAnimationFrame(mainLoop);
    });

    function getActiveShaderIndex(){
        return d.getElementById('shaderSelect').selectedIndex;
    }

    function mainLoop(time){
        const timeInSeconds = time * 0.001;
        if(!!activeScene){
            if(!!activeScene.update){
                activeScene.update(activeScene, timeInSeconds);
            }
            renderer.render(activeScene, timeInSeconds);
        }

        window.requestAnimationFrame(mainLoop);
    }

    function onSampleSelected(ev){
        const select = (ev.srcElement||ev.target);
        loadScene(scenes[select.selectedIndex]);
    }

    function onShaderSelected(ev){
        const select = (ev.srcElement||ev.target);
        d.getElementById('vshader-ta').value = editorShaders[select.selectedIndex].vs || '';
        d.getElementById('fshader-ta').value = editorShaders[select.selectedIndex].fs || '';
    }

    async function loadScene(scene){
        activeScene = null;
        editorShaders = [];
        d.getElementById('shaderSelect').length = 0;

        console.log(`Loading: ${scene.label}`);

        try{
            await renderer.loadScene(scene);
            scene.shaders.forEach((shader, i) => {
                const name = shader.name || (`${scene.label} - ${i}`);
                const option = d.createElement('option');
                option.value = name;
                option.text = name;
                d.getElementById('shaderSelect').appendChild(option);

                editorShaders.push({
                    fs: shader.fs,
                    vs: shader.vs
                });
            });
            const shaderTarget = (scene.shaders || []).findIndex(s => !!s.editor) || 0;
            d.getElementById('shaderSelect').selectedIndex = shaderTarget;
            d.getElementById('vshader-ta').value = scene.shaders[shaderTarget].vs || '';
            d.getElementById('fshader-ta').value = scene.shaders[shaderTarget].fs || '';



            activeScene = scene;
        }catch(e){
            console.error(e);
            d.getElementById('vshader-ta').value = '';
            d.getElementById('fshader-ta').value = '';
        }
    }
})(document);