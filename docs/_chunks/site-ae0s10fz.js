import{Vs as i}from"./site-gda1mzz6.js";import{lt as a,nt as e,ot as l}from"./site-rrva3mwb.js";import{hG as r}from"./site-qd0cy957.js";class u extends i{constructor(t){super(t);this.sound=this.registerDataInput("sound",a),this.volume=this.registerDataInput("volume",e,1),this.startOffset=this.registerDataInput("startOffset",e,0),this.loop=this.registerDataInput("loop",l,!1)}_execute(t,g){let o=this.sound.getValue(t);if(!o){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let n=this.volume.getValue(t),h=this.startOffset.getValue(t),f=this.loop.getValue(t);o.play({volume:n,startOffset:h,loop:f}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function p(){if(s)return;s=!0,r("FlowGraphPlaySoundBlock",u)}p();
export{u as Vm,p as Wm};

//# debugId=F09DC8FA412A072C64756E2164756E21
//# sourceMappingURL=site-ae0s10fz.js.map
