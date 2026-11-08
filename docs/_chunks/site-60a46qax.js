import{it}from"./site-2z9zdtr9.js";import{w,V,ct}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class fm extends it{constructor(t){super(t);this.sound=this.registerDataInput("sound",w),this.volume=this.registerDataInput("volume",V,1),this.startOffset=this.registerDataInput("startOffset",V,0),this.loop=this.registerDataInput("loop",ct,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let r=this.volume.getValue(t),a=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:r,startOffset:a,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function pm(){if(s)return;s=!0,o("FlowGraphPlaySoundBlock",fm)}pm();
export{fm,pm};

//# debugId=AC26EF33108351EE64756E2164756E21
//# sourceMappingURL=site-60a46qax.js.map
