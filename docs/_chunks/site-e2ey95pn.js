import{Ut as i}from"./site-ktyw28d4.js";import{ku as a,mu as e,nu as l}from"./site-86tpqddf.js";import{sE as r}from"./site-yf4sr5jd.js";class u extends i{constructor(t){super(t);this.sound=this.registerDataInput("sound",a),this.volume=this.registerDataInput("volume",e,1),this.startOffset=this.registerDataInput("startOffset",e,0),this.loop=this.registerDataInput("loop",l,!1)}_execute(t,g){let o=this.sound.getValue(t);if(!o){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let n=this.volume.getValue(t),h=this.startOffset.getValue(t),f=this.loop.getValue(t);o.play({volume:n,startOffset:h,loop:f}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function p(){if(s)return;s=!0,r("FlowGraphPlaySoundBlock",u)}p();
export{u as ln,p as mn};

//# debugId=28863BA7F3E252DD64756E2164756E21
//# sourceMappingURL=site-e2ey95pn.js.map
