/*
ONE MESH, LAND AND SEA. The material for a planet whose ground and water are
one sphere, told apart per pixel by height (board #3271).

The mesh holds every vertex that is under water AT sea level, and carries each
vertex's true height as data. So the shader knows, at every pixel, how far
above or below the sea it is:

- ABOVE: land. The colour map if there is one; else a small set of rules by
  latitude, height and a moisture noise (ice, rock, forest, grass, desert).
- BELOW: water. Pale in the shallows and dark in the deep, and it GLINTS: the
  sun's reflection, which land does not have. The glint is broken up by fine
  noise standing in for waves, because a real sea's glint is not a mirror's
  disc but a field of sparkle that is wider and rougher toward its edge.
- THE COAST is where the interpolated height crosses zero, which happens
  INSIDE a triangle: a smooth line however coarse the mesh. (With a sea
  sphere the coast was wherever the ground poked through, as jagged as the
  mesh.)

It lights itself from the scene's sun or star, like the gas giant and the
cloud shell, and keeps the night side dim, not black.
*/
import * as BABYLON from '@babylonjs/core';
import { GAS_GIANT_GLSL } from './gas-giant.js';
import { sceneLight } from './gas-giant-material.js';
import { sceneSeconds } from './b3d-utils.js';
import { NOISE_TEXTURE_GLSL, NOISE_TEXTURE_SAMPLER, hasNoiseTexture, noiseTextureOf, } from './noise-texture.js';
import { attachBiomePlugin, noiseTextureOf as biomeNoiseTextureOf, climateTextureOf, } from './biome-plugin.js';
const NAME = 'b3dPlanetSurface';
/**
 * Register the shader, plain or with the BIOME SHADER inside it, and return
 * the name it is under. The biome variant is not a look-alike: it is the
 * biome plugin's own GLSL (its uniforms, its functions and its classifying
 * block, taken from the plugin as text), so a planet's land is classified by
 * the same code, the same chart and the same parameters as terrain is.
 */
function registerShader(biome) {
    const store = BABYLON.Effect.ShadersStore;
    const name = biome ? `${NAME}Biome` : NAME;
    if (store[`${name}VertexShader`])
        return name;
    const code = biome?.getCustomCode('fragment') ?? null;
    const biomeDecl = biome
        ? `#define BIOME\n#define NORMAL\n${biome.getUniforms().fragment}\n${code?.CUSTOM_FRAGMENT_DEFINITIONS ?? ''}`
        : '';
    /*
    The plugin's block reads vPositionW and vNormalW and writes diffuseColor.
    It is given the position this pixel would have had WITHOUT the sea holding
    the mesh level (so its altitude is the true one, and the sea bed is
    classified as sea bed), and its answer is the land's colour.
  
    Its SLOPE under the sea comes from the height field: the normal is the
    cross product of how that reconstructed position changes across the
    screen, because the mesh is held flat there and its normals know nothing
    of the sea bed. On land the mesh IS the ground, and its own normal is
    used: smooth, where the derivative one is constant per triangle.
    */
    const biomeLand = biome
        ? `{vec3 pc=biomePlanet.xyz;vec3 vPositionW=hfPos;vec3 vNormalW=hfNormal;vec3 diffuseColor=vec3(1.0);
${code?.CUSTOM_FRAGMENT_UPDATE_DIFFUSE ?? ''}
land=diffuseColor;}`
        : '';
    store[`${name}VertexShader`] = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 vBody;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vHeight;
void main(){
  vBody=position;
  vHeight=uv.x;
  vec4 w=world*vec4(position,1.0);
  vWorld=w.xyz;
  vNormalW=normalize(mat3(world)*normal);
  gl_Position=worldViewProjection*vec4(position,1.0);
}`;
    store[`${name}FragmentShader`] = `
precision highp float;
varying vec3 vBody;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vHeight;
uniform sampler2D psColor;
uniform vec4 psLight;
uniform vec3 psEye;
uniform vec4 psK;
uniform vec4 psSea;
uniform float psLakes;
uniform vec3 psWaterS;
uniform vec3 psWaterD;
uniform vec2 psFine;
uniform mat4 world;
${biomeDecl}
${GAS_GIANT_GLSL}
${NOISE_TEXTURE_GLSL}
void main(){
  vec3 d=normalize(vBody);
  vec3 n=normalize(vNormalW);
  vec3 l=psLight.w>0.5?normalize(psLight.xyz-vWorld):normalize(psLight.xyz);
  vec3 v=normalize(psEye-vWorld);
  float nl=dot(n,l);
  /*
  FINER THAN THE MESH. The mesh carries the height at its vertices, and a
  coast drawn from that alone cannot turn tighter than about two of its
  cells: asked for more detail, it gives facets. So the octaves the mesh
  cannot hold are added HERE, per pixel, to the height everything below
  reads: where the sea ends, how deep it is, how high and how steep the land
  is. psFine is (frequency, amplitude); zero amplitude is a mapped world,
  whose heights are the truth.
  */
  float hgt=vHeight;
  if(psFine.y>0.0)hgt+=psFine.y*(b3dVnFbm(d*psFine.x+vec3(psK.z*3.1))-0.5)*2.0;
  // How much of this pixel is sea: the height crossing zero, softened over
  // about a pixel. psSea.x is 0 for a world with no sea at all.
  float edge=max(fwidth(hgt)*0.9,1e-5);
  float sea=psSea.x*(1.0-smoothstep(-edge,edge,hgt));
  float lat=asin(clamp(d.y,-1.0,1.0));

#ifdef BIOME
  // Outside any branch: a derivative taken inside one is undefined.
  vec3 hfC=biomePlanet.xyz;
  vec3 hfUp=normalize(vWorld-hfC);
  // A WORLD WITH NO SEA has nothing under water: its crater floors dip
  // below the zero height, and read as sea bed (a flat dark patch) until
  // the classifier is told the ground is all far above any sea.
  vec3 hfPos=hfC+hfUp*(biomePlanet.w+hgt+(psSea.x>0.5?0.0:biomePlanet.w*0.25));
  // The SLOPE is the mesh's heights alone. The fine octaves are small and
  // quick, so their slope is steep everywhere: read for steepness, they
  // turned the whole land to cliff.
  vec3 hfFlat=hfC+hfUp*(biomePlanet.w+vHeight);
  vec3 hfNormal=cross(dFdx(hfFlat),dFdy(hfFlat));
  float hfLen=length(hfNormal);
  hfNormal=hfLen>0.0?hfNormal/hfLen:hfUp;
  if(dot(hfNormal,hfUp)<0.0)hfNormal=-hfNormal;
  // ON LAND the mesh is the true ground, and its normal is smooth: the
  // screen-derivative one is constant across each triangle, so a slope
  // threshold read from it stepped triangle by triangle (blocky rock on a
  // cratered moon). Only the sea bed, held flat in the mesh, needs it; a
  // world with no sea has none, however deep its crater floors go.
  if(vHeight>0.0||psSea.x<0.5)hfNormal=n;
#endif

  // --- land ---------------------------------------------------------------
  vec3 land;
  if(psK.w>0.5){
    vec2 uv=vec2(atan(d.z,d.x)/6.2831853+0.5,1.0-acos(clamp(d.y,-1.0,1.0))/3.14159265);
    land=texture2D(psColor,uv).rgb;
    /*
    INLAND WATER, guessed from the map's COLOUR (optional): the height map
    knows the sea, but a lake sits above sea level and reads as land. Two
    tells. Blue above both red and green (the Caspian, a coast). And NEARLY
    BLACK: NASA's Blue Marble paints deep lakes about 0/7/2 out of 255,
    darker than any land on it (the Congo forest is 21/35/10), which is how
    Victoria, Tanganyika, Superior and Baikal are found. Either is taken for
    water: it keeps the map's colour and gains the sea's glint. A guess, so
    it is a setting: blue ice or a black lava field can pass for a lake.
    */
    float mx=max(land.r,max(land.g,land.b));
    float blue=max(smoothstep(0.06,0.2,(land.b-max(land.r,land.g))/(land.b+0.02)),1.0-smoothstep(0.04,0.075,mx));
    sea=max(sea,psLakes*blue);
  }else if(psSea.x<-0.5){
    land=vec3(0.5);
  }else{
    ${biome ? '' : '/*'}
    ${biomeLand}
    ${biome ? '/*' : '*/'}
    float alt=clamp(hgt/max(psK.x,1e-4),0.0,1.0);
    float wet=b3dVnFbm(d*3.1+vec3(psK.z))*0.7+b3dVn(d*11.0)*0.3;
    float temp=1.0-abs(lat)/1.45-alt*0.55+(b3dVn(d*5.0+vec3(3.0))-0.5)*0.18;
    vec3 desert=vec3(0.76,0.66,0.44);
    vec3 grass=vec3(0.35,0.5,0.24);
    vec3 forest=vec3(0.13,0.3,0.14);
    vec3 tundra=vec3(0.45,0.44,0.36);
    vec3 rock=vec3(0.42,0.39,0.36);
    land=mix(desert,mix(grass,forest,smoothstep(0.5,0.72,wet)),smoothstep(0.34,0.52,wet));
    land=mix(tundra,land,smoothstep(0.22,0.42,temp));
    land=mix(land,rock,smoothstep(0.55,0.8,alt));
    land=mix(vec3(0.93,0.95,0.97),land,smoothstep(0.1,0.2,temp));
    land=mix(land,vec3(0.8,0.74,0.56),(1.0-smoothstep(0.0,0.035,alt))*0.7);
    ${biome ? '*/' : ''}
  }

  // --- water --------------------------------------------------------------
  float depth=clamp(-hgt/max(psK.y,1e-4),0.0,1.0);
  vec3 water=mix(psWaterS,psWaterD,1.0-exp(-depth*3.2));
  // With a colour map the map's own sea colour is the truth; deepen it only.
  if(psK.w>0.5)water=land*mix(1.0,0.82,depth);
  ${biome
        ? '// The biome shader has coloured the sea BED: shallow water shows it.\n  water=mix(land,water,0.35+0.65*(1.0-exp(-depth*4.0)));'
        : ''}
  // Sea ice toward the poles.
  float ice=psSea.z>0.0&&abs(lat)>0.9?psSea.z*smoothstep(1.02,1.2,abs(lat)+(b3dVn(d*9.0)-0.5)*0.12):0.0;
  water=mix(water,vec3(0.86,0.9,0.94),ice);

  vec3 alb=mix(land,water,sea);
  float lit=smoothstep(-0.05,0.25,nl)*(0.25+0.75*max(nl,0.0));
  vec3 col=alb*(lit+0.09);

  /*
  THE GLINT. A mirror ball would show the sun as one small disc. A sea is a
  mirror broken into waves far too small to see, each tilted a little, so
  what shows is a patch of sparkle: bright and tight at its heart, wide and
  thin around it. The tilts are fine noise in the planet's own frame (so the
  glint is fixed to no patch of water and slides across the sea as you move)
  drifting slowly so that it shimmers.
  */
  if(sea>0.0&&psSea.y>0.0){
    vec3 up=normalize(mat3(world)*d);
    vec3 h=normalize(l+v);
    float day=smoothstep(-0.02,0.15,dot(up,l));
    // Only NEAR the reflection: the waves tilt the surface by 12 degrees at
    // most, so further than that from the mirror point there is no sparkle
    // to work out, and that is most of an ocean.
    if(dot(up,h)>0.72){
      float t=psSea.w;
      vec3 wv=vec3(b3dVn(d*420.0+vec3(t*0.7,0.0,0.0)),b3dVn(d*420.0+vec3(31.0,t*0.6,0.0)),b3dVn(d*420.0+vec3(0.0,57.0,t*0.5)))-0.5;
      vec3 wv2=vec3(b3dVn(d*95.0+vec3(t*0.2)),b3dVn(d*95.0+vec3(17.0+t*0.2)),b3dVn(d*95.0+vec3(41.0)))-0.5;
      vec3 wn=normalize(up+wv*0.16+wv2*0.07);
      float nh=max(dot(wn,h),0.0);
      float core=pow(nh,260.0)*3.2;
      float spread=pow(nh,34.0)*0.38;
      // Low sun and a grazing view both stretch and brighten it.
      float fres=0.25+0.75*pow(1.0-max(dot(up,v),0.0),3.0);
      col+=vec3(1.0,0.96,0.88)*(core+spread)*fres*day*sea*(1.0-ice)*psSea.y;
    }
    // …and the sea's own sheen of sky at the limb.
    col+=vec3(0.25,0.4,0.6)*pow(1.0-max(dot(up,v),0.0),5.0)*0.25*day*sea;
  }
  gl_FragColor=vec4(col,1.0);
}`;
    return name;
}
/**
 * The material for a one-mesh planet. The mesh must carry each vertex's
 * height above the sea (negative below) in `uv.x`, with every vertex that is
 * below the sea placed AT sea level.
 */
export function createPlanetSurfaceMaterial(scene, options) {
    const biome = options.colorUrl ? null : options.biome ?? null;
    const name = registerShader(biome);
    const mat = new BABYLON.ShaderMaterial('planet-surface', scene, { vertex: name, fragment: name }, {
        attributes: ['position', 'normal', 'uv'],
        uniforms: [
            'world',
            'worldViewProjection',
            'psLight',
            'psEye',
            'psK',
            'psSea',
            'psLakes',
            'psWaterS',
            'psWaterD',
            'psFine',
            ...(biome ? biome.getUniforms().ubo.map((u) => u.name) : []),
        ],
        samplers: [
            'psColor',
            NOISE_TEXTURE_SAMPLER,
            'biomeNoiseTex',
            'biomeClimateTex',
        ],
        // The noise is READ where the engine has 3D textures: this shader's
        // own (noise-texture) and the biome shader's fine noise, as on terrain.
        defines: hasNoiseTexture(scene)
            ? ['#define B3D_NOISETEX', '#define BIOME_NOISETEX']
            : [],
    });
    if (hasNoiseTexture(scene)) {
        mat.setTexture(NOISE_TEXTURE_SAMPLER, noiseTextureOf(scene));
        // Bound NOW, not at the first draw (where the plugin would bind it): a 3D
        // sampler left on the unit a 2D one is using is an invalid draw, and the
        // planet was dropped for a frame each time it was rebuilt.
        if (biome != null)
            mat.setTexture('biomeNoiseTex', biomeNoiseTextureOf(scene));
    }
    // The biome shader declares its flat-ground climate texture whether or not
    // a planet reads it, and an unbound sampler is an invalid draw.
    if (biome != null)
        mat.setTexture('biomeClimateTex', climateTextureOf(scene));
    // No mipmaps on the map: the lookup jumps at the date line, and a mip
    // level chosen from that jump draws a seam down the back of the planet.
    const tex = options.colorUrl != null && options.colorUrl !== ''
        ? new BABYLON.Texture(options.colorUrl, scene, true, true, BABYLON.Texture.BILINEAR_SAMPLINGMODE)
        : BABYLON.RawTexture.CreateRGBATexture(new Uint8Array([255, 255, 255, 255]), 1, 1, scene, false);
    tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    mat.setTexture('psColor', tex);
    mat.setVector4('psK', new BABYLON.Vector4(options.heightScale, options.depthScale, (options.seed ?? 1) * 1.37, options.colorUrl ? 1 : 0));
    // The sea's colour, shallow to deep: an Earth's by default, a methane
    // sea's (Titan) or any other when given.
    const ws = options.water?.shallow ?? [0.09, 0.42, 0.5];
    const wd = options.water?.deep ?? [0.012, 0.06, 0.2];
    mat.setVector3('psWaterS', new BABYLON.Vector3(ws[0], ws[1], ws[2]));
    mat.setVector3('psWaterD', new BABYLON.Vector3(wd[0], wd[1], wd[2]));
    const light = new BABYLON.Vector4(0, 1, 0, 0);
    const fine = new BABYLON.Vector2(options.fine?.scale ?? 0, options.colorUrl ? 0 : options.fine?.amplitude ?? 0);
    const sea = new BABYLON.Vector4();
    /*
    The plugin binds its uniforms into a uniform BUFFER. This material has
    none, so it is handed something with the same few methods that sets them
    on the material instead: the plugin's own binding code runs unchanged, and
    whatever it would have sent to terrain it sends here.
    */
    const sink = {
        updateFloat4: (n, a, b, c, d) => mat.setVector4(n, new BABYLON.Vector4(a, b, c, d)),
        updateFloatArray: (n, values) => mat.setArray4(n, Array.from(values)),
        updateMatrix: (n, m) => mat.setMatrix(n, m),
        setTexture: (n, t) => mat.setTexture(n, t),
    };
    mat.onBind = (mesh) => {
        if (biome != null)
            biome.bindForSubMesh(sink, scene, scene.getEngine(), { getMesh: () => mesh });
        sceneLight(scene, light);
        mat.setVector4('psLight', light);
        const cam = scene.activeCamera;
        if (cam != null)
            mat.setVector3('psEye', cam.globalPosition);
        sea.set(options.sea ? 1 : 0, options.glint ?? 1, options.seaIce ?? 0, sceneSeconds(scene) % 1000);
        mat.setVector4('psSea', sea);
        mat.setFloat('psLakes', options.inlandWater === true ? 1 : 0);
        mat.setVector2('psFine', fine);
    };
    mat.onDisposeObservable.add(() => tex.dispose());
    return mat;
}
/**
 * A biome shader for a one-mesh planet: the real plugin, attached to a
 * material that is never drawn, so that it holds the parameters, the
 * palettes and the code. Hand it to `createPlanetSurfaceMaterial`'s `biome`.
 * Its `params` are live, exactly as on terrain. Dispose `host` with the
 * planet.
 */
export function createPlanetBiome(scene, params) {
    const host = new BABYLON.StandardMaterial('planet-biome-host', scene);
    return { plugin: attachBiomePlugin(host, params), host };
}
//# sourceMappingURL=planet-surface-material.js.map