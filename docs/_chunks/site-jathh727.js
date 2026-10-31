import{it}from"./site-3hzw4f8j.js";import{O,V,ct}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class am extends it{constructor(t){super(t);this.sound=this.registerDataInput("sound",O),this.volume=this.registerDataInput("volume",V,1),this.startOffset=this.registerDataInput("startOffset",V,0),this.loop=this.registerDataInput("loop",ct,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let r=this.volume.getValue(t),a=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:r,startOffset:a,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function lm(){if(s)return;s=!0,o("FlowGraphPlaySoundBlock",am)}lm();
export{am,lm};

//# debugId=7C557D703377F6EE64756E2164756E21
//# sourceMappingURL=site-jathh727.js.map
