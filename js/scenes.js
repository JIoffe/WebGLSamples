import {FragmentShaders, VertexShaders, PostProcessShaders} from './shaders';

const Meshes = {
    tri: 'tri',
    knot: 'knot',
    cube: 'cube',
    crate: 'crate',
    torus: 'torus',
    cube: 'cube',
    jack: 'jack',
    icosphere: 'icosphere',
    ufo: 'ufo'
};

const Cubemaps = {
    beach: {
        name: 'beach',
        imgs: [
            'cubemaps/beach/posx.jpg',
            'cubemaps/beach/negx.jpg',
            'cubemaps/beach/posy.jpg',
            'cubemaps/beach/negy.jpg',
            'cubemaps/beach/posz.jpg',
            'cubemaps/beach/negz.jpg',
        ]
    }
}

export const scenes = [
    {
        label: 'Solid Triangle',
        camera: [
            0, 0, 0
        ],
        shaders: [
            {
                editor: true,
                fs: FragmentShaders.solidwhite,
                vs: VertexShaders.notransform
            }
        ],
        objects: [
            {
                mesh: Meshes.tri,
                shader: 0,
                pos: [0,0,0]
            }
        ]
    },
    {
        label: 'Spinning Crate - Unlit',
        camera: [
            0, 0, 20
        ],
        shaders: [
            {
                editor: true,
                fs: FragmentShaders.textured,
                vs: VertexShaders.postransformtex
            }
        ],
        objects: [
            {
                mesh: Meshes.crate,
                scale: 0.06,
                rotVelocity: [20,30,0],
                shader: 0,
                pos: [0,0,0],
                textures: {
                    diffuse: 'crate_color.png'
                }
            }
        ]
    },
    {
        label: 'Torus - Direct Light',
        camera: [
            0, 0, 3
        ],
        shaders: [
            {
                editor: true,
                fs: FragmentShaders.directlight,
                vs: VertexShaders.postransformtexnorm
            }
        ],
        objects: [
            {
                mesh: Meshes.torus,
                scale: 1,
                rotVelocity: [20,80,0],
                shader: 0,
                pos: [0,0,0],
            }
        ]
    },
    {
        label: 'Torus - Phong',
        camera: [
            0, 0, 3
        ],
        shaders: [
            {
                editor: true,
                fs: FragmentShaders.directlightspecular,
                vs: VertexShaders.postransformtexnormcamera
            }
        ],
        objects: [
            {
                mesh: Meshes.torus,
                scale: 1,
                rotVelocity: [20,80,0],
                shader: 0,
                pos: [0,0,0],
            }
        ]
    },
    {
        label: 'Torus - Rim Lighting',
        camera: [
            0, 0, 3
        ],
        shaders: [
            {
                editor: true,
                fs: FragmentShaders.directlightrim,
                vs: VertexShaders.postransformtexnormcamera
            }
        ],
        objects: [
            {
                mesh: Meshes.torus,
                scale: 1,
                rotVelocity: [20,80,0],
                shader: 0,
                pos: [0,0,0],
            }
        ]
    },
    {
        label: 'Toon Shading',
        camera: [
            0, 0, 3
        ],
        shaders: [
            {
                editor: true,
                fs: FragmentShaders.toon,
                vs: VertexShaders.postransformtexnormcamera
            }
        ],
        objects: [
            {
                mesh: Meshes.torus,
                scale: 1,
                rotVelocity: [20,80,0],
                shader: 0,
                pos: [0,0,0],
                textures: {
                    ramp: 'toon_ramp.png'
                }
            }
        ]
    },
    {
        label: 'Cube - Normal Mapping',
        camera: [
            0, 0, 5
        ],
        shaders: [
            {
                editor: true,
                fs: FragmentShaders.phong_normalmapping,
                vs: VertexShaders.postransform_tex_norm_camera_tangents
            }
        ],
        objects: [
            {
                mesh: Meshes.cube,
                scale: 1,
                rotVelocity: [5,20,0],
                shader: 0,
                pos: [0,0,0],
                textures: {
                    diffuse: 'stone_plain.png',
                    normalMap: 'ground-stoney-01-normal.png'
                }
            }
        ]
    },
    {
        label: 'Jack - Normal Mapping',
        camera: [
            0, 0, 10
        ],
        shaders: [
            {
                editor: true,
                fs: FragmentShaders.phong_normalmapping,
                vs: VertexShaders.postransform_tex_norm_camera_tangents
            }
        ],
        objects: [
            {
                mesh: Meshes.jack,
                scale: 1,
                rotVelocity: [20,10,0],
                shader: 0,
                pos: [0,0,0],
                textures: {
                    diffuse: 'Pebbles_017_baseColor.jpg',
                    normalMap: 'Pebbles_017_normal.jpg'
                }
            }
        ]
    },
    {
        label: 'Wavy Plane',
        camera: [
            0, 2.5, 5
        ],
        shaders: [
            {
                editor: true,
                fs: FragmentShaders.vertexcolor,
                vs: VertexShaders.wavy_plane
            }
        ],
        objects: [
            {
                primitive: {
                    name: 'plane128',
                    type: 'plane',
                    resolution: 128,
                    width: 4
                },
                shader: 0,
                pos: [0,0,0]
            }
        ]
    },
    {
        label: 'Shiny Water (Planar)',
        camera: [
            0, 1, 5
        ],
        planarReflection: true,
        shaders: [
            {
                editor: true,
                fs: FragmentShaders.planar_reflection_bump,
                vs: VertexShaders.water
            },
            {
                name: 'Textured',
                fs: FragmentShaders.textured,
                vs: VertexShaders.postransformtex
            },
            {
                name: 'Skybox',
                fs: FragmentShaders.skybox,
                vs: VertexShaders.post_process_pos
            },
            {
                name: 'Torus',
                fs: FragmentShaders.directlightrim,
                vs: VertexShaders.postransformtexnormcamera
            }
        ],
        bg: {
            shader: 2,
            cubemap: Cubemaps.beach
        },
        objects: [
            {
                noReflect: true,
                primitive: {
                    name: 'plane128',
                    type: 'plane',
                    resolution: 2,
                    width: 28
                },
                textures: {
                    normalMap: 'water-normal.png'
                },
                shader: 0,
                pos: [0,0,0]
            },
            {
                mesh: Meshes.crate,
                scale: 0.006,
                rotVelocity: [0,20,0],
                shader: 1,
                pos: [-1,1.0,0],
                textures: {
                    diffuse: 'crate_color.png'
                }
            },
            {
                mesh: Meshes.torus,
                scale: 1,
                rotVelocity: [20,80,0],
                shader: 3,
                pos: [1,1.2,0],
            }
        ]
    },
    {
        label: 'Shiny Cube',
        cameraOrbitSpeed: 0.4,
        camera: [
            0, 2.5, 10
        ],
        shaders: [
            {
                editor: true,
                fs: FragmentShaders.environmentmap_smooth,
                vs: VertexShaders.postransformtexnormcamera
            },
            {
                name: 'Skybox',
                fs: FragmentShaders.skybox,
                vs: VertexShaders.post_process_pos
            }
        ],
        objects: [
            {
                mesh: Meshes.cube,
                shader: 0,
                pos: [0,0,0],
                cubemap: Cubemaps.beach
            }
        ],
        bg: {
            shader: 1,
            cubemap: Cubemaps.beach
        }
    },
    {
        label: 'Shiny Saucer',
        cameraOrbitSpeed: 0.4,
        camera: [
            0, 2.5, 10
        ],
        shaders: [
            {
                editor: true,
                fs: FragmentShaders.environmentmap_smooth,
                vs: VertexShaders.postransformtexnormcamera
            },
            {
                name: 'Skybox',
                fs: FragmentShaders.skybox,
                vs: VertexShaders.post_process_pos
            }
        ],
        objects: [
            {
                mesh: Meshes.ufo,
                shader: 0,
                pos: [0,0,0],
                cubemap: Cubemaps.beach
            }
        ],
        bg: {
            shader: 1,
            cubemap: Cubemaps.beach
        }
    },
    {
        label: 'Shiny Bumpy Saucer',
        cameraOrbitSpeed: 0.4,
        camera: [
            0, 2.5, 10
        ],
        shaders: [
            {
                editor: true,
                fs: FragmentShaders.environmentmap_normalmapping,
                vs: VertexShaders.postransformtexnormcamera
            },
            {
                name: 'Skybox',
                fs: FragmentShaders.skybox,
                vs: VertexShaders.post_process_pos
            }
        ],
        objects: [
            {
                mesh: Meshes.ufo,
                shader: 0,
                pos: [0,0,0],
                cubemap: Cubemaps.beach,
                textures: {
                    normalMap: '216-normal.jpg'
                }
            }
        ],
        bg: {
            shader: 1,
            cubemap: Cubemaps.beach
        }
    },
    {
        label: 'Gaussian Blur',
        camera: [
            0, 0, 0
        ],
        shaders: [
            {
                name: "Blur H",
                editor: true,
                fs: PostProcessShaders.blur_h,
                vs: VertexShaders.post_process
            },
            {
                name: "Blur V",
                fs: PostProcessShaders.blur_v,
                vs: VertexShaders.post_process
            },
            {
                name: "Pass Through",
                fs: PostProcessShaders.passthrough_forward,
                vs: VertexShaders.post_process
            },
            {
                name: "Composite",
                fs: PostProcessShaders.passthrough,
                vs: VertexShaders.post_process
            },
            {
                name: "Texture",
                fs: FragmentShaders.textured,
                vs: VertexShaders.post_process
            },
        ],
        objects: [],
        postProcess: [
            2,
            0,0,0,0,0,0,0,0,0,0,
            1,1,1,1,1,1,1,1,1,1,
            3
        ],
        bg: {
            shader: 4,
            textures: {
                diffuse: 'tulips.jpg'
            }
        }
    },
    {
        label: 'Bloom (Glow)',
        camera: [
            0, 0, 20
        ],
        clearColor: [
            0,0,0
        ],
        shaders: [
            {
                name: "Textured Cubes",
                fs: FragmentShaders.textured,
                vs: VertexShaders.postransformtex
            },
            {
                name: "Brightness Pass",
                fs: PostProcessShaders.extract_bright_spots,
                vs: VertexShaders.post_process
            },
            {
                name: "Blur H",
                editor: true,
                fs: PostProcessShaders.blur_h,
                vs: VertexShaders.post_process
            },
            {
                name: "Blur V",
                fs: PostProcessShaders.blur_v,
                vs: VertexShaders.post_process
            },
            {
                name: "Composite",
                fs: PostProcessShaders.bloom_composite,
                vs: VertexShaders.post_process
            }
        ],
        postProcessScaleFactor: 0.25,
        postProcess: [
            1,
            2,2,2,2,2,
            3,3,3,3,3,
            4
        ],
        objects: [
            {
                mesh: Meshes.cube,
                scale: 2,
                rotVelocity: [20,0,0],
                shader: 0,
                pos: [-5,5,0],
                textures: {
                    diffuse: 'scificrate1.png'
                }
            },
            {
                mesh: Meshes.torus,
                scale: 4,
                rotVelocity: [10,40,0],
                shader: 0,
                pos: [5,5,0],
                textures: {
                    diffuse: 'green.png'
                }
            },
            {
                mesh: Meshes.cube,
                scale: 2,
                rotVelocity: [20,30,0],
                shader: 0,
                pos: [5,-5,0],
                textures: {
                    diffuse: 'orange.png'
                }
            },
            {
                mesh: Meshes.crate,
                scale: 0.02,
                rotVelocity: [0,30,0],
                shader: 0,
                pos: [-5,-5,0],
                textures: {
                    diffuse: 'crate_color.png'
                }
            }
        ]
    },
    {
        label: 'Light Beams',
        update: (_this, time) => {
            const lightRange = 15.0;
            const lightSpeed = 1.0;

            _this.lightPos[0] = Math.sin(time * lightSpeed ) * lightRange;
        },
        lightPos: [0,0,-9],
        camera: [
            0, 0, 20
        ],
        clearColor: [
            0,0,0
        ],
        shaders: [
            {
                name: "Light Source",
                fs: FragmentShaders.sun_ball,
                vs: VertexShaders.sun_ball
            },
            {
                name: "Extract Sunbeams",
                fs: PostProcessShaders.extract_sunbeam,
                vs: VertexShaders.post_process
            },
            {
                editor: true,
                name: "Blur Sunbeams",
                fs: PostProcessShaders.blur_sunbeams,
                vs: VertexShaders.blur_sunbeams
            },
            {
                name: "Composite",
                fs: PostProcessShaders.bloom_composite,
                vs: VertexShaders.post_process
            },
            {
                name: 'Point Lit',
                fs: FragmentShaders.directlightpoint,
                vs: VertexShaders.postransformtexnormworldpos
            }
        ],
        // postProcessScaleFactor: 0.25,
        postProcess: [
            1, 2, 3
        ],
        objects: [
            {
                primitive: {
                    type: 'quad',
                    width: 1
                },
                scale: 1.0,
                rotVelocity: [0,0,0],
                shader: 0,
                pos: [0,0,0]
            },
            {
                mesh: Meshes.cube,
                scale: 2.5,
                rotVelocity: [0,30,0],
                shader: 4,
                pos: [-7,0,0]
            },
            {
                mesh: Meshes.torus,
                scale: 4.5,
                rotVelocity: [10,0,0],
                shader: 4,
                pos: [7,0,0]
            }
        ],
        // bg: {
        //     shader: 0
        // }
    },
    {
        label: 'Light Beams 2',
        lightPos: [0,1,-9],
        camera: [
            0, 0, 20
        ],
        clearColor: [
            0,0,0
        ],
        shaders: [
            {
                name: "Light Source",
                fs: FragmentShaders.sun_ball,
                vs: VertexShaders.sun_ball
            },
            {
                name: "Extract Sunbeams",
                fs: PostProcessShaders.extract_sunbeam,
                vs: VertexShaders.post_process
            },
            {
                editor: true,
                name: "Blur Sunbeams",
                fs: PostProcessShaders.blur_sunbeams,
                vs: VertexShaders.blur_sunbeams
            },
            {
                name: "Composite",
                fs: PostProcessShaders.bloom_composite,
                vs: VertexShaders.post_process
            },
            {
                name: 'Point Lit',
                fs: FragmentShaders.directlightpoint,
                vs: VertexShaders.postransformtexnormworldpos
            }
        ],
        // postProcessScaleFactor: 0.25,
        postProcess: [
            1, 2, 3
        ],
        objects: [
            {
                primitive: {
                    type: 'quad',
                    width: 1
                },
                scale: 1.0,
                rotVelocity: [0,0,0],
                shader: 0,
                pos: [0,0,0]
            },
            {
                mesh: Meshes.jack,
                scale: 1.5,
                rotVelocity: [0,0,20],
                shader: 4,
                pos: [0,-4,0]
            }
        ],
        // bg: {
        //     shader: 0
        // }
    },
];