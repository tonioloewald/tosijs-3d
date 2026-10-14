/*
A planet's weather seen from orbit: a shell of cloud just above the ground and
inside the air. Babylon-side; `<tosi-b3d-planet clouds="0.5">` uses it.

The field is the cloud deck's idea on a sphere: fBm with ONE coverage dial
that slides a threshold through it, advected by wind. Read in 3D at the point
itself, in the planet's own frame, so there is no pole and no seam and the
weather turns with the world. Three things make it read as weather and not
as marble:

- the winds reverse with latitude (trades one way, westerlies the other), so
  systems shear into streaks;
- the point is pushed about by a coarser noise before the cloud is read, which
  curls fronts into commas;
- climate: weather lives in belts. A thin band of storms near the equator,
  clear skies over the deserts at about 25 degrees, and a broad belt of
  travelling systems around 52 degrees in each hemisphere;
- cyclones: in those belts the field is wound about scattered centres, which
  draws cloud into the comma of a real depression;
- relief: the field is the cloud's depth, and its slope toward the sun
  shades the tops, which is the texture a deck has.

And the SHADOW, which is most of what makes cloud sit above ground: the shell
also darkens the surface where cloud stands between it and the sun, by reading
the same field a little way toward the sun.
*/
import * as BABYLON from '@babylonjs/core';
import { GAS_GIANT_GLSL } from './gas-giant.js';
import { sceneLight } from './gas-giant-material.js';
import { latLonToDirection } from './sphere-map.js';
import { sceneSeconds } from './b3d-utils.js';
import { NOISE_TEXTURE_GLSL, NOISE_TEXTURE_SAMPLER, hasNoiseTexture, noiseTextureOf, } from './noise-texture.js';
const NAME = 'b3dPlanetClouds';
function registerShader() {
    const store = BABYLON.Effect.ShadersStore;
    if (store[`${NAME}VertexShader`])
        return;
    store[`${NAME}VertexShader`] = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 vBody;
varying vec3 vWorld;
varying vec3 vNormalW;
void main(){
  vBody=position;
  vec4 w=world*vec4(position,1.0);
  vWorld=w.xyz;
  vNormalW=normalize(mat3(world)*normal);
  gl_Position=worldViewProjection*vec4(position,1.0);
}`;
    store[`${NAME}FragmentShader`] = `
precision highp float;
varying vec3 vBody;
varying vec3 vWorld;
varying vec3 vNormalW;
uniform vec4 pcLight;
uniform vec3 pcSunBody;
uniform vec3 pcColor;
uniform vec4 pcK;
uniform vec4 pcStormA[4];
uniform vec4 pcStormB[4];
${GAS_GIANT_GLSL}
${NOISE_TEXTURE_GLSL}
// Rodrigues: turn p about a unit axis.
vec3 pcAbout(vec3 p,vec3 ax,float a){float c=cos(a);float s=sin(a);return p*c+cross(ax,p)*s+ax*dot(ax,p)*(1.0-c);}
// WHERE WEATHER LIVES, by latitude (0…1): a thin band of storms near the
// equator, clear skies over the deserts at about 25 degrees, and a broad
// belt of travelling systems around 52 degrees in each hemisphere.
float pcBelt(float latDeg){
  float a=abs(latDeg);
  float itcz=exp(-pow((latDeg-6.0)/7.0,2.0));
  float mid=exp(-pow((a-52.0)/15.0,2.0));
  return clamp(0.85*itcz+mid+0.45*smoothstep(66.0,86.0,a),0.0,1.0);
}
// The cloud's DEPTH at a point, with the belt winds having blown for tt
// seconds, before the coverage dial cuts it.
float pcF(vec3 d,float tt){
  float latDeg=asin(clamp(d.y,-1.0,1.0))*57.29578;
  float lat=latDeg*0.0174533;
  vec3 sd=vec3(pcK.z*11.3,pcK.z*5.9,pcK.z*2.7);
  // The whole sky drifts east (that can run for ever: nothing is stretched),
  // and each belt is carried by its own wind for tt.
  vec3 q=b3dGgTurn(d,-pcK.y*0.003+tt*0.012*cos(lat*3.0));
  /*
  CYCLONES. Space is cut into cells about 16 degrees across, each with a
  centre; near its centre the sky is WOUND about it, anticlockwise in the
  north and clockwise in the south, more tightly toward the middle. Winding
  a field of cloud is what draws it into the comma of a real depression.
  The winding fades to nothing before a cell's edge, so cells do not show.
  */
  vec3 cq=q*3.6+sd;
  vec3 g=floor(cq);
  vec3 jit=vec3(b3dGgHash(g),b3dGgHash(g+vec3(7.0)),b3dGgHash(g+vec3(13.0)))-0.5;
  vec3 ctr=(g+0.5+0.24*jit-sd)/3.6;
  float rr=length(q-ctr)*3.6;
  float wind=1.0-smoothstep(0.0,0.42,rr);
  float mid=exp(-pow((abs(latDeg)-52.0)/17.0,2.0));
  float twist=2.6*wind*wind*(0.25+0.75*mid)*(0.4+0.9*b3dGgHash(g+vec3(3.0)));
  // Which way it turns is the CELL's hemisphere, not the pixel's, and it
  // fades through nothing at the equator (there is no Coriolis turning
  // there). Taken per pixel, a cell lying across the equator was wound one
  // way above the line and the other way below: a hard edge along it.
  vec3 cax=normalize(ctr);
  q=pcAbout(q,cax,twist*clamp(cax.y*7.0,-1.0,1.0));
  /*
  PLACED STORMS (planet.storms): a cyclone where the caller says. Inside its
  radius the sky is wound hard about its centre and keeps turning (the turn
  rides the same resetting clock as the winds, so it never winds up tight),
  the cloud is thickened into a solid disc with spiral arms, and the middle
  is cleared for an eye.
  */
  float storm=0.0;
  for(int i=0;i<4;i++){
    vec4 sa=pcStormA[i];
    if(sa.w<=0.0)continue;
    float ang=acos(clamp(dot(d,sa.xyz),-1.0,1.0));
    float u=ang/sa.w;
    if(u>=2.6)continue;
    float power=pcStormB[i].x;
    // How much of a CYCLONE it is: 0 is a thunderstorm complex, a mass of
    // cloud that does not turn and has no eye.
    float cyc=pcStormB[i].w;
    float hemi=sa.y>=0.0?1.0:-1.0;
    /*
    WOUND LIKE A VORTEX: fastest near the middle and falling away with
    distance (about 1/r), so the tight curl is round the eye and the outer
    arms are barely bent. It was a bell that was flat in the middle and
    steepest half way out, which put the hardest shearing at the rim, where
    a storm is weakest.
    */
    float reach=1.0-smoothstep(0.9,2.2,u);
    float turn=(1.05/(u+0.16)+0.012*tt/(u+0.3))*reach*power*cyc*hemi;
    vec3 sc=b3dGgTurn(sa.xyz,-pcK.y*0.003+tt*0.012*cos(lat*3.0));
    q=pcAbout(q,sc,turn);
    // RAINBANDS: the disc is not one slab. Its depth rises and falls along
    // spiral arms, which is what the light then picks out as texture.
    vec3 e1=normalize(cross(sa.xyz,abs(sa.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0)));
    vec3 e2=cross(sa.xyz,e1);
    float az=atan(dot(d,e2),dot(d,e1));
    float arms=sin(2.0*az*hemi+7.0*log(u+0.06)-0.02*tt);
    float bell=exp(-u*u*1.15);
    /*
    THE EYE IS A FUNNEL, not a hole punched in a disc. The cloud is deepest
    at the eye wall, and from there it slopes down INTO the eye over a
    visible distance before the edge; the slope is what the light shades.
    */
    float wall=smoothstep(0.05,0.2,u);
    float depth=0.40*bell*(0.86+0.14*arms*cyc)*mix(1.0,0.7+0.3*wall,cyc)+0.05*cyc*bell*exp(-pow((u-0.22)/0.1,2.0));
    storm=max(storm,power*(depth-0.95*cyc*(1.0-smoothstep(0.035,0.075,u))));
  }
  // Big systems, then two finer layers for the texture a deck has close to.
  // The noise is READ (noise-texture): 54 samples a pixel, which computed
  // was most of what a planet cost on a headset.
  float f=storm+0.46*b3dVnFbm(q*7.5+sd)
    +0.32*b3dVnFbm(q*22.0+sd*2.1)
    +0.22*b3dVnFbm(q*60.0+sd*3.3);
  // A lean, not a rule: the belts are cloudier and the deserts clearer, but
  // there is cloud in the subtropics and clear sky on the equator. (At 0.24
  // the subtropics were swept bare and the belts were nearly solid.)
  return f+0.14*(pcBelt(latDeg)-0.5);
}
/*
WINDS THAT DIFFER BY LATITUDE CANNOT SIMPLY RUN. Neighbouring belts moving at
different speeds shear whatever lies across them, and the shear grows without
limit: after a few minutes every system had been drawn out into thin stripes
along the latitude lines, and the stripes overwhelmed everything else. So the
winds run for a minute and start again, in two copies half a minute apart,
and the sky is a cross-fade between them: each copy is faded out as it
reaches its limit and back in once it has been reset. Nothing is ever
stretched further than a minute's wind, and the fade doubles as the slow
birth and death of systems. The blend is restored to full contrast, since
the average of two skies is a flatter sky.
*/
float pcField(vec3 d){
  const float T=60.0;
  float ph=pcK.y/T;
  float a=fract(ph);
  float b=fract(ph+0.5);
  float wa=1.0-abs(2.0*a-1.0);
  float wb=1.0-wa;
  float f=wa*pcF(d,(a-0.5)*T)+wb*pcF(d,(b-0.5)*T);
  return 0.5+(f-0.5)/sqrt(wa*wa+wb*wb);
}
// THE THRESHOLD the coverage dial slides: 0 is clear, 1 is mostly cloud
// with breaks, and on past 1 the breaks close, until 3 is a solid deck
// (Venus). It used to stop at 1, which still left holes.
float pcTh(){
  return 0.74-0.44*clamp(pcK.x,0.0,1.0)-0.25*clamp(pcK.x-1.0,0.0,2.0);
}
float pcCut(float f){
  float th=pcTh();
  return smoothstep(th-0.05,th+0.1,f);
}
void main(){
  vec3 d=normalize(vBody);
  vec3 n=normalize(vNormalW);
  vec3 l=pcLight.w>0.5?normalize(pcLight.xyz-vWorld):normalize(pcLight.xyz);
  float nl=dot(n,l);
  float f=pcField(d);
  float c=pcCut(f);
  // The part of the sun's direction that lies along the ground here.
  vec3 sb=normalize(pcSunBody);
  vec3 t=sb-d*dot(sb,d);
  // RELIEF. The field is the cloud's depth, so its slope toward the sun is
  // which way the cloud top faces: rising toward the sun, this side is in
  // its own shade; falling, it is a lit flank. That is what gives a deck its
  // texture, and without it cloud is a white stencil.
  float toward=pcField(normalize(d+t*0.010));
  float relief=clamp(0.5+(f-toward)*9.0,0.0,1.0);
  // Thick cloud is bright on top; thin cloud is a grey veil.
  float body=mix(0.84,1.0,smoothstep(0.0,0.25,f-pcTh()));
  // Where the sun reaches the GROUND through cloud: the same field, further
  // toward the sun.
  float sh=pcCut(pcField(normalize(d+t*0.035)))*smoothstep(-0.05,0.25,nl)*pcK.w;
  // Cloud scatters light forward and sideways, so it stays bright well
  // toward the terminator where bare ground has already dimmed.
  float lit=smoothstep(-0.12,0.3,nl)*(0.5+0.5*max(nl,0.0));
  // Premultiplied: cloud is added, and what is behind is dimmed by cloud
  // and by its shadow.
  // On the night side cloud is a little BRIGHTER than the ground it hides
  // (it is pale, and the ground is dim, not black); darker, it showed as
  // black holes punched in the planet.
  // Deep cloud shows its relief hardest: a storm's core is all cloud top,
  // and with nothing but white there it read as a paper disc.
  float deep=smoothstep(0.1,0.45,f-pcTh());
  vec3 rgb=pcColor*(lit*1.3*body*mix(mix(0.78,0.6,deep),1.12,relief)+0.07)*c;
  // Down the eye wall the cloud falls away from the light: shade it, so the
  // eye reads as the bottom of a funnel and not a hole in a white plate.
  for(int i=0;i<4;i++){
    vec4 sa=pcStormA[i];
    if(sa.w<=0.0)continue;
    float u=acos(clamp(dot(d,sa.xyz),-1.0,1.0))/sa.w;
    rgb*=1.0-0.5*pcStormB[i].w*pcStormB[i].x*(1.0-smoothstep(0.05,0.24,u));
  }
  /*
  LIGHTNING, inside the placed storms: each flash is a patch of cloud lit
  from within for a fraction of a second, somewhere in the storm, on a
  schedule drawn from the storm's own seed. By day it is a flicker; on the
  night side it is the only light there is, which is how it looks from orbit.
  */
  for(int i=0;i<4;i++){
    vec4 sa=pcStormA[i];
    vec4 st=pcStormB[i];
    if(sa.w<=0.0||st.y<=0.0)continue;
    for(int k=0;k<2;k++){
      float clock=pcK.y*st.y*2.0+float(k)*0.37+st.z*3.1;
      float slot=floor(clock);
      float h=b3dGgHash(vec3(slot,st.z,float(k)*5.0));
      if(h<0.45)continue;
      float age=fract(clock);
      float pulse=exp(-age*9.0)*(0.6+0.4*sin(age*70.0));
      vec3 e1=normalize(cross(sa.xyz,abs(sa.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0)));
      vec3 e2=cross(sa.xyz,e1);
      float fa=b3dGgHash(vec3(slot,st.z,11.0))*6.2832;
      float fr=sqrt(b3dGgHash(vec3(slot,st.z,23.0)))*0.8*sa.w;
      vec3 at=normalize(sa.xyz+(e1*cos(fa)+e2*sin(fa))*fr);
      float dist=acos(clamp(dot(d,at),-1.0,1.0))/(0.16*sa.w);
      rgb+=vec3(0.75,0.82,1.0)*pulse*exp(-dist*dist)*c*1.6;
    }
  }
  float a=c+(1.0-c)*sh;
  gl_FragColor=vec4(rgb,a);
}`;
}
/** A cloud shell of `radius` (in the parent's units), parented to `parent`. */
export function createPlanetClouds(scene, parent, radius, options) {
    registerShader();
    const mesh = BABYLON.MeshBuilder.CreateSphere('planet-clouds', { diameter: radius * 2, segments: 48 }, scene);
    const mat = new BABYLON.ShaderMaterial(
    // Named so the cost sweep lists it apart from the planet's surface: the
    // sweep groups by the name up to the first hyphen, and this is the
    // dearest thing a planet draws.
    'cloudshell-planet', scene, { vertex: NAME, fragment: NAME }, {
        attributes: ['position', 'normal'],
        uniforms: [
            'world',
            'worldViewProjection',
            'pcLight',
            'pcSunBody',
            'pcColor',
            'pcK',
            'pcStormA',
            'pcStormB',
        ],
        samplers: [NOISE_TEXTURE_SAMPLER],
        defines: hasNoiseTexture(scene) ? ['#define B3D_NOISETEX'] : [],
        needAlphaBlending: true,
    });
    if (hasNoiseTexture(scene))
        mat.setTexture(NOISE_TEXTURE_SAMPLER, noiseTextureOf(scene));
    const color = options.color ?? new BABYLON.Color3(1, 1, 1);
    mat.setVector3('pcColor', new BABYLON.Vector3(color.r, color.g, color.b));
    mat.alphaMode = BABYLON.Constants.ALPHA_PREMULTIPLIED;
    mat.disableDepthWrite = true;
    mat.backFaceCulling = true;
    const light = new BABYLON.Vector4(0, 1, 0, 0);
    const toSun = new BABYLON.Vector3();
    const inv = new BABYLON.Matrix();
    const speed = options.speed ?? 1;
    mat.onBind = () => {
        sceneLight(scene, light);
        mat.setVector4('pcLight', light);
        // The sun's direction in the planet's own frame, for the shadow.
        mesh.getWorldMatrix().invertToRef(inv);
        if (light.w > 0.5) {
            toSun.set(light.x, light.y, light.z);
            toSun.subtractInPlace(mesh.getAbsolutePosition());
        }
        else
            toSun.set(light.x, light.y, light.z);
        BABYLON.Vector3.TransformNormalToRef(toSun, inv, toSun);
        mat.setVector3('pcSunBody', toSun);
        const sa = new Array(16).fill(0);
        const sb = new Array(16).fill(0);
        (options.storms?.() ?? []).slice(0, 4).forEach((storm, i) => {
            const d = latLonToDirection(storm.lat, storm.lon);
            const size = Math.max(0.5, storm.size ?? 8) * (Math.PI / 180);
            sa.splice(i * 4, 4, d.x, d.y, d.z, size);
            sb.splice(i * 4, 4, Math.max(0, Math.min(1.5, storm.intensity ?? 1)), Math.max(0, storm.lightning ?? 1), i + 1 + (options.seed ?? 1) * 0.37, Math.max(0, Math.min(1, storm.cyclone ?? 1)));
        });
        mat.setArray4('pcStormA', sa);
        mat.setArray4('pcStormB', sb);
        mat.setVector4('pcK', new BABYLON.Vector4(options.coverage, sceneSeconds(scene) * speed, options.seed ?? 1, options.shadow ?? 0.45));
    };
    mesh.material = mat;
    mesh.parent = parent;
    mesh.isPickable = false;
    return mesh;
}
//# sourceMappingURL=planet-clouds.js.map