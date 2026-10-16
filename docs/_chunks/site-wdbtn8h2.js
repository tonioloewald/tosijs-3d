import{tt}from"./site-n1qmzpg8.js";import{P,V,lt}from"./site-p0tgjt0r.js";import{o}from"./site-zg1n9j37.js";class rm extends tt{constructor(t){super(t);this.sound=this.registerDataInput("sound",P),this.volume=this.registerDataInput("volume",V,1),this.startOffset=this.registerDataInput("startOffset",V,0),this.loop=this.registerDataInput("loop",lt,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let r=this.volume.getValue(t),a=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:r,startOffset:a,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function sm(){if(s)return;s=!0,o("FlowGraphPlaySoundBlock",rm)}sm();
export{rm,sm};

//# debugId=68A58783EE42698264756E2164756E21
//# sourceMappingURL=site-wdbtn8h2.js.map
