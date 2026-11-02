import{it}from"./site-scdwvr9t.js";import{O}from"./site-cb9bs1rv.js";import{o}from"./site-qd2v2bpa.js";class Fp extends it{constructor(t){super(t);this.sound=this.registerDataInput("sound",O)}_execute(t,i){let r=this.sound.getValue(t);if(!r){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}r.stop(),this.out._activateSignal(t)}getClassName(){return"FlowGraphStopSoundBlock"}}var e=!1;function kp(){if(e)return;e=!0,o("FlowGraphStopSoundBlock",Fp)}kp();
export{Fp,kp};

//# debugId=242A65F3F67D5DEB64756E2164756E21
//# sourceMappingURL=site-106qvcrs.js.map
