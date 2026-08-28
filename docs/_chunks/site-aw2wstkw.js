import{Ts as i}from"./site-nv8skz8z.js";import{jt as a,lt as e,mt as l}from"./site-bab0thfc.js";import{fG as r}from"./site-pcap36fe.js";class u extends i{constructor(t){super(t);this.sound=this.registerDataInput("sound",a),this.volume=this.registerDataInput("volume",e,1),this.startOffset=this.registerDataInput("startOffset",e,0),this.loop=this.registerDataInput("loop",l,!1)}_execute(t,g){let o=this.sound.getValue(t);if(!o){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let n=this.volume.getValue(t),h=this.startOffset.getValue(t),f=this.loop.getValue(t);o.play({volume:n,startOffset:h,loop:f}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function p(){if(s)return;s=!0,r("FlowGraphPlaySoundBlock",u)}p();
export{u as Tm,p as Um};

//# debugId=0952CA3DF987C5F864756E2164756E21
//# sourceMappingURL=site-aw2wstkw.js.map
