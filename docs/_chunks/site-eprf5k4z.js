import{it}from"./site-ktydmw50.js";import{O,V,ct}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class dm extends it{constructor(t){super(t);this.sound=this.registerDataInput("sound",O),this.volume=this.registerDataInput("volume",V,1),this.startOffset=this.registerDataInput("startOffset",V,0),this.loop=this.registerDataInput("loop",ct,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let r=this.volume.getValue(t),a=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:r,startOffset:a,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function fm(){if(s)return;s=!0,o("FlowGraphPlaySoundBlock",dm)}fm();
export{dm,fm};

//# debugId=B7AB439DD16EDE3764756E2164756E21
//# sourceMappingURL=site-eprf5k4z.js.map
