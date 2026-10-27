import{it}from"./site-v7dfb6ky.js";import{P}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class wp extends it{constructor(t){super(t);this.sound=this.registerDataInput("sound",P)}_execute(t,i){let r=this.sound.getValue(t);if(!r){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}r.stop(),this.out._activateSignal(t)}getClassName(){return"FlowGraphStopSoundBlock"}}var e=!1;function Mp(){if(e)return;e=!0,o("FlowGraphStopSoundBlock",wp)}Mp();
export{wp,Mp};

//# debugId=646B620D36439DEF64756E2164756E21
//# sourceMappingURL=site-rz7zdtk2.js.map
