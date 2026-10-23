// Procedural pores in object coordinates avoid visible UV seams at ears and paws.
export function addSurfaceShader(shader,material) {
  shader.uniforms.uGrain={value:material.userData.grain??0};
  shader.vertexShader='varying vec3 vSurfacePosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vSurfacePosition=position;\n#include <begin_vertex>');
  shader.fragmentShader=`
    varying vec3 vSurfacePosition;
    uniform float uGrain;
    float surfaceHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float surfaceNoise(vec3 p){
      vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
      return mix(mix(mix(surfaceHash(i),surfaceHash(i+vec3(1,0,0)),f.x),mix(surfaceHash(i+vec3(0,1,0)),surfaceHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(surfaceHash(i+vec3(0,0,1)),surfaceHash(i+vec3(1,0,1)),f.x),mix(surfaceHash(i+vec3(0,1,1)),surfaceHash(i+vec3(1,1,1)),f.x),f.y),f.z);
    }
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
    #include <color_fragment>
    float pores=surfaceNoise(vSurfacePosition*105.0);
    diffuseColor.rgb*=1.0-uGrain*smoothstep(0.56,0.84,pores)*0.6;
  `).replace('#include <roughnessmap_fragment>',`
    #include <roughnessmap_fragment>
    roughnessFactor=clamp(roughnessFactor+uGrain*(pores-0.3),0.08,1.0);
  `).replace('#include <normal_fragment_maps>',`
    #include <normal_fragment_maps>
    float microHeight=surfaceNoise(vSurfacePosition*86.0)*uGrain*1.3;
    normal=normalize(normal+normalize(dFdx(vViewPosition)+vec3(0.000001))*dFdx(microHeight)+normalize(dFdy(vViewPosition)+vec3(0.000001))*dFdy(microHeight));
  `);
}
