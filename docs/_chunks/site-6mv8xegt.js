import{Ut as H}from"./site-40a1yrg8.js";import{ku as C,mu as m,nu as D}from"./site-v2rprchq.js";import{sE as A}from"./site-c9kedmgh.js";class I extends H{constructor(b){super(b);this.sound=this.registerDataInput("sound",C),this.volume=this.registerDataInput("volume",m,1),this.startOffset=this.registerDataInput("startOffset",m,0),this.loop=this.registerDataInput("loop",D,!1)}_execute(b,N){let q=this.sound.getValue(b);if(!q){this._reportError(b,"No sound provided"),this.out._activateSignal(b);return}let K=this.volume.getValue(b),L=this.startOffset.getValue(b),M=this.loop.getValue(b);q.play({volume:K,startOffset:L,loop:M}),this.out._activateSignal(b)}getClassName(){return"FlowGraphPlaySoundBlock"}}var z=!1;function J(){if(z)return;z=!0,A("FlowGraphPlaySoundBlock",I)}J();
export{I as ln,J as mn};

//# debugId=3BC4F2027CD8CF4B64756E2164756E21
//# sourceMappingURL=site-6mv8xegt.js.map
