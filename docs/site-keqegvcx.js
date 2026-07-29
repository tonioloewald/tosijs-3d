import{Ut as H}from"./site-2z5azex9.js";import{ku as C,mu as m,nu as D}from"./site-5mc4escc.js";import{sE as A}from"./site-tvqrtn5a.js";class I extends H{constructor(b){super(b);this.sound=this.registerDataInput("sound",C),this.volume=this.registerDataInput("volume",m,1),this.startOffset=this.registerDataInput("startOffset",m,0),this.loop=this.registerDataInput("loop",D,!1)}_execute(b,N){let q=this.sound.getValue(b);if(!q){this._reportError(b,"No sound provided"),this.out._activateSignal(b);return}let K=this.volume.getValue(b),L=this.startOffset.getValue(b),M=this.loop.getValue(b);q.play({volume:K,startOffset:L,loop:M}),this.out._activateSignal(b)}getClassName(){return"FlowGraphPlaySoundBlock"}}var z=!1;function J(){if(z)return;z=!0,A("FlowGraphPlaySoundBlock",I)}J();
export{I as ln,J as mn};

//# debugId=2262F0A566844CF164756E2164756E21
//# sourceMappingURL=site-keqegvcx.js.map
