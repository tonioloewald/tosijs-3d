import{it}from"./site-x0v5x8t1.js";import{w,V,ct}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Hp extends it{constructor(t){super(t);this.sound=this.registerDataInput("sound",w),this.volume=this.registerDataInput("volume",V,1),this.startOffset=this.registerDataInput("startOffset",V,0),this.loop=this.registerDataInput("loop",ct,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let r=this.volume.getValue(t),a=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:r,startOffset:a,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function Yp(){if(s)return;s=!0,o("FlowGraphPlaySoundBlock",Hp)}Yp();
export{Hp,Yp};

//# debugId=3177816CB64B5B0D64756E2164756E21
//# sourceMappingURL=site-vpv78evz.js.map
