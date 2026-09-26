import{tt}from"./site-5tw2831p.js";import{I,k}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class wp extends tt{constructor(e){super(e);this.sound=this.registerDataInput("sound",I),this.volume=this.registerDataInput("volume",k,1)}_execute(e,u){let o=this.sound.getValue(e);if(!o){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let r=this.volume.getValue(e);o.volume=r,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var t=!1;function Dp(){if(t)return;t=!0,a("FlowGraphSetSoundVolumeBlock",wp)}Dp();
export{wp,Dp};

//# debugId=4F6328629D184E3464756E2164756E21
//# sourceMappingURL=site-cqft7ry2.js.map
